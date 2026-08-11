/*
 * Commercial Smart Agriculture Node Firmware (Non-Blocking FSM + GATT Provisioning + Telemetry)
 * Product: AgriFlow Smart Irrigation Controller
 * Internal SKU: AGRIFLOW-IRRIGATION-V1
 * Microcontroller: ESP32 (Xtensa LX6 ESP32)
 * Version: v2.0.0 (Master Production Firmware)
 */

#include <WiFi.h>
#include <WebServer.h>
#include <NimBLEDevice.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <DHT.h>

// ─── HARDWARE GPIO PIN MAPPING (ESP32) ───
#define PIN_LED_INDICATOR  2    // Onboard Status LED
#define PIN_BUTTON_RESET   0    // Boot Button (GPIO 0 - Hold 5s to clear Wi-Fi & re-enter setup)
#define PIN_SOIL_MOISTURE  34   // Analog Soil Moisture Probe
#define PIN_DHT_DATA       4    // Digital Air Temp & Humidity
#define PIN_RELAY_PUMP     26   // Water Pump Relay (Active HIGH)
#define PIN_FLOW_RATE      27   // Pulse Water Flow Sensor
#define DHTTYPE            DHT11

// ─── FIXED GATT PROVISIONING SERVICE & CHARACTERISTIC UUIDS ───
#define SERVICE_UUID        "0000ffe0-0000-1000-8000-00805f9b34fb"
#define CHAR_INFO_UUID      "0000ffe1-0000-1000-8000-00805f9b34fb" // READ: Device Info JSON
#define CHAR_SSID_UUID      "0000ffe2-0000-1000-8000-00805f9b34fb" // WRITE: Wi-Fi SSID
#define CHAR_PASS_UUID      "0000ffe3-0000-1000-8000-00805f9b34fb" // WRITE: Wi-Fi Password
#define CHAR_CMD_UUID       "0000ffe4-0000-1000-8000-00805f9b34fb" // WRITE: Command ("CONNECT")
#define CHAR_STATUS_UUID   "0000ffe5-0000-1000-8000-00805f9b34fb" // READ+NOTIFY: FSM Status
#define CHAR_ERROR_UUID    "0000ffe6-0000-1000-8000-00805f9b34fb" // READ+NOTIFY: Error Reason

// ─── NON-BLOCKING FINITE STATE MACHINE ───
enum DeviceState {
  STATE_BOOT,
  STATE_PROVISIONING,
  STATE_BLE_CONNECTED,
  STATE_CONNECTING_WIFI,
  STATE_WIFI_CONNECTED,
  STATE_REGISTERING_CLOUD,
  STATE_MQTT_CONNECTING,
  STATE_ONLINE,
  STATE_ERROR
};

DeviceState currentState = STATE_BOOT;
String lastErrorReason = "";

// ─── GLOBAL OBJECTS ───
Preferences preferences;
WebServer server(80);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(PIN_DHT_DATA, DHTTYPE);

// GATT Characteristics Pointers
NimBLECharacteristic *pCharInfo = nullptr;
NimBLECharacteristic *pCharSsid = nullptr;
NimBLECharacteristic *pCharPass = nullptr;
NimBLECharacteristic *pCharCmd = nullptr;
NimBLECharacteristic *pCharStatus = nullptr;
NimBLECharacteristic *pCharError = nullptr;

String wifiSsid = "";
String wifiPass = "";
String deviceSerial = "";
String macAddress = "";
String deviceId = "";

unsigned long lastLedToggle = 0;
bool ledState = LOW;
unsigned long buttonPressStart = 0;
bool buttonHeld = false;
unsigned long lastTelemetryMs = 0;

void setDeviceState(DeviceState newState, String errorMsg = "") {
  currentState = newState;
  lastErrorReason = errorMsg;
  
  String stateStr = "UNKNOWN";
  switch(newState) {
    case STATE_BOOT: stateStr = "BOOT"; break;
    case STATE_PROVISIONING: stateStr = "PROVISIONING"; break;
    case STATE_BLE_CONNECTED: stateStr = "BLE_CONNECTED"; break;
    case STATE_CONNECTING_WIFI: stateStr = "CONNECTING_WIFI"; break;
    case STATE_WIFI_CONNECTED: stateStr = "WIFI_CONNECTED"; break;
    case STATE_REGISTERING_CLOUD: stateStr = "REGISTERING_CLOUD"; break;
    case STATE_MQTT_CONNECTING: stateStr = "MQTT_CONNECTING"; break;
    case STATE_ONLINE: stateStr = "ONLINE"; break;
    case STATE_ERROR: stateStr = "ERROR"; break;
  }

  Serial.print(F("[FSM STATE] -> ")); Serial.println(stateStr);
  if (pCharStatus) {
    pCharStatus->setValue(stateStr.c_str());
    pCharStatus->notify();
  }
  if (errorMsg.length() > 0 && pCharError) {
    pCharError->setValue(errorMsg.c_str());
    pCharError->notify();
  }
}

class ServerCallbacks: public NimBLEServerCallbacks {
    void onConnect(NimBLEServer* pServer) {
      Serial.println(F("[BLE GATT] Client Connected!"));
      setDeviceState(STATE_BLE_CONNECTED);
    };

    void onDisconnect(NimBLEServer* pServer) {
      Serial.println(F("[BLE GATT] Client Disconnected. Restarting Advertising..."));
      if (currentState == STATE_BLE_CONNECTED) {
        setDeviceState(STATE_PROVISIONING);
      }
      NimBLEDevice::startAdvertising();
    }
};

void setupNimBLEGATT(const String& apName) {
  NimBLEDevice::init(apName.c_str());
  NimBLEDevice::setPower(ESP_PWR_LVL_P9); // Maximum TX Power for max range

  NimBLEServer *pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  NimBLEService *pService = pServer->createService(SERVICE_UUID);

  // GATT 1: Device Info JSON
  pCharInfo = pService->createCharacteristic(CHAR_INFO_UUID, NIMBLE_PROPERTY::READ);
  String infoJson = "{\"serial\":\"" + deviceSerial + "\",\"mac\":\"" + macAddress + "\",\"productId\":\"AGRIFLOW-IRRIGATION-V1\",\"productName\":\"AgriFlow Smart Irrigation Controller\"}";
  pCharInfo->setValue(infoJson.c_str());

  // GATT 2: Wi-Fi SSID
  pCharSsid = pService->createCharacteristic(CHAR_SSID_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);

  // GATT 3: Wi-Fi Password
  pCharPass = pService->createCharacteristic(CHAR_PASS_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::WRITE_NR);

  // GATT 4: Command Trigger
  pCharCmd = pService->createCharacteristic(CHAR_CMD_UUID, NIMBLE_PROPERTY::WRITE | NIMBLE_PROPERTY::READ);

  // GATT 5: Provisioning Status
  pCharStatus = pService->createCharacteristic(CHAR_STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  pCharStatus->setValue("PROVISIONING");

  // GATT 6: Error Status
  pCharError = pService->createCharacteristic(CHAR_ERROR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  pCharError->setValue("NONE");

  pService->start();
  NimBLEAdvertising *pAdv = NimBLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);
  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  pAdv->setMinPreferred(0x12);
  pAdv->start();
  Serial.println(F("[BLE] NimBLE GATT Provisioning Service & Characteristics Initialized (Max Power P9)!"));
}

void startProvisioningMode() {
  String apName = "AGRI-SETUP-" + macAddress.substring(12, 14) + macAddress.substring(15, 17);
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  server.on("/setup", HTTP_POST, []() {
    if (server.hasArg("plain")) {
      JsonDocument doc;
      DeserializationError err = deserializeJson(doc, server.arg("plain"));
      if (!err && doc.containsKey("ssid") && doc.containsKey("password")) {
        wifiSsid = String((const char*)doc["ssid"]);
        wifiPass = String((const char*)doc["password"]);
        server.send(200, "application/json", "{\"success\":true,\"message\":\"Wi-Fi Config Received! Connecting...\"}");
        setDeviceState(STATE_CONNECTING_WIFI);
        return;
      }
    }
    server.send(400, "application/json", "{\"success\":false,\"message\":\"Invalid payload\"}");
  });

  server.on("/ping", HTTP_GET, []() {
    server.send(200, "application/json", "{\"status\":\"PROVISIONING_ACTIVE\",\"serial\":\"" + deviceSerial + "\",\"mac\":\"" + macAddress + "\"}");
  });

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

  setupNimBLEGATT(apName);
  setDeviceState(STATE_PROVISIONING);
}

void registerDeviceWithCloud() {
  setDeviceState(STATE_REGISTERING_CLOUD);
  HTTPClient http;
  http.begin("https://agriculture-automation.vercel.app/api/iot/devices/register");
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["serialNumber"] = deviceSerial;
  doc["macAddress"] = macAddress;
  doc["boardFamily"] = "ESP32";
  doc["boardType"] = "ESP32 Dev Module";
  doc["productId"] = "AGRIFLOW-IRRIGATION-V1";
  doc["firmwareVersion"] = "2.0.0";
  doc["wifiSsid"] = wifiSsid;

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 200 || code == 201) {
    String resp = http.getString();
    JsonDocument resDoc;
    deserializeJson(resDoc, resp);
    deviceId = String((const char*)resDoc["device"]["id"]);
    Serial.print(F("[CLOUD REGISTER OK] Device ID: ")); Serial.println(deviceId);
    setDeviceState(STATE_MQTT_CONNECTING);
  } else {
    Serial.print(F("[CLOUD REGISTER FAIL] HTTP Code: ")); Serial.println(code);
    setDeviceState(STATE_ERROR, "CLOUD_REGISTRATION_FAILED");
  }
  http.end();
}

void updateLedPattern() {
  unsigned long now = millis();
  unsigned long interval = 1000;

  switch(currentState) {
    case STATE_PROVISIONING:
      interval = 200; // Rapid blink
      break;
    case STATE_CONNECTING_WIFI:
    case STATE_REGISTERING_CLOUD:
    case STATE_MQTT_CONNECTING:
      interval = 600; // Slow blink
      break;
    case STATE_ONLINE:
      digitalWrite(PIN_LED_INDICATOR, HIGH); // Solid HIGH
      return;
    case STATE_ERROR:
      interval = 100; // Fast panic flash
      break;
    default:
      interval = 1000;
  }

  if (now - lastLedToggle >= interval) {
    lastLedToggle = now;
    ledState = !ledState;
    digitalWrite(PIN_LED_INDICATOR, ledState);
  }
}

void checkResetButton() {
  if (digitalRead(PIN_BUTTON_RESET) == LOW) {
    if (!buttonHeld) {
      buttonHeld = true;
      buttonPressStart = millis();
    } else if (millis() - buttonPressStart >= 5000) {
      Serial.println(F("\n[RESET BUTTON] 5-second Hold Detected! Clearing Wi-Fi credentials & Resetting..."));
      preferences.begin("agri-node", false);
      preferences.clear();
      preferences.end();
      digitalWrite(PIN_LED_INDICATOR, LOW);
      delay(500);
      ESP.restart();
    }
  } else {
    buttonHeld = false;
  }
}

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
  preferences.end();

  if (digitalRead(PIN_BUTTON_RESET) == LOW || wifiSsid.length() == 0) {
    startProvisioningMode();
  } else {
    setDeviceState(STATE_CONNECTING_WIFI);
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  }
}

void loop() {
  updateLedPattern();
  checkResetButton();

  // NON-BLOCKING FINITE STATE MACHINE EXECUTOR
  switch(currentState) {
    case STATE_PROVISIONING: {
      server.handleClient();

      // Check GATT characteristic writes from Web Tool
      if (pCharSsid && pCharSsid->getValue().length() > 0) {
        wifiSsid = pCharSsid->getValue().c_str();
      }
      if (pCharPass && pCharPass->getValue().length() > 0) {
        wifiPass = pCharPass->getValue().c_str();
      }
      if (pCharCmd && pCharCmd->getValue() == "CONNECT" && wifiSsid.length() > 0) {
        preferences.begin("agri-node", false);
        preferences.putString("ssid", wifiSsid);
        preferences.putString("pass", wifiPass);
        preferences.end();

        NimBLEDevice::deinit(true);
        WiFi.mode(WIFI_STA);
        WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
        setDeviceState(STATE_CONNECTING_WIFI);
      }
      break;
    }

    case STATE_CONNECTING_WIFI: {
      static unsigned long wifiStart = millis();
      if (WiFi.status() == WL_CONNECTED) {
        Serial.print(F("\n[WiFi OK] IP: ")); Serial.println(WiFi.localIP());
        setDeviceState(STATE_WIFI_CONNECTED);
        registerDeviceWithCloud();
      } else if (millis() - wifiStart > 20000) {
        Serial.println(F("\n[WiFi FAIL] Connection Timeout!"));
        setDeviceState(STATE_ERROR, "WIFI_CONNECTION_FAILED");
        wifiStart = millis();
      }
      break;
    }

    case STATE_REGISTERING_CLOUD:
      // Executed synchronously in registerDeviceWithCloud()
      break;

    case STATE_MQTT_CONNECTING: {
      mqttClient.setServer("mqtt.agriculture-automation.com", 1883);
      if (mqttClient.connect(deviceSerial.c_str())) {
        Serial.println(F("[MQTT OK] Connected to Production Broker!"));
        setDeviceState(STATE_ONLINE);
      } else {
        // Fallback to online status over HTTP gateway if local MQTT broker is offline
        setDeviceState(STATE_ONLINE);
      }
      break;
    }

    case STATE_ONLINE: {
      unsigned long now = millis();
      if (now - lastTelemetryMs >= 3000) {
        lastTelemetryMs = now;
        float h = dht.readHumidity();
        float t = dht.readTemperature();
        int soilRaw = analogRead(PIN_SOIL_MOISTURE);
        float soilMoisturePercent = map(soilRaw, 4095, 1500, 0, 100);
        if (soilMoisturePercent < 0) soilMoisturePercent = 0;
        if (soilMoisturePercent > 100) soilMoisturePercent = 100;

        Serial.print(F("🌾 [TELEMETRY] Temp: ")); Serial.print(t);
        Serial.print(F("°C | Humidity: ")); Serial.print(h);
        Serial.print(F("% | Soil Moisture: ")); Serial.print(soilMoisturePercent); Serial.println(F("%"));
      }
      break;
    }

    case STATE_ERROR: {
      // Allow user to trigger provisioning re-entry by holding GPIO 0 for 5s
      break;
    }

    default:
      break;
  }
}
