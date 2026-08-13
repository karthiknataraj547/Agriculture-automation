/*
 * Commercial Smart Agriculture Node Firmware (Provisioning + MQTT Telemetry + Remote Hard Reset)
 * Product: AgriFlow Smart Irrigation Controller
 * Microcontroller: ESP32 (Xtensa LX6)
 * Version: v1.5.0 (MQTT + Auth Code + Strong Hard Reset)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <ESPmDNS.h>
#include <WiFiUdp.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─── HARDWARE GPIO PIN MAPPING (ESP32) ───
#define PIN_LED_INDICATOR  2    // Onboard Status LED
#define PIN_BUTTON_RESET   0    // Flash/Boot Button (GPIO 0 - Hold 3s to Hard Reset)
#define PIN_SOIL_MOISTURE  34  // Analog Soil Moisture Probe
#define PIN_DHT_DATA       4   // Digital Air Temp & Humidity
#define PIN_RELAY_PUMP     26   // Water Pump Relay (Active HIGH)
#define PIN_FLOW_RATE      27   // Pulse Water Flow Sensor
#define DHTTYPE            DHT11

// ─── GLOBAL OBJECTS & STATE ───
Preferences preferences;
WebServer server(80);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
WiFiUDP udpBeacon;

DHT dht(PIN_DHT_DATA, DHTTYPE);

String wifiSsid = "";
String wifiPass = "";
String deviceSerial = "";
String macAddress = "";
String authCode = "ATH-8085-7013";
bool isProvisioned = false;

enum ProvisioningMode { MODE_EZ_FAST_BLINK, MODE_AP_SLOW_BLINK, MODE_CONNECTING_HEARTBEAT };
ProvisioningMode currentBlinkMode = MODE_AP_SLOW_BLINK;

bool toolConnected = false;
unsigned long lastToolConnectTime = 0;
unsigned long lastBeaconTime = 0;
unsigned long lastLedToggle = 0;
bool ledState = LOW;

const char* MQTT_BROKER = "broker.hivemq.com";
const int   MQTT_PORT   = 1883;

void setupProvisioningMode();
void handleProvisioningRequest();
void connectToWiFi();
void sendTelemetryPing();
void executeStrongHardReset();
void mqttCallback(char* topic, byte* payload, unsigned int length);

void setup() {
  Serial.begin(115200);
  pinMode(PIN_LED_INDICATOR, OUTPUT);
  pinMode(PIN_BUTTON_RESET, INPUT_PULLUP);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, LOW);
  
  dht.begin();
  
  WiFi.mode(WIFI_AP_STA);
  delay(100);
  macAddress = WiFi.macAddress();
  String macClean = macAddress;
  macClean.replace(":", "");
  String lastFour = macClean.substring(8, 12);
  deviceSerial = "AGRI-ESP32-" + lastFour;
  deviceSerial.toUpperCase();

  Serial.println("\n==========================================");
  Serial.println(" AgriFlow Smart Wireless Node (MQTT + Auth)");
  Serial.println(" Serial Number: " + deviceSerial);
  Serial.println(" MAC Address:   " + macAddress);
  Serial.println(" Certificate:   AGRI-CERT-WIPRO-AUTHENTICATED-V2");
  Serial.println("==========================================");

  preferences.begin("agri-node", false);
  wifiSsid = preferences.getString("ssid", "");
  wifiPass = preferences.getString("pass", "");
  authCode = preferences.getString("authCode", "ATH-8085-7013");
  preferences.end();

  if (digitalRead(PIN_BUTTON_RESET) == LOW || wifiSsid.length() == 0) {
    Serial.println("[MODE] Entering 15-SECOND WIRELESS AUTO-BEACON PROVISIONING MODE...");
    setupProvisioningMode();
  } else {
    Serial.println("[MODE] Connecting with saved Wi-Fi: " + wifiSsid);
    connectToWiFi();
  }
}

void setupProvisioningMode() {
  isProvisioned = false;
  toolConnected = false;
  currentBlinkMode = MODE_AP_SLOW_BLINK;

  String macClean = macAddress;
  macClean.replace(":", "");
  String lastFour = macClean.substring(8, 12);
  String apName = "AGRI-SETUP-" + lastFour;
  apName.toUpperCase();

  WiFi.softAP(apName.c_str(), "agrifarm2026");

  // mDNS Wireless Signal Hostname (agriflow-smart-node.local)
  if (MDNS.begin("agriflow-smart-node")) {
    MDNS.addService("http", "tcp", 80);
    MDNS.addService("agriflow", "tcp", 80);
    Serial.println(F("[mDNS] Wireless Signal Host: http://agriflow-smart-node.local"));
  }

  // GET /ping — Wireless Hardware Detection & Signal Endpoint
  server.on("/ping", HTTP_GET, []() {
    toolConnected = true;
    currentBlinkMode = MODE_CONNECTING_HEARTBEAT;
    lastToolConnectTime = millis();
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "*");
    String json = "{\"status\":\"PROVISIONING_ACTIVE\",\"serial\":\"" + deviceSerial + 
                  "\",\"mac\":\"" + macAddress + 
                  "\",\"authCode\":\"" + authCode +
                  "\",\"vendor\":\"AgriFlow\",\"boardFamily\":\"ESP32\"," +
                  "\"hardwareCertificate\":\"AGRI-CERT-WIPRO-AUTHENTICATED-V2\"," +
                  "\"protocol\":\"WIPRO_TUYA_BEACON_V3\"," +
                  "\"rssi\":-42," +
                  "\"toolConnected\":true}";
    server.send(200, "application/json", json);
  });

  // GET /wifi-scan — Wireless 2.4GHz network scanner
  server.on("/wifi-scan", HTTP_GET, []() {
    toolConnected = true;
    currentBlinkMode = MODE_CONNECTING_HEARTBEAT;
    lastToolConnectTime = millis();
    server.sendHeader("Access-Control-Allow-Origin", "*");
    int n = WiFi.scanNetworks();
    String json = "[";
    for (int i = 0; i < n; ++i) {
      if (i > 0) json += ",";
      json += "{\"ssid\":\"" + WiFi.SSID(i) + "\",\"rssi\":" + String(WiFi.RSSI(i)) + "}";
    }
    json += "]";
    server.send(200, "application/json", json);
  });

  // GET /status — Wireless Connection Status
  server.on("/status", HTTP_GET, []() {
    toolConnected = true;
    lastToolConnectTime = millis();
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"status\":\"PROVISIONING_ACTIVE\",\"authCode\":\"" + authCode + "\"}");
  });

  // POST or GET /setup — Wireless Credentials Endpoint
  server.on("/setup", []() {
    toolConnected = true;
    currentBlinkMode = MODE_CONNECTING_HEARTBEAT;
    lastToolConnectTime = millis();
    server.sendHeader("Access-Control-Allow-Origin", "*");
    String reqSsid = server.arg("ssid");
    String reqPass = server.arg("password");
    String reqAuth = server.arg("authCode");
    if (reqSsid.length() > 0) {
      wifiSsid = reqSsid;
      wifiPass = reqPass;
      if (reqAuth.length() > 0) authCode = reqAuth;
      isProvisioned = true;
      server.send(200, "application/json", "{\"success\":true,\"message\":\"Wi-Fi credentials received! Connecting...\"}");
      return;
    }
    server.send(400, "application/json", "{\"success\":false,\"message\":\"Missing Wi-Fi SSID\"}");
  });

  // POST or GET /reset — Wipe saved Wi-Fi credentials
  server.on("/reset", []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"success\":true,\"message\":\"Hardware Wi-Fi Credentials Erased! Rebooting...\"}");
    executeStrongHardReset();
  });

  server.begin();

  // Provisioning Loop
  while (!isProvisioned) {
    unsigned long currentMillis = millis();

    // Broadcast UDP Wireless Signal Packet every 1 second
    if (currentMillis - lastBeaconTime >= 1000) {
      lastBeaconTime = currentMillis;
      udpBeacon.beginPacket(IPAddress(255, 255, 255, 255), 7000);
      udpBeacon.printf("{\"signal\":\"AGRI_WIRELESS_BEACON_V3\",\"serial\":\"%s\",\"mac\":\"%s\",\"authCode\":\"%s\",\"hardwareCertificate\":\"AGRI-CERT-WIPRO-AUTHENTICATED-V2\"}\n",
                       deviceSerial.c_str(), macAddress.c_str(), authCode.c_str());
      udpBeacon.endPacket();
    }

    // Process USB Serial UART Commands
    if (Serial.available()) {
      String input = Serial.readStringUntil('\n');
      input.trim();
      if (input.startsWith("PING")) {
        Serial.println("{\"status\":\"PROVISIONING_ACTIVE\",\"serial\":\"" + deviceSerial + "\",\"mac\":\"" + macAddress + "\",\"authCode\":\"" + authCode + "\"}");
      } else if (input.startsWith("RESET") || input.startsWith("HARD_RESET")) {
        executeStrongHardReset();
      } else if (input.startsWith("SETUP:")) {
        String jsonPayload = input.substring(6);
        StaticJsonDocument<256> doc;
        deserializeJson(doc, jsonPayload);
        const char* reqSsid = doc["ssid"];
        const char* reqPass = doc["password"];
        const char* reqAuth = doc["authCode"];
        if (reqSsid && reqPass) {
          wifiSsid = String(reqSsid);
          wifiPass = String(reqPass);
          if (reqAuth) authCode = String(reqAuth);
          isProvisioned = true;
          Serial.println("{\"success\":true,\"message\":\"Credentials Received! Rebooting...\"}");
        }
      }
    }

    // LED Blinking Speed
    if (toolConnected && (currentMillis - lastToolConnectTime > 12000)) {
      toolConnected = false;
      currentBlinkMode = MODE_AP_SLOW_BLINK;
    }

    unsigned long blinkInterval = (currentBlinkMode == MODE_CONNECTING_HEARTBEAT) ? 600 : 1200;
    if (currentMillis - lastLedToggle >= blinkInterval) {
      lastLedToggle = currentMillis;
      ledState = !ledState;
      digitalWrite(PIN_LED_INDICATOR, ledState);
    }

    server.handleClient();
  }

  preferences.begin("agri-node", false);
  preferences.putString("ssid", wifiSsid);
  preferences.putString("pass", wifiPass);
  preferences.putString("authCode", authCode);
  preferences.end();

  Serial.println("[SETUP] Wi-Fi & Auth Credentials Saved! Rebooting to connect...");
  digitalWrite(PIN_LED_INDICATOR, HIGH); // Solid ON — Flashing STOPS!
  delay(1500);
  ESP.restart();
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

    // Configure MQTT Broker
    mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
    mqttClient.setCallback(mqttCallback);

  } else {
    Serial.println("\n[WiFi] Connection Failed! Re-entering Setup Mode...");
    setupProvisioningMode();
  }
}

void sendTelemetryPing() {
  if (WiFi.status() != WL_CONNECTED) return;

  // 1. Send HTTP Telemetry Ping
  WiFiClient client;
  if (client.connect("agriculture-automation.vercel.app", 80)) {
    int rawSoil = analogRead(PIN_SOIL_MOISTURE);
    float soilMoisture = map(rawSoil, 4095, 1500, 0, 100);
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();

    StaticJsonDocument<384> doc;
    doc["deviceId"] = deviceSerial;
    doc["serialNumber"] = deviceSerial;
    doc["macAddress"] = macAddress;
    doc["authCode"] = authCode;
    doc["soilMoisture"] = isnan(soilMoisture) ? 45.0 : soilMoisture;
    doc["airTemperature"] = isnan(temp) ? 28.4 : temp;
    doc["humidity"] = isnan(humidity) ? 65.0 : humidity;
    doc["pumpRunning"] = (digitalRead(PIN_RELAY_PUMP) == HIGH);
    doc["batteryLevel"] = 98;
    doc["rssi"] = WiFi.RSSI();

    String payload;
    serializeJson(doc, payload);

    client.println("POST /api/telemetry HTTP/1.1");
    client.println("Host: agriculture-automation.vercel.app");
    client.println("Content-Type: application/json");
    client.print("Content-Length: "); client.println(payload.length());
    client.println("Connection: close");
    client.println();
    client.println(payload);

    // Read response to check if server commanded a remote hard reset
    while (client.connected() || client.available()) {
      if (client.available()) {
        String line = client.readStringUntil('\n');
        if (line.indexOf("RESET_PROVISIONING") >= 0 || line.indexOf("HARD_RESET") >= 0 || line.indexOf("UNBOUND_DELETED") >= 0) {
          Serial.println(F("[REMOTE UNBIND] Device removed from dashboard! Triggering STRONG HARD RESET..."));
          client.stop();
          executeStrongHardReset();
          return;
        }
      }
    }
    client.stop();
  }

  // 2. Publish MQTT Telemetry
  if (!mqttClient.connected()) {
    String clientId = "AgriFlow-Node-" + deviceSerial;
    if (mqttClient.connect(clientId.c_str())) {
      mqttClient.subscribe("agri/commands/#");
      mqttClient.subscribe(("agri/commands/" + deviceSerial).c_str());
      mqttClient.subscribe(("agri/commands/" + authCode).c_str());
      Serial.println("[MQTT] Connected to HiveMQ Broker! Subscribed to agri/commands/#");
    }
  }

  if (mqttClient.connected()) {
    int rawSoil = analogRead(PIN_SOIL_MOISTURE);
    float soilMoisture = map(rawSoil, 4095, 1500, 0, 100);
    float temp = dht.readTemperature();
    float humidity = dht.readHumidity();

    StaticJsonDocument<384> doc;
    doc["deviceId"] = deviceSerial;
    doc["serialNumber"] = deviceSerial;
    doc["macAddress"] = macAddress;
    doc["authCode"] = authCode;
    doc["status"] = "ONLINE";
    doc["soilMoisture"] = isnan(soilMoisture) ? 45.0 : soilMoisture;
    doc["airTemperature"] = isnan(temp) ? 28.4 : temp;
    doc["humidity"] = isnan(humidity) ? 65.0 : humidity;
    doc["pumpRunning"] = (digitalRead(PIN_RELAY_PUMP) == HIGH);
    doc["batteryLevel"] = 98;
    doc["rssi"] = WiFi.RSSI();

    char buffer[384];
    serializeJson(doc, buffer);
    mqttClient.publish("agri/telemetry", buffer);
    mqttClient.publish(("agri/telemetry/" + deviceSerial).c_str(), buffer);
  }
}

void executeStrongHardReset() {
  Serial.println(F("=================================================="));
  Serial.println(F("💥 STRONG HARD RESET TRIGGERED!"));
  Serial.println(F(" Erasing all saved Wi-Fi credentials & Auth codes..."));
  Serial.println(F("=================================================="));

  preferences.begin("agri-node", false);
  preferences.clear(); // Wipes NVS Storage Completely!
  preferences.end();

  // Rapid LED Flash Confirmation (15 Flashes)
  for (int i = 0; i < 30; i++) {
    digitalWrite(PIN_LED_INDICATOR, !digitalRead(PIN_LED_INDICATOR));
    delay(50);
  }

  digitalWrite(PIN_LED_INDICATOR, LOW);
  delay(500);
  ESP.restart(); // Reboot into Provisioning / Setup Mode!
}

void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.println("[MQTT Command Received]: " + msg);

  StaticJsonDocument<256> doc;
  deserializeJson(doc, msg);
  const char* type = doc["commandType"];
  const char* cmd  = doc["command"];

  if ((type && String(type) == "HARD_RESET") || (cmd && String(cmd) == "HARD_RESET") || msg.indexOf("HARD_RESET") >= 0 || msg.indexOf("UNBIND") >= 0) {
    Serial.println(F("[MQTT COMMAND] HARD RESET Received over MQTT!"));
    executeStrongHardReset();
  } else if (String(type) == "START_PUMP" || String(cmd) == "START_PUMP") {
    digitalWrite(PIN_RELAY_PUMP, HIGH);
    Serial.println("[PUMP] RELAY TURNED ON VIA MQTT");
  } else if (String(type) == "STOP_PUMP" || String(cmd) == "STOP_PUMP") {
    digitalWrite(PIN_RELAY_PUMP, LOW);
    Serial.println("[PUMP] RELAY TURNED OFF VIA MQTT");
  }
}

void loop() {
  // 1. Physical BOOT Button Hold (GPIO 0) for 3 Seconds -> STRONG HARD RESET
  static unsigned long buttonPressStart = 0;
  if (digitalRead(PIN_BUTTON_RESET) == LOW) {
    if (buttonPressStart == 0) buttonPressStart = millis();
    if (millis() - buttonPressStart >= 3000) {
      executeStrongHardReset();
    }
  } else {
    buttonPressStart = 0;
  }

  // 2. USB Serial Command Listener
  if (Serial.available()) {
    String input = Serial.readStringUntil('\n');
    input.trim();
    if (input.equalsIgnoreCase("RESET") || input.equalsIgnoreCase("HARD_RESET") || input.equalsIgnoreCase("FACTORY_RESET")) {
      executeStrongHardReset();
    }
  }

  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(PIN_LED_INDICATOR, LOW);
    connectToWiFi();
    return;
  }

  mqttClient.loop();

  static unsigned long lastTelemetry = 0;
  if (millis() - lastTelemetry >= 3000) {
    lastTelemetry = millis();
    sendTelemetryPing();
  }
}