/*
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  AETHERCROP SPATIAL IOT PLATFORM — ESP8266 FIRMWARE NODE v3.5
 *  (WEBSOCKETS SERVER + CAPTIVE SOFTAP + EEPROM FLASH + MDNS + MQTT + HTTP)
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  Hardware Target : ESP8266 NodeMCU V2/V3 / WeMos D1 Mini / ESP-12E / Generic ESP8266
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <DNSServer.h>
#include <ESP8266WebServer.h>
#include <EEPROM.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>
#include <DHT.h>
#include <WebSocketsServer.h>

// ─── HARDWARE GPIO PIN MAPPING (RAW GPIO INTEGERS - ZERO D2/D3 CONFLICTS) ───
#define PIN_LED_INDICATOR  2    // Built-in Status LED (GPIO 2 - Active LOW on ESP8266)
#define PIN_BUTTON_RESET   0    // Flash Button (GPIO 0 - Hold 3s for Factory Reset)
#define PIN_SOIL_MOISTURE  A0   // Analog Soil Moisture Probe (0-1023)
#define PIN_DHT_DATA       4    // Digital Air Temp & Humidity (GPIO 4)
#define PIN_RELAY_PUMP     5    // Water Pump Relay (GPIO 5 - Active HIGH)
#define PIN_FLOW_RATE      14   // Pulse Water Flow Sensor (GPIO 14)
#define DHTTYPE            DHT11

// ─── SERVER & GATEWAY CONFIGURATION ───
const byte DNS_PORT = 53;
const char* BACKEND_GATEWAY_HOST = "192.168.1.100";
const int   BACKEND_GATEWAY_PORT = 3000;
const int   MQTT_PORT            = 1883;
const char* TOPIC_TELEMETRY      = "aether/farm-alpha/zone-1/telemetry";
const char* TOPIC_COMMANDS       = "aether/farm-alpha/zone-1/commands";

// ─── EEPROM MEMORY MAP ───
#define EEPROM_SIZE 512
#define EEPROM_SSID_ADDR 0
#define EEPROM_PASS_ADDR 100
#define EEPROM_AUTH_ADDR 200

// ─── GLOBAL INSTANCES ───
ESP8266WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81); // Dedicated WebSocket Server on Port 81
DNSServer dnsServer;
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(PIN_DHT_DATA, DHTTYPE);

String wifiSsid = "";
String wifiPass = "";
String deviceSerial = "";
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
volatile unsigned long pulseCount = 0;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 2500;

bool pumpState = false;
unsigned long pumpStartTime = 0;
unsigned long pumpDurationMs = 0;

unsigned long lastLedToggle = 0;
bool ledState = HIGH; // Active LOW LED
unsigned long wifiConnectStartTime = 0;
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 25000;

unsigned long buttonPressStartTime = 0;
bool isButtonPressed = false;

void ICACHE_RAM_ATTR flowPulseISR() {
  pulseCount++;
}

void connectToWiFi();
void performCompleteFactoryReset();
void sendDirectHttpHeartbeat();
void broadcastWsStatus();
void saveCredentialsToEeprom(String s, String p, String a);
void loadCredentialsFromEeprom();

// ─── EEPROM STORAGE HANDLERS ───
void saveCredentialsToEeprom(String s, String p, String a) {
  EEPROM.begin(EEPROM_SIZE);
  // Clear areas
  for (int i = 0; i < 300; ++i) EEPROM.write(i, 0);

  // Write SSID
  for (unsigned int i = 0; i < s.length(); ++i) EEPROM.write(EEPROM_SSID_ADDR + i, s[i]);
  EEPROM.write(EEPROM_SSID_ADDR + s.length(), '\0');

  // Write PASS
  for (unsigned int i = 0; i < p.length(); ++i) EEPROM.write(EEPROM_PASS_ADDR + i, p[i]);
  EEPROM.write(EEPROM_PASS_ADDR + p.length(), '\0');

  // Write AUTH
  for (unsigned int i = 0; i < a.length(); ++i) EEPROM.write(EEPROM_AUTH_ADDR + i, a[i]);
  EEPROM.write(EEPROM_AUTH_ADDR + a.length(), '\0');

  EEPROM.commit();
  EEPROM.end();
}

void loadCredentialsFromEeprom() {
  EEPROM.begin(EEPROM_SIZE);
  char s[64] = {0};
  char p[64] = {0};
  char a[64] = {0};

  for (int i = 0; i < 64; ++i) s[i] = EEPROM.read(EEPROM_SSID_ADDR + i);
  for (int i = 0; i < 64; ++i) p[i] = EEPROM.read(EEPROM_PASS_ADDR + i);
  for (int i = 0; i < 64; ++i) a[i] = EEPROM.read(EEPROM_AUTH_ADDR + i);

  wifiSsid = String(s);
  wifiPass = String(p);
  String loadedAuth = String(a);
  if (loadedAuth.length() > 0) authCode = loadedAuth;

  EEPROM.end();
}

// ─── COMPLETE FACTORY RESET (CLEARS EEPROM FLASH & WI-FI) ───
void performCompleteFactoryReset() {
  Serial.println(F("\n⚠️ [FACTORY RESET] Erasing EEPROM Flash & Stored Wi-Fi Credentials..."));

  for (int i = 0; i < 6; i++) {
    digitalWrite(PIN_LED_INDICATOR, LOW);
    delay(80);
    digitalWrite(PIN_LED_INDICATOR, HIGH);
    delay(80);
  }

  EEPROM.begin(EEPROM_SIZE);
  for (int i = 0; i < EEPROM_SIZE; ++i) EEPROM.write(i, 0);
  EEPROM.commit();
  EEPROM.end();

  WiFi.disconnect(true);

  wifiSsid = "";
  wifiPass = "";

  Serial.println(F("✅ [FACTORY RESET] Complete! Restarting into discovery mode...\n"));
  delay(400);
  ESP.restart();
}

// ─── WEBSOCKET EVENT HANDLER (PORT 81) ───
void webSocketEvent(uint8_t num, WStype_t type, uint8_t * payload, size_t length) {
  switch(type) {
    case WStype_DISCONNECTED:
      Serial.printf("🔌 [WS #%u] Client Disconnected\n", num);
      break;

    case WStype_CONNECTED: {
      IPAddress ip = webSocket.remoteIP(num);
      Serial.printf("🔌 [WS #%u] Client Connected from %d.%d.%d.%d\n", num, ip[0], ip[1], ip[2], ip[3]);
      broadcastWsStatus();
      break;
    }

    case WStype_TEXT: {
      String text = String((char*)payload);
      Serial.printf("📥 [WS #%u RX]: %s\n", num, text.c_str());

      StaticJsonDocument<512> doc;
      DeserializationError err = deserializeJson(doc, text);

      if (!err) {
        String msgType = doc["type"] | doc["action"] | "";

        if (msgType == "SET_WIFI" || doc.containsKey("ssid")) {
          String s = doc["ssid"] | doc["wifiSsid"] | "";
          String p = doc["password"] | doc["wifiPass"] | "";
          String a = doc["authCode"] | "";

          if (s.length() > 0) {
            wifiSsid = s;
            wifiPass = p;
            if (a.length() > 0) authCode = a;

            saveCredentialsToEeprom(wifiSsid, wifiPass, authCode);
            Serial.printf("💾 [WS] Stored Wi-Fi SSID: %s\n", wifiSsid.c_str());

            // Acknowledge to WebSocket Client
            StaticJsonDocument<256> ack;
            ack["type"] = "WIFI_STATUS";
            ack["status"] = "CONNECTING";
            ack["ssid"] = wifiSsid;
            String ackStr;
            serializeJson(ack, ackStr);
            webSocket.sendTXT(num, ackStr);

            delay(300);
            currentState = STATE_WIFI_CONNECTING;
            connectToWiFi();
          }
        } else if (msgType == "PUMP" || msgType == "PUMP_COMMAND") {
          String action = doc["action"] | doc["status"] | "TOGGLE";
          int dur = doc["durationSec"] | 6;

          if (action == "ON" || (!pumpState && action == "TOGGLE")) {
            pumpState = true;
            pumpStartTime = millis();
            pumpDurationMs = dur * 1000UL;
            digitalWrite(PIN_RELAY_PUMP, HIGH);
          } else {
            pumpState = false;
            digitalWrite(PIN_RELAY_PUMP, LOW);
          }

          StaticJsonDocument<256> resp;
          resp["type"] = "PUMP_STATUS";
          resp["state"] = pumpState;
          String respStr;
          serializeJson(resp, respStr);
          webSocket.broadcastTXT(respStr);
        } else if (msgType == "FACTORY_RESET") {
          performCompleteFactoryReset();
        } else if (msgType == "GET_STATUS" || msgType == "PING") {
          broadcastWsStatus();
        }
      }
      break;
    }

    default:
      break;
  }
}

void broadcastWsStatus() {
  StaticJsonDocument<512> doc;
  doc["type"] = "DEVICE_STATUS";
  doc["serial"] = deviceSerial;
  doc["mac"] = macAddress;
  doc["authCode"] = authCode;
  doc["wifiSsid"] = wifiSsid;
  doc["pumpRunning"] = pumpState;

  int rawSoil = analogRead(PIN_SOIL_MOISTURE);
  float soilPercent = constrain(map(rawSoil, 1023, 300, 0, 100), 0.0, 100.0);
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  doc["soilMoisture"] = round(soilPercent * 10.0) / 10.0;
  doc["temp"] = isnan(t) ? 28.0 : (round(t * 10.0) / 10.0);
  doc["humidity"] = isnan(h) ? 60.0 : (round(h * 10.0) / 10.0);

  if (WiFi.status() == WL_CONNECTED) {
    doc["status"] = "CONNECTED";
    doc["ip"] = WiFi.localIP().toString();
    doc["rssi"] = WiFi.RSSI();
  } else if (currentState == STATE_WIFI_CONNECTING) {
    doc["status"] = "CONNECTING";
    doc["ip"] = WiFi.softAPIP().toString();
    doc["rssi"] = -45;
  } else {
    doc["status"] = "PROVISIONING_AP";
    doc["ip"] = WiFi.softAPIP().toString();
    doc["rssi"] = -35;
  }

  String res;
  serializeJson(doc, res);
  webSocket.broadcastTXT(res);
}

// ─── DIRECT HTTP HEARTBEAT TO CLOUD / LOCAL GATEWAY ───
void sendDirectHttpHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  WiFiClient client;
  HTTPClient http;
  String url = "http://" + String(BACKEND_GATEWAY_HOST) + ":" + String(BACKEND_GATEWAY_PORT) + "/api/telemetry";
  http.begin(client, url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2500);

  int rawSoil = analogRead(PIN_SOIL_MOISTURE);
  float soilPercent = constrain(map(rawSoil, 1023, 300, 0, 100), 0.0, 100.0);
  float t = dht.readTemperature();
  float h = dht.readHumidity();

  StaticJsonDocument<384> doc;
  doc["deviceId"] = deviceSerial;
  doc["serialNumber"] = deviceSerial;
  doc["authCode"] = authCode;
  doc["status"] = "ONLINE";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["wifiSsid"] = wifiSsid;
  doc["soilMoisture"] = round(soilPercent * 10.0) / 10.0;
  doc["airTemperature"] = isnan(t) ? 28.0 : (round(t * 10.0) / 10.0);
  doc["humidity"] = isnan(h) ? 60.0 : (round(h * 10.0) / 10.0);
  doc["pumpRunning"] = pumpState;
  doc["rssi"] = WiFi.RSSI();

  String payload;
  serializeJson(doc, payload);
  int httpCode = http.POST(payload);
  if (httpCode > 0) {
    Serial.printf("📡 [HTTP POST Telemetry] Sent to gateway (Code: %d)\n", httpCode);
  }
  http.end();
}

// ─── SETUP FUNCTION ───
void setup() {
  Serial.begin(115200);
  delay(300);

  Serial.println(F("\n========================================================"));
  Serial.println(F(" 🌾 AETHERCROP SPATIAL IOT PLATFORM — ESP8266 NODE v3.5"));
  Serial.println(F("========================================================"));

  pinMode(PIN_LED_INDICATOR, OUTPUT);
  pinMode(PIN_BUTTON_RESET, INPUT_PULLUP);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  pinMode(PIN_FLOW_RATE, INPUT_PULLUP);

  digitalWrite(PIN_RELAY_PUMP, LOW);
  digitalWrite(PIN_LED_INDICATOR, HIGH); // Off for active LOW LED

  attachInterrupt(digitalPinToInterrupt(PIN_FLOW_RATE), flowPulseISR, RISING);
  dht.begin();

  macAddress = WiFi.macAddress();
  String macClean = macAddress;
  macClean.replace(":", "");
  String lastFour = macClean.substring(macClean.length() - 4);
  deviceSerial = "ESP8266-ATH-" + lastFour;
  deviceSerial.toUpperCase();

  Serial.print(F("📌 Node Serial: ")); Serial.println(deviceSerial);
  Serial.print(F("📌 MAC Address: ")); Serial.println(macAddress);

  if (digitalRead(PIN_BUTTON_RESET) == LOW) {
    delay(500);
    if (digitalRead(PIN_BUTTON_RESET) == LOW) {
      performCompleteFactoryReset();
    }
  }

  loadCredentialsFromEeprom();

  // 1. SoftAP WebServer & WebSocket Server Setup
  String apName = "AGRI-SETUP-" + lastFour;
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  dnsServer.start(DNS_PORT, "*", WiFi.softAPIP());

  if (MDNS.begin("agriflow-smart-node") || MDNS.begin("aethercrop-node")) {
    MDNS.addService("http", "tcp", 80);
    MDNS.addService("ws", "tcp", 81);
  }

  // Start WebSocket Server on Port 81
  webSocket.begin();
  webSocket.onEvent(webSocketEvent);
  Serial.println(F("🔌 [WebSocket] Server listening on Port 81: ws://192.168.4.1:81/"));

  // WebServer HTTP Endpoints
  auto handleCors = []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS,PUT,DELETE");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, Cache-Control");
    server.sendHeader("Access-Control-Max-Age", "86400");
    server.send(204);
  };

  server.on("/ping", HTTP_OPTIONS, handleCors);
  server.on("/status", HTTP_OPTIONS, handleCors);
  server.on("/api/wifi/status", HTTP_OPTIONS, handleCors);
  server.on("/api/wifi/credentials", HTTP_OPTIONS, handleCors);
  server.on("/api/wifi/scan", HTTP_OPTIONS, handleCors);
  server.on("/api/pump", HTTP_OPTIONS, handleCors);
  server.on("/api/reset", HTTP_OPTIONS, handleCors);
  server.on("/reset", HTTP_OPTIONS, handleCors);

  auto handleStatus = []() {
    StaticJsonDocument<512> doc;
    doc["serial"] = deviceSerial;
    doc["serialNumber"] = deviceSerial;
    doc["mac"] = macAddress;
    doc["macAddress"] = macAddress;
    doc["nvsStored"] = (wifiSsid.length() > 0);
    doc["ssid"] = wifiSsid;
    doc["boardFamily"] = "ESP8266";
    doc["firmwareVersion"] = "3.5.0-WEBSOCKET";
    doc["authCode"] = authCode;

    int rawSoil = analogRead(PIN_SOIL_MOISTURE);
    float soilPercent = constrain(map(rawSoil, 1023, 300, 0, 100), 0.0, 100.0);
    doc["soilMoisture"] = round(soilPercent * 10.0) / 10.0;
    doc["pumpRunning"] = pumpState;

    if (WiFi.status() == WL_CONNECTED) {
      doc["status"] = "CONNECTED";
      doc["wifiStatus"] = "CONNECTED";
      doc["ipAddress"] = WiFi.localIP().toString();
      doc["rssi"] = WiFi.RSSI();
    } else if (currentState == STATE_WIFI_CONNECTING) {
      doc["status"] = "CONNECTING";
      doc["wifiStatus"] = "CONNECTING";
      doc["ipAddress"] = WiFi.softAPIP().toString();
      doc["rssi"] = -45;
    } else {
      doc["status"] = "PROVISIONING_ACTIVE";
      doc["wifiStatus"] = "PROVISIONING_AP";
      doc["ipAddress"] = WiFi.softAPIP().toString();
      doc["rssi"] = -35;
    }

    String res;
    serializeJson(doc, res);
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", res);
  };

  server.on("/ping", HTTP_GET, handleStatus);
  server.on("/status", HTTP_GET, handleStatus);
  server.on("/api/wifi/status", HTTP_GET, handleStatus);

  server.on("/api/wifi/scan", HTTP_GET, []() {
    int n = WiFi.scanNetworks();
    StaticJsonDocument<1024> doc;
    JsonArray networks = doc.createNestedArray("networks");
    for (int i = 0; i < n; ++i) {
      JsonObject net = networks.createNestedObject();
      net["ssid"] = WiFi.SSID(i);
      net["rssi"] = WiFi.RSSI(i);
      net["encryption"] = (WiFi.encryptionType(i) == ENC_TYPE_NONE) ? "OPEN" : "WPA2";
    }
    String res;
    serializeJson(doc, res);
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", res);
  });

  server.on("/api/pump", HTTP_POST, []() {
    StaticJsonDocument<256> doc;
    if (server.hasArg("plain")) {
      deserializeJson(doc, server.arg("plain"));
    }
    const char* action = doc["action"] | "TOGGLE";
    int durSec = doc["durationSec"] | 6;

    if (String(action) == "ON" || (!pumpState && String(action) == "TOGGLE")) {
      pumpState = true;
      pumpStartTime = millis();
      pumpDurationMs = durSec * 1000UL;
      digitalWrite(PIN_RELAY_PUMP, HIGH);
    } else {
      pumpState = false;
      digitalWrite(PIN_RELAY_PUMP, LOW);
    }

    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", pumpState ? "{\"pump\":\"ON\"}" : "{\"pump\":\"OFF\"}");
    broadcastWsStatus();
  });

  server.on("/api/wifi/credentials", HTTP_POST, []() {
    String s = "";
    String p = "";
    String a = "";

    if (server.hasArg("plain")) {
      StaticJsonDocument<384> doc;
      deserializeJson(doc, server.arg("plain"));
      s = doc["ssid"] | doc["wifiSsid"] | "";
      p = doc["password"] | doc["wifiPass"] | "";
      a = doc["authCode"] | "";
    } else if (server.hasArg("ssid")) {
      s = server.arg("ssid");
      p = server.arg("password");
      a = server.arg("authCode");
    }

    if (s.length() > 0) {
      wifiSsid = s;
      wifiPass = p;
      if (a.length() > 0) authCode = a;

      saveCredentialsToEeprom(wifiSsid, wifiPass, authCode);
      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "application/json", "{\"success\":true,\"message\":\"EEPROM Saved. Connecting to Wi-Fi...\"}");

      delay(300);
      currentState = STATE_WIFI_CONNECTING;
      connectToWiFi();
      return;
    }
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID required\"}");
  });

  auto handleReset = []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"success\":true,\"message\":\"Factory reset initiated...\"}");
    delay(500);
    performCompleteFactoryReset();
  };

  server.on("/api/reset", HTTP_POST, handleReset);
  server.on("/reset", HTTP_POST, handleReset);
  server.on("/reset", HTTP_GET, handleReset);

  server.begin();
  Serial.print(F("📶 [SoftAP] Running on Port 80: ")); Serial.println(apName);

  if (wifiSsid.length() == 0) {
    currentState = STATE_PROVISIONING_AP;
  } else {
    connectToWiFi();
  }
}

void connectToWiFi() {
  currentState = STATE_WIFI_CONNECTING;
  wifiConnectStartTime = millis();
  Serial.print(F("📡 [WiFi] Connecting to: ")); Serial.println(wifiSsid);
  WiFi.mode(WIFI_AP_STA);
  WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
}

void reconnectMQTT() {
  if (WiFi.status() != WL_CONNECTED) return;
  static unsigned long lastMqtt = 0;
  if (millis() - lastMqtt < 4000) return;
  lastMqtt = millis();

  String clientId = "ESP8266-" + deviceSerial;
  if (mqttClient.connect(clientId.c_str())) {
    Serial.println(F("✅ [MQTT] Connected to Broker!"));
    mqttClient.subscribe(TOPIC_COMMANDS);
  }
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  StaticJsonDocument<256> doc;
  deserializeJson(doc, payload, length);
  const char* action = doc["action"] | doc["status"] | "OFF";
  if (String(action) == "ON" || String(action) == "RUNNING") {
    pumpState = true;
    pumpStartTime = millis();
    pumpDurationMs = (doc["durationSec"] | 60) * 1000UL;
    digitalWrite(PIN_RELAY_PUMP, HIGH);
    Serial.println(F("⚡ [MQTT RELAY] Pump ON"));
  } else {
    pumpState = false;
    digitalWrite(PIN_RELAY_PUMP, LOW);
    Serial.println(F("🛑 [MQTT RELAY] Pump OFF"));
  }
  broadcastWsStatus();
}

void loop() {
  dnsServer.processNextRequest();
  server.handleClient();
  webSocket.loop(); // Handle WebSocket client connections

  // Check physical Flash button for Factory Reset (Hold 3 seconds)
  if (digitalRead(PIN_BUTTON_RESET) == LOW) {
    if (!isButtonPressed) {
      isButtonPressed = true;
      buttonPressStartTime = millis();
    } else {
      if (millis() - buttonPressStartTime >= 3000) {
        performCompleteFactoryReset();
      }
    }
  } else {
    isButtonPressed = false;
  }

  // State Handler & LED Blink (Active LOW on ESP8266)
  if (currentState == STATE_PROVISIONING_AP) {
    if (millis() - lastLedToggle >= 500) {
      lastLedToggle = millis();
      ledState = !ledState;
      digitalWrite(PIN_LED_INDICATOR, ledState);
    }
  } else if (currentState == STATE_WIFI_CONNECTING) {
    if (millis() - lastLedToggle >= 150) {
      lastLedToggle = millis();
      ledState = !ledState;
      digitalWrite(PIN_LED_INDICATOR, ledState);
    }

    if (WiFi.status() == WL_CONNECTED) {
      currentState = STATE_CONNECTED_ONLINE;
      digitalWrite(PIN_LED_INDICATOR, LOW); // Solid ON
      Serial.print(F("✅ [WiFi] Connected! IP: ")); Serial.println(WiFi.localIP());

      sendDirectHttpHeartbeat();
      broadcastWsStatus();

      mqttClient.setServer(BACKEND_GATEWAY_HOST, MQTT_PORT);
      mqttClient.setCallback(mqttCallback);
    } else if (millis() - wifiConnectStartTime >= WIFI_CONNECT_TIMEOUT_MS) {
      currentState = STATE_PROVISIONING_AP;
      Serial.println(F("❌ [WiFi] Connection timed out."));
      broadcastWsStatus();
    }
  }

  // When Online: Handle MQTT, Telemetry & WebSockets
  if (currentState == STATE_CONNECTED_ONLINE) {
    digitalWrite(PIN_LED_INDICATOR, LOW); // Solid ON

    if (WiFi.status() != WL_CONNECTED) {
      currentState = STATE_WIFI_CONNECTING;
      wifiConnectStartTime = millis();
      return;
    }

    if (!mqttClient.connected()) {
      reconnectMQTT();
    }
    mqttClient.loop();

    if (pumpState && (millis() - pumpStartTime >= pumpDurationMs)) {
      pumpState = false;
      digitalWrite(PIN_RELAY_PUMP, LOW);
      Serial.println(F("⏱️ [RELAY] Pump Timer Expired"));
      broadcastWsStatus();
    }

    if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
      lastTelemetryTime = millis();
      broadcastWsStatus();

      int rawSoil = analogRead(PIN_SOIL_MOISTURE);
      float soilPercent = constrain(map(rawSoil, 1023, 300, 0, 100), 0.0, 100.0);
      float t = dht.readTemperature();
      float h = dht.readHumidity();

      StaticJsonDocument<384> doc;
      doc["deviceId"] = deviceSerial;
      doc["authCode"] = authCode;
      doc["soilMoisture"] = round(soilPercent * 10.0) / 10.0;
      doc["airTemperature"] = isnan(t) ? 28.0 : (round(t * 10.0) / 10.0);
      doc["humidity"] = isnan(h) ? 60.0 : (round(h * 10.0) / 10.0);
      doc["pumpRunning"] = pumpState;
      doc["rssi"] = WiFi.RSSI();

      char buf[384];
      serializeJson(doc, buf);
      if (mqttClient.connected()) {
        mqttClient.publish(TOPIC_TELEMETRY, buf);
      }
    }
  }
}
