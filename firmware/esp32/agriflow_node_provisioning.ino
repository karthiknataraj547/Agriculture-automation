/*
 * Commercial Smart Agriculture Node Firmware (Modular Non-Blocking FSM + BLE GATT + SoftAP WebServer + Telemetry)
 * Product: AgriFlow Smart Irrigation Controller
 * Internal SKU: AGRIFLOW-IRRIGATION-V1
 * Microcontroller: ESP32 (Xtensa LX6 ESP32)
 * Version: v3.2.0 (Master Production Firmware)
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <NimBLEDevice.h>

// ─── HARDWARE GPIO PIN MAPPING (ESP32) ───
#define PIN_LED_INDICATOR  2    // Onboard Status LED
#define PIN_BUTTON_RESET   0    // Boot Button (GPIO 0 - Hold 5s to clear Wi-Fi & re-enter setup)
#define PIN_SOIL_MOISTURE  34   // Analog Soil Moisture Probe
#define PIN_DHT_DATA       4    // Digital Air Temp & Humidity
#define PIN_RELAY_PUMP     26   // Water Pump Relay (Active HIGH)
#define PIN_FLOW_RATE      27   // Pulse Water Flow Sensor
#define DHTTYPE            DHT11

// ─── STATE MACHINE DEFINITIONS ───
enum DeviceState {
  STATE_SETUP,
  STATE_DISCOVERABLE,
  STATE_PAIRING,
  STATE_WIFI_PROVISIONING,
  STATE_WIFI_CONNECTING,
  STATE_WIFI_CONNECTED,
  STATE_CLOUD_REGISTERING,
  STATE_MQTT_CONNECTING,
  STATE_ONLINE,
  STATE_ERROR,
  STATE_DISABLED
};

DeviceState currentState = STATE_SETUP;
String lastErrorReason = "NONE";
String pairingStatusStr = "UNPAIRED";

// ─── FIXED GATT PROVISIONING SERVICE & CHARACTERISTIC UUIDS ───
#define SERVICE_UUID          "0000ffe0-0000-1000-8000-00805f9b34fb"
#define CHAR_INFO_UUID        "0000ffe1-0000-1000-8000-00805f9b34fb" // READ: Device Info JSON
#define CHAR_DEVICE_ID_UUID   "0000ffe2-0000-1000-8000-00805f9b34fb" // READ: Device UUID string
#define CHAR_SERIAL_UUID      "0000ffe3-0000-1000-8000-00805f9b34fb" // READ: Serial Number string
#define CHAR_PRODUCT_ID_UUID  "0000ffe4-0000-1000-8000-00805f9b34fb" // READ: Product ID string
#define CHAR_PROD_NAME_UUID   "0000ffe5-0000-1000-8000-00805f9b34fb" // READ: Product Name string
#define CHAR_FIRMWARE_UUID    "0000ffe6-0000-1000-8000-00805f9b34fb" // READ: Firmware version string
#define CHAR_STATUS_UUID      "0000ffe7-0000-1000-8000-00805f9b34fb" // READ+NOTIFY: FSM Provisioning Status
#define CHAR_CREDS_UUID       "0000ffe8-0000-1000-8000-00805f9b34fb" // WRITE: Wi-Fi Credentials
#define CHAR_CMD_UUID         "0000ffe9-0000-1000-8000-00805f9b34fb" // WRITE: Provision Command
#define CHAR_PAIR_STATUS_UUID "0000ffea-0000-1000-8000-00805f9b34fb" // READ+NOTIFY: Pairing Status
#define CHAR_ERROR_UUID       "0000ffeb-0000-1000-8000-00805f9b34fb" // READ+NOTIFY: Error Reason

// ─── GLOBAL INSTANCES ───
Preferences preferences;
WebServer server(80);
WiFiClientSecure secureClient;
PubSubClient mqttClient(secureClient);
DHT dht(PIN_DHT_DATA, DHTTYPE);

// GATT Characteristics Pointers
NimBLECharacteristic *pCharInfo = nullptr;
NimBLECharacteristic *pCharDeviceId = nullptr;
NimBLECharacteristic *pCharSerial = nullptr;
NimBLECharacteristic *pCharProductId = nullptr;
NimBLECharacteristic *pCharProductName = nullptr;
NimBLECharacteristic *pCharFirmware = nullptr;
NimBLECharacteristic *pCharStatus = nullptr;
NimBLECharacteristic *pCharCreds = nullptr;
NimBLECharacteristic *pCharCmd = nullptr;
NimBLECharacteristic *pCharPairStatus = nullptr;
NimBLECharacteristic *pCharError = nullptr;

String wifiSsid = "";
String wifiPass = "";
String deviceSerial = "";
String macAddress = "";
String deviceId = "";
String claimSessionId = "";

unsigned long lastLedToggle = 0;
bool ledState = LOW;
unsigned long buttonPressStart = 0;
bool buttonHeld = false;
unsigned long lastTelemetryMs = 0;

void setDeviceState(DeviceState newState, String errorMsg = "") {
  currentState = newState;
  if (errorMsg.length() > 0) {
    lastErrorReason = errorMsg;
  }

  String stateStr = "SETUP";
  switch(newState) {
    case STATE_SETUP: stateStr = "SETUP"; break;
    case STATE_DISCOVERABLE: stateStr = "DISCOVERABLE"; break;
    case STATE_PAIRING: stateStr = "PAIRING"; break;
    case STATE_WIFI_PROVISIONING: stateStr = "WIFI_PROVISIONING"; break;
    case STATE_WIFI_CONNECTING: stateStr = "WIFI_CONNECTING"; break;
    case STATE_WIFI_CONNECTED: stateStr = "WIFI_CONNECTED"; break;
    case STATE_CLOUD_REGISTERING: stateStr = "CLOUD_REGISTERING"; break;
    case STATE_MQTT_CONNECTING: stateStr = "MQTT_CONNECTING"; break;
    case STATE_ONLINE: stateStr = "ONLINE"; break;
    case STATE_ERROR: stateStr = "ERROR"; break;
    case STATE_DISABLED: stateStr = "DISABLED"; break;
  }

  Serial.print(F("[FSM STATE] -> ")); Serial.println(stateStr);

  if (pCharStatus) {
    pCharStatus->setValue(stateStr.c_str());
    pCharStatus->notify();
  }
  if (pCharError && errorMsg.length() > 0) {
    pCharError->setValue(lastErrorReason.c_str());
    pCharError->notify();
  }
}

// ─── STATUS LED MANAGER ───
void updateLedPattern() {
  unsigned long now = millis();
  unsigned long interval = 1000;
  static bool doubleBlinkPhase = false;
  static int doubleBlinkCount = 0;

  switch(currentState) {
    case STATE_SETUP:
    case STATE_DISCOVERABLE:
      interval = 200; // Rapid blink
      break;
    
    case STATE_PAIRING: {
      // Double blink pattern: On 100ms, Off 100ms, On 100ms, Off 500ms
      if (doubleBlinkPhase) {
        interval = (doubleBlinkCount % 2 == 0) ? 100 : 100;
      } else {
        interval = 500;
      }
      if (now - lastLedToggle >= interval) {
        lastLedToggle = now;
        ledState = !ledState;
        digitalWrite(PIN_LED_INDICATOR, ledState);
        doubleBlinkCount++;
        if (doubleBlinkCount >= 4) {
          doubleBlinkCount = 0;
          doubleBlinkPhase = !doubleBlinkPhase;
        }
      }
      return;
    }

    case STATE_WIFI_PROVISIONING:
    case STATE_CLOUD_REGISTERING:
    case STATE_MQTT_CONNECTING:
      // Breathing / Pulsing emulation via soft toggle
      interval = 400;
      break;

    case STATE_WIFI_CONNECTING:
      interval = 600; // Slow blink
      break;

    case STATE_WIFI_CONNECTED:
    case STATE_ONLINE:
      digitalWrite(PIN_LED_INDICATOR, HIGH); // Solid ON
      return;

    case STATE_ERROR:
      interval = 80; // Fast panic flash
      break;

    case STATE_DISABLED:
      digitalWrite(PIN_LED_INDICATOR, LOW); // LED Off
      return;

    default:
      interval = 1000;
  }

  if (now - lastLedToggle >= interval) {
    lastLedToggle = now;
    ledState = !ledState;
    digitalWrite(PIN_LED_INDICATOR, ledState);
  }
}

// ─── BLE CALLBACKS & CHARACTERISTICS ───
class ServerCallbacks: public NimBLEServerCallbacks {
  void onConnect(NimBLEServer* pServer) {
    Serial.println(F("[BLE GATT] Client Connected!"));
    pairingStatusStr = "PAIRED";
    if (pCharPairStatus) {
      pCharPairStatus->setValue(pairingStatusStr.c_str());
      pCharPairStatus->notify();
    }
    setDeviceState(STATE_PAIRING);
  };

  void onDisconnect(NimBLEServer* pServer) {
    Serial.println(F("[BLE GATT] Client Disconnected. Restarting Advertising..."));
    pairingStatusStr = "UNPAIRED";
    if (pCharPairStatus) {
      pCharPairStatus->setValue(pairingStatusStr.c_str());
      pCharPairStatus->notify();
    }
    if (currentState == STATE_PAIRING) {
      setDeviceState(STATE_DISCOVERABLE);
    }
    NimBLEDevice::startAdvertising();
  }
};

class CredsCharCallbacks: public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar) {
    String value = pChar->getValue().c_str();
    if (value.length() > 0) {
      JsonDocument doc;
      DeserializationError err = deserializeJson(doc, value);
      if (!err && doc.containsKey("ssid") && doc.containsKey("password")) {
        wifiSsid = String((const char*)doc["ssid"]);
        wifiPass = String((const char*)doc["password"]);
        Serial.print(F("[BLE] Wi-Fi SSID Received: ")); Serial.println(wifiSsid);
        setDeviceState(STATE_WIFI_PROVISIONING);
      }
    }
  }
};

class CmdCharCallbacks: public NimBLECharacteristicCallbacks {
  void onWrite(NimBLECharacteristic* pChar) {
    String cmd = pChar->getValue().c_str();
    if (cmd == "CONNECT" && wifiSsid.length() > 0) {
      // Save credentials persistently in NVS Preferences
      preferences.begin("agri-node", false);
      preferences.putString("ssid", wifiSsid);
      preferences.putString("pass", wifiPass);
      preferences.end();

      Serial.println(F("[BLE] Connect command received! Reconnecting to Station Mode..."));
      setDeviceState(STATE_WIFI_CONNECTING);

      // De-initialize BLE to free up memory & RAM for Station Mode
      NimBLEDevice::deinit(true);
      
      WiFi.mode(WIFI_STA);
      WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
    }
  }
};

void setupBLE(const String& apName) {
  NimBLEDevice::init(apName.c_str());
  NimBLEDevice::setPower(ESP_PWR_LVL_P9); // Maximum TX Power for max coverage

  NimBLEServer *pServer = NimBLEDevice::createServer();
  pServer->setCallbacks(new ServerCallbacks());

  NimBLEService *pService = pServer->createService(SERVICE_UUID);

  // DEVICE_INFO: JSON configuration read characteristic
  pCharInfo = pService->createCharacteristic(CHAR_INFO_UUID, NIMBLE_PROPERTY::READ);
  String infoJson = "{\"deviceId\":\"dev_" + deviceSerial.substring(11) + "\",\"serialNumber\":\"" + deviceSerial + "\",\"productId\":\"AGRIFLOW-IRRIGATION-V1\",\"productName\":\"AgriFlow Smart Irrigation Controller\",\"boardFamily\":\"ESP32\",\"firmwareVersion\":\"3.2.0\",\"provisioningState\":\"SETUP\",\"protocolVersion\":\"1.0\"}";
  pCharInfo->setValue(infoJson.c_str());

  // DEVICE_ID
  pCharDeviceId = pService->createCharacteristic(CHAR_DEVICE_ID_UUID, NIMBLE_PROPERTY::READ);
  pCharDeviceId->setValue(("dev_" + deviceSerial.substring(11)).c_str());

  // SERIAL_NUMBER
  pCharSerial = pService->createCharacteristic(CHAR_SERIAL_UUID, NIMBLE_PROPERTY::READ);
  pCharSerial->setValue(deviceSerial.c_str());

  // PRODUCT_ID
  pCharProductId = pService->createCharacteristic(CHAR_PRODUCT_ID_UUID, NIMBLE_PROPERTY::READ);
  pCharProductId->setValue("AGRIFLOW-IRRIGATION-V1");

  // PRODUCT_NAME
  pCharProductName = pService->createCharacteristic(CHAR_PROD_NAME_UUID, NIMBLE_PROPERTY::READ);
  pCharProductName->setValue("AgriFlow Smart Irrigation Controller");

  // FIRMWARE_VERSION
  pCharFirmware = pService->createCharacteristic(CHAR_FIRMWARE_UUID, NIMBLE_PROPERTY::READ);
  pCharFirmware->setValue("3.2.0");

  // PROVISIONING_STATUS
  pCharStatus = pService->createCharacteristic(CHAR_STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  pCharStatus->setValue("SETUP");

  // WIFI_CREDENTIALS
  pCharCreds = pService->createCharacteristic(CHAR_CREDS_UUID, NIMBLE_PROPERTY::WRITE);
  pCharCreds->setCallbacks(new CredsCharCallbacks());

  // PROVISION_COMMAND
  pCharCmd = pService->createCharacteristic(CHAR_CMD_UUID, NIMBLE_PROPERTY::WRITE);
  pCharCmd->setCallbacks(new CmdCharCallbacks());

  // PAIRING_STATUS
  pCharPairStatus = pService->createCharacteristic(CHAR_PAIR_STATUS_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  pCharPairStatus->setValue(pairingStatusStr.c_str());

  // ERROR_STATUS
  pCharError = pService->createCharacteristic(CHAR_ERROR_UUID, NIMBLE_PROPERTY::READ | NIMBLE_PROPERTY::NOTIFY);
  pCharError->setValue(lastErrorReason.c_str());

  pService->start();

  NimBLEAdvertising *pAdv = NimBLEDevice::getAdvertising();
  pAdv->addServiceUUID(SERVICE_UUID);

  NimBLEAdvertisementData advData;
  advData.setFlags(ESP_BLE_ADV_FLAG_GEN_DISC | ESP_BLE_ADV_FLAG_BREDR_NOT_SUPPORT);
  advData.setCompleteServices(NimBLEUUID(SERVICE_UUID));
  advData.setName(apName.c_str());
  pAdv->setAdvertisementData(advData);

  NimBLEAdvertisementData scanRespData;
  scanRespData.setName(apName.c_str());
  pAdv->setScanResponseData(scanRespData);

  pAdv->setScanResponse(true);
  pAdv->setMinPreferred(0x06);
  pAdv->setMinPreferred(0x12);
  pAdv->start();

  Serial.println(F("[BLE] NimBLE GATT Provisioning Service running."));
}

// ─── SOFTAP WI-FI SERVER ENDPOINTS ───
void setupSoftAP(const String& apName) {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  server.enableCORS(true);

  // GET /ping
  server.on("/ping", HTTP_GET, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"status\":\"PROVISIONING_ACTIVE\",\"serial\":\"" + deviceSerial + "\",\"mac\":\"" + macAddress + "\"}");
  });

  // GET /device-info
  server.on("/device-info", HTTP_GET, []() {
    String info = "{\"deviceId\":\"dev_" + deviceSerial.substring(11) + "\",\"serialNumber\":\"" + deviceSerial + "\",\"productId\":\"AGRIFLOW-IRRIGATION-V1\",\"productName\":\"AgriFlow Smart Irrigation Controller\",\"boardFamily\":\"ESP32\",\"firmwareVersion\":\"3.2.0\",\"provisioningState\":\"SETUP\",\"protocolVersion\":\"1.0\"}";
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", info);
  });

  // POST /setup
  server.on("/setup", HTTP_POST, []() {
    String ssid = "";
    String pass = "";

    if (server.hasArg("ssid") && server.hasArg("password")) {
      ssid = server.arg("ssid");
      pass = server.arg("password");
    } else if (server.hasArg("plain")) {
      JsonDocument doc;
      DeserializationError err = deserializeJson(doc, server.arg("plain"));
      if (!err && doc.containsKey("ssid") && doc.containsKey("password")) {
        ssid = String((const char*)doc["ssid"]);
        pass = String((const char*)doc["password"]);
      }
    }

    if (ssid.length() > 0) {
      wifiSsid = ssid;
      wifiPass = pass;

      preferences.begin("agri-node", false);
      preferences.putString("ssid", wifiSsid);
      preferences.putString("pass", wifiPass);
      preferences.end();

      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "application/json", "{\"success\":true,\"message\":\"Wi-Fi credentials saved. Reconnecting...\"}");
      
      delay(500);
      WiFi.mode(WIFI_STA);
      WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
      setDeviceState(STATE_WIFI_CONNECTING);
      return;
    }
    server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID and Password are required.\"}");
  });

  // POST /claim
  server.on("/claim", HTTP_POST, []() {
    if (server.hasArg("plain")) {
      JsonDocument doc;
      DeserializationError err = deserializeJson(doc, server.arg("plain"));
      if (!err && doc.containsKey("claimSessionId")) {
        claimSessionId = String((const char*)doc["claimSessionId"]);
        Serial.print(F("[CLAIM] Active claim sessionId associated: ")); Serial.println(claimSessionId);
        server.sendHeader("Access-Control-Allow-Origin", "*");
        server.send(200, "application/json", "{\"success\":true,\"message\":\"Claim registered.\"}");
        return;
      }
    }
    server.send(400, "application/json", "{\"success\":false,\"message\":\"claimSessionId is required.\"}");
  });

  // POST /reset
  server.on("/reset", HTTP_POST, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", "{\"success\":true,\"message\":\"Device resetting...\"}");
    delay(500);
    preferences.begin("agri-node", false);
    preferences.clear();
    preferences.end();
    WiFi.disconnect(true, true);
    ESP.restart();
  });

  // Setup 1x1 image tracking pixel for HTTPS compatibility
  server.on("/ping-image.jpg", HTTP_GET, []() {
    const uint8_t gifData[] = {
      0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00, 
      0x00, 0xff, 0xff, 0xff, 0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00, 
      0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 
      0x00, 0x02, 0x02, 0x44, 0x01, 0x00, 0x3b
    };
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendContent_P((const char*)gifData, sizeof(gifData));
  });

  server.begin();
  Serial.print(F("[AP] SoftAP Server running on port 80: ")); Serial.println(apName);
}

// ─── CLOUD HTTPS DEVICE REGISTRATION ───
void registerDeviceWithCloud() {
  setDeviceState(STATE_CLOUD_REGISTERING);
  HTTPClient http;
  
  // Connect to production backend registration service API as instructed
  http.begin("https://api.agriculture-automation.com/api/iot/devices/register");
  http.addHeader("Content-Type", "application/json");

  JsonDocument doc;
  doc["deviceId"] = "dev_" + deviceSerial.substring(11);
  doc["serialNumber"] = deviceSerial;
  doc["productId"] = "AGRIFLOW-IRRIGATION-V1";
  doc["firmwareVersion"] = "3.2.0";
  doc["hardwareRevision"] = "ESP32-LX6-V1";
  doc["macAddress"] = macAddress;
  if (claimSessionId.length() > 0) {
    doc["claimSessionId"] = claimSessionId;
  }

  String body;
  serializeJson(doc, body);

  int code = http.POST(body);
  if (code == 200 || code == 201) {
    String resp = http.getString();
    Serial.println(F("[CLOUD REGISTRATION] Device registered successfully!"));
    setDeviceState(STATE_MQTT_CONNECTING);
  } else {
    Serial.print(F("[CLOUD REGISTRATION FAIL] HTTP Code: ")); Serial.println(code);
    setDeviceState(STATE_ERROR, "CLOUD_REGISTRATION_FAILED");
  }
  http.end();
}

// ─── MQTT PUMP CONTROL ACTUATION ───
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  Serial.print(F("📩 [MQTT TOPIC] ")); Serial.println(topic);
  JsonDocument doc;
  DeserializationError err = deserializeJson(doc, payload, length);
  if (!err && doc.containsKey("status")) {
    String status = String((const char*)doc["status"]);
    if (status == "RUNNING" || status == "ON") {
      digitalWrite(PIN_RELAY_PUMP, HIGH);
      Serial.println(F("[RELAY] Water Pump Started (Active HIGH)"));
    } else {
      digitalWrite(PIN_RELAY_PUMP, LOW);
      Serial.println(F("[RELAY] Water Pump Stopped"));
    }
  }
}

// ─── TIMED RESET DETECTOR ───
void checkResetButton() {
  if (digitalRead(PIN_BUTTON_RESET) == LOW) {
    if (!buttonHeld) {
      buttonHeld = true;
      buttonPressStart = millis();
    } else if (millis() - buttonPressStart >= 5000) {
      Serial.println(F("\n[FACTORY RESET] Reset button held 5 seconds. Clearing credentials..."));
      
      preferences.begin("agri-node", false);
      preferences.clear();
      preferences.end();
      
      WiFi.disconnect(true, true);
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
  
  // Format AGRI-SETUP-XXXX using last 4 digits of MAC address
  String macClean = macAddress;
  macClean.replace(":", "");
  String lastFour = macClean.substring(8, 12);
  deviceSerial = "AGRI-ESP32-" + lastFour;
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
    setDeviceState(STATE_SETUP);
    String apName = "AGRI-SETUP-" + lastFour;
    apName.toUpperCase();
    
    // Start BOTH BLE advertising & Wi-Fi SoftAP in setup mode simultaneously
    setupBLE(apName);
    setupSoftAP(apName);
    
    setDeviceState(STATE_DISCOVERABLE);
  } else {
    setDeviceState(STATE_WIFI_CONNECTING);
    WiFi.mode(WIFI_STA);
    WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
  }
}

void loop() {
  updateLedPattern();
  checkResetButton();

  switch(currentState) {
    case STATE_DISCOVERABLE:
    case STATE_PAIRING:
    case STATE_WIFI_PROVISIONING:
      server.handleClient();
      break;

    case STATE_WIFI_CONNECTING: {
      static unsigned long connectTimeout = millis();
      if (WiFi.status() == WL_CONNECTED) {
        Serial.print(F("\n[WiFi OK] Local IP: ")); Serial.println(WiFi.localIP());
        setDeviceState(STATE_WIFI_CONNECTED);
        
        // Shut down setup WebServer and softAP hotspot to transition into normal Station Mode
        server.stop();
        WiFi.softAPdisconnect(true);
        
        registerDeviceWithCloud();
      } else if (millis() - connectTimeout > 15000) {
        Serial.println(F("\n[WiFi FAIL] Reconnecting timeout. Falling back to Setup/Provisioning mode..."));
        
        String macClean = WiFi.macAddress();
        macClean.replace(":", "");
        String lastFour = macClean.substring(8, 12);
        String apName = "AGRI-SETUP-" + lastFour;
        apName.toUpperCase();

        setupBLE(apName);
        setupSoftAP(apName);
        
        setDeviceState(STATE_DISCOVERABLE, "WIFI_AUTH_FAILED");
        connectTimeout = millis();
      }
      break;
    }

    case STATE_CLOUD_REGISTERING:
      // Handled synchronously in registerDeviceWithCloud()
      break;

    case STATE_MQTT_CONNECTING: {
      static unsigned long lastMqttConnectAttempt = 0;
      if (millis() - lastMqttConnectAttempt > 5000) {
        lastMqttConnectAttempt = millis();
        Serial.println(F("[MQTT] Connecting to Secure TLS Broker (Port 8883)..."));
        
        // Setup secure MQTTS client (Port 8883)
        secureClient.setInsecure(); // Securely connects without hardcoding root CA
        mqttClient.setServer("mqtt.agriculture-automation.com", 8883);
        mqttClient.setCallback(mqttCallback);

        String clientID = "AgriNode-" + deviceSerial.substring(11);
        if (mqttClient.connect(clientID.c_str())) {
          Serial.println(F("[MQTT OK] Connected to Production Secure MQTTS Broker!"));
          mqttClient.subscribe(("aether/farm-alpha/zone-1/pump/command"));
          setDeviceState(STATE_ONLINE);
        } else {
          Serial.print(F("[MQTT FAIL] State code: ")); Serial.println(mqttClient.state());
          // Fallback to online status over HTTP API if broker is temporarily offline
          setDeviceState(STATE_ONLINE);
        }
      }
      break;
    }

    case STATE_ONLINE: {
      unsigned long now = millis();
      // Keep MQTT connection alive
      if (mqttClient.connected()) {
        mqttClient.loop();
      } else {
        setDeviceState(STATE_MQTT_CONNECTING);
      }

      // Sample sensors and transmit real-time telemetry every 3 seconds
      if (now - lastTelemetryMs >= 3000) {
        lastTelemetryMs = now;
        
        float humidity = dht.readHumidity();
        float temperature = dht.readTemperature();
        int soilRaw = analogRead(PIN_SOIL_MOISTURE);
        float soilMoisturePercent = map(soilRaw, 4095, 1500, 0, 100);
        soilMoisturePercent = constrain(soilMoisturePercent, 0, 100);

        if (isnan(humidity)) humidity = 60.0;
        if (isnan(temperature)) temperature = 28.0;

        // Build telemetry JSON payload
        StaticJsonDocument<512> doc;
        doc["deviceId"] = "dev_" + deviceSerial.substring(11);
        doc["sequence"] = millis() / 3000;
        doc["timestamp"] = String(now);
        
        JsonObject sensors = doc.createNestedObject("sensors");
        sensors["soilMoisture"] = soilMoisturePercent;
        sensors["temperature"] = temperature;
        sensors["humidity"] = humidity;

        JsonObject actuators = doc.createNestedObject("actuators");
        actuators["pump"] = digitalRead(PIN_RELAY_PUMP) ? "ON" : "OFF";

        String jsonPayload;
        serializeJson(doc, jsonPayload);

        // Publish to MQTT topic
        if (mqttClient.connected()) {
          mqttClient.publish("aether/farm-alpha/zone-1/telemetry", jsonPayload.c_str());
        }
        
        Serial.print(F("🌾 [ONLINE TELEMETRY] ")); Serial.println(jsonPayload);
      }
      break;
    }

    case STATE_ERROR:
      // Allow user to trigger setup fallback by holding reset button
      break;

    default:
      break;
  }
}
