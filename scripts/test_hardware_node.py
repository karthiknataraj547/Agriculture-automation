#!/usr/bin/env python3
"""
AetherCrop IoT Hardware Simulation & Ingestion Tester
Simulates a physical ESP32 Smart Farming Hardware Node sending real-time sensor telemetry.
"""

import json
import time
import urllib.request

GATEWAY_URL = "http://localhost:4000/api/v1/telemetry/ingest"
DEVICE_SERIAL = "ESP32-FARM-NODE-01"
AUTH_CODE = "ATH-8F92-4C10-99E4"

def send_telemetry(soil_moisture, temp, humidity):
    payload = {
        "deviceId": DEVICE_SERIAL,
        "authCode": AUTH_CODE,
        "zoneId": "zone-1",
        "soilMoisture": soil_moisture,
        "airTemperature": temp,
        "humidity": humidity,
        "waterFlowRate": 12.5 if soil_moisture < 35 else 0.0,
        "tankLevelPercent": 88
    }

    data = json.dumps(payload).encode('utf-8')
    req = urllib.request.Request(GATEWAY_URL, data=data, headers={'Content-Type': 'application/json'})

    try:
        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            print(f"✅ [SUCCESS] Ingested | Soil: {soil_moisture}% | Temp: {temp}°C | Rules Triggered: {result.get('rulesTriggered')}")
    except Exception as e:
        print(f"❌ [ERROR] Could not connect to gateway: {e}")

if __name__ == "__main__":
    print("🌾 Starting AetherCrop Physical Hardware Integration Test...")
    print(f"📡 Target Gateway: {GATEWAY_URL}")
    print(f"🔑 Device Serial: {DEVICE_SERIAL} | Auth Key: {AUTH_CODE}\n")

    moisture = 45.0
    while True:
        moisture -= 2.0  # Simulate drying soil
        if moisture < 20.0:
            moisture = 55.0  # Reset after irrigation

        send_telemetry(round(moisture, 1), 31.5, 58.0)
        time.sleep(3)
