/*
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  AETHERCROP SPATIAL IOT PLATFORM — ESP32 FIRMWARE NODE v3.5
 *  (WEBSOCKETS SERVER + CAPTIVE SOFTAP + BLE GATT + NVS PROVISIONING + MQTT)
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  Hardware Target : ESP32 DevKit V1 / WROOM-32 / NodeMCU-32S / ESP32-WROVER
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <nvs_flash.h>
#include <WebSocketsServer.h>

// ─── BLE UUID DEFINITIONS ───
#define SERVICE_UUID        "0000ffe0-0000-1000-8000-00805f9b34fb"
#define CHARACTERISTIC_UUID "0000ffe1-0000-1000-8000-00805f9b34fb"

// ─── PIN DEFINITIONS (ESP32) ───
#define SOIL_MOISTURE_PIN  34    // ADC1 Channel 6 (Analog 0-4095)
#define DHT_PIN            4     // GPIO 4 for DHT11 / DHT22 Data
#define DHT_TYPE           DHT11 // DHT11 or DHT22
#define FLOW_SENSOR_PIN    18    // Interrupt Pin for Pulse Counting
#define RELAY_PUMP_PIN     26    // GPIO 26 for Pump Relay (Active HIGH)
#define STATUS_LED_PIN     2     // Built-in LED (GPIO 2)
#define PIN_FACTORY_RESET  0     // Boot/Flash Button (Hold 3s to Factory Reset)

// ─── SERVER & GATEWAY CONFIGURATION ───
const byte DNS_PORT = 53;
const char* BACKEND_GATEWAY_HOST = "192.168.1.100";
const int   BACKEND_GATEWAY_PORT = 3000;
const int   MQTT_PORT            = 1883;
const char* TOPIC_TELEMETRY      = "aether/farm-alpha/zone-1/telemetry";
const char* TOPIC_COMMANDS       = "aether/farm-alpha/zone-1/commands";

// ─── GLOBAL INSTANCES ───
Preferences preferences;
WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81); // WebSocket server on port 81
DNSServer dnsServer;
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

BLEServer* pBleServer = NULL;
BLECharacteristic* pBleCharacteristic = NULL;
bool bleClientConnected = false;
bool oldBleClientConnected = false;

String wifiSsid = "";
String wifiPass = "";
String deviceSerial = "ESP32-ATH-8A12";
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
const unsigned long TELEMETRY_INTERVAL_MS = 2000;

bool pumpState = false;
unsigned long pumpStartTime = 0;
unsigned long pumpDurationMs = 0;

unsigned long lastLedToggle = 0;
bool ledState = LOW;
unsigned long wifiConnectStartTime = 0;
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 25000;

unsigned long buttonPressStartTime = 0;
bool isButtonPressed = false;

void IRAM_ATTR flowPulseISR() {
  pulseCount++;
}

void connectToWiFi();
void sendBleStatusNotification(const String& statusStr, const String& ipStr = "");
void performCompleteFactoryReset();
void sendDirectHttpHeartbeat();
void broadcastWsStatus();

// ─── COMPLETE FACTORY RESET (CLEARS NVS FLASH + WIFI CREDENTIALS) ───
void performCompleteFactoryReset() {
  Serial.println(F("\n⚠️ [FACTORY RESET] Erasing all NVS Flash & Stored Wi-Fi Credentials..."));

  for (int i = 0; i < 5; i++) {
    digitalWrite(STATUS_LED_PIN, HIGH);
    delay(100);
    digitalWrite(STATUS_LED_PIN, LOW);
    delay(100);
  }

  preferences.begin("aether-wifi", false);
  preferences.clear();
  preferences.end();

  WiFi.disconnect(true, true);

  nvs_flash_erase();
  nvs_flash_init();

  wifiSsid = "";
  wifiPass = "";

  Serial.println(F("✅ [FACTORY RESET] Complete! Restarting in clean mode...\n"));
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

            preferences.begin("aether-wifi", false);
            preferences.putString("ssid", wifiSsid);
            preferences.putString("pass", wifiPass);
            if (a.length() > 0) preferences.putString("auth", authCode);
            preferences.end();

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
            digitalWrite(RELAY_PUMP_PIN, HIGH);
          } else {
            pumpState = false;
            digitalWrite(RELAY_PUMP_PIN, LOW);
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

  int rawSoil = analogRead(SOIL_MOISTURE_PIN);
  float soilPercent = constrain(map(rawSoil, 3200, 1200, 0, 100), 0.0, 100.0);
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

// ─── BLE SERVER CALLBACKS ───
class BleServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      bleClientConnected = true;
      Serial.println(F("\n📱 [BLE GATT] Wireless Client Connected!"));
    }

    void onDisconnect(BLEServer* pServer) {
      bleClientConnected = false;
      Serial.println(F("\n📱 [BLE GATT] Client Disconnected. Resuming BLE Advertising..."));
      delay(200);
      pServer->getAdvertising()->start();
    }
};

// ─── BLE CHARACTERISTIC WRITE HANDLER ───
class BleCharacteristicCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      std::string rxValue = pCharacteristic->getValue();
      if (rxValue.length() > 0) {
        Serial.print(F("📥 [BLE RX]: "));
        Serial.println(rxValue.c_str());

        if (rxValue == "FACTORY_RESET" || rxValue == "RESET") {
          performCompleteFactoryReset();
          return;
        }

        StaticJsonDocument<512> doc;
        DeserializationError err = deserializeJson(doc, rxValue.c_str());

        String s = "";
        String p = "";
        String a = "";

        if (!err) {
          if (doc.containsKey("cmd") && doc["cmd"] == "FACTORY_RESET") {
            performCompleteFactoryReset();
            return;
          }
          s = doc["ssid"] | doc["wifiSsid"] | "";
          p = doc["password"] | doc["wifiPass"] | "";
          a = doc["authCode"] | "";
        } else {
          String rawStr = String(rxValue.c_str());
          int sep = rawStr.indexOf(':');
          if (sep == -1) sep = rawStr.indexOf(',');
          if (sep != -1) {
            s = rawStr.substring(0, sep);
            p = rawStr.substring(sep + 1);
          }
        }

        if (s.length() > 0) {
          wifiSsid = s;
          wifiPass = p;
          if (a.length() > 0) authCode = a;

          preferences.begin("aether-wifi", false);
          preferences.putString("ssid", wifiSsid);
          preferences.putString("pass", wifiPass);
          if (a.length() > 0) preferences.putString("auth", authCode);
          preferences.end();

          Serial.println(F("💾 [NVS] Wi-Fi credentials saved to NVS flash!"));
          Serial.print(F("💾 SSID: ")); Serial.println(wifiSsid);

          sendBleStatusNotification("NVS_SAVED", WiFi.softAPIP().toString());

          delay(300);
          currentState = STATE_WIFI_CONNECTING;
          connectToWiFi();
        }
      }
    }
};

void sendBleStatusNotification(const String& statusStr, const String& ipStr) {
  if (pBleCharacteristic != NULL && bleClientConnected) {
    StaticJsonDocument<256> doc;
    doc["status"] = statusStr;
    doc["serial"] = deviceSerial;
    doc["authCode"] = authCode;
    if (ipStr.length() > 0) doc["ip"] = ipStr;

    String jsonRes;
    serializeJson(doc, jsonRes);
    pBleCharacteristic->setValue(jsonRes.c_str());
    pBleCharacteristic->notify();
    Serial.print(F("📤 [BLE NOTIFY]: ")); Serial.println(jsonRes);
  }
}

// ─── DIRECT HTTP HEARTBEAT TO CLOUD / LOCAL GATEWAY ───
void sendDirectHttpHeartbeat() {
  if (WiFi.status() != WL_CONNECTED) return;

  HTTPClient http;
  String url = "http://" + String(BACKEND_GATEWAY_HOST) + ":" + String(BACKEND_GATEWAY_PORT) + "/api/telemetry";
  http.begin(url);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(2500);

  int rawSoil = analogRead(SOIL_MOISTURE_PIN);
  float soilPercent = constrain(map(rawSoil, 3200, 1200, 0, 100), 0.0, 100.0);
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
  Serial.println(F(" 🌾 AETHERCROP SPATIAL IOT PLATFORM — ESP32 NODE v3.5"));
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

  if (digitalRead(PIN_FACTORY_RESET) == LOW) {
    delay(500);
    if (digitalRead(PIN_FACTORY_RESET) == LOW) {
      performCompleteFactoryReset();
    }
  }

  preferences.begin("aether-wifi", false);
  wifiSsid = preferences.getString("ssid", "");
  wifiPass = preferences.getString("pass", "");
  authCode = preferences.getString("auth", "ATH-8F92-4C10-99E4");
  preferences.end();

  // 1. Initialize BLE Stack
  String bleDeviceName = "AGRI-ESP32-" + lastFour;
  BLEDevice::init(bleDeviceName.c_str());
  BLEDevice::setPower(ESP_PWR_LVL_P9);

  pBleServer = BLEDevice::createServer();
  pBleServer->setCallbacks(new BleServerCallbacks());

  BLEService *pService = pBleServer->createService(SERVICE_UUID);
  pBleCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ |
      BLECharacteristic::PROPERTY_WRITE |
      BLECharacteristic::PROPERTY_WRITE_NR |
      BLECharacteristic::PROPERTY_NOTIFY
  );
  pBleCharacteristic->addDescriptor(new BLE2902());
  pBleCharacteristic->setCallbacks(new BleCharacteristicCallbacks());
  pBleCharacteristic->setValue("AGRIFLOW_READY");
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.print(F("📱 [BLE] Advertising as: ")); Serial.println(bleDeviceName);

  // 2. SoftAP WebServer & WebSocket Server Setup
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
  server.enableCORS(true);

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
    doc["boardFamily"] = "ESP32";
    doc["firmwareVersion"] = "3.5.0-WEBSOCKET";
    doc["authCode"] = authCode;

    int rawSoil = analogRead(SOIL_MOISTURE_PIN);
    float soilPercent = constrain(map(rawSoil, 3200, 1200, 0, 100), 0.0, 100.0);
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
      net["encryption"] = (WiFi.encryptionType(i) == WIFI_AUTH_OPEN) ? "OPEN" : "WPA2";
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
      digitalWrite(RELAY_PUMP_PIN, HIGH);
    } else {
      pumpState = false;
      digitalWrite(RELAY_PUMP_PIN, LOW);
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

      preferences.begin("aether-wifi", false);
      preferences.putString("ssid", wifiSsid);
      preferences.putString("pass", wifiPass);
      if (a.length() > 0) preferences.putString("auth", authCode);
      preferences.end();

      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "application/json", "{\"success\":true,\"message\":\"NVS Saved. Connecting to Wi-Fi...\"}");

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

  String clientId = "ESP32-" + deviceSerial;
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
    digitalWrite(RELAY_PUMP_PIN, HIGH);
    Serial.println(F("⚡ [MQTT RELAY] Pump ON"));
  } else {
    pumpState = false;
    digitalWrite(RELAY_PUMP_PIN, LOW);
    Serial.println(F("🛑 [MQTT RELAY] Pump OFF"));
  }
  broadcastWsStatus();
}

void loop() {
  dnsServer.processNextRequest();
  server.handleClient();
  webSocket.loop(); // Handle WebSocket client connections

  // Check physical BOOT button for Factory Reset (Hold 3 seconds)
  if (digitalRead(PIN_FACTORY_RESET) == LOW) {
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

  // Handle BLE Disconnect Re-advertising
  if (!bleClientConnected && oldBleClientConnected) {
    delay(300);
    pBleServer->startAdvertising();
    Serial.println(F("📱 [BLE] Restarted advertising."));
    oldBleClientConnected = bleClientConnected;
  }
  if (bleClientConnected && !oldBleClientConnected) {
    oldBleClientConnected = bleClientConnected;
  }

  // State Handler & LED Blink
  if (currentState == STATE_PROVISIONING_AP) {
    if (millis() - lastLedToggle >= 500) {
      lastLedToggle = millis();
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState);
    }
  } else if (currentState == STATE_WIFI_CONNECTING) {
    if (millis() - lastLedToggle >= 150) {
      lastLedToggle = millis();
      ledState = !ledState;
      digitalWrite(STATUS_LED_PIN, ledState);
    }

    if (WiFi.status() == WL_CONNECTED) {
      currentState = STATE_CONNECTED_ONLINE;
      digitalWrite(STATUS_LED_PIN, HIGH);
      Serial.print(F("✅ [WiFi] Connected! IP: ")); Serial.println(WiFi.localIP());

      sendBleStatusNotification("CONNECTED", WiFi.localIP().toString());
      sendDirectHttpHeartbeat();
      broadcastWsStatus();

      mqttClient.setServer(BACKEND_GATEWAY_HOST, MQTT_PORT);
      mqttClient.setCallback(mqttCallback);
    } else if (millis() - wifiConnectStartTime >= WIFI_CONNECT_TIMEOUT_MS) {
      currentState = STATE_PROVISIONING_AP;
      Serial.println(F("❌ [WiFi] Connection timed out."));
      sendBleStatusNotification("FAILED_TIMEOUT", WiFi.softAPIP().toString());
      broadcastWsStatus();
    }
  }

  // When Online: Handle MQTT, Telemetry & WebSockets
  if (currentState == STATE_CONNECTED_ONLINE) {
    digitalWrite(STATUS_LED_PIN, HIGH);

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
      digitalWrite(RELAY_PUMP_PIN, LOW);
      Serial.println(F("⏱️ [RELAY] Pump Timer Expired"));
      broadcastWsStatus();
    }

    if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
      lastTelemetryTime = millis();
      broadcastWsStatus();

      int rawSoil = analogRead(SOIL_MOISTURE_PIN);
      float soilPercent = constrain(map(rawSoil, 3200, 1200, 0, 100), 0.0, 100.0);
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
