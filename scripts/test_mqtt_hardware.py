#!/usr/bin/env python3
"""
AetherCrop MQTT Hardware Simulation & Testing Script
Simulates a physical ESP32 Smart Farming Hardware Node communicating over MQTT (Port 1883).
"""

import json
import time
import socket

MQTT_HOST = "localhost"
MQTT_PORT = 1883
DEVICE_SERIAL = "ESP32-FARM-NODE-01"
AUTH_CODE = "ATH-8F92-4C10-99E4"
TELEMETRY_TOPIC = "aether/farm-alpha/zone-1/telemetry"

print(f"🌾 Starting AetherCrop MQTT Physical Hardware Tester...")
print(f"📡 Connecting to Embedded MQTT Broker at {MQTT_HOST}:{MQTT_PORT}...")
print(f"🔑 Device Serial: {DEVICE_SERIAL} | Topic: {TELEMETRY_TOPIC}\n")

# Simple MQTT Publish over TCP Socket (Connect + Publish)
def publish_mqtt_telemetry(soil_moisture):
    payload = {
        "deviceId": DEVICE_SERIAL,
        "authCode": AUTH_CODE,
        "zoneId": "zone-1",
        "soilMoisture": soil_moisture,
        "airTemperature": 30.2,
        "humidity": 58,
        "waterFlowRate": 14.2 if soil_moisture < 35 else 0.0,
        "tankLevelPercent": 90
    }
    
    payload_bytes = json.dumps(payload).encode('utf-8')
    topic_bytes = TELEMETRY_TOPIC.encode('utf-8')

    # Construct MQTT CONNECT packet
    client_id = f"ESP32-{int(time.time())}".encode('utf-8')
    connect_packet = bytearray([0x10, 12 + len(client_id), 0x00, 0x04, 0x4D, 0x51, 0x54, 0x54, 0x04, 0x02, 0x00, 0x3C, 0x00, len(client_id)]) + client_id

    # Construct MQTT PUBLISH packet
    remaining_len = 2 + len(topic_bytes) + len(payload_bytes)
    publish_packet = bytearray([0x30, remaining_len, 0x00, len(topic_bytes)]) + topic_bytes + payload_bytes

    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.connect((MQTT_HOST, MQTT_PORT))
        s.sendall(connect_packet)
        time.sleep(0.1)
        s.sendall(publish_packet)
        s.close()
        print(f"✅ [MQTT PUBLISH 1883] Streamed Telemetry | Soil: {soil_moisture}% | Topic: {TELEMETRY_TOPIC}")
    except Exception as e:
        print(f"❌ [MQTT ERROR] Could not connect to MQTT Broker on port 1883: {e}")

if __name__ == "__main__":
    moisture = 42.0
    for _ in range(5):
        moisture -= 3.5
        publish_mqtt_telemetry(round(moisture, 1))
        time.sleep(2)
