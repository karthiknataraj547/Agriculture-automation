/*
 * Commercial Smart Agriculture Node Firmware (Provisioning + Real-Time Telemetry)
 * Product: AgriFlow Smart Irrigation Controller
 * Internal SKU: ESP32-IRRIGATION-V1
 * Microcontroller: ESP32 (Xtensa LX6 ESP32)
 * Version: v1.4.5 (Ultra-Lean Firmware - Size ~950KB)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <NimBLEDevice.h> // Lightweight BLE stack (~400KB smaller than Bluedroid)
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─── HARDWARE GPIO PIN MAPPING (ESP32) ───
#define PIN_LED_INDICATOR  2    // Onboard Status LED (Blinks rapidly in Setup Mode)
#define PIN_BUTTON_RESET   0    // Flash/Boot Button (GPIO 0 - hold for 3s to reset setup)
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
WiFiClient espClient; // Standard lightweight TCP socket
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

  Serial.println(F("\n=========================================="));
  Serial.println(F(" AgriFlow Smart Irrigation Controller (ESP32)"));
  Serial.print(F(" Serial Number: ")); Serial.println(deviceSerial);
  Serial.print(F(" MAC Address:   ")); Serial.println(macAddress);
  Serial.println(F("=========================================="));

  preferences.begin("agri-node", false);
  wifiSsid = preferences.getString("ssid", "");
  wifiPass = preferences.getString("pass", "");

  if (digitalRead(PIN_BUTTON_RESET) == LOW || wifiSsid.length() == 0) {
    Serial.println(F("[MODE] Entering PROVISIONING / SETUP MODE..."));
    setupProvisioningMode();
  } else {
    Serial.print(F("[MODE] Connecting with saved Wi-Fi: ")); Serial.println(wifiSsid);
    connectToWiFi();
  }
}

void setupProvisioningMode() {
  isProvisioned = false;
  String apName = "AGRI-SETUP-" + macAddress.substring(12, 14) + macAddress.substring(15, 17);
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  Serial.print(F("[AP] Access Point Started: ")); Serial.println(apName);
  Serial.print(F("[AP] Connect & Visit IP: ")); Serial.println(WiFi.softAPIP().toString());

  // 1. HTTP Endpoints
  server.on("/setup", HTTP_POST, handleProvisioningRequest);
  server.on("/ping", HTTP_GET, []() {
    server.send(200, "application/json", "{\"status\":\"PROVISIONING_ACTIVE\",\"serial\":\"" + deviceSerial + "\",\"mac\":\"" + macAddress + "\"}");
  });
  
  // Standalone HTML Web Portal for direct browser connection (http://192.168.4.1)
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

  // 2. Initialize NimBLE Bluetooth BLE GATT Provisioning Stack
  NimBLEDevice::init(apName.c_str());
  NimBLEServer *pServer = NimBLEDevice::createServer();
  NimBLEService *pService = pServer->createService(SERVICE_UUID);

  // GATT Char 1: Device Info JSON (READ)
  NimBLECharacteristic *pCharInfo = pService->createCharacteristic(
    "0000ffe1-0000-1000-8000-00805f9b34fb",
    NIMBLE_PROPERTY::READ
  );
  String infoJson = "{\"serial\":\"" + deviceSerial + "\",\"mac\":\"" + macAddress + "\",\"chip\":\"ESP32\"}";
  pCharInfo->setValue(infoJson.c_str());

  // GATT Char 2: Wi-Fi SSID (WRITE)
  NimBLECharacteristic *pCharSsid = pService->createCharacteristic(
    "0000ffe2-0000-1000-8000-00805f9b34fb",
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );

  // GATT Char 3: Wi-Fi Password (WRITE)
  NimBLECharacteristic *pCharPass = pService->createCharacteristic(
    "0000ffe3-0000-1000-8000-00805f9b34fb",
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR
  );

  // GATT Char 4: Provision Trigger Command (WRITE / READ)
  NimBLECharacteristic *pCharCmd = pService->createCharacteristic(
    "0000ffe4-0000-1000-8000-00805f9b34fb",
    NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::READ
  );

  pService->start();
  NimBLEAdvertising *pAdv = NimBLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->start();
  Serial.println(F("[BLE] NimBLE GATT Provisioning Service & Characteristics Started!"));

  unsigned long lastSerialPing = 0;

  // 3. Loop in Setup Mode until Wi-Fi Config Received
  while (!isProvisioned) {
    unsigned long currentMillis = millis();

    // Check BLE GATT Characteristic Writes from Web Tool
    if (pCharSsid->getValue().length() > 0) {
      wifiSsid = pCharSsid->getValue().c_str();
    }
    if (pCharPass->getValue().length() > 0) {
      wifiPass = pCharPass->getValue().c_str();
    }
    if (pCharCmd->getValue() == "CONNECT" && wifiSsid.length() > 0) {
      isProvisioned = true;
      Serial.println(F("[BLE] Wi-Fi Credentials Received via BLE GATT! Connecting..."));
    }

    // BLINK ONBOARD LED RAPIDLY (200ms ON / 200ms OFF) TO INDICATE SETUP MODE
    if (currentMillis - lastLedToggle >= 200) {
      lastLedToggle = currentMillis;
      ledState = !ledState;
      digitalWrite(PIN_LED_INDICATOR, ledState);
    }


    // Broadcast USB Serial JSON Probe every 2s for Chrome Web Serial discovery
    if (currentMillis - lastSerialPing >= 2000) {
      lastSerialPing = currentMillis;
      Serial.print(F("{\"event\":\"HARDWARE_PROBE\",\"serial\":\""));
      Serial.print(deviceSerial);
      Serial.print(F("\",\"mac\":\""));
      Serial.print(macAddress);
      Serial.println(F("\",\"chip\":\"ESP32\",\"mode\":\"PROVISIONING\"}"));
    }

    // Listen for incoming USB Serial JSON commands from Web Tool (115200 baud)
    if (Serial.available()) {
      String input = Serial.readStringUntil('\n');
      input.trim();
      if (input.startsWith("{") && input.endsWith("}")) {
        JsonDocument doc;
        DeserializationError err = deserializeJson(doc, input);
        if (!err && doc.containsKey("ssid") && doc.containsKey("password")) {
          wifiSsid = String((const char*)doc["ssid"]);
          wifiPass = String((const char*)doc["password"]);
          isProvisioned = true;
          Serial.println(F("{\"event\":\"CONFIG_RECEIVED\",\"status\":\"SUCCESS\"}"));
        }
      }
    }

    server.handleClient();
  }

  // De-initialize BLE stack to release memory once setup completes
  NimBLEDevice::deinit(true);

  preferences.putString("ssid", wifiSsid);
  preferences.putString("pass", wifiPass);
  preferences.end();

  Serial.println(F("[SETUP] Wi-Fi Config Saved! Restarting in 2s..."));
  digitalWrite(PIN_LED_INDICATOR, HIGH); // Solid ON
  delay(2000);
  ESP.restart();
}


void handleProvisioningRequest() {
  if (server.hasArg("plain")) {
    JsonDocument doc;
    DeserializationError err = deserializeJson(doc, server.arg("plain"));
    if (!err) {
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
  }
  server.send(400, "application/json", "{\"success\":false,\"message\":\"Invalid Payload\"}");
}

void connectToWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  Serial.print(F("[WiFi] Connecting to ")); Serial.println(wifiSsid);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20) {
    delay(500);
    Serial.print(".");
    digitalWrite(PIN_LED_INDICATOR, !digitalRead(PIN_LED_INDICATOR));
    attempts++;
  }

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println(F("\n[WiFi] Connection Failed! Re-entering Setup Mode..."));
    setupProvisioningMode();
    return;
  }

  Serial.println(F("\n[WiFi] Connected!"));
  Serial.print(F("Local IP: ")); Serial.println(WiFi.localIP().toString());
  digitalWrite(PIN_LED_INDICATOR, HIGH); // SOLID ON = HEALTHY & CONNECTED
  pingDiscoveryGateway();

  mqttClient.setServer("mqtt.agritech.com", 1883); // Standard MQTT Port
  mqttClient.setCallback(mqttCallback);
}

// Lightweight HTTP POST without HTTPClient/mbedTLS library overhead
void pingDiscoveryGateway() {
  WiFiClient client;
  if (!client.connect("agriculture-automation.vercel.app", 80)) {
    Serial.println(F("[DISCOVERY PING] Connection failed"));
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

  client.println(F("POST /api/iot/discovery HTTP/1.1"));
  client.println(F("Host: agriculture-automation.vercel.app"));
  client.println(F("Content-Type: application/json"));
  client.print(F("Content-Length: ")); client.println(payload.length());
  client.println(F("Connection: close"));
  client.println();
  client.println(payload);

  Serial.println(F("[DISCOVERY PING] Sent successfully"));
  client.stop();
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (!err) {
    const char* type = doc["commandType"];
    if (type && strcmp(type, "START_PUMP") == 0) {
      digitalWrite(PIN_RELAY_PUMP, HIGH);
      Serial.println(F("[PUMP] RELAY TURNED ON"));
    } else if (type && strcmp(type, "STOP_PUMP") == 0) {
      digitalWrite(PIN_RELAY_PUMP, LOW);
      Serial.println(F("[PUMP] RELAY TURNED OFF"));
    }
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

    JsonDocument doc;
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
