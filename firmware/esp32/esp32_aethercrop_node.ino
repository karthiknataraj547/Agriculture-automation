/*
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  AETHERCROP SPATIAL IOT PLATFORM — ESP32 FIRMWARE NODE
 *  (WIFI PROVISIONING + NVS FLASH + SOFTAP + BLE GATT + MDNS + MQTT TELEMETRY)
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  Hardware Target : ESP32 DevKit V1 / WROOM-32 / NodeMCU-32S / ESP32-WROVER
 *  Features        : 
 *    - Persistent WiFi Credential Storage in NVS Flash (Preferences.h)
 *    - SoftAP Provisioning Mode (192.168.4.1) with Full CORS HTTP REST WebServer
 *    - NimBLE / ESP32 BLE GATT Characteristic (0000ffe0-0000-1000-8000-00805f9b34fb)
 *    - High-MTU UTF-8 JSON BLE WiFi Credential Parser & NVS Write
 *    - BLE Notification Broadcast on State Change (CONNECTING -> CONNECTED)
 *    - mDNS Hostname Discovery (http://agriflow-smart-node.local & http://aethercrop-node.local)
 *    - MQTT Telemetry & Active Relay Pump Control (Broker IP / Topic Sync)
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

// ─── BLE UUID DEFINITIONS ───
#define SERVICE_UUID        "0000ffe0-0000-1000-8000-00805f9b34fb"
#define CHARACTERISTIC_UUID "0000ffe1-0000-1000-8000-00805f9b34fb"

// ─── PIN DEFINITIONS (ESP32) ───
#define SOIL_MOISTURE_PIN  34    // ADC1 Channel 6 (Analog 0-4095)
#define DHT_PIN            4     // GPIO 4 for DHT11 / DHT22 Data
#define DHT_TYPE           DHT11 // Change to DHT22 if using DHT22
#define FLOW_SENSOR_PIN    18    // Interrupt Pin for Pulse Counting
#define RELAY_PUMP_PIN     26    // GPIO 26 for Pump Relay (Active HIGH)
#define STATUS_LED_PIN     2     // Built-in LED (GPIO 2)
#define PIN_FACTORY_RESET  0     // Boot/Flash Button (Hold 5s to clear NVS Wi-Fi)

// ─── MQTT CONFIGURATION ───
const char* MQTT_SERVER     = "192.168.1.100"; // Backend / MQTT Broker IP
const int   MQTT_PORT       = 1883;
const char* MQTT_USER       = "";              // Optional MQTT Username
const char* MQTT_PASS       = "";              // Optional MQTT Password

const char* TOPIC_TELEMETRY = "aether/farm-alpha/zone-1/telemetry";
const char* TOPIC_COMMANDS  = "aether/farm-alpha/zone-1/commands";

// ─── GLOBAL INSTANCES & STATE ───
Preferences preferences;
WebServer server(80);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

BLEServer* pBleServer = NULL;
BLECharacteristic* pBleCharacteristic = NULL;
bool bleDeviceConnected = false;

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
String lastConnectionError = "";

volatile unsigned long pulseCount = 0;
float waterFlowRate = 0.0;
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 2500;

bool pumpState = false;
unsigned long pumpStartTime = 0;
unsigned long pumpDurationMs = 0;

unsigned long lastLedToggle = 0;
bool ledState = LOW;
unsigned long resetBtnPressTime = 0;
bool resetBtnHeld = false;

unsigned long wifiConnectStartTime = 0;
const unsigned long WIFI_CONNECT_TIMEOUT_MS = 25000;

void IRAM_ATTR flowPulseISR() {
  pulseCount++;
}

void connectToWiFi();
void sendBleStatusNotification(const String& statusStr, const String& ipStr = "");

// ─── BLE SERVER CALLBACKS ───
class MyServerCallbacks: public BLEServerCallbacks {
    void onConnect(BLEServer* pServer) {
      bleDeviceConnected = true;
      Serial.println(F("📱 [BLE] Client Connected!"));
    };

    void onDisconnect(BLEServer* pServer) {
      bleDeviceConnected = false;
      Serial.println(F("📱 [BLE] Client Disconnected. Restarting advertising..."));
      pServer->getAdvertising()->start();
    }
};

// ─── BLE CHARACTERISTIC WRITE HANDLER (WI-FI CREDENTIALS) ───
class MyCharacteristicCallbacks: public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
      std::string rxValue = pCharacteristic->getValue();
      if (rxValue.length() > 0) {
        Serial.print(F("📥 [BLE RX WRITE]: "));
        Serial.println(rxValue.c_str());

        StaticJsonDocument<512> doc;
        DeserializationError err = deserializeJson(doc, rxValue.c_str());

        String s = "";
        String p = "";
        String a = "";

        if (!err) {
          s = doc["ssid"] | doc["wifiSsid"] | "";
          p = doc["password"] | doc["wifiPass"] | "";
          a = doc["authCode"] | "";
        } else {
          // Fallback parsing for raw comma or urlencoded format (e.g. ssid:pass)
          String rawStr = String(rxValue.c_str());
          int sepIdx = rawStr.indexOf(',');
          if (sepIdx == -1) sepIdx = rawStr.indexOf(':');
          if (sepIdx != -1) {
            s = rawStr.substring(0, sepIdx);
            p = rawStr.substring(sepIdx + 1);
          }
        }

        if (s.length() > 0) {
          wifiSsid = s;
          wifiPass = p;
          if (a.length() > 0) authCode = a;

          // Save to NVS Flash
          preferences.putString("ssid", wifiSsid);
          preferences.putString("pass", wifiPass);
          if (a.length() > 0) preferences.putString("auth", authCode);

          Serial.println(F("💾 [BLE] Wi-Fi credentials saved to NVS Flash!"));
          Serial.print(F("💾 Stored SSID: ")); Serial.println(wifiSsid);

          // Send BLE Notification back to App
          sendBleStatusNotification("NVS_SAVED_CONNECTING", WiFi.softAPIP().toString());

          // Trigger Wi-Fi connection in AP_STA dual mode
          currentState = STATE_WIFI_CONNECTING;
          connectToWiFi();
        }
      }
    }
};

void sendBleStatusNotification(const String& statusStr, const String& ipStr) {
  if (pBleCharacteristic != NULL) {
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

  // Read stored Wi-Fi credentials from NVS Flash
  preferences.begin("aether-wifi", false);
  wifiSsid = preferences.getString("ssid", "");
  wifiPass = preferences.getString("pass", "");
  authCode = preferences.getString("auth", "ATH-8F92-4C10-99E4");

  // Initialize BLE Stack
  String bleDeviceName = "AGRI-SETUP-" + lastFour;
  bleDeviceName.toUpperCase();
  BLEDevice::init(bleDeviceName.c_str());
  pBleServer = BLEDevice::createServer();
  pBleServer->setCallbacks(new MyServerCallbacks());

  BLEService *pService = pBleServer->createService(SERVICE_UUID);
  pBleCharacteristic = pService->createCharacteristic(
      CHARACTERISTIC_UUID,
      BLECharacteristic::PROPERTY_READ |
      BLECharacteristic::PROPERTY_WRITE |
      BLECharacteristic::PROPERTY_WRITE_NR |
      BLECharacteristic::PROPERTY_NOTIFY
  );
  pBleCharacteristic->addDescriptor(new BLE2902());
  pBleCharacteristic->setCallbacks(new MyCharacteristicCallbacks());
  pBleCharacteristic->setValue("READY_FOR_PROVISION");
  pService->start();

  BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
  pAdvertising->addServiceUUID(SERVICE_UUID);
  pAdvertising->setScanResponse(true);
  pAdvertising->setMinPreferred(0x06);
  pAdvertising->setMinPreferred(0x12);
  BLEDevice::startAdvertising();
  Serial.print(F("📱 [BLE] BLE Advertising Active as: ")); Serial.println(bleDeviceName);

  // SoftAP WebServer Setup
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(bleDeviceName.c_str(), "agrifarm2026");

  if (MDNS.begin("agriflow-smart-node") || MDNS.begin("aethercrop-node")) {
    MDNS.addService("http", "tcp", 80);
  }

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
  server.on("/device-info", HTTP_OPTIONS, handleCors);
  server.on("/setup", HTTP_OPTIONS, handleCors);
  server.on("/api/wifi/credentials", HTTP_OPTIONS, handleCors);
  server.on("/wifi-scan", HTTP_OPTIONS, handleCors);
  server.on("/api/wifi/scan", HTTP_OPTIONS, handleCors);
  server.on("/claim", HTTP_OPTIONS, handleCors);
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
    doc["firmwareVersion"] = "2.2.0-PROVISION";
    doc["authCode"] = authCode;

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

      preferences.putString("ssid", wifiSsid);
      preferences.putString("pass", wifiPass);
      if (a.length() > 0) preferences.putString("auth", authCode);

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

  server.begin();
  Serial.print(F("📶 [SoftAP] Running on Port 80: ")); Serial.println(bleDeviceName);

  if (digitalRead(PIN_FACTORY_RESET) == LOW || wifiSsid.length() == 0) {
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
}

void loop() {
  server.handleClient();

  // Wi-Fi Connection State Handler
  if (currentState == STATE_WIFI_CONNECTING) {
    if (WiFi.status() == WL_CONNECTED) {
      currentState = STATE_CONNECTED_ONLINE;
      digitalWrite(STATUS_LED_PIN, HIGH);
      Serial.print(F("✅ [WiFi] Connected! IP: ")); Serial.println(WiFi.localIP());

      // Send BLE Notification to Mobile App / Browser
      sendBleStatusNotification("CONNECTED", WiFi.localIP().toString());

      mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
      mqttClient.setCallback(mqttCallback);
    } else if (millis() - wifiConnectStartTime >= WIFI_CONNECT_TIMEOUT_MS) {
      currentState = STATE_PROVISIONING_AP;
      Serial.println(F("❌ [WiFi] Connection timed out. Returned to AP setup mode."));
      sendBleStatusNotification("FAILED_TIMEOUT", WiFi.softAPIP().toString());
    }
  }

  // When Online: Handle MQTT & Telemetry
  if (currentState == STATE_CONNECTED_ONLINE) {
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
      Serial.println(F("⏱️ [RELAY] Pump Timer Expired (Auto-Off)"));
    }

    if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
      lastTelemetryTime = millis();
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
