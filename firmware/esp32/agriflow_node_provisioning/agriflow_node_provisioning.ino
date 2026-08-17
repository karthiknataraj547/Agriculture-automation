/*
 * Commercial Smart Agriculture Node Firmware (Provisioning + Real-Time Telemetry)
 * Product: AgriFlow Smart Irrigation Controller
 * Internal SKU: ESP32-IRRIGATION-V1
 * Microcontroller: ESP32 (Xtensa LX6 ESP32)
 * Version: v1.4.2
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
#define PIN_BUTTON_RESET   0    // Flash/Boot Button (GPIO 0 - hold for 3s to reset setup)
#define PIN_SOIL_MOISTURE  34  // Analog Soil Moisture Probe
#define PIN_DHT_DATA       4   // Digital Air Temp & Humidity
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
  deviceSerial = "AGRI-ESP32-" + macAddress.substring(12, 14) + macAddress.substring(15, 17);
  deviceSerial.toUpperCase();

  Serial.println("\n==========================================");
  Serial.println(" AgriFlow Smart Irrigation Controller (ESP32)");
  Serial.println(" Serial Number: " + deviceSerial);
  Serial.println(" MAC Address:   " + macAddress);
  Serial.println("==========================================");

  preferences.begin("agri-node", false);
  wifiSsid = preferences.getString("ssid", "");
  wifiPass = preferences.getString("pass", "");

  if (digitalRead(PIN_BUTTON_RESET) == LOW || wifiSsid.length() == 0) {
    Serial.println("[MODE] Entering PROVISIONING / SETUP MODE...");
    setupProvisioningMode();
  } else {
    Serial.println("[MODE] Connecting with saved Wi-Fi: " + wifiSsid);
    connectToWiFi();
  }
}

void setupProvisioningMode() {
  isProvisioned = false;
  String apName = "AGRI-SETUP-" + macAddress.substring(12, 14) + macAddress.substring(15, 17);
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  Serial.println("[AP] Access Point Started: " + apName);
  Serial.println("[AP] Connect & Visit IP: " + WiFi.softAPIP().toString());

  server.on("/setup", HTTP_POST, handleProvisioningRequest);
  server.on("/ping", HTTP_GET, []() {
    server.send(200, "application/json", "{\"status\":\"PROVISIONING_ACTIVE\",\"serial\":\"" + deviceSerial + "\"}");
  });
  server.begin();

  NimBLEDevice::init(apName.c_str());
  NimBLEServer *pServer = NimBLEDevice::createServer();
  NimBLEService *pService = pServer->createService(SERVICE_UUID);
  pService->start();
  NimBLEAdvertising *pAdv = NimBLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->start();
  Serial.println("[BLE] NimBLE Bluetooth Advertising Started!");

  // Loop in Setup Mode until Wi-Fi Config Received
  while (!isProvisioned) {
    // BLINK ONBOARD LED RAPIDLY (200ms ON / 200ms OFF) TO INDICATE SETUP MODE
    unsigned long currentMillis = millis();
    if (currentMillis - lastLedToggle >= 200) {
      lastLedToggle = currentMillis;
      ledState = !ledState;
      digitalWrite(PIN_LED_INDICATOR, ledState);
    }

    server.handleClient();
  }

  NimBLEDevice::deinit(true);
  preferences.putString("ssid", wifiSsid);
  preferences.putString("pass", wifiPass);
  preferences.end();

  Serial.println("[SETUP] Wi-Fi Config Saved! Restarting in 2s...");
  digitalWrite(PIN_LED_INDICATOR, HIGH); // Solid ON
  delay(2000);
  ESP.restart();
}

void handleProvisioningRequest() {
  if (server.hasArg("plain")) {
    StaticJsonDocument<256> doc;
    deserializeJson(doc, server.arg("plain"));
    const char* reqSsid = doc["ssid"];
    const char* reqPass = doc["password"];
    if (reqSsid && reqPass) {
      wifiSsid = String(reqSsid);
      wifiPass = String(reqPass);
      isProvisioned = true;
      server.send(200, "application/json", "{\"success\":true,\"message\":\"Wi-Fi Config Received! Connecting...\"}");
      return;
    }
  }
  server.send(400, "application/json", "{\"success\":false,\"message\":\"Invalid Payload\"}");
}

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  Serial.print("[WiFi] Connecting to " + wifiSsid);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_LED_INDICATOR, !digitalRead(PIN_LED_INDICATOR));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[WiFi] Connected! Local IP: " + WiFi.localIP().toString());
    digitalWrite(PIN_LED_INDICATOR, HIGH); // SOLID ON = HEALTHY & CONNECTED
    pingDiscoveryGateway();

    mqttClient.setServer("mqtt.agritech.com", 1883);
    mqttClient.setCallback(mqttCallback);

  } else {
    Serial.println("\n[WiFi] Connection Failed! Re-entering Setup Mode...");
    setupProvisioningMode();
  }
}

void pingDiscoveryGateway() {
  WiFiClient client;
  if (!client.connect("agriculture-automation.vercel.app", 80)) {
    Serial.println("[DISCOVERY PING] Connection failed");
    return;
  }

  JsonDocument doc;
  doc["macAddress"] = macAddress;
  doc["serialNumber"] = deviceSerial;
  doc["boardFamily"] = "ESP32";
  doc["boardType"] = "ESP32 Dev Module";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();

  String payload;
  serializeJson(doc, payload);

  client.println("POST /api/iot/discovery HTTP/1.1");
  client.println("Host: agriculture-automation.vercel.app");
  client.println("Content-Type: application/json");
  client.print("Content-Length: "); client.println(payload.length());
  client.println("Connection: close");
  client.println();
  client.println(payload);

  Serial.println("[DISCOVERY PING] Sent successfully");
  client.stop();
}


void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.println("[MQTT Command]: " + msg);

  StaticJsonDocument<256> doc;
  deserializeJson(doc, msg);
  const char* type = doc["commandType"];

  if (String(type) == "START_PUMP") {
    digitalWrite(PIN_RELAY_PUMP, HIGH);
    Serial.println("[PUMP] RELAY TURNED ON");
  } else if (String(type) == "STOP_PUMP") {
    digitalWrite(PIN_RELAY_PUMP, LOW);
    Serial.println("[PUMP] RELAY TURNED OFF");
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
      mqttClient.subscribe("agri/farm-alpha/zone-1/commands");
    }
  }
  mqttClient.loop();

  static unsigned long lastTelemetry = 0;
  if (millis() - lastTelemetry >= 5000) {
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

    char buffer[384];
    serializeJson(doc, buffer);
    mqttClient.publish("agri/farm-alpha/zone-1/telemetry", buffer);
  }
}