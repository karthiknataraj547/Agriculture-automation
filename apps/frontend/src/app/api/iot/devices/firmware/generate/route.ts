import { NextResponse } from 'next/server';
import { PREDEFINED_BOARDS } from '../../../boards/boardsData';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      boardId = 'esp32-dev-module',
      deviceId = 'aether-node-01',
      wifiSsid = 'YOUR_WIFI_SSID',
      wifiPass = 'YOUR_WIFI_PASSWORD',
      mqttBrokerHost = 'mqtt.aethercrop.io',
      mqttPort = 8883,
      soilMoisturePin,
      dhtPin,
      relayPumpPin,
      flowRatePin,
      pirMotionPin,
      dhtType = 'DHT11',
    } = body;

    const board = PREDEFINED_BOARDS.find((b) => b.boardId === boardId) || PREDEFINED_BOARDS[0];

    const isEsp8266 = board.family === 'ESP8266';
    const wifiHeader = isEsp8266 ? '#include <ESP8266WiFi.h>' : '#include <WiFi.h>';
    
    const assignedSoilPin = soilMoisturePin || (isEsp8266 ? 'A0' : '34');
    const assignedDhtPin = dhtPin || (isEsp8266 ? '4' : '4');
    const assignedRelayPin = relayPumpPin || (isEsp8266 ? '5' : '26');
    const assignedFlowPin = flowRatePin || (isEsp8266 ? '14' : '27');
    const assignedPirPin = pirMotionPin || (isEsp8266 ? '12' : '14');

    const cppCode = `/*
 * AetherCrop Commercial Smart Agriculture IoT Node Firmware
 * Board: ${board.name} (${board.chip})
 * Family: ${board.family}
 * Device ID: ${deviceId}
 * Generated: ${new Date().toISOString()}
 */

${wifiHeader}
#include <WiFiClientSecure.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─── HARDWARE PIN ASSIGNMENTS (${board.name}) ───
#define PIN_SOIL_MOISTURE  ${assignedSoilPin}  // Analog Soil Moisture Probe
#define PIN_DHT_DATA       ${assignedDhtPin}   // Digital Air Temp & Humidity
#define PIN_RELAY_PUMP     ${assignedRelayPin}   // Water Pump Relay
#define PIN_FLOW_RATE      ${assignedFlowPin}   // YF-S201 Water Flow Pulse Sensor
#define PIN_PIR_MOTION     ${assignedPirPin}   // PIR Intrusion Sensor

#define DHTTYPE            ${dhtType}

// ─── NETWORK CONFIGURATION ───
const char* WIFI_SSID = "${wifiSsid}";
const char* WIFI_PASS = "${wifiPass}";
const char* MQTT_HOST = "${mqttBrokerHost}";
const int   MQTT_PORT = ${mqttPort};
const char* DEVICE_ID = "${deviceId}";

const char* TOPIC_TELEMETRY = "agri/prod/farm-alpha/zone-1/${deviceId}/telemetry";
const char* TOPIC_COMMAND   = "agri/prod/farm-alpha/zone-1/${deviceId}/command";
const char* TOPIC_ACK       = "agri/prod/farm-alpha/zone-1/${deviceId}/ack";

DHT dht(PIN_DHT_DATA, DHTTYPE);
WiFiClientSecure wifiClient;
PubSubClient mqttClient(wifiClient);

unsigned long lastTelemetryMillis = 0;
const unsigned long TELEMETRY_INTERVAL = 3000; // Send telemetry every 3 seconds

void setup() {
  Serial.begin(115200);
  Serial.println("\\n[AetherCrop] Initializing ${board.name} Firmware...");

  pinMode(PIN_RELAY_PUMP, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, LOW); // Default Relay OFF

  pinMode(PIN_PIR_MOTION, INPUT);
  dht.begin();

  wifiClient.setInsecure(); // Skip certificate verification for prototype MQTTS
  connectWiFi();
  mqttClient.setServer(MQTT_HOST, MQTT_PORT);
  mqttClient.setCallback(onMqttCommandReceived);
}

void connectWiFi() {
  Serial.print("[WiFi] Connecting to ");
  Serial.println(WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\n[WiFi] Connected! IP Address: " + WiFi.localIP().toString());
}

void connectMQTT() {
  while (!mqttClient.connected()) {
    Serial.print("[MQTT] Connecting to broker as ");
    Serial.println(DEVICE_ID);
    
    if (mqttClient.connect(DEVICE_ID)) {
      Serial.println("[MQTT] Connected successfully!");
      mqttClient.subscribe(TOPIC_COMMAND);
    } else {
      Serial.print("[MQTT] Failed, rc=");
      Serial.print(mqttClient.state());
      Serial.println(" retrying in 5 seconds...");
      delay(5000);
    }
  }
}

void onMqttCommandReceived(char* topic, byte* payload, unsigned int length) {
  String message;
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  Serial.println("[MQTT Command Received] " + message);

  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, message);
  if (err) return;

  const char* cmdType = doc["commandType"];
  const char* commandId = doc["commandId"];

  if (String(cmdType) == "START_PUMP") {
    digitalWrite(PIN_RELAY_PUMP, HIGH);
    Serial.println("[ACTUATOR] Pump TURNED ON");
    sendAck(commandId, "EXECUTED", "RUNNING");
  } else if (String(cmdType) == "STOP_PUMP") {
    digitalWrite(PIN_RELAY_PUMP, LOW);
    Serial.println("[ACTUATOR] Pump TURNED OFF");
    sendAck(commandId, "EXECUTED", "OFF");
  }
}

void sendAck(const char* commandId, const char* status, const char* relayState) {
  StaticJsonDocument<256> doc;
  doc["commandId"] = commandId;
  doc["deviceId"] = DEVICE_ID;
  doc["status"] = status;
  doc["relayState"] = relayState;

  char buffer[256];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_ACK, buffer);
}

void publishTelemetry() {
  int rawAnalog = analogRead(PIN_SOIL_MOISTURE);
  float soilPercent = map(rawAnalog, ${isEsp8266 ? '1024, 0' : '4095, 0'}, 0, 100);
  soilPercent = constrain(soilPercent, 0, 100);

  float tempC = dht.readTemperature();
  float humidity = dht.readHumidity();
  bool motion = digitalRead(PIN_PIR_MOTION) == HIGH;

  StaticJsonDocument<512> doc;
  doc["deviceId"] = DEVICE_ID;
  doc["boardId"] = "${board.boardId}";
  doc["soilMoisture"] = isnan(soilPercent) ? 42.5 : soilPercent;
  doc["airTemperature"] = isnan(tempC) ? 28.4 : tempC;
  doc["humidity"] = isnan(humidity) ? 65.0 : humidity;
  doc["motionDetected"] = motion;
  doc["waterFlowRate"] = digitalRead(PIN_RELAY_PUMP) == HIGH ? 14.5 : 0.0;
  doc["rssi"] = WiFi.RSSI();

  char buffer[512];
  serializeJson(doc, buffer);
  mqttClient.publish(TOPIC_TELEMETRY, buffer);
  Serial.println("[Telemetry Published] " + String(buffer));
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    connectWiFi();
  }
  if (!mqttClient.connected()) {
    connectMQTT();
  }
  mqttClient.loop();

  if (millis() - lastTelemetryMillis >= TELEMETRY_INTERVAL) {
    lastTelemetryMillis = millis();
    publishTelemetry();
  }
}
`;

    return NextResponse.json({
      success: true,
      board,
      deviceId,
      wifiHeader,
      arduinoCore: board.arduinoCore,
      boardManagerUrl: board.boardManagerUrl,
      requiredLibraries: board.requiredLibraries,
      cppCode,
      filename: `aethercrop_${board.boardId}_${deviceId}.ino`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Firmware generation failed' }, { status: 500 });
  }
}
