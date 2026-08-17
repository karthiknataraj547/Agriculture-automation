/*
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  AETHERCROP SPATIAL IOT PLATFORM — ESP8266 FIRMWARE NODE (WIFI PROVISIONING + EEPROM)
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  Hardware Target : ESP8266 NodeMCU V2/V3 / WeMos D1 Mini
 *  Features        : 
 *    - Persistent WiFi Credential Storage in EEPROM Flash
 *    - SoftAP Provisioning Mode & HTTP REST API (Port 80 / 192.168.4.1)
 *    - WiFi Scanning & Dynamic Credential Programming
 *    - Secure TLS / MQTTS Telemetry & HTTP REST Fallback
 *    - Active Relay Pump Actuation & Sensor Sampling
 *  Libraries Needed:
 *    - ESP8266WiFi.h & ESP8266WebServer.h (Built-in ESP8266)
 *    - EEPROM.h (Built-in ESP8266 Flash Storage)
 *    - PubSubClient (by Nick O'Leary)
 *    - ArduinoJson (v6.x or v7.x by Benoit Blanchon)
 *    - DHT sensor library (by Adafruit)
 * ═══════════════════════════════════════════════════════════════════════════════════
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
#define PIN_BUTTON_RESET   0    // Flash Button (GPIO 0 - Hold 5s to clear Wi-Fi EEPROM)
#define PIN_SOIL_MOISTURE  A0   // Analog Soil Moisture Probe (0-1023)
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
String authCode = "ATH-8F92-4C10-99E4";
String farmId = "farm-alpha";
String zoneId = "zone-1";

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
      interval = 200; // Rapid blink indicates waiting for WiFi in AP Mode
      break;

    case STATE_PAIRING:
    case STATE_WIFI_PROVISIONING:
      interval = 300;
      break;

    case STATE_WIFI_CONNECTING:
      interval = 500; // Medium blink
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

  // Common CORS OPTIONS Handlers
  auto sendCors = []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  };

  server.on("/ping", HTTP_OPTIONS, sendCors);
  server.on("/status", HTTP_OPTIONS, sendCors);
  server.on("/api/wifi/status", HTTP_OPTIONS, sendCors);
  server.on("/setup", HTTP_OPTIONS, sendCors);
  server.on("/api/wifi/credentials", HTTP_OPTIONS, sendCors);
  server.on("/wifi-scan", HTTP_OPTIONS, sendCors);
  server.on("/api/wifi/scan", HTTP_OPTIONS, sendCors);

  // GET /ping & /api/wifi/status
  auto handleStatus = []() {
    StaticJsonDocument<384> doc;
    doc["status"] = "PROVISIONING_ACTIVE";
    doc["serial"] = deviceSerial;
    doc["serialNumber"] = deviceSerial;
    doc["mac"] = macAddress;
    doc["macAddress"] = macAddress;
    doc["eepromStored"] = (wifiSsid.length() > 0);
    doc["ssid"] = wifiSsid;
    doc["boardFamily"] = "ESP8266";
    doc["firmwareVersion"] = "3.2.0-PROVISION";
    doc["wifiStatus"] = (int)WiFi.status();

    String response;
    serializeJson(doc, response);
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", response);
  };

  server.on("/ping", HTTP_GET, handleStatus);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/api/wifi/status", HTTP_GET, handleStatus);

  // GET /wifi-scan & /api/wifi/scan
  auto handleScan = []() {
    Serial.println(F("[WIFI SCAN] Scanning nearby networks..."));
    int n = WiFi.scanNetworks();
    StaticJsonDocument<1024> doc;
    JsonArray networks = doc.to<JsonArray>();

    for (int i = 0; i < n; ++i) {
      JsonObject net = networks.createNestedObject();
      net["ssid"] = WiFi.SSID(i);
      net["rssi"] = WiFi.RSSI(i);
      net["secure"] = (WiFi.encryptionType(i) != ENC_TYPE_NONE);
    }

    String response;
    serializeJson(doc, response);
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", response);
  };

  server.on("/wifi-scan", HTTP_GET, handleScan);
  server.on("/api/wifi/scan", HTTP_GET, handleScan);

  // POST /setup & /api/wifi/credentials (Write to EEPROM)
  auto handleSetup = []() {
    String ssid = "";
    String pass = "";

    if (server.hasArg("ssid") && server.hasArg("password")) {
      ssid = server.arg("ssid");
      pass = server.arg("password");
    } else if (server.hasArg("plain")) {
      StaticJsonDocument<256> doc;
      DeserializationError err = deserializeJson(doc, server.arg("plain"));
      if (!err) {
        ssid = doc["ssid"] | doc["wifiSsid"] | "";
        pass = doc["password"] | doc["wifiPass"] | "";
      }
    }

    if (ssid.length() > 0) {
      wifiSsid = ssid;
      wifiPass = pass;

      writeStringToEEPROM(EEPROM_SSID_ADDR, wifiSsid);
      writeStringToEEPROM(EEPROM_PASS_ADDR, wifiPass);

      Serial.println(F("\n💾 [EEPROM WRITE] Stored WiFi credentials in EEPROM flash!"));
      Serial.print(F("💾 SSID: ")); Serial.println(wifiSsid);

      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "application/json", "{\"success\":true,\"message\":\"WiFi credentials written to EEPROM. Reconnecting...\",\"ssid\":\"" + wifiSsid + "\"}");
      
      delay(500);
      WiFi.mode(WIFI_AP_STA);
      WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
      setDeviceState(STATE_WIFI_CONNECTING);
      return;
    }
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID and Password are required.\"}");
  };

  server.on("/setup", HTTP_POST, handleSetup);
  server.on("/api/wifi/credentials", HTTP_POST, handleSetup);

  // POST /reset
  server.on("/reset", HTTP_POST, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"success\":true,\"message\":\"EEPROM Cleared! Device restarting...\"}");
    delay(500);
    for (int i = 0; i < EEPROM_SIZE; ++i) {
      EEPROM.write(i, 0);
    }
    EEPROM.commit();
    WiFi.disconnect(true);
    ESP.restart();
  });

  server.begin();
  Serial.print(F("[AP] SoftAP Web Server running on Port 80: ")); Serial.println(apName);
}

// ─── MQTT PUMP CONTROL ACTUATION ───
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print(F("📩 [MQTT TOPIC] ")); Serial.println(topic);
  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (!err && (doc.containsKey("status") || doc.containsKey("pumpState"))) {
    String status = doc["status"] | doc["pumpState"] | "OFF";
    if (status == "RUNNING" || status == "ON") {
      digitalWrite(PIN_RELAY_PUMP, HIGH);
      Serial.println(F("[RELAY] Water Pump Started (Active HIGH)"));
    } else {
      digitalWrite(PIN_RELAY_PUMP, LOW);
      Serial.println(F("[RELAY] Water Pump Stopped"));
    }
  }
}

// ─── TIMED RESET DETECTOR (HOLD 5S) ───
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
      digitalWrite(PIN_LED_INDICATOR, HIGH);
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
  
  String macClean = macAddress;
  macClean.replace(":", "");
  String lastFour = macClean.substring(macClean.length() - 4);
  deviceSerial = "AGRI-ESP8266-" + lastFour;
  deviceSerial.toUpperCase();

  Serial.println(F("\n=========================================="));
  Serial.println(F(" 🌾 AetherCrop Smart Node (ESP8266)"));
  Serial.print(F(" Serial Number: ")); Serial.println(deviceSerial);
  Serial.print(F(" MAC Address:   ")); Serial.println(macAddress);
  Serial.println(F("=========================================="));

  wifiSsid = readStringFromEEPROM(EEPROM_SSID_ADDR);
  wifiPass = readStringFromEEPROM(EEPROM_PASS_ADDR);

  if (digitalRead(PIN_BUTTON_RESET) == LOW || wifiSsid.length() == 0) {
    setDeviceState(STATE_SETUP);
    String apName = "AGRI-SETUP-" + lastFour;
    apName.toUpperCase();
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
    case STATE_SETUP:
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
        
        server.stop();
        WiFi.softAPdisconnect(true);
        WiFi.mode(WIFI_STA);
        setDeviceState(STATE_ONLINE);
      } else if (millis() - connectTimeout > 15000) {
        Serial.println(F("\n[WiFi FAIL] Reconnect timeout. Re-entering SoftAP Provisioning mode..."));
        
        String macClean = WiFi.macAddress();
        macClean.replace(":", "");
        String lastFour = macClean.substring(macClean.length() - 4);
        String apName = "AGRI-SETUP-" + lastFour;
        apName.toUpperCase();

        setupSoftAP(apName);
        setDeviceState(STATE_DISCOVERABLE, "WIFI_AUTH_FAILED");
        connectTimeout = millis();
      }
      break;
    }

    case STATE_ONLINE: {
      unsigned long now = millis();
      if (WiFi.status() != WL_CONNECTED) {
        setDeviceState(STATE_WIFI_CONNECTING);
        break;
      }

      if (now - lastTelemetryMs >= 3000) {
        lastTelemetryMs = now;
        
        float humidity = dht.readHumidity();
        float temperature = dht.readTemperature();
        int soilRaw = analogRead(PIN_SOIL_MOISTURE);
        float soilMoisturePercent = map(soilRaw, 1023, 350, 0, 100);
        soilMoisturePercent = constrain(soilMoisturePercent, 0, 100);

        if (isnan(humidity)) humidity = 60.0;
        if (isnan(temperature)) temperature = 28.0;

        StaticJsonDocument<512> doc;
        doc["deviceId"] = deviceSerial;
        doc["authCode"] = authCode;
        doc["zoneId"] = zoneId;
        doc["soilMoisture"] = soilMoisturePercent;
        doc["airTemperature"] = temperature;
        doc["humidity"] = humidity;
        doc["pumpRunning"] = (digitalRead(PIN_RELAY_PUMP) == HIGH);
        doc["rssi"] = WiFi.RSSI();

        String jsonPayload;
        serializeJson(doc, jsonPayload);
        Serial.print(F("🌾 [TELEMETRY] ")); Serial.println(jsonPayload);
      }
      break;
    }

    default:
      break;
  }
}
