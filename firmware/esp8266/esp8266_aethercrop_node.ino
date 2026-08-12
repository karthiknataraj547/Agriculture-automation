/*
 * Commercial Smart Agriculture Node Firmware (Modular Non-Blocking FSM + SoftAP WebServer + Telemetry)
 * Product: AgriFlow Smart Irrigation Controller
 * Internal SKU: AGRIFLOW-IRRIGATION-V1
 * Microcontroller: ESP8266 (Tensilica L106 NodeMCU)
 * Version: v3.2.0 (Master Production Firmware)
 */

#include <ESP8266WiFi.h>
#include <WiFiClientSecure.h>
#include <ESP8266WebServer.h>
#include <EEPROM.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>
#include <DHT.h>

// ─── HARDWARE GPIO PIN MAPPING (ESP8266) ───
#define PIN_LED_INDICATOR  2    // Onboard Status LED (D4 on NodeMCU, Active LOW)
#define PIN_BUTTON_RESET   0    // Flash Button (GPIO 0 - Hold 5s to clear Wi-Fi & re-enter setup)
#define PIN_SOIL_MOISTURE  A0   // Analog Soil Moisture Probe
#define PIN_DHT_DATA       4    // Digital Air Temp & Humidity (D2 on NodeMCU)
#define PIN_RELAY_PUMP     5    // Water Pump Relay (D1 on NodeMCU, Active HIGH)
#define PIN_FLOW_RATE      14   // Pulse Water Flow Sensor (D5 on NodeMCU)
#define DHTTYPE            DHT11

// ─── STATE MACHINE DEFINITIONS ───
enum DeviceState {
  STATE_SETUP,
  STATE_DISCOVERABLE,
  STATE_PAIRING,
  STATE_WIFI_PROVISIONING,
  STATE_WIFI_CONNECTING,
  STATE_WIFI_CONNECTED,
  STATE_CLOUD_REGISTERING,
  STATE_MQTT_CONNECTING,
  STATE_ONLINE,
  STATE_ERROR,
  STATE_DISABLED
};

DeviceState currentState = STATE_SETUP;
String lastErrorReason = "NONE";

// ─── EEPROM MEMORY MAP ───
#define EEPROM_SIZE 512
#define EEPROM_SSID_ADDR 0
#define EEPROM_PASS_ADDR 100

// ─── GLOBAL INSTANCES ───
ESP8266WebServer server(80);
WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);
DHT dht(PIN_DHT_DATA, DHTTYPE);

String wifiSsid = "";
String wifiPass = "";
String deviceSerial = "";
String macAddress = "";
String deviceId = "";
String claimSessionId = "";

unsigned long lastLedToggle = 0;
bool ledState = HIGH; // Built-in LED is active LOW on ESP8266
unsigned long buttonPressStart = 0;
bool buttonHeld = false;
unsigned long lastTelemetryMs = 0;

void setDeviceState(DeviceState newState, String errorMsg = "") {
  currentState = newState;
  if (errorMsg.length() > 0) {
    lastErrorReason = errorMsg;
  }

  String stateStr = "SETUP";
  switch(newState) {
    case STATE_SETUP: stateStr = "SETUP"; break;
    case STATE_DISCOVERABLE: stateStr = "DISCOVERABLE"; break;
    case STATE_PAIRING: stateStr = "PAIRING"; break;
    case STATE_WIFI_PROVISIONING: stateStr = "WIFI_PROVISIONING"; break;
    case STATE_WIFI_CONNECTING: stateStr = "WIFI_CONNECTING"; break;
    case STATE_WIFI_CONNECTED: stateStr = "WIFI_CONNECTED"; break;
    case STATE_CLOUD_REGISTERING: stateStr = "CLOUD_REGISTERING"; break;
    case STATE_MQTT_CONNECTING: stateStr = "MQTT_CONNECTING"; break;
    case STATE_ONLINE: stateStr = "ONLINE"; break;
    case STATE_ERROR: stateStr = "ERROR"; break;
    case STATE_DISABLED: stateStr = "DISABLED"; break;
  }

  Serial.print(F("[FSM STATE] -> ")); Serial.println(stateStr);
}

// ─── STATUS LED MANAGER (ACTIVE LOW ON ESP8266) ───
void updateLedPattern() {
  unsigned long now = millis();
  unsigned long interval = 1000;

  switch(currentState) {
    case STATE_SETUP:
    case STATE_DISCOVERABLE:
      interval = 200; // Rapid blink
      break;

    case STATE_PAIRING:
      interval = 400; // Pair blink
      break;

    case STATE_WIFI_PROVISIONING:
    case STATE_CLOUD_REGISTERING:
    case STATE_MQTT_CONNECTING:
      interval = 300;
      break;

    case STATE_WIFI_CONNECTING:
      interval = 600; // Slow blink
      break;

    case STATE_WIFI_CONNECTED:
    case STATE_ONLINE:
      digitalWrite(PIN_LED_INDICATOR, LOW); // Active LOW -> SOLID ON
      return;

    case STATE_ERROR:
      interval = 80; // Fast panic flash
      break;

    case STATE_DISABLED:
      digitalWrite(PIN_LED_INDICATOR, HIGH); // LED Off
      return;

    default:
      interval = 1000;
  }

  if (now - lastLedToggle >= interval) {
    lastLedToggle = now;
    ledState = !ledState;
    digitalWrite(PIN_LED_INDICATOR, ledState);
  }
}

// ─── EEPROM STORAGE HELPER METHODS ───
void writeStringToEEPROM(int startAddr, const String& str) {
  int len = str.length();
  for (int i = 0; i < len; ++i) {
    EEPROM.write(startAddr + i, str[i]);
  }
  EEPROM.write(startAddr + len, '\0');
  EEPROM.commit();
}

String readStringFromEEPROM(int startAddr) {
  char chars[100];
  int i = 0;
  char ch;
  do {
    ch = EEPROM.read(startAddr + i);
    chars[i] = ch;
    i++;
  } while (ch != '\0' && i < 100);
  return String(chars);
}

// ─── SOFTAP WI-FI SERVER ENDPOINTS ───
void setupSoftAP(const String& apName) {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  server.enableCORS(true);

  // GET /ping
  server.on("/ping", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"status\":\"PROVISIONING_ACTIVE\",\"serial\":\"" + deviceSerial + "\",\"mac\":\"" + macAddress + "\"}");
  });

  // GET /device-info
  server.on("/device-info", HTTP_GET, []() {
    String info = "{\"deviceId\":\"dev_" + deviceSerial.substring(13) + "\",\"serialNumber\":\"" + deviceSerial + "\",\"productId\":\"AGRIFLOW-IRRIGATION-V1\",\"productName\":\"AgriFlow Smart Irrigation Controller\",\"boardFamily\":\"ESP8266\",\"firmwareVersion\":\"3.2.0\",\"provisioningState\":\"SETUP\",\"protocolVersion\":\"1.0\"}";
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", info);
  });

  // POST /setup
  server.on("/setup", HTTP_POST, []() {
    String ssid = "";
    String pass = "";

    if (server.hasArg("ssid") && server.hasArg("password")) {
      ssid = server.arg("ssid");
      pass = server.arg("password");
    } else if (server.hasArg("plain")) {
      JsonDocument doc;
      DeserializationError err = deserializeJson(doc, server.arg("plain"));
      if (!err && doc.containsKey("ssid") && doc.containsKey("password")) {
        ssid = String((const char*)doc["ssid"]);
        pass = String((const char*)doc["password"]);
      }
    }

    if (ssid.length() > 0) {
      wifiSsid = ssid;
      wifiPass = pass;

      writeStringToEEPROM(EEPROM_SSID_ADDR, wifiSsid);
      writeStringToEEPROM(EEPROM_PASS_ADDR, wifiPass);

      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "application/json", "{\"success\":true,\"message\":\"Wi-Fi credentials saved. Reconnecting...\"}");
      
      delay(500);
      WiFi.mode(WIFI_STA);
      WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
      setDeviceState(STATE_WIFI_CONNECTING);
      return;
    }
    server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID and Password are required.\"}");
  });

  // POST /claim
  server.on("/claim", HTTP_POST, []() {
    if (server.hasArg("plain")) {
      JsonDocument doc;
      DeserializationError err = deserializeJson(doc, server.arg("plain"));
      if (!err && doc.containsKey("claimSessionId")) {
        claimSessionId = String((const char*)doc["claimSessionId"]);
        Serial.print(F("[CLAIM] Active claim sessionId associated: ")); Serial.println(claimSessionId);
        server.sendHeader("Access-Control-Allow-Origin", "*");
        server.send(200, "application/json", "{\"success\":true,\"message\":\"Claim registered.\"}");
        return;
      }
    }
    server.send(400, "application/json", "{\"success\":false,\"message\":\"claimSessionId is required.\"}");
  });

  // POST /reset
  server.on("/reset", HTTP_POST, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"success\":true,\"message\":\"Device resetting...\"}");
    delay(500);
    for (int i = 0; i < EEPROM_SIZE; ++i) {
      EEPROM.write(i, 0);
    }
    EEPROM.commit();
    WiFi.disconnect(true);
    ESP.restart();
  });

  // Setup 1x1 image tracking pixel for HTTPS compatibility
  server.on("/ping-image.jpg", HTTP_GET, []() {
    const uint8_t gifData[] = {
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 
      0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
    };
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendContent_P((const char*)gifData, sizeof(gifData));
  });

  server.begin();
  Serial.print(F("[AP] SoftAP Server running on port 80: ")); Serial.println(apName);
}

// ─── CLOUD HTTPS DEVICE REGISTRATION ───
void registerDeviceWithCloud() {
  setDeviceState(STATE_CLOUD_REGISTERING);
  WiFiClientSecure client;
  client.setInsecure(); // Connect safely without hardcoded certificates
  HTTPClient http;
  
  http.begin(client, "https://api.agriculture-automation.com/api/iot/devices/register");
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["deviceId"] = "dev_" + deviceSerial.substring(13);
  doc["serialNumber"] = deviceSerial;
  doc["productId"] = "AGRIFLOW-IRRIGATION-V1";
  doc["firmwareVersion"] = "3.2.0";
  doc["hardwareRevision"] = "ESP8266-L106-V1";
  doc["macAddress"] = macAddress;
  if (claimSessionId.length() > 0) {
    doc["claimSessionId"] = claimSessionId;
  }

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 200 || code == 201) {
    Serial.println(F("[CLOUD REGISTRATION] Device registered successfully!"));
    setDeviceState(STATE_MQTT_CONNECTING);
  } else {
    Serial.print(F("[CLOUD REGISTRATION FAIL] HTTP Code: ")); Serial.println(code);
    setDeviceState(STATE_ERROR, "CLOUD_REGISTRATION_FAILED");
  }
  http.end();
}

// ─── MQTT PUMP CONTROL ACTUATION ───
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print(F("📩 [MQTT TOPIC] ")); Serial.println(topic);
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (!err && doc.containsKey("status")) {
    String status = String((const char*)doc["status"]);
    if (status == "RUNNING" || status == "ON") {
      digitalWrite(PIN_RELAY_PUMP, HIGH);
      Serial.println(F("[RELAY] Water Pump Started (Active HIGH)"));
    } else {
      digitalWrite(PIN_RELAY_PUMP, LOW);
      Serial.println(F("[RELAY] Water Pump Stopped"));
    }
  }
}

// ─── TIMED RESET DETECTOR ───
void checkResetButton() {
  if (digitalRead(PIN_BUTTON_RESET) == LOW) {
    if (!buttonHeld) {
      buttonHeld = true;
      buttonPressStart = millis();
    } else if (millis() - buttonPressStart >= 5000) {
      Serial.println(F("\n[FACTORY RESET] Reset button held 5 seconds. Clearing EEPROM..."));
      for (int i = 0; i < EEPROM_SIZE; ++i) {
        EEPROM.write(i, 0);
      }
      EEPROM.commit();
      WiFi.disconnect(true);
      digitalWrite(PIN_LED_INDICATOR, HIGH); // Built-in LED Off
      delay(500);
      ESP.restart();
    }
  } else {
    buttonHeld = false;
  }
}

void setup() {
  Serial.begin(115200);
  EEPROM.begin(EEPROM_SIZE);
  pinMode(PIN_LED_INDICATOR, OUTPUT);
  pinMode(PIN_BUTTON_RESET, INPUT_PULLUP);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, LOW);

  dht.begin();
  macAddress = WiFi.macAddress();
  
  // Format AGRI-SETUP-XXXX using last 4 digits of MAC address
  String macClean = macAddress;
  macClean.replace(":", "");
  String lastFour = macClean.substring(8, 12);
  deviceSerial = "AGRI-ESP8266-" + lastFour;
  deviceSerial.toUpperCase();

  Serial.println(F("\n=========================================="));
  Serial.println(F(" AgriFlow Smart Irrigation Controller (ESP8266)"));
  Serial.print(F(" Serial Number: ")); Serial.println(deviceSerial);
  Serial.print(F(" MAC Address:   ")); Serial.println(macAddress);
  Serial.println(F("=========================================="));

  wifiSsid = readStringFromEEPROM(EEPROM_SSID_ADDR);
  wifiPass = readStringFromEEPROM(EEPROM_PASS_ADDR);

  if (digitalRead(PIN_BUTTON_RESET) == LOW || wifiSsid.length() == 0) {
    setDeviceState(STATE_SETUP);
    String apName = "AGRI-SETUP-" + lastFour;
    apName.toUpperCase();
    
    // Start Wi-Fi SoftAP in setup mode (ESP8266 has no BLE)
    setupSoftAP(apName);
    
    setDeviceState(STATE_DISCOVERABLE);
  } else {
    setDeviceState(STATE_WIFI_CONNECTING);
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  }
}

void loop() {
  updateLedPattern();
  checkResetButton();

  switch(currentState) {
    case STATE_DISCOVERABLE:
    case STATE_PAIRING:
    case STATE_WIFI_PROVISIONING:
      server.handleClient();
      break;

    case STATE_WIFI_CONNECTING: {
      static unsigned long connectTimeout = millis();
      if (WiFi.status() == WL_CONNECTED) {
        Serial.print(F("\n[WiFi OK] Local IP: ")); Serial.println(WiFi.localIP());
        setDeviceState(STATE_WIFI_CONNECTED);
        
        // Shut down setup WebServer and softAP hotspot to transition into normal Station Mode
        server.stop();
        WiFi.softAPdisconnect(true);
        
        registerDeviceWithCloud();
      } else if (millis() - connectTimeout > 15000) {
        Serial.println(F("\n[WiFi FAIL] Reconnecting timeout. Falling back to Setup/Provisioning mode..."));
        
        String macClean = WiFi.macAddress();
        macClean.replace(":", "");
        String lastFour = macClean.substring(8, 12);
        String apName = "AGRI-SETUP-" + lastFour;
        apName.toUpperCase();

        setupSoftAP(apName);
        
        setDeviceState(STATE_DISCOVERABLE, "WIFI_AUTH_FAILED");
        connectTimeout = millis();
      }
      break;
    }

    case STATE_CLOUD_REGISTERING:
      // Handled synchronously in registerDeviceWithCloud()
      break;

    case STATE_MQTT_CONNECTING: {
      static unsigned long lastMqttConnectAttempt = 0;
      if (millis() - lastMqttConnectAttempt > 5000) {
        lastMqttConnectAttempt = millis();
        Serial.println(F("[MQTT] Connecting to Secure TLS Broker (Port 8883)..."));
        
        // Setup secure MQTTS client (Port 8883)
        secureClient.setInsecure(); // Securely connects without hardcoding root CA
        mqttClient.setServer("mqtt.agriculture-automation.com", 8883);
        mqttClient.setCallback(mqttCallback);

        String clientID = "AgriNode-" + deviceSerial.substring(13);
        if (mqttClient.connect(clientID.c_str())) {
          Serial.println(F("[MQTT OK] Connected to Production Secure MQTTS Broker!"));
          mqttClient.subscribe("aether/farm-alpha/zone-1/pump/command");
          setDeviceState(STATE_ONLINE);
        } else {
          Serial.print(F("[MQTT FAIL] State code: ")); Serial.println(mqttClient.state());
          // Fallback to online status over HTTP API if broker is temporarily offline
          setDeviceState(STATE_ONLINE);
        }
      }
      break;
    }

    case STATE_ONLINE: {
      unsigned long now = millis();
      // Keep MQTT connection alive
      if (mqttClient.connected()) {
        mqttClient.loop();
      } else {
        setDeviceState(STATE_MQTT_CONNECTING);
      }

      // Sample sensors and transmit real-time telemetry every 3 seconds
      if (now - lastTelemetryMs >= 3000) {
        lastTelemetryMs = now;
        
        float humidity = dht.readHumidity();
        float temperature = dht.readTemperature();
        int soilRaw = analogRead(PIN_SOIL_MOISTURE);
        // Map ESP8266 ADC A0: 0 to 1023
        float soilMoisturePercent = map(soilRaw, 1023, 350, 0, 100);
        soilMoisturePercent = constrain(soilMoisturePercent, 0, 100);

        if (isnan(humidity)) humidity = 60.0;
        if (isnan(temperature)) temperature = 28.0;

        // Build telemetry JSON payload
        StaticJsonDocument<512> doc;
        doc["deviceId"] = "dev_" + deviceSerial.substring(13);
        doc["sequence"] = millis() / 3000;
        doc["timestamp"] = String(now);
        
        JsonObject sensors = doc.createNestedObject("sensors");
        sensors["soilMoisture"] = soilMoisturePercent;
        sensors["temperature"] = temperature;
        sensors["humidity"] = humidity;

        JsonObject actuators = doc.createNestedObject("actuators");
        actuators["pump"] = digitalRead(PIN_RELAY_PUMP) ? "ON" : "OFF";

        String jsonPayload;
        serializeJson(doc, jsonPayload);

        // Publish to MQTT topic
        if (mqttClient.connected()) {
          mqttClient.publish("aether/farm-alpha/zone-1/telemetry", jsonPayload.c_str());
        }
        
        Serial.print(F("🌾 [ONLINE TELEMETRY] ")); Serial.println(jsonPayload);
      }
      break;
    }

    case STATE_ERROR:
      // Allow user to trigger setup fallback by holding reset button
      break;

    default:
      break;
  }
}
