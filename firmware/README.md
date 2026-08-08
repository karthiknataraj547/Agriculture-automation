# 🌾 AetherCrop Microcontroller Firmware (ESP32 & ESP8266)

Production-grade C++ Arduino sketches for connecting physical **ESP32** and **ESP8266** microcontrollers directly to the **AetherCrop Spatial Agriculture Platform**.

---

## 📌 Firmware Files Included

| Microcontroller | Sketch File Path | Primary Pinout | Recommended Board |
|---|---|---|---|
| **ESP32** | [`firmware/esp32/esp32_aethercrop_node.ino`](file:///d:/IrIgation/firmware/esp32/esp32_aethercrop_node.ino) | GPIO 34 (Soil), GPIO 4 (DHT), GPIO 18 (Flow), GPIO 26 (Relay) | ESP32 DevKit V1 / WROOM-32 |
| **ESP8266** | [`firmware/esp8266/esp8266_aethercrop_node.ino`](file:///d:/IrIgation/firmware/esp8266/esp8266_aethercrop_node.ino) | A0 (Soil), D4 (DHT), D5 (Flow), D1 (Relay) | NodeMCU V2/V3 / WeMos D1 Mini |

---

## 🛠️ Required Arduino IDE Libraries

Install these libraries via **Arduino IDE -> Sketch -> Include Library -> Manage Libraries**:

1. **PubSubClient** by *Nick O'Leary* (v2.8+)
2. **ArduinoJson** by *Benoit Blanchon* (v6.x or v7.x)
3. **DHT sensor library** by *Adafruit* (v1.4+)
4. **Adafruit Unified Sensor** by *Adafruit*

---

## 🔌 Hardware Pinout Wiring Diagram

### 1. ESP32 DevKit V1 Pinouts
```text
+-------------------+-----------------------------+
| Sensor / Module   | ESP32 Pin                   |
+-------------------+-----------------------------+
| Soil Moisture AO  | GPIO 34 (ADC1 Channel 6)    |
| DHT11/DHT22 Data  | GPIO 4                      |
| Water Flow Signal | GPIO 18 (Interrupt Capable) |
| Pump Relay IN     | GPIO 26                     |
| Status LED        | GPIO 2 (Built-in LED)       |
| VCC / GND         | 3.3V / 5V & GND             |
+-------------------+-----------------------------+
```

### 2. ESP8266 NodeMCU V2/V3 Pinouts
```text
+-------------------+-----------------------------+
| Sensor / Module   | ESP8266 NodeMCU Pin         |
+-------------------+-----------------------------+
| Soil Moisture AO  | A0 (Analog 0-1.0V)          |
| DHT11/DHT22 Data  | D4 (GPIO 2)                 |
| Water Flow Signal | D5 (GPIO 14 - Interrupt)    |
| Pump Relay IN     | D1 (GPIO 5)                 |
| Status LED        | LED_BUILTIN (D4 / GPIO 2)   |
| VCC / GND         | 3.3V / 5V & GND             |
+-------------------+-----------------------------+
```

---

## ⚡ How to Flash & Run

1. Open **Arduino IDE**.
2. Select your target board:
   - For ESP32: **Tools -> Board -> ESP32 Arduino -> ESP32 Dev Module**
   - For ESP8266: **Tools -> Board -> ESP8266 Boards -> NodeMCU 1.0 (ESP-12E Module)**
3. Open either `firmware/esp32/esp32_aethercrop_node.ino` or `firmware/esp8266/esp8266_aethercrop_node.ino`.
4. Update lines 23-27 with your **WiFi credentials** and **MQTT server IP**:
   ```cpp
   const char* WIFI_SSID     = "Your_WiFi_Name";
   const char* WIFI_PASSWORD = "Your_WiFi_Password";
   const char* MQTT_SERVER   = "192.168.1.100"; // IP of your server running backend
   ```
5. Connect your board via USB and click **Upload** (➡️).
6. Open **Serial Monitor** (115200 Baud) to view live connection logs and published telemetry!

---

## 📡 MQTT Topics

- **Telemetry Published**: `aether/farm-alpha/zone-1/telemetry`
- **Commands Subscribed**: `aether/farm-alpha/zone-1/commands`
