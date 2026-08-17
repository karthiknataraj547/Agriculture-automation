/*
 * Commercial Smart Agriculture Node Firmware (Provisioning + Real-Time Telemetry)
 * Product: AgriFlow Smart Irrigation Controller
 * Internal SKU: ESP32-IRRIGATION-V1
 * Microcontroller: ESP32 (Xtensa LX6 ESP32)
 * Version: v2.0.0 (Master Provisioning & NVS Read/Write)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <NimBLEDevice.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─── HARDWARE GPIO PIN MAPPING (ESP32) ───
#define PIN_LED_INDICATOR  2    // Onboard Status LED (Blinks rapidly in Setup Mode)
#define PIN_BUTTON_RESET   0    // Flash/Boot Button (GPIO 0 - hold for 5s to reset setup)
#define PIN_SOIL_MOISTURE  34   // Analog Soil Moisture Probe
#define PIN_DHT_DATA       4    // Digital Air Temp & Humidity
#define PIN_RELAY_PUMP     26   // Water Pump Relay (Active HIGH)
#define PIN_FLOW_RATE      27   // Pulse Water Flow Sensor
#define DHTTYPE            DHT11

#define SERVICE_UUID        "0000ffe0-0000-1000-8000-00805f9b34fb"
#define CHARACTERISTIC_UUID "0000ffe1-0000-1000-8000-00805f9b34fb"

// ─── GLOBAL OBJECTS & STATE ───
Preferences preferences;
WebServer server(80);
WiFiClient espClient;
PubSubClient mqttClient(espClient);

DHT dht(PIN_DHT_DATA, DHTTYPE);

String wifiSsid = "";
String wifiPass = "";
String deviceSerial = "";
String macAddress = "";
bool isProvisioned = false;

unsigned long lastLedToggle = 0;
bool ledState = LOW;

void setupProvisioningMode();
void handleProvisioningRequest();
void handleStatusRequest();
void handleWifiScan();
void connectToWiFi();
void pingDiscoveryGateway();
void mqttCallback(char* topic, byte* payload, unsigned int length);

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_INDICATOR, OUTPUT);
  pinMode(PIN_BUTTON_RESET, INPUT_PULLUP);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, LOW);
  
  dht.begin();
  
  macAddress = WiFi.macAddress();
  String macClean = macAddress;
  macClean.replace(":", "");
  String lastFour = macClean.substring(macClean.length() - 4);
  deviceSerial = "AGRI-ESP32-" + lastFour;
  deviceSerial.toUpperCase();

  Serial.println(F("\n=========================================="));
  Serial.println(F(" AgriFlow Smart Irrigation Controller (ESP32)"));
  Serial.print(F(" Serial Number: ")); Serial.println(deviceSerial);
  Serial.print(F(" MAC Address:   ")); Serial.println(macAddress);
  Serial.println(F("=========================================="));

  // 1. Read WiFi credentials from NVS flash memory
  preferences.begin("agri-node", false);
  wifiSsid = preferences.getString("ssid", "");
  wifiPass = preferences.getString("pass", "");

  Serial.print(F("📖 NVS Stored SSID: "));
  if (wifiSsid.length() > 0) {
    Serial.println(wifiSsid);
  } else {
    Serial.println(F("[NONE] - Starting Provisioning AP"));
  }

  // 2. Determine boot mode
  if (digitalRead(PIN_BUTTON_RESET) == LOW || wifiSsid.length() == 0) {
    Serial.println(F("[MODE] Entering PROVISIONING / SETUP MODE..."));
    setupProvisioningMode();
  } else {
    Serial.println(F("[MODE] Connecting with saved NVS Wi-Fi: ") + wifiSsid);
    connectToWiFi();
  }
}

void setupProvisioningMode() {
  isProvisioned = false;
  String macClean = macAddress;
  macClean.replace(":", "");
  String lastFour = macClean.substring(macClean.length() - 4);
  String apName = "AGRI-SETUP-" + lastFour;
  apName.toUpperCase();
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  Serial.print(F("[AP] Access Point Started: ")); Serial.println(apName);
  Serial.print(F("[AP] Provisioning IP:      http://")); Serial.println(WiFi.softAPIP());

  server.enableCORS(true);
  server.on("/setup", HTTP_POST, handleProvisioningRequest);
  server.on("/api/wifi/credentials", HTTP_POST, handleProvisioningRequest);
  server.on("/ping", HTTP_GET, handleStatusRequest);
  server.on("/status", HTTP_GET, handleStatusRequest);
  server.on("/api/wifi/status", HTTP_GET, handleStatusRequest);
  server.on("/wifi-scan", HTTP_GET, handleWifiScan);
  server.on("/api/wifi/scan", HTTP_GET, handleWifiScan);

  server.begin();

  NimBLEDevice::init(apName.c_str());
  NimBLEServer *pServer = NimBLEDevice::createServer();
  NimBLEService *pService = pServer->createService(SERVICE_UUID);
  pService->start();
  NimBLEAdvertising *pAdv = NimBLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->start();
  Serial.println(F("[BLE] NimBLE Bluetooth Advertising Started!"));

  // Loop in Setup Mode until Wi-Fi Config Received & saved to NVS
  while (!isProvisioned) {
    unsigned long currentMillis = millis();
    if (currentMillis - lastLedToggle >= 200) {
      lastLedToggle = currentMillis;
      ledState = !ledState;
      digitalWrite(PIN_LED_INDICATOR, ledState);
    }

    server.handleClient();
  }

  NimBLEDevice::deinit(true);
  
  // Write WiFi Credentials to NVS Flash Memory
  preferences.putString("ssid", wifiSsid);
  preferences.putString("pass", wifiPass);
  preferences.end();

  Serial.println(F("[SETUP] Wi-Fi Config Saved to NVS! Restarting in 1s..."));
  digitalWrite(PIN_LED_INDICATOR, HIGH);
  delay(1000);
  ESP.restart();
}

void handleProvisioningRequest() {
  String reqSsid = "";
  String reqPass = "";

  if (server.hasArg("plain")) {
    StaticJsonDocument<256> doc;
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
    isProvisioned = true;
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"success\":true,\"message\":\"WiFi credentials written to NVS! Reconnecting...\",\"ssid\":\"" + wifiSsid + "\"}");
    return;
  }

  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID and Password are required.\"}");
}

void handleStatusRequest() {
  StaticJsonDocument<256> doc;
  doc["status"] = "PROVISIONING_ACTIVE";
  doc["serial"] = deviceSerial;
  doc["mac"] = macAddress;
  doc["nvsStored"] = (wifiSsid.length() > 0);
  doc["ssid"] = wifiSsid;

  String res;
  serializeJson(doc, res);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", res);
}

void handleWifiScan() {
  int n = WiFi.scanNetworks();
  StaticJsonDocument<768> doc;
  JsonArray array = doc.to<JsonArray>();

  for (int i = 0; i < n; ++i) {
    JsonObject obj = array.createNestedObject();
    obj["ssid"] = WiFi.SSID(i);
    obj["rssi"] = WiFi.RSSI(i);
    obj["secure"] = (WiFi.encryptionType(i) != WIFI_AUTH_OPEN);
  }

  String res;
  serializeJson(doc, res);
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(200, "application/json", res);
}

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  Serial.print(F("[WiFi] Connecting to ") + wifiSsid);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_LED_INDICATOR, !digitalRead(PIN_LED_INDICATOR));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println(F("\n[WiFi] Connected! Local IP: ") + WiFi.localIP().toString());
    digitalWrite(PIN_LED_INDICATOR, HIGH);
    pingDiscoveryGateway();

    mqttClient.setServer("192.168.1.100", 1883);
    mqttClient.setCallback(mqttCallback);

  } else {
    Serial.println(F("\n[WiFi] Connection Failed! Re-entering Setup Mode..."));
    setupProvisioningMode();
  }
}

void pingDiscoveryGateway() {
  WiFiClient client;
  if (!client.connect("192.168.1.100", 4000)) {
    Serial.println(F("[DISCOVERY PING] Local gateway connect bypass"));
    return;
  }

  StaticJsonDocument<256> doc;
  doc["macAddress"] = macAddress;
  doc["serialNumber"] = deviceSerial;
  doc["boardFamily"] = "ESP32";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();

  String payload;
  serializeJson(doc, payload);

  client.println("POST /api/v1/devices/wifi-provision HTTP/1.1");
  client.println("Host: 192.168.1.100:4000");
  client.println("Content-Type: application/json");
  client.print("Content-Length: "); client.println(payload.length());
  client.println("Connection: close");
  client.println();
  client.println(payload);

  Serial.println(F("[DISCOVERY PING] Sent successfully"));
  client.stop();
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < (int)length; i++) msg += (char)payload[i];
  Serial.println(F("[MQTT Command]: ") + msg);

  StaticJsonDocument<256> doc;
  deserializeJson(doc, msg);
  const char* type = doc["status"] | doc["commandType"];

  if (String(type) == "RUNNING" || String(type) == "ON" || String(type) == "START_PUMP") {
    digitalWrite(PIN_RELAY_PUMP, HIGH);
    Serial.println(F("[PUMP] RELAY TURNED ON"));
  } else {
    digitalWrite(PIN_RELAY_PUMP, LOW);
    Serial.println(F("[PUMP] RELAY TURNED OFF"));
  }
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(PIN_LED_INDICATOR, LOW);
    connectToWiFi();
    return;
  }

  if (!mqttClient.connected()) {
    if (mqttClient.connect(deviceSerial.c_str())) {
      mqttClient.subscribe("aether/farm-alpha/zone-1/commands");
    }
  }
  mqttClient.loop();

  static unsigned long lastTelemetry = 0;
  if (millis() - lastTelemetry >= 4000) {
    lastTelemetry = millis();
    int rawSoil = analogRead(PIN_SOIL_MOISTURE);
    float soilMoisture = map(rawSoil, 4095, 1500, 0, 100);
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();

    StaticJsonDocument<384> doc;
    doc["deviceId"] = deviceSerial;
    doc["macAddress"] = macAddress;
    doc["soilMoisture"] = isnan(soilMoisture) ? 45.0 : soilMoisture;
    doc["airTemperature"] = isnan(temp) ? 28.4 : temp;
    doc["humidity"] = isnan(humidity) ? 65.0 : humidity;
    doc["pumpRunning"] = (digitalRead(PIN_RELAY_PUMP) == HIGH);
    doc["rssi"] = WiFi.RSSI();

    char buffer[384];
    serializeJson(doc, buffer);
    mqttClient.publish("aether/farm-alpha/zone-1/telemetry", buffer);
  }
}