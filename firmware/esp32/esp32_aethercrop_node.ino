/*
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  AETHERCROP SPATIAL IOT PLATFORM — ESP32 FIRMWARE NODE
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  Hardware Target : ESP32 DevKit V1 / WROOM-32
 *  Features        : MQTT Telemetry, HTTP REST Backup, Relay Control, Sensor Sampling
 *  Libraries Needed:
 *    - WiFi.h (Built-in ESP32)
 *    - PubSubClient (by Nick O'Leary)
 *    - ArduinoJson (v6.x or v7.x by Benoit Blanchon)
 *    - DHT sensor library (by Adafruit)
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>
#include <HTTPClient.h>

// ─── USER CONFIGURATION ───
const char* WIFI_SSID       = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD   = "YOUR_WIFI_PASSWORD";

const char* MQTT_SERVER     = "192.168.1.100"; // Replace with Backend/MQTT IP or domain
const int   MQTT_PORT       = 1883;
const char* MQTT_USER       = "";              // Optional MQTT Username
const char* MQTT_PASS       = "";              // Optional MQTT Password

const char* DEVICE_UUID     = "esp32-node-alpha-01";
const char* AUTH_CODE       = "ATH-8F92-4C10-99E4";
const char* FARM_ID         = "farm-alpha";
const char* ZONE_ID         = "zone-1";

// MQTT Topics
const char* TOPIC_TELEMETRY = "aether/farm-alpha/zone-1/telemetry";
const char* TOPIC_COMMANDS  = "aether/farm-alpha/zone-1/commands";

// HTTP Fallback API (if MQTT is offline)
const char* HTTP_API_URL    = "http://192.168.1.100:3000/api/state";

// ─── PIN DEFINITIONS (ESP32) ───
#define SOIL_MOISTURE_PIN  34    // ADC1 Channel 6
#define DHT_PIN            4     // GPIO 4
#define DHT_TYPE           DHT11 // Change to DHT22 if using DHT22
#define FLOW_SENSOR_PIN    18    // Interrupt Pin for Pulse Counting
#define RELAY_PUMP_PIN     26    // GPIO 26 for Pump Relay (Active HIGH/LOW)
#define STATUS_LED_PIN     2     // Built-in LED (GPIO 2)

// ─── GLOBAL OBJECTS & VARIABLES ───
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

volatile unsigned long pulseCount = 0;
float waterFlowRate = 0.0; // L/min
unsigned long lastTelemetryTime = 0;
const unsigned long TELEMETRY_INTERVAL_MS = 2000; // 2 seconds

bool pumpState = false;
unsigned long pumpStartTime = 0;
unsigned long pumpDurationMs = 0;

// Interrupt Service Routine for Flow Meter Pulse
void IRAM_ATTR flowPulseISR() {
  pulseCount++;
}

// ─── SETUP FUNCTION ───
void setup() {
  Serial.begin(115200);
  delay(500);

  Serial.println("\n\n🌱 Initializing AetherCrop ESP32 Node...");

  pinMode(SOIL_MOISTURE_PIN, INPUT);
  pinMode(FLOW_SENSOR_PIN, INPUT_PULLUP);
  pinMode(RELAY_PUMP_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);

  // Default Pump OFF
  digitalWrite(RELAY_PUMP_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);

  // Attach interrupt for Flow Meter
  attachInterrupt(digitalPinToInterrupt(FLOW_SENSOR_PIN), flowPulseISR, RISING);

  dht.begin();

  setupWiFi();
  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);
}

// ─── WIFI CONNECTION ───
void setupWiFi() {
  Serial.print("📡 Connecting to WiFi: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    digitalWrite(STATUS_LED_PIN, !digitalRead(STATUS_LED_PIN)); // Blink LED while connecting
    delay(500);
    Serial.print(".");
  }

  digitalWrite(STATUS_LED_PIN, HIGH); // Solid LED when connected
  Serial.println("\n✅ WiFi Connected!");
  Serial.print("📶 IP Address: ");
  Serial.println(WiFi.localIP());
}

// ─── MQTT RECONNECT ───
void reconnectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("🔄 Connecting to MQTT Broker at ");
    Serial.print(MQTT_SERVER);
    Serial.print("...");

    String clientId = "ESP32Client-";
    clientId += String(random(0xffff), HEX);

    bool connected = false;
    if (strlen(MQTT_USER) > 0) {
      connected = mqttClient.connect(clientId.c_str(), MQTT_USER, MQTT_PASS);
    } else {
      connected = mqttClient.connect(clientId.c_str());
    }

    if (connected) {
      Serial.println("\n✅ MQTT Connected!");
      mqttClient.subscribe(TOPIC_COMMANDS);
      Serial.print("📥 Subscribed to Topic: ");
      Serial.println(TOPIC_COMMANDS);
    } else {
      Serial.print("❌ Failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" (Retrying in 4 seconds...)");
      delay(4000);
    }
  }
}

// ─── MQTT INCOMING COMMAND CALLBACK ───
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print("📩 [MQTT COMMAND RECEIVED] Topic: ");
  Serial.println(topic);

  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, payload, length);

  if (error) {
    Serial.print("❌ JSON Parsing Failed: ");
    Serial.println(error.f_str());
    return;
  }

  // Handle Pump Relay Commands
  if (doc.containsKey("pumpState") || doc.containsKey("action")) {
    const char* action = doc["pumpState"] | doc["action"] | "OFF";
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
      Serial.println("🛑 PUMP TURNED OFF");
    }
  }
}

// ─── READ SOIL MOISTURE ───
float readSoilMoisture() {
  int rawADC = analogRead(SOIL_MOISTURE_PIN);
  // ESP32 ADC: 0 (Wet ~1200) to 4095 (Dry ~3200)
  float moisturePercent = map(rawADC, 3200, 1200, 0, 100);
  moisturePercent = constrain(moisturePercent, 0.0, 100.0);
  return moisturePercent;
}

// ─── CALCULATE WATER FLOW RATE ───
float readWaterFlowRate() {
  static unsigned long lastCheck = 0;
  unsigned long now = millis();
  float durationSec = (now - lastCheck) / 1000.0;
  if (durationSec <= 0) return 0.0;

  // YF-S201 Flow Sensor: 7.5 pulses per second = 1 L/min
  float flowLmin = (pulseCount / 7.5) / durationSec;
  pulseCount = 0;
  lastCheck = now;
  return flowLmin;
}

// ─── PUBLISH TELEMETRY OVER MQTT ───
void publishTelemetry() {
  float soilMoisture = readSoilMoisture();
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();
  float flowRate = readWaterFlowRate();

  if (isnan(temp)) temp = 28.5;     // Fallback if sensor disconnected
  if (isnan(humidity)) humidity = 60.0;

  StaticJsonDocument<512> doc;
  doc["deviceId"]         = DEVICE_UUID;
  doc["authCode"]         = AUTH_CODE;
  doc["zoneId"]           = ZONE_ID;
  doc["soilMoisture"]     = round(soilMoisture * 10.0) / 10.0;
  doc["airTemperature"]   = round(temp * 10.0) / 10.0;
  doc["humidity"]         = round(humidity * 10.0) / 10.0;
  doc["waterFlowRate"]    = round(flowRate * 10.0) / 10.0;
  doc["tankLevelPercent"] = 92;
  doc["pumpRunning"]      = pumpState;
  doc["batteryLevel"]     = 98;
  doc["rssi"]             = WiFi.RSSI();

  char jsonBuffer[512];
  serializeJson(doc, jsonBuffer);

  if (mqttClient.connected()) {
    mqttClient.publish(TOPIC_TELEMETRY, jsonBuffer);
    Serial.printf("📤 [MQTT PUBLISH] Soil: %.1f%% | Temp: %.1fC | Flow: %.1fL/m | Topic: %s\n",
                  soilMoisture, temp, flowRate, TOPIC_TELEMETRY);
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
    Serial.printf("🌐 [HTTP POST FALLBACK] Response Code: %d\n", httpCode);
  } else {
    Serial.printf("❌ [HTTP POST ERROR] Failed: %s\n", http.errorToString(httpCode).c_str());
  }
  http.end();
}

// ─── MAIN LOOP ───
void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    setupWiFi();
  }

  if (!mqttClient.connected()) {
    reconnectMQTT();
  }
  mqttClient.loop();

  // Safety Watchdog for Pump Run Timer
  if (pumpState && (millis() - pumpStartTime >= pumpDurationMs)) {
    pumpState = false;
    digitalWrite(RELAY_PUMP_PIN, LOW);
    Serial.println("⏱️ PUMP TIMER EXPIRED — PUMP AUTO TURNED OFF");
  }

  // Telemetry publish interval (every 2 seconds)
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL_MS) {
    lastTelemetryTime = millis();
    publishTelemetry();
  }
}
