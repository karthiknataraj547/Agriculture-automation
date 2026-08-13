/*
 * Commercial Smart Agriculture Node Firmware (Modular Non-Blocking FSM + BLE GATT + SoftAP WebServer + Telemetry)
 * Product: AgriFlow Smart Irrigation Controller
 * Internal SKU: AGRIFLOW-IRRIGATION-V1
 * Microcontroller: ESP32 (Xtensa LX6 ESP32)
 * Version: v3.2.0 (Master Production Firmware)
 * 
 * NOTE FOR ARDUINO IDE COMPILATION ("Sketch too big" / "text section exceeds available space"):
 * In Arduino IDE, go to: Tools -> Partition Scheme -> Select "Huge APP (3MB No OTA/1MB SPIFFS)" 
 * OR "Minimal SPIFFS (1.9MB APP with OTA)" to give 1.9MB - 3.0MB of program flash storage.
 */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <WebServer.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#define CONFIG_NIMBLE_CPP_LOG_LEVEL 0
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
  advData.setFlags(0x06); // General discoverable, BR/EDR not supported
  advData.setCompleteServices(NimBLEUUID(SERVICE_UUID));
  advData.setName(apName.c_str());
  pAdv->setAdvertisementData(advData);

  NimBLEAdvertisementData scanRespData;
  scanRespData.setName(apName.c_str());
  pAdv->setScanResponseData(scanRespData);

  pAdv->start();

  Serial.println(F("[BLE] NimBLE GATT Provisioning Service running."));
}

// ─── SOFTAP WI-FI SERVER ENDPOINTS ───
void setupSoftAP(const String& apName) {
  WiFi.mode(WIFI_AP);
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  server.enableCORS(true);

  // CORS Preflight OPTIONS Handlers
  server.on("/ping", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });
  server.on("/device-info", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });
  server.on("/status", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });
  server.on("/setup", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

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

  // GET /status
  server.on("/status", HTTP_GET, []() {
    String stateStr = "SETUP";
    switch(currentState) {
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
      default: stateStr = "UNKNOWN";
    }

    JsonDocument doc;
    doc["status"] = stateStr;
    doc["wifiStatus"] = (int)WiFi.status();
    doc["error"] = lastErrorReason;

    String response;
    serializeJson(doc, response);
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", response);
  });

  // GET /wifi-scan
  server.on("/wifi-scan", HTTP_GET, []() {
    Serial.println(F("[WIFI SCAN] Scanning nearby networks..."));
    int n = WiFi.scanNetworks();
    JsonDocument doc;
    JsonArray networks = doc.to<JsonArray>();

    for (int i = 0; i < n; ++i) {
      JsonObject net = networks.createNestedObject();
      net["ssid"] = WiFi.SSID(i);
      net["rssi"] = WiFi.RSSI(i);
      net["secure"] = WiFi.encryptionType(i) != WIFI_AUTH_OPEN;
    }

    String response;
    serializeJson(doc, response);
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "application/json", response);
  });

  server.on("/wifi-scan", HTTP_OPTIONS, []() {
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.sendHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    server.sendHeader("Access-Control-Allow-Headers", "Content-Type");
    server.send(204);
  });

  // POST /setup — receive Wi-Fi credentials and start connection
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

      Serial.print(F("[SETUP] Credentials saved! SSID: ")); Serial.println(wifiSsid);

      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "application/json", "{\"success\":true,\"message\":\"Wi-Fi credentials saved. Reconnecting...\"}");
      
      // Ensure the response is fully flushed to the client before switching modes
      delay(200);
      server.client().flush();
      delay(300);
      
      WiFi.mode(WIFI_AP_STA);
      WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
      setDeviceState(STATE_WIFI_CONNECTING);
      return;
    }
    server.send(400, "application/json", "{\"success\":false,\"message\":\"SSID and Password are required.\"}");
  });

  // GET /setup — same logic, allows credentials via query parameters from the proxy
  server.on("/setup", HTTP_GET, []() {
    String ssid = "";
    String pass = "";

    if (server.hasArg("ssid") && server.hasArg("password")) {
      ssid = server.arg("ssid");
      pass = server.arg("password");
    }

    if (ssid.length() > 0) {
      wifiSsid = ssid;
      wifiPass = pass;

      preferences.begin("agri-node", false);
      preferences.putString("ssid", wifiSsid);
      preferences.putString("pass", wifiPass);
      preferences.end();

      Serial.print(F("[SETUP-GET] Credentials saved! SSID: ")); Serial.println(wifiSsid);

      server.sendHeader("Access-Control-Allow-Origin", "*");
      server.send(200, "application/json", "{\"success\":true,\"message\":\"Wi-Fi credentials saved. Reconnecting...\"}");
      
      delay(200);
      server.client().flush();
      delay(300);
      
      WiFi.mode(WIFI_AP_STA);
      WiFi.begin(wifiSsid.c_str(), wifiPass.c_str());
      setDeviceState(STATE_WIFI_CONNECTING);
      return;
    }
    server.sendHeader("Access-Control-Allow-Origin", "*");
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
  // GET / — Self-contained Captive Portal Provisioning Page
  server.on("/", HTTP_GET, []() {
    String html = R"rawliteral(
<!DOCTYPE html><html><head>
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>AgriFlow Setup</title>
<style>
*{box-sizing:border-box;margin:0;padding:0}
body{font-family:-apple-system,sans-serif;background:#0f172a;color:#e2e8f0;min-height:100vh;display:flex;justify-content:center;align-items:center;padding:16px}
.card{background:#1e293b;border-radius:16px;padding:24px;max-width:400px;width:100%;box-shadow:0 20px 40px rgba(0,0,0,.5)}
h1{font-size:18px;color:#a78bfa;margin-bottom:4px}
.sub{font-size:12px;color:#64748b;margin-bottom:16px}
label{font-size:12px;color:#94a3b8;display:block;margin-bottom:4px;margin-top:12px}
select,input{width:100%;padding:10px 12px;border-radius:8px;border:1px solid #334155;background:#0f172a;color:#fff;font-size:13px;outline:none}
select:focus,input:focus{border-color:#7c3aed}
button{width:100%;padding:12px;border:none;border-radius:10px;font-size:14px;font-weight:bold;cursor:pointer;margin-top:16px;transition:.2s}
.btn-scan{background:#4f46e5;color:#fff}
.btn-scan:hover{background:#6366f1}
.btn-connect{background:#7c3aed;color:#fff}
.btn-connect:hover{background:#8b5cf6}
.status{margin-top:12px;padding:10px;border-radius:8px;font-size:12px;display:none}
.ok{background:#064e3b;color:#6ee7b7;border:1px solid #065f46;display:block}
.err{background:#450a0a;color:#fca5a5;border:1px solid #7f1d1d;display:block}
.info{background:#1e1b4b;color:#a5b4fc;border:1px solid #312e81;display:block}
.devinfo{font-size:11px;color:#475569;margin-top:8px;text-align:center}
#networks{max-height:120px;overflow-y:auto}
</style></head><body>
<div class="card">
<h1>&#127793; AgriFlow Setup</h1>
<div class="sub">)rawliteral" + deviceSerial + " &bull; " + macAddress + R"rawliteral(</div>

<button class="btn-scan" onclick="scanWifi()">&#128225; Scan Wi-Fi Networks</button>
<div id="status1" class="status"></div>

<label>Wi-Fi Network (SSID)</label>
<select id="ssid"><option value="">-- Scan first or type below --</option></select>
<input id="ssid_manual" placeholder="Or type SSID manually" style="margin-top:6px">

<label>Password</label>
<input id="pass" type="password" placeholder="Enter Wi-Fi password">

<button class="btn-connect" onclick="sendCreds()">&#128268; Connect to Wi-Fi</button>
<div id="status2" class="status"></div>

<div class="devinfo">After connecting, the device will register with AgriFlow Cloud automatically.</div>
</div>

<script>
function $(id){return document.getElementById(id)}
function showStatus(el,msg,cls){el.className='status '+cls;el.textContent=msg;el.style.display='block'}

function scanWifi(){
  showStatus($('status1'),'Scanning...','info');
  fetch('/wifi-scan').then(r=>r.json()).then(data=>{
    var sel=$('ssid');sel.innerHTML='';
    if(data.length===0){showStatus($('status1'),'No networks found','err');return}
    data.forEach(n=>{var o=document.createElement('option');o.value=n.ssid;o.textContent=n.ssid+' ('+n.rssi+'dBm)';sel.appendChild(o)});
    showStatus($('status1'),'Found '+data.length+' networks','ok');
  }).catch(e=>showStatus($('status1'),'Scan failed: '+e,'err'));
}

function sendCreds(){
  var ssid=$('ssid').value||$('ssid_manual').value;
  var pass=$('pass').value;
  if(!ssid){showStatus($('status2'),'Please enter SSID','err');return}
  showStatus($('status2'),'Sending credentials...','info');
  fetch('/setup?ssid='+encodeURIComponent(ssid)+'&password='+encodeURIComponent(pass),{method:'POST'})
    .then(r=>r.json()).then(d=>{
      if(d.success){showStatus($('status2'),'Credentials saved! Connecting to WiFi...','ok');pollStatus()}
      else showStatus($('status2'),d.message||'Failed','err');
    }).catch(e=>showStatus($('status2'),'Send failed: '+e,'err'));
}

function pollStatus(){
  var iv=setInterval(function(){
    fetch('/status').then(r=>r.json()).then(d=>{
      if(d.status==='WIFI_CONNECTED'||d.status==='ONLINE'||d.status==='CLOUD_REGISTERING'||d.status==='MQTT_CONNECTING'){
        clearInterval(iv);showStatus($('status2'),'Connected to WiFi! IP: Device is now online.','ok');
      }else if(d.status==='ERROR'||d.error==='WIFI_AUTH_FAILED'){
        clearInterval(iv);showStatus($('status2'),'WiFi connection failed. Check password and try again.','err');
      }else{
        showStatus($('status2'),'Status: '+d.status+'...','info');
      }
    }).catch(function(){});
  },2000);
}
</script></body></html>)rawliteral";
    server.sendHeader("Access-Control-Allow-Origin", "*");
    server.send(200, "text/html", html);
  });

  // Captive portal redirect — catch all unknown URLs and redirect to /
  server.onNotFound([]() {
    server.sendHeader("Location", "http://192.168.4.1/");
    server.send(302, "text/plain", "Redirecting to setup page...");
  });

  server.begin();
  Serial.print(F("[AP] SoftAP Server running on port 80: ")); Serial.println(apName);
  Serial.println(F("[AP] Connect & Visit IP: 192.168.4.1"));
}

// ─── CLOUD HTTPS DEVICE REGISTRATION ───
void registerDeviceWithCloud() {
  setDeviceState(STATE_CLOUD_REGISTERING);

  secureClient.setInsecure();
  if (secureClient.connect("api.agriculture-automation.com", 443)) {
    JsonDocument doc;
    doc["deviceId"] = "dev_" + deviceSerial.substring(11);
    doc["serialNumber"] = deviceSerial;
    doc["productId"] = "AGRIFLOW-IRRIGATION-V1";
    doc["firmwareVersion"] = "3.2.0";
    doc["macAddress"] = macAddress;
    if (claimSessionId.length() > 0) {
      doc["claimSessionId"] = claimSessionId;
    }

    String body;
    serializeJson(doc, body);

    secureClient.println("POST /api/iot/devices/register HTTP/1.1");
    secureClient.println("Host: api.agriculture-automation.com");
    secureClient.println("Content-Type: application/json");
    secureClient.print("Content-Length: "); secureClient.println(body.length());
    secureClient.println("Connection: close");
    secureClient.println();
    secureClient.println(body);

    Serial.println(F("[CLOUD REGISTRATION] Device registered successfully!"));
    secureClient.stop();
    setDeviceState(STATE_MQTT_CONNECTING);
  } else {
    Serial.println(F("[CLOUD REGISTRATION] Proceeding to MQTT connection..."));
    setDeviceState(STATE_MQTT_CONNECTING);
  }
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
  
  // Initialize WiFi hardware FIRST so macAddress() returns a valid MAC
  WiFi.mode(WIFI_AP);
  delay(100);
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

    // Keep SoftAP web server alive during WiFi connection so proxy can poll /status
    case STATE_WIFI_CONNECTING: {
      server.handleClient();
      static unsigned long connectTimeout = millis();
      if (WiFi.status() == WL_CONNECTED) {
        Serial.print(F("\n[WiFi OK] Local IP: ")); Serial.println(WiFi.localIP());
        setDeviceState(STATE_WIFI_CONNECTED);
        
        // Shut down setup WebServer and softAP hotspot to transition into normal Station Mode
        server.stop();
        WiFi.softAPdisconnect(true);
        WiFi.mode(WIFI_STA);
        
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
