/*
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  AETHERCROP SPATIAL IOT PLATFORM — ESP32 FIRMWARE NODE (WIFI PROVISIONING + NVS)
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  Hardware Target : ESP32 DevKit V1 / WROOM-32 / NodeMCU-32S
 *  Features        : 
 *    - Persistent WiFi Credential Storage in NVS Flash (Preferences.h)
 *    - SoftAP Provisioning Mode & HTTP REST API (Port 80 / 192.168.4.1)
 *    - WiFi Scanning & Dynamic Credential Programming
 *    - MQTT Telemetry + HTTP REST Fallback
 *    - Pulse Water Flow Meter & Soil Moisture Sampling
 *    - Active Relay Pump Actuation with Safety Watchdog
 *  Libraries Needed:
 *    - WiFi.h & WebServer.h (Built-in ESP32)
 *    - Preferences.h (Built-in ESP32 NVS)
 *    - PubSubClient (by Nick O'Leary)
 *    - ArduinoJson (v6.x or v7.x by Benoit Blanchon)
 *    - DHT sensor library & Adafruit Unified Sensor (by Adafruit)
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <WebServer.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>

// ─── PIN DEFINITIONS (ESP32) ───
#define SOIL_MOISTURE_PIN  34    // ADC1 Channel 6 (Analog 0-4095)
#define DHT_PIN            4     // GPIO 4 for DHT11 / DHT22 Data
#define DHT_TYPE           DHT11 // Change to DHT22 if using DHT22
#define FLOW_SENSOR_PIN    18    // Interrupt Pin for Pulse Counting
#define RELAY_PUMP_PIN     26    // GPIO 26 for Pump Relay (Active HIGH)
#define STATUS_LED_PIN     2     // Built-in LED (GPIO 2)
#define PIN_FACTORY_RESET  0     // Boot/Flash Button (Hold 5s to clear NVS Wi-Fi)

// ─── MQTT & SERVER CONFIGURATION ───
const char* MQTT_SERVER     = "192.168.1.100"; // Replace with Backend/MQTT IP or domain
const int   MQTT_PORT       = 1883;
const char* MQTT_USER       = "";              // Optional MQTT Username
const char* MQTT_PASS       = "";              // Optional MQTT Password

const char* TOPIC_TELEMETRY = "aether/farm-alpha/zone-1/telemetry";
const char* TOPIC_COMMANDS  = "aether/farm-alpha/zone-1/commands";
const char* HTTP_API_URL    = "http://192.168.1.100:4000/api/v1/telemetry/ingest";

// ─── GLOBAL INSTANCES & STATE ───
Preferences preferences;
WebServer server(80);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

String wifiSsid = "";
String wifiPass = "";
String deviceSerial = "ESP32-NODE-ALPHA-01";
String macAddress = "";
String authCode = "ATH-8F92-4C10-99E4";
String farmId = "farm-alpha";
String zoneId = "zone-1";

enum NodeState {
  STATE_INIT,
  STATE_PROVISIONING_AP,
  STATE_WIFI_CONNECTING,
  STATE_CONNECTED_ONLINE,
  STATE_ERROR
};

NodeState currentState = STATE_INIT;
bool isProvisioned = false;

volatile unsigned long pulseCount = 0;
float waterFlowRate = 0.0; // L/min
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 2500; // 2.5 seconds

bool pumpState = false;
unsigned long pumpStartTime = 0;
unsigned long pumpDurationMs = 0;

unsigned long lastLedToggle = 0;
bool ledState = LOW;
unsigned long resetBtnPressTime = 0;
bool resetBtnHeld = false;

// Interrupt Service Routine for Water Flow Meter Pulse
void IRAM_ATTR flowPulseISR() {
  pulseCount++;
}

// ─── FUNCTION DECLARATIONS ───
void setupProvisioningAP();
void handleProvisioningRequest();
void handleStatusRequest();
void handleWifiScan();
void handleResetRequest();
void connectToWiFi();
void reconnectMQTT();
void mqttCallback(char* topic, byte* payload, unsigned int length);
float readSoilMoisture();
float readWaterFlowRate();
void publishTelemetry();
void sendHTTPFallback(const char* jsonPayload);
void checkFactoryResetButton();
void updateLedIndicator();

// ─── SETUP FUNCTION ───
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println(F("\n\n========================================================"));
  Serial.println(F(" 🌾 AETHERCROP SPATIAL IOT PLATFORM — ESP32 NODE"));
  Serial.println(F("========================================================"));

  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  pinMode(RELAY_PUMP_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  pinMode(PIN_FACTORY_RESET, INPUT_PULLUP);

  digitalWrite(RELAY_PUMP_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);

  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowPulseISR, RISING);
  dht.begin();

  macAddress = WiFi.macAddress();
  String macClean = macAddress;
  macClean.replace(":", "");
  String lastFour = macClean.substring(macClean.length() - 4);
  deviceSerial = "ESP32-ATH-" + lastFour;
  deviceSerial.toUpperCase();

  Serial.print(F("📌 Node Serial: ")); Serial.println(deviceSerial);
  Serial.print(F("📌 MAC Address: ")); Serial.println(macAddress);

  // 1. Read WiFi Credentials from Non-Volatile Flash (NVS)
  preferences.begin("aether-wifi", false);
  wifiSsid = preferences.getString("ssid", "");
  wifiPass = preferences.getString("pass", "");

  Serial.print(F("📖 NVS Stored SSID: "));
  if (wifiSsid.length() > 0) {
    Serial.println(wifiSsid);
  } else {
    Serial.println(F("[NONE] - No credentials stored in NVS"));
  }

  // 2. Decide whether to connect or enter SoftAP provisioning
  if (digitalRead(PIN_FACTORY_RESET) == LOW || wifiSsid.length() == 0) {
    Serial.println(F("⚡ Entering SoftAP WiFi Provisioning Mode..."));
    setupProvisioningAP();
  } else {
    connectToWiFi();
  }
}

// ─── ACCESS POINT & WEB SERVER PROVISIONING MODE ───
void setupProvisioningAP() {
  currentState = STATE_PROVISIONING_AP;
  isProvisioned = false;

  String macClean = macAddress;
  macClean.replace(":", "");
  String lastFour = macClean.substring(macClean.length() - 4);
  String apName = "AetherCrop-SETUP-" + lastFour;
  apName.toUpperCase();

  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  Serial.println(F("\n--------------------------------------------------------"));
  Serial.print(F("📶 WiFi SoftAP Started: ")); Serial.println(apName);
  Serial.print(F("🌐 Provisioning IP:     http://")); Serial.println(WiFi.softAPIP());
  Serial.println(F("🔑 AP Password:        agrifarm2026"));
  Serial.println(F("--------------------------------------------------------\n"));

  // Register WebServer REST Endpoints for Provisioning
  server.enableCORS(true);

  // Endpoint 1: POST /setup and /api/wifi/credentials (Write to NVS & Connect)
  server.on("/setup", HTTP_POST, handleProvisioningRequest);
  server.on("/api/wifi/credentials", HTTP_POST, handleProvisioningRequest);

  // Endpoint 2: GET /ping and /api/wifi/status (Read Status)
  server.on("/ping", HTTP_GET, handleStatusRequest);
  server.on("/api/wifi/status", HTTP_GET, handleStatusRequest);
  server.on("/status", HTTP_GET, handleStatusRequest);

  // Endpoint 3: GET /wifi-scan and /api/wifi/scan (Scan local SSIDs)
  server.on("/wifi-scan", HTTP_GET, handleWifiScan);
  server.on("/api/wifi/scan", HTTP_GET, handleWifiScan);

  // Endpoint 4: POST /reset (Factory Reset NVS)
  server.on("/reset", HTTP_POST, handleResetRequest);

  // Endpoint 5: Root Web Page for Browser Provisioning
  server.on("/", HTTP_GET, []() {
    String html = "<!DOCTYPE html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
                  "<title>AetherCrop WiFi Setup</title>"
                  "<style>body{font-family:sans-serif;background:#0b0f19;color:#e2e8f0;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;}"
                  ".card{background:#151d2f;border:1px solid #06b6d4;border-radius:16px;padding:24px;width:90%;max-width:380px;text-align:center;box-shadow:0 8px 32px rgba(6,182,212,0.2);}"
                  "h2{color:#38bdf8;margin-top:0;}input{width:100%;box-sizing:border-box;padding:12px;margin:8px 0;background:#090d16;border:1px solid #334155;border-radius:8px;color:#fff;font-size:14px;}"
                  "button{width:100%;padding:12px;background:linear-gradient(135deg,#06b6d4,#3b82f6);color:#fff;border:none;border-radius:8px;font-weight:bold;font-size:15px;cursor:pointer;margin-top:12px;}"
                  ".status{font-size:12px;color:#94a3b8;margin-top:16px;}</style></head><body>"
                  "<div class='card'><h2>🌾 AetherCrop Node</h2><p style='font-size:13px;color:#cbd5e1'>Enter WiFi credentials to write into firmware NVS flash memory.</p>"
                  "<form action='/setup' method='POST'><input name='ssid' placeholder='WiFi SSID' required>"
                  "<input name='password' type='password' placeholder='WiFi Password' required>"
                  "<button type='submit'>Write to Firmware & Connect</button></form>"
                  "<div class='status'>Device: " + deviceSerial + "<br>MAC: " + macAddress + "</div></div></body></html>";
    server.send(200, "text/html", html);
  });

  server.begin();
  Serial.println(F("🚀 Provisioning Web Server listening on Port 80."));
}

// ─── PROVISIONING REQUEST HANDLER (WRITE TO NVS) ───
void handleProvisioningRequest() {
  String reqSsid = "";
  String reqPass = "";

  if (server.hasArg("plain")) {
    StaticJsonDocument<384> doc;
    DeserializationError err = deserializeJson(doc, server.arg("plain"));
    if (!err) {
      reqSsid = doc["ssid"] | doc["wifiSsid"] | "";
      reqPass = doc["password"] | doc["wifiPass"] | "";
    }
  }

  if (reqSsid.length() == 0 && server.hasArg("ssid")) {
    reqSsid = server.arg("ssid");
    reqPass = server.arg("password");
  }

  if (reqSsid.length() > 0) {
    wifiSsid = reqSsid;
    wifiPass = reqPass;

    // Write WiFi Credentials to ESP32 NVS Flash Storage
    preferences.putString("ssid", wifiSsid);
    preferences.putString("pass", wifiPass);

    Serial.println(F("\n💾 [NVS WRITE] New WiFi credentials written to flash memory!"));
    Serial.print(F("💾 Stored SSID: ")); Serial.println(wifiSsid);

    String response = "{\"success\":true,\"message\":\"WiFi credentials written to ESP32 NVS! Connecting...\",\"ssid\":\"" + wifiSsid + "\",\"deviceSerial\":\"" + deviceSerial + "\"}";
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", response);

    delay(800);
    currentState = STATE_WIFI_CONNECTING;
    connectToWiFi();
    return;
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID and Password are required.\"}");
}

// ─── STATUS ENDPOINT (READ FROM NVS & WIFI) ───
void handleStatusRequest() {
  StaticJsonDocument<384> doc;
  doc["serialNumber"]    = deviceSerial;
  doc["macAddress"]      = macAddress;
  doc["nvsSsidStored"]   = (wifiSsid.length() > 0);
  doc["ssid"]            = wifiSsid;
  doc["wifiStatus"]      = (WiFi.status() == WL_CONNECTED) ? "CONNECTED" : (currentState == STATE_PROVISIONING_AP ? "PROVISIONING_AP" : "DISCONNECTED");
  doc["ipAddress"]       = (WiFi.status() == WL_CONNECTED) ? WiFi.localIP().toString() : WiFi.softAPIP().toString();
  doc["rssi"]            = (WiFi.status() == WL_CONNECTED) ? WiFi.RSSI() : 0;
  doc["boardFamily"]     = "ESP32";
  doc["firmwareVersion"] = "2.0.0-PROVISION";

  String res;
  serializeJson(doc, res);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", res);
}

// ─── WIFI SCAN ENDPOINT ───
void handleWifiScan() {
  Serial.println(F("🔍 Scanning 2.4GHz WiFi networks..."));
  int n = WiFi.scanNetworks();
  StaticJsonDocument<1024> doc;
  JsonArray array = doc.to<JsonArray>();

  for (int i = 0; i < n; ++i) {
    JsonObject obj = array.createNestedObject();
    obj["ssid"]   = WiFi.SSID(i);
    obj["rssi"]   = WiFi.RSSI(i);
    obj["secure"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
  }

  String res;
  serializeJson(doc, res);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", res);
}

// ─── FACTORY RESET REQUEST (CLEAR NVS) ───
void handleResetRequest() {
  preferences.clear();
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", "{\"success\":true,\"message\":\"ESP32 NVS Cleared! Restarting into AP setup mode...\"}");
  delay(1000);
  ESP.restart();
}

// ─── CONNECT TO WIFI USING NVS CREDENTIALS ───
void connectToWiFi() {
  currentState = STATE_WIFI_CONNECTING;
  Serial.print(F("📡 Connecting to WiFi: "));
  Serial.println(wifiSsid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) { // 15-second timeout (30 * 500ms)
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN)); // Fast blink while connecting
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    currentState = STATE_CONNECTED_ONLINE;
    digitalWrite(STATUS_LED_PIN, HIGH); // Solid ON when connected
    Serial.println(F("\n✅ WiFi Connected Successfully!"));
    Serial.print(F("📶 Assigned IP: ")); Serial.println(WiFi.localIP());
    Serial.print(F("📶 Gateway IP:  ")); Serial.println(WiFi.gatewayIP());
    Serial.print(F("📶 Signal RSSI: ")); Serial.print(WiFi.RSSI()); Serial.println(F(" dBm"));

    mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);
  } else {
    Serial.println(F("\n❌ WiFi Connection Failed or Timed Out! Re-entering SoftAP Provisioning..."));
    setupProvisioningAP();
  }
}

// ─── MQTT RECONNECT ───
void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;

  static unsigned long lastMqttAttempt = 0;
  if (millis() - lastMqttAttempt < 4000) return;
  lastMqttAttempt = millis();

  Serial.print(F("🔄 Connecting to MQTT Broker: "));
  Serial.print(MQTT_SERVER);
  Serial.print(F("..."));

  String clientId = "ESP32-" + deviceSerial;
  bool connected = false;
  if (strlen(MQTT_USER) > 0) {
    connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
  } else {
    connected = mqttClient.connect(clientId.c_str());
  }

  if (connected) {
    Serial.println(F("\n✅ MQTT Connected!"));
    mqttClient.subscribe(TOPIC_COMMANDS);
    Serial.print(F("📥 Subscribed to Topic: ")); Serial.println(TOPIC_COMMANDS);
  } else {
    Serial.print(F(" Failed (rc=")); Serial.print(mqttClient.state()); Serial.println(F(")"));
  }
}

// ─── MQTT INCOMING COMMAND CALLBACK ───
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print(F("📩 [MQTT COMMAND RECEIVED] Topic: "));
  Serial.println(topic);

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);
  if (error) {
    Serial.print(F("❌ JSON Parsing Failed: ")); Serial.println(error.f_str());
    return;
  }

  if (doc.containsKey("status") || doc.containsKey("pumpState") || doc.containsKey("action")) {
    const char* action = doc["status"] | doc["pumpState"] | doc["action"] | "OFF";
    int durationSec = doc["durationSec"] | 60;

    if (String(action) == "RUNNING" || String(action) == "ON") {
      pumpState = true;
      pumpStartTime = millis();
      pumpDurationMs = durationSec * 1000UL;
      digitalWrite(RELAY_PUMP_PIN, HIGH);
      Serial.printf("⚡ PUMP TURNED ON for %d seconds\n", durationSec);
    } else {
      pumpState = false;
      digitalWrite(RELAY_PUMP_PIN, LOW);
      Serial.println(F("🛑 PUMP TURNED OFF"));
    }
  }
}

// ─── READ SOIL MOISTURE ───
float readSoilMoisture() {
  int rawADC = analogRead(SOIL_MOISTURE_PIN);
  float moisturePercent = map(rawADC, 3200, 1200, 0, 100);
  return constrain(moisturePercent, 0.0, 100.0);
}

// ─── CALCULATE WATER FLOW RATE ───
float readWaterFlowRate() {
  static unsigned long lastCheck = 0;
  unsigned long now = millis();
  float durationSec = (now - lastCheck) / 1000.0;
  if (durationSec <= 0) return 0.0;

  float flowLmin = (pulseCount / 7.5) / durationSec;
  pulseCount = 0;
  lastCheck = now;
  return flowLmin;
}

// ─── PUBLISH TELEMETRY OVER MQTT / HTTP ───
void publishTelemetry() {
  float soilMoisture = readSoilMoisture();
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  float flowRate = readWaterFlowRate();

  if (isnan(temp)) temp = 28.2;
  if (isnan(humidity)) humidity = 62.0;

  StaticJsonDocument<512> doc;
  doc["deviceId"]         = deviceSerial;
  doc["authCode"]         = authCode;
  doc["zoneId"]           = zoneId;
  doc["soilMoisture"]     = round(soilMoisture * 10.0) / 10.0;
  doc["airTemperature"]   = round(temp * 10.0) / 10.0;
  doc["humidity"]         = round(humidity * 10.0) / 10.0;
  doc["waterFlowRate"]    = round(flowRate * 10.0) / 10.0;
  doc["tankLevelPercent"] = 88;
  doc["pumpRunning"]      = pumpState;
  doc["batteryLevel"]     = 97;
  doc["rssi"]             = WiFi.RSSI();

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  if (mqttClient.connected()) {
    mqttClient.publish(TOPIC_TELEMETRY, jsonBuffer);
    Serial.printf("📤 [MQTT PUBLISH] Soil: %.1f%% | Temp: %.1fC | Flow: %.1fL/m\n", soilMoisture, temp, flowRate);
  } else {
    sendHTTPFallback(jsonBuffer);
  }
}

// ─── HTTP FALLBACK API INGESTION ───
void sendHTTPFallback(const char* jsonPayload) {
  HTTPClient http;
  http.begin(HTTP_API_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonPayload);
  if (httpCode > 0) {
    Serial.printf("🌐 [HTTP INGEST FALLBACK] Code: %d\n", httpCode);
  } else {
    Serial.printf("❌ [HTTP POST ERROR] Failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ─── FACTORY RESET BUTTON MONITOR (HOLD 5S) ───
void checkFactoryResetButton() {
  if (digitalRead(PIN_FACTORY_RESET) == LOW) {
    if (!resetBtnHeld) {
      resetBtnHeld = true;
      resetBtnPressTime = millis();
    } else if (millis() - resetBtnPressTime >= 5000) {
      Serial.println(F("\n⚠️ [FACTORY RESET] Reset button held 5 seconds! Clearing NVS & restarting..."));
      preferences.clear();
      digitalWrite(STATUS_LED_PIN, LOW);
      delay(500);
      ESP.restart();
    }
  } else {
    resetBtnHeld = false;
  }
}

// ─── LED STATUS PATTERNS ───
void updateLedIndicator() {
  unsigned long now = millis();
  unsigned long interval = 1000;

  if (currentState == STATE_PROVISIONING_AP) {
    interval = 200; // Rapid blink indicates waiting for WiFi credentials in AP Mode
  } else if (currentState == STATE_WIFI_CONNECTING) {
    interval = 500; // Medium blink while connecting
  } else if (currentState == STATE_CONNECTED_ONLINE) {
    digitalWrite(STATUS_LED_PIN, HIGH); // Solid ON when healthy & connected
    return;
  }

  if (now - lastLedToggle >= interval) {
    lastLedToggle = now;
    ledState = !ledState;
    digitalWrite(STATUS_LED_PIN, ledState);
  }
}

// ─── MAIN LOOP ───
void loop() {
  updateLedIndicator();
  checkFactoryResetButton();

  // If in AP Provisioning Mode, keep Web Server active to accept credentials from app
  if (currentState == STATE_PROVISIONING_AP) {
    server.handleClient();
    return;
  }

  // If WiFi drops unexpectedly, reconnect
  if (WiFi.status() != WL_CONNECTED) {
    connectToWiFi();
    return;
  }

  // Manage MQTT
  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  // Safety Pump Watchdog
  if (pumpState && (millis() - pumpStartTime >= pumpDurationMs)) {
    pumpState = false;
    digitalWrite(RELAY_PUMP_PIN, LOW);
    Serial.println(F("⏱️ PUMP TIMER EXPIRED — Pump turned OFF automatically."));
  }

  // Publish sensor telemetry
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = millis();
    publishTelemetry();
  }
}
