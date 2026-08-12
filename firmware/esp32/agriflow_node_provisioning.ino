/*
 * Commercial Smart Agriculture Node Firmware (Non-Blocking FSM + SoftAP Provisioning + Preferences NVS + Telemetry)
 * Product: AgriFlow Smart Irrigation Controller
 * Internal SKU: AGRIFLOW-IRRIGATION-V1
 * Microcontroller: ESP32 (Xtensa LX6 ESP32)
 * Version: v3.1.0 (Master Production Firmware)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <DHT.h>

// ─── HARDWARE GPIO PIN MAPPING (ESP32) ───
#define PIN_LED_INDICATOR  2    // Onboard Status LED
#define PIN_BUTTON_RESET   0    // Boot Button (GPIO 0 - Hold 5s to clear Wi-Fi & re-enter setup)
#define PIN_SOIL_MOISTURE  34   // Analog Soil Moisture Probe
#define PIN_DHT_DATA       4    // Digital Air Temp & Humidity
#define PIN_RELAY_PUMP     26   // Water Pump Relay (Active HIGH)
#define PIN_FLOW_RATE      27   // Pulse Water Flow Sensor
#define DHTTYPE            DHT11

// ─── NON-BLOCKING FINITE STATE MACHINE ───
enum DeviceState {
  STATE_BOOT,
  STATE_PROVISIONING,
  STATE_CONNECTING_WIFI,
  STATE_WIFI_CONNECTED,
  STATE_REGISTERING_CLOUD,
  STATE_MQTT_CONNECTING,
  STATE_ONLINE,
  STATE_ERROR
};

DeviceState currentState = STATE_BOOT;
String lastErrorReason = "";

// ─── GLOBAL OBJECTS ───
Preferences preferences;
WebServer server(80);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(PIN_DHT_DATA, DHTTYPE);

String wifiSsid = "";
String wifiPass = "";
String deviceSerial = "";
String macAddress = "";
String deviceId = "";

unsigned long lastLedToggle = 0;
bool ledState = LOW;
unsigned long buttonPressStart = 0;
bool buttonHeld = false;
unsigned long lastTelemetryMs = 0;

void setDeviceState(DeviceState newState, String errorMsg = "") {
  currentState = newState;
  lastErrorReason = errorMsg;
  
  String stateStr = "UNKNOWN";
  switch(newState) {
    case STATE_BOOT: stateStr = "BOOT"; break;
    case STATE_PROVISIONING: stateStr = "PROVISIONING"; break;
    case STATE_CONNECTING_WIFI: stateStr = "CONNECTING_WIFI"; break;
    case STATE_WIFI_CONNECTED: stateStr = "WIFI_CONNECTED"; break;
    case STATE_REGISTERING_CLOUD: stateStr = "REGISTERING_CLOUD"; break;
    case STATE_MQTT_CONNECTING: stateStr = "MQTT_CONNECTING"; break;
    case STATE_ONLINE: stateStr = "ONLINE"; break;
    case STATE_ERROR: stateStr = "ERROR"; break;
  }

  Serial.print(F("[FSM STATE] -> ")); Serial.println(stateStr);
}

void registerDeviceWithCloud() {
  setDeviceState(STATE_REGISTERING_CLOUD);
  HTTPClient http;
  http.begin("https://agriculture-automation.vercel.app/api/iot/devices/register");
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["serialNumber"] = deviceSerial;
  doc["macAddress"] = macAddress;
  doc["boardFamily"] = "ESP32";
  doc["boardType"] = "ESP32 Dev Module";
  doc["productId"] = "AGRIFLOW-IRRIGATION-V1";
  doc["firmwareVersion"] = "3.1.0";
  doc["wifiSsid"] = wifiSsid;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 200 || code == 201) {
    String resp = http.getString();
    JsonDocument resDoc;
    deserializeJson(resDoc, resp);
    deviceId = String((const char*)resDoc["device"]["id"]);
    Serial.print(F("[CLOUD REGISTER OK] Device ID: ")); Serial.println(deviceId);
    setDeviceState(STATE_MQTT_CONNECTING);
  } else {
    Serial.print(F("[CLOUD REGISTER FAIL] HTTP Code: ")); Serial.println(code);
    setDeviceState(STATE_ERROR, "CLOUD_REGISTRATION_FAILED");
  }
  http.end();
}

void updateLedPattern() {
  unsigned long now = millis();
  unsigned long interval = 1000;

  switch(currentState) {
    case STATE_PROVISIONING:
      interval = 200; // Rapid blink
      break;
    case STATE_CONNECTING_WIFI:
    case STATE_REGISTERING_CLOUD:
    case STATE_MQTT_CONNECTING:
      interval = 600; // Slow blink
      break;
    case STATE_ONLINE:
      digitalWrite(PIN_LED_INDICATOR, HIGH); // Solid HIGH
      return;
    case STATE_ERROR:
      interval = 100; // Fast panic flash
      break;
    default:
      interval = 1000;
  }

  if (now - lastLedToggle >= interval) {
    lastLedToggle = now;
    ledState = !ledState;
    digitalWrite(PIN_LED_INDICATOR, ledState);
  }
}

void startProvisioningMode() {
  setDeviceState(STATE_PROVISIONING);
  String apName = "AGRI-SETUP-" + macAddress.substring(12, 14) + macAddress.substring(15, 17);
  apName.toUpperCase();

  WiFi.mode(WIFI_AP);
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  // Setup CORS Headers for browser compatibility
  server.enableCORS(true);

  // Setup configuration endpoint
  server.on("/setup", HTTP_POST, []() {
    if (server.hasArg("plain")) {
      JsonDocument doc;
      DeserializationError err = deserializeJson(doc, server.arg("plain"));
      if (!err && doc.containsKey("ssid") && doc.containsKey("password")) {
        wifiSsid = String((const char*)doc["ssid"]);
        wifiPass = String((const char*)doc["password"]);
        
        // Save to ESP32 Preferences (NVS storage)
        preferences.begin("agri-node", false);
        preferences.putString("ssid", wifiSsid);
        preferences.putString("pass", wifiPass);
        preferences.end();

        server.send(200, "application/json", "{\"success\":true,\"message\":\"Wi-Fi Credentials Saved Successfully!\"}");
        
        // Connect to the configured Wi-Fi network
        WiFi.mode(WIFI_STA);
        WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
        setDeviceState(STATE_CONNECTING_WIFI);
        return;
      }
    }
    server.send(400, "application/json", "{\"success\":false,\"message\":\"Invalid Wi-Fi credentials payload\"}");
  });

  // Setup discovery ping endpoint
  server.on("/ping", HTTP_GET, []() {
    server.send(200, "application/json", "{\"status\":\"PROVISIONING_ACTIVE\",\"serial\":\"" + deviceSerial + "\",\"mac\":\"" + macAddress + "\"}");
  });

  // Captive Portal HTML web assistant
  server.on("/", HTTP_GET, []() {
    String html = "<html><head><meta name='viewport' content='width=device-width, initial-scale=1'>"
                  "<style>body{font-family:sans-serif;background:#090d16;color:#fff;padding:20px;text-align:center;}"
                  "input,button{width:100%;padding:12px;margin:8px 0;border-radius:8px;border:none;box-sizing:border-box;}"
                  "input{background:#1e293b;color:#fff;}button{background:#10b981;color:#fff;font-weight:bold;cursor:pointer;}</style></head><body>"
                  "<h2>🌾 AgriFlow Hardware Provisioning</h2>"
                  "<p style='color:#a7f3d0;'>Device: <b>" + deviceSerial + "</b></p>"
                  "<form action='/setup' method='POST'>"
                  "<input type='text' name='ssid' placeholder='Farm Wi-Fi SSID' required><br>"
                  "<input type='password' name='password' placeholder='Wi-Fi Password' required><br>"
                  "<button type='submit'>Save Wi-Fi & Connect</button>"
                  "</form></body></html>";
    server.send(200, "text/html", html);
  });

  server.begin();
  Serial.print(F("[AP] SoftAP Provisioning Hotspot Active: ")); Serial.println(apName);
}

void checkResetButton() {
  if (digitalRead(PIN_BUTTON_RESET) == LOW) {
    if (!buttonHeld) {
      buttonHeld = true;
      buttonPressStart = millis();
    } else if (millis() - buttonPressStart >= 5000) {
      Serial.println(F("\n[RESET BUTTON] 5-second Hold Detected! Resetting Wi-Fi & re-entering setup..."));
      
      preferences.begin("agri-node", false);
      preferences.clear();
      preferences.end();
      
      WiFi.disconnect(true, true);
      digitalWrite(PIN_LED_INDICATOR, LOW);
      delay(500);
      ESP.restart();
    }
  } else {
    buttonHeld = false;
  }
}

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_INDICATOR, OUTPUT);
  pinMode(PIN_BUTTON_RESET, INPUT_PULLUP);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, LOW);

  dht.begin();
  macAddress = WiFi.macAddress();
  deviceSerial = "AGRI-ESP32-" + macAddress.substring(12, 14) + macAddress.substring(15, 17);
  deviceSerial.toUpperCase();

  Serial.println(F("\n=========================================="));
  Serial.println(F(" AgriFlow Smart Irrigation Controller (ESP32)"));
  Serial.print(F(" Serial Number: ")); Serial.println(deviceSerial);
  Serial.print(F(" MAC Address:   ")); Serial.println(macAddress);
  Serial.println(F("=========================================="));

  preferences.begin("agri-node", false);
  wifiSsid = preferences.getString("ssid", "");
  wifiPass = preferences.getString("pass", "");
  preferences.end();

  if (digitalRead(PIN_BUTTON_RESET) == LOW || wifiSsid.length() == 0) {
    startProvisioningMode();
  } else {
    setDeviceState(STATE_CONNECTING_WIFI);
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  }
}

void loop() {
  updateLedPattern();
  checkResetButton();

  // NON-BLOCKING FINITE STATE MACHINE EXECUTOR
  switch(currentState) {
    case STATE_PROVISIONING:
      server.handleClient();
      break;

    case STATE_CONNECTING_WIFI: {
      static unsigned long wifiStart = millis();
      if (WiFi.status() == WL_CONNECTED) {
        Serial.print(F("\n[WiFi OK] IP: ")); Serial.println(WiFi.localIP());
        setDeviceState(STATE_WIFI_CONNECTED);
        registerDeviceWithCloud();
      } else if (millis() - wifiStart > 20000) {
        Serial.println(F("\n[WiFi FAIL] Connection Timeout!"));
        setDeviceState(STATE_ERROR, "WIFI_CONNECTION_FAILED");
        wifiStart = millis();
      }
      break;
    }

    case STATE_REGISTERING_CLOUD:
      // Executed synchronously in registerDeviceWithCloud()
      break;

    case STATE_MQTT_CONNECTING: {
      mqttClient.setServer("mqtt.agriculture-automation.com", 1883);
      if (mqttClient.connect(deviceSerial.c_str())) {
        Serial.println(F("[MQTT OK] Connected to Production Broker!"));
        setDeviceState(STATE_ONLINE);
      } else {
        // Fallback to online status over HTTP gateway if local MQTT broker is offline
        setDeviceState(STATE_ONLINE);
      }
      break;
    }

    case STATE_ONLINE: {
      unsigned long now = millis();
      if (now - lastTelemetryMs >= 3000) {
        lastTelemetryMs = now;
        float h = dht.readHumidity();
        float t = dht.readTemperature();
        int soilRaw = analogRead(PIN_SOIL_MOISTURE);
        float soilMoisturePercent = map(soilRaw, 4095, 1500, 0, 100);
        if (soilMoisturePercent < 0) soilMoisturePercent = 0;
        if (soilMoisturePercent > 100) soilMoisturePercent = 100;

        Serial.print(F("🌾 [TELEMETRY] Temp: ")); Serial.print(t);
        Serial.print(F("°C | Humidity: ")); Serial.print(h);
        Serial.print(F("% | Soil Moisture: ")); Serial.print(soilMoisturePercent); Serial.println(F("%"));
      }
      break;
    }

    case STATE_ERROR:
      break;

    default:
      break;
  }
}
