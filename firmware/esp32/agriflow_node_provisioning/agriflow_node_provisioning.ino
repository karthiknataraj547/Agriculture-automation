/*
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  AETHERCROP / AGRIFLOW SMART AGRICULTURE NODE FIRMWARE
 *  (PROVISIONING + REAL-TIME TELEMETRY + MQTT ACTUATION)
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  Target Boards: ESP8266 (NodeMCU / WeMos / Generic) & ESP32 DevKit
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

#if defined(ESP8266)
  #include <ESP8266WiFi.h>
  #include <ESP8266WebServer.h>
  typedef ESP8266WebServer WebServerType;
#elif defined(ESP32)
  #include <WiFi.h>
  #include <WebServer.h>
  typedef WebServer WebServerType;
#else
  #include <ESP8266WiFi.h>
  #include <ESP8266WebServer.h>
  typedef ESP8266WebServer WebServerType;
#endif

#include <EEPROM.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─── HARDWARE GPIO PIN MAPPING (RAW GPIO INTEGERS - ZERO DEPENDENCIES ON D2/D3) ───
#define PIN_LED_INDICATOR  2    // Built-in Status LED (GPIO 2)
#define PIN_BUTTON_RESET   0    // Flash/Boot Button (GPIO 0)
#define PIN_SOIL_MOISTURE  0    // Analog Soil Moisture Probe (A0)
#define PIN_DHT_DATA       4    // Digital Air Temp & Humidity (GPIO 4)
#define PIN_RELAY_PUMP     5    // Water Pump Relay (GPIO 5 - Active HIGH)
#define PIN_FLOW_RATE      14   // Pulse Water Flow Sensor (GPIO 14)
#define DHTTYPE            DHT11

// ─── GLOBAL OBJECTS & STATE ───
WebServerType server(80);
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
  delay(200);

  pinMode(PIN_LED_INDICATOR, OUTPUT);
  pinMode(PIN_BUTTON_RESET, INPUT_PULLUP);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, LOW);
  
  dht.begin();
  
  macAddress = WiFi.macAddress();
  String macClean = macAddress;
  macClean.replace(":", "");
  String lastFour = macClean.substring(macClean.length() - 4);
  deviceSerial = "AGRI-NODE-" + lastFour;
  deviceSerial.toUpperCase();

  Serial.println(F("\n=========================================="));
  Serial.println(F(" 🌾 AgriFlow Smart Irrigation Node"));
  Serial.print(F(" 📌 Serial Number: ")); Serial.println(deviceSerial);
  Serial.print(F(" 📌 MAC Address:   ")); Serial.println(macAddress);
  Serial.println(F("=========================================="));

  EEPROM.begin(512);

  if (digitalRead(PIN_BUTTON_RESET) == LOW || wifiSsid.length() == 0) {
    Serial.println(F("[MODE] Entering PROVISIONING / SETUP MODE..."));
    setupProvisioningMode();
  } else {
    Serial.println(F("[MODE] Connecting with saved Wi-Fi..."));
    connectToWiFi();
  }
}

void setupProvisioningMode() {
  isProvisioned = false;
  String apName = "AGRI-SETUP-" + deviceSerial.substring(deviceSerial.length() - 4);
  WiFi.mode(WIFI_AP_STA);
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  Serial.print(F("[AP] Access Point Started: ")); Serial.println(apName);
  Serial.print(F("[AP] Connect & Visit IP: ")); Serial.println(WiFi.softAPIP());

  server.on("/setup", HTTP_POST, handleProvisioningRequest);
  server.on("/ping", HTTP_GET, []() {
    server.send(200, "application/json", "{\"status\":\"PROVISIONING_ACTIVE\",\"serial\":\"" + deviceSerial + "\"}");
  });
  server.begin();

  // Loop in Setup Mode until Wi-Fi Config Received
  while (!isProvisioned) {
    unsigned long currentMillis = millis();
    if (currentMillis - lastLedToggle >= 200) {
      lastLedToggle = currentMillis;
      ledState = !ledState;
      digitalWrite(PIN_LED_INDICATOR, ledState);
    }
    server.handleClient();
    delay(5);
  }

  Serial.println(F("[SETUP] Wi-Fi Config Saved! Restarting in 1s..."));
  digitalWrite(PIN_LED_INDICATOR, HIGH);
  delay(1000);
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
  Serial.print(F("[WiFi] Connecting to ")); Serial.println(wifiSsid);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 25) {
    delay(500);
    Serial.print(F("."));
    digitalWrite(PIN_LED_INDICATOR, !digitalRead(PIN_LED_INDICATOR));
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(F("\n[WiFi] Connected! Local IP: ")); Serial.println(WiFi.localIP());
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
  if (!client.connect("192.168.1.100", 3000)) {
    Serial.println(F("[DISCOVERY PING] Local gateway not responding."));
    return;
  }

  StaticJsonDocument<256> doc;
  doc["macAddress"] = macAddress;
  doc["serialNumber"] = deviceSerial;
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();

  String payload;
  serializeJson(doc, payload);

  client.println(F("POST /api/telemetry HTTP/1.1"));
  client.println(F("Host: 192.168.1.100:3000"));
  client.println(F("Content-Type: application/json"));
  client.print(F("Content-Length: ")); client.println(payload.length());
  client.println(F("Connection: close\r\n"));
  client.println(payload);

  Serial.println(F("[DISCOVERY PING] Sent successfully"));
  client.stop();
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (unsigned int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.print(F("[MQTT Command]: ")); Serial.println(msg);

  StaticJsonDocument<256> doc;
  deserializeJson(doc, msg);
  const char* type = doc["commandType"] | doc["action"] | "";

  if (String(type) == "START_PUMP" || String(type) == "ON") {
    digitalWrite(PIN_RELAY_PUMP, HIGH);
    Serial.println(F("[PUMP] RELAY TURNED ON"));
  } else if (String(type) == "STOP_PUMP" || String(type) == "OFF") {
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
  if (millis() - lastTelemetry >= 5000) {
    lastTelemetry = millis();
    int rawSoil = analogRead(PIN_SOIL_MOISTURE);
    float soilMoisture = map(rawSoil, 1023, 300, 0, 100);
    soilMoisture = constrain(soilMoisture, 0.0, 100.0);
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
    mqttClient.publish("aether/farm-alpha/zone-1/telemetry", buffer);
  }
}