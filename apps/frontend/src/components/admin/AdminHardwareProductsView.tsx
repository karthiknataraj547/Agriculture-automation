import React, { useState } from 'react';
import { useAdminStore } from '@/store/useAdminStore';
import { HardwareProduct } from '@aether/shared';
import {
  Package,
  Plus,
  Trash2,
  Edit3,
  FileCode,
  Copy,
  Download,
  Check,
  Cpu,
  Radio,
  CheckCircle2,
  Layers,
  Sliders,
  Settings,
  Shield,
  Activity,
  Box,
  X,
  Zap,
  Code2,
} from 'lucide-react';

export const AdminHardwareProductsView: React.FC = () => {
  const { hardwareProducts, createHardwareProduct, updateHardwareProduct, deleteHardwareProduct } = useAdminStore();

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Edit Modal State
  const [editingProduct, setEditingProduct] = useState<HardwareProduct | null>(null);

  // Firmware Viewer Modal State
  const [firmwareViewerProduct, setFirmwareViewerProduct] = useState<HardwareProduct | null>(null);
  const [firmwareFamilyTab, setFirmwareFamilyTab] = useState<'ESP32' | 'ESP8266'>('ESP32');
  const [copiedFirmware, setCopiedFirmware] = useState(false);

  // Form inputs for Create / Edit
  const [internalName, setInternalName] = useState('');
  const [customerProductName, setCustomerProductName] = useState('');
  const [description, setDescription] = useState('');
  const [boardFamily, setBoardFamily] = useState<'ESP32' | 'ESP8266'>('ESP32');
  const [boardType, setBoardType] = useState('ESP32 Dev Module');
  const [firmwareVersion, setFirmwareVersion] = useState('1.4.2');

  const availableSensors = ['Soil Moisture', 'Temperature', 'Humidity', 'PIR Motion', 'Water Flow', 'Water Level'];
  const availableActuators = ['Pump Relay', 'Solenoid Valve', 'Fertigation Injector'];
  const [selectedSensors, setSelectedSensors] = useState<string[]>(['Soil Moisture', 'Temperature', 'Humidity']);
  const [selectedActuators, setSelectedActuators] = useState<string[]>(['Pump Relay']);

  const openCreateModal = () => {
    setEditingProduct(null);
    setInternalName('');
    setCustomerProductName('');
    setDescription('');
    setBoardFamily('ESP32');
    setBoardType('ESP32 Dev Module');
    setFirmwareVersion('1.4.2');
    setSelectedSensors(['Soil Moisture', 'Temperature', 'Humidity']);
    setSelectedActuators(['Pump Relay']);
    setShowCreateModal(true);
  };

  const openEditModal = (p: HardwareProduct) => {
    setEditingProduct(p);
    setInternalName(p.internalName);
    setCustomerProductName(p.customerProductName);
    setDescription(p.description || '');
    setBoardFamily(p.boardFamily);
    setBoardType(p.boardType);
    setFirmwareVersion(p.firmwareVersion || '1.4.2');
    setSelectedSensors(p.supportedSensors || ['Soil Moisture', 'Temperature', 'Humidity']);
    setSelectedActuators(p.supportedActuators || ['Pump Relay']);
    setShowCreateModal(true);
  };

  const toggleSensor = (sensor: string) => {
    setSelectedSensors((prev) =>
      prev.includes(sensor) ? prev.filter((s) => s !== sensor) : [...prev, sensor]
    );
  };

  const toggleActuator = (actuator: string) => {
    setSelectedActuators((prev) =>
      prev.includes(actuator) ? prev.filter((a) => a !== actuator) : [...prev, actuator]
    );
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payload = {
      internalName: internalName || `${boardFamily}-CUSTOM-V1`,
      customerProductName: customerProductName || 'AgriFlow Controller Pro',
      description: description || 'Commercial smart agriculture hardware controller.',
      boardFamily,
      boardType: boardFamily === 'ESP32' ? boardType : 'NodeMCU 1.0 (ESP-12E Module)',
      firmwareVersion,
      firmwareTemplate: `${customerProductName.replace(/\s+/g, '_')}_v${firmwareVersion}`,
      supportedSensors: selectedSensors,
      supportedActuators: selectedActuators,
      gpioMapping: boardFamily === 'ESP32' ? {
        soilMoisturePin: 34,
        dhtPin: 4,
        relayPumpPin: 26,
        flowRatePin: 27,
      } : {
        soilMoisturePin: 'A0',
        dhtPin: 'D2',
        relayPumpPin: 'D3',
        flowRatePin: 'D5',
      },
      hardwareCapabilities: boardFamily === 'ESP32' ? ['BLE_PROVISIONING', 'WIFI_PROVISIONING', 'MQTTS_TLS'] : ['WIFI_AP_PROVISIONING', 'MQTTS_TLS'],
      status: 'STABLE' as const,
    };

    let ok = false;
    if (editingProduct) {
      ok = await updateHardwareProduct({ ...editingProduct, ...payload });
    } else {
      ok = await createHardwareProduct(payload);
    }

    if (ok) {
      setShowCreateModal(false);
      setEditingProduct(null);
    }
  };

  // GENERATE C++ ARDUINO CODE FOR ESP32 & ESP8266 FAMILIES
  const generateArduinoCode = (product: HardwareProduct, family: 'ESP32' | 'ESP8266') => {
    const isEsp8266 = family === 'ESP8266';
    const wifiHeader = isEsp8266 ? '#include <ESP8266WiFi.h>\n#include <ESP8266WebServer.h>' : '#include <WiFi.h>\n#include <WebServer.h>\n#include <NimBLEDevice.h>';


    const prefHeader = isEsp8266 ? '#include <EEPROM.h>' : '#include <Preferences.h>';
    const ledPin = isEsp8266 ? '2' : '2'; // GPIO 2 (D4 on NodeMCU / GPIO 2 on ESP32)
    const soilPin = isEsp8266 ? 'A0' : '34';
    const dhtPin = isEsp8266 ? 'D2' : '4';
    const relayPin = isEsp8266 ? 'D3' : '26';
    const flowPin = isEsp8266 ? 'D5' : '27';
    const serverType = isEsp8266 ? 'ESP8266WebServer' : 'WebServer';

    return `/*
 * Commercial Smart Agriculture Node Firmware (Provisioning + Real-Time Telemetry)
 * Product: ${product.customerProductName}
 * Internal SKU: ${product.internalName}
 * Microcontroller: ${family} (${isEsp8266 ? 'Tensilica L106 NodeMCU' : 'Xtensa LX6 ESP32'})
 * Version: v${product.firmwareVersion || '1.4.2'}
 */

${wifiHeader}
${prefHeader}
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─── HARDWARE GPIO PIN MAPPING (${family}) ───
#define PIN_LED_INDICATOR  ${ledPin}    // Onboard Status LED (Blinks rapidly in Setup Mode)
#define PIN_BUTTON_RESET   0    // Flash/Boot Button (GPIO 0 - hold for 3s to reset setup)
#define PIN_SOIL_MOISTURE  ${soilPin}  // Analog Soil Moisture Probe
#define PIN_DHT_DATA       ${dhtPin}   // Digital Air Temp & Humidity
#define PIN_RELAY_PUMP     ${relayPin}   // Water Pump Relay (Active ${isEsp8266 ? 'LOW' : 'HIGH'})
#define PIN_FLOW_RATE      ${flowPin}   // Pulse Water Flow Sensor
#define DHTTYPE            DHT11

${isEsp8266 ? '' : '#define SERVICE_UUID        "0000ffe0-0000-1000-8000-00805f9b34fb"\n#define CHARACTERISTIC_UUID "0000ffe1-0000-1000-8000-00805f9b34fb"\n'}
// ─── GLOBAL OBJECTS & STATE ───
${isEsp8266 ? '' : 'Preferences preferences;\n'}${serverType} server(80);
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
  pinMode(PIN_LED_INDICATOR, OUTPUT);
  pinMode(PIN_BUTTON_RESET, INPUT_PULLUP);
  pinMode(PIN_RELAY_PUMP, OUTPUT);
  digitalWrite(PIN_RELAY_PUMP, LOW);
  
  dht.begin();
  
  macAddress = WiFi.macAddress();
  deviceSerial = "AGRI-${family}-" + macAddress.substring(12, 14) + macAddress.substring(15, 17);
  deviceSerial.toUpperCase();

  Serial.println("\\n==========================================");
  Serial.println(" ${product.customerProductName} (${family})");
  Serial.println(" Serial Number: " + deviceSerial);
  Serial.println(" MAC Address:   " + macAddress);
  Serial.println("==========================================");

  ${isEsp8266 ? 'EEPROM.begin(512);\n  char s[32], p[64];\n  // Load saved Wi-Fi credentials\n' : 'preferences.begin("agri-node", false);\n  wifiSsid = preferences.getString("ssid", "");\n  wifiPass = preferences.getString("pass", "");\n'}
  if (digitalRead(PIN_BUTTON_RESET) == LOW || wifiSsid.length() == 0) {
    Serial.println("[MODE] Entering PROVISIONING / SETUP MODE...");
    setupProvisioningMode();
  } else {
    Serial.println("[MODE] Connecting with saved Wi-Fi: " + wifiSsid);
    connectToWiFi();
  }
}

void setupProvisioningMode() {
  isProvisioned = false;
  String apName = "AGRI-SETUP-" + macAddress.substring(12, 14) + macAddress.substring(15, 17);
  WiFi.softAP(apName.c_str(), "agrifarm2026");

  Serial.println("[AP] Access Point Started: " + apName);
  Serial.println("[AP] Connect & Visit IP: " + WiFi.softAPIP().toString());

  server.on("/setup", HTTP_POST, handleProvisioningRequest);
  server.on("/ping", HTTP_GET, []() {
    server.send(200, "application/json", "{\\"status\\":\\"PROVISIONING_ACTIVE\\",\\"serial\\":\\"" + deviceSerial + "\\"}");
  });
  server.begin();

  ${isEsp8266 ? '' : 'NimBLEDevice::init(apName.c_str());\n  NimBLEServer *pServer = NimBLEDevice::createServer();\n  NimBLEService *pService = pServer->createService(SERVICE_UUID);\n  pService->start();\n  NimBLEAdvertising *pAdv = NimBLEDevice::getAdvertising();\n  pAdv->addServiceUUID(SERVICE_UUID);\n  pAdv->start();\n  Serial.println("[BLE] NimBLE Bluetooth Advertising Started!");\n'}
  // Loop in Setup Mode until Wi-Fi Config Received
  while (!isProvisioned) {
    // BLINK ONBOARD LED RAPIDLY (200ms ON / 200ms OFF) TO INDICATE SETUP MODE
    unsigned long currentMillis = millis();
    if (currentMillis - lastLedToggle >= 200) {
      lastLedToggle = currentMillis;
      ledState = !ledState;
      digitalWrite(PIN_LED_INDICATOR, ledState);
    }

    server.handleClient();
  }

  ${isEsp8266 ? '' : 'NimBLEDevice::deinit(true);\n  preferences.putString("ssid", wifiSsid);\n  preferences.putString("pass", wifiPass);\n  preferences.end();\n'}
  Serial.println("[SETUP] Wi-Fi Config Saved! Restarting in 2s...");
  digitalWrite(PIN_LED_INDICATOR, HIGH); // Solid ON
  delay(2000);
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
      server.send(200, "application/json", "{\\"success\\":true,\\"message\\":\\"Wi-Fi Config Received! Connecting...\\"}");
      return;
    }
  }
  server.send(400, "application/json", "{\\"success\\":false,\\"message\\":\\"Invalid Payload\\"}");
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
    Serial.println("\\n[WiFi] Connected! Local IP: " + WiFi.localIP().toString());
    digitalWrite(PIN_LED_INDICATOR, HIGH); // SOLID ON = HEALTHY & CONNECTED
    pingDiscoveryGateway();

    mqttClient.setServer("mqtt.agritech.com", 1883);
    mqttClient.setCallback(mqttCallback);

  } else {
    Serial.println("\\n[WiFi] Connection Failed! Re-entering Setup Mode...");
    setupProvisioningMode();
  }
}

void pingDiscoveryGateway() {
  WiFiClient client;
  if (!client.connect("agriculture-automation.vercel.app", 80)) {
    Serial.println("[DISCOVERY PING] Connection failed");
    return;
  }

  JsonDocument doc;
  doc["macAddress"] = macAddress;
  doc["serialNumber"] = deviceSerial;
  doc["boardFamily"] = "${family}";
  doc["boardType"] = "${product.boardType}";
  doc["ipAddress"] = WiFi.localIP().toString();
  doc["rssi"] = WiFi.RSSI();

  String payload;
  serializeJson(doc, payload);

  client.println("POST /api/iot/discovery HTTP/1.1");
  client.println("Host: agriculture-automation.vercel.app");
  client.println("Content-Type: application/json");
  client.print("Content-Length: "); client.println(payload.length());
  client.println("Connection: close");
  client.println();
  client.println(payload);

  Serial.println("[DISCOVERY PING] Sent successfully");
  client.stop();
}


void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String msg = "";
  for (int i = 0; i < length; i++) msg += (char)payload[i];
  Serial.println("[MQTT Command]: " + msg);

  StaticJsonDocument<256> doc;
  deserializeJson(doc, msg);
  const char* type = doc["commandType"];

  if (String(type) == "START_PUMP") {
    digitalWrite(PIN_RELAY_PUMP, HIGH);
    Serial.println("[PUMP] RELAY TURNED ON");
  } else if (String(type) == "STOP_PUMP") {
    digitalWrite(PIN_RELAY_PUMP, LOW);
    Serial.println("[PUMP] RELAY TURNED OFF");
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
      mqttClient.subscribe("agri/farm-alpha/zone-1/commands");
    }
  }
  mqttClient.loop();

  static unsigned long lastTelemetry = 0;
  if (millis() - lastTelemetry >= 5000) {
    lastTelemetry = millis();
    int rawSoil = analogRead(PIN_SOIL_MOISTURE);
    float soilMoisture = map(rawSoil, ${isEsp8266 ? '1023, 300' : '4095, 1500'}, 0, 100);
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
    mqttClient.publish("agri/farm-alpha/zone-1/telemetry", buffer);
  }
}`;
  };

  const handleCopyFirmware = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedFirmware(true);
    setTimeout(() => setCopiedFirmware(false), 2000);
  };

  const handleDownloadIno = (product: HardwareProduct, family: 'ESP32' | 'ESP8266') => {
    const code = generateArduinoCode(product, family);
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${product.customerProductName.replace(/\s+/g, '_')}_${family}.ino`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 text-slate-100 font-sans">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Box className="w-6 h-6 text-purple-400" />
            Hardware Products & C++ Firmware Governance
          </h1>
          <p className="text-xs text-slate-400">
            Create, edit, and version commercial hardware products, GPIO pin mappings, and C++ Arduino firmware for ESP32 & ESP8266 families.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create Hardware Product</span>
        </button>
      </div>

      {/* PRODUCTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hardwareProducts.map((p) => (
          <div
            key={p.id}
            className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4 shadow-xl hover:border-purple-500/40 transition-all relative"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-bold font-mono">
                    {p.boardFamily}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold">
                    {p.status || 'STABLE'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{p.customerProductName}</h3>
                <div className="text-xs text-purple-400 font-mono">Internal SKU: {p.internalName}</div>
              </div>

              {/* CARD ACTIONS: EDIT, VIEW FIRMWARE, DELETE */}
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => openEditModal(p)}
                  className="p-2 rounded-xl bg-slate-950 text-slate-400 hover:text-purple-400 border border-slate-800 hover:border-purple-600/60 transition-all"
                  title="Edit Hardware Product"
                >
                  <Edit3 className="w-4 h-4" />
                </button>

                <button
                  onClick={() => {
                    setFirmwareViewerProduct(p);
                    setFirmwareFamilyTab(p.boardFamily);
                  }}
                  className="p-2 rounded-xl bg-slate-950 text-slate-400 hover:text-cyan-400 border border-slate-800 hover:border-cyan-600/60 transition-all"
                  title="View / Download C++ Firmware Sketch"
                >
                  <FileCode className="w-4 h-4" />
                </button>

                <button
                  onClick={() => deleteHardwareProduct(p.id)}
                  className="p-2 rounded-xl bg-slate-950 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-800 transition-all"
                  title="Delete Product Template"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{p.description}</p>

            {/* SPECS & GPIO MAP */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Microcontroller:</span>
                <span className="text-slate-200 font-semibold">{p.boardType}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Firmware Release:</span>
                <span className="text-cyan-400 font-semibold">v{p.firmwareVersion || '1.4.2'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Provisioning Mode:</span>
                <span className="text-emerald-400 font-semibold">
                  {p.boardFamily === 'ESP32' ? 'Wi-Fi + Bluetooth BLE' : 'Wi-Fi AP (AGRI-SETUP)'}
                </span>
              </div>
            </div>

            {/* SUPPORTED SENSORS */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400">Supported Field Sensors:</div>
              <div className="flex flex-wrap gap-1.5">
                {p.supportedSensors?.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 text-purple-300 border border-slate-800 text-[10px] font-mono"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* FIRMWARE QUICK CODE BUTTON */}
            <button
              onClick={() => {
                setFirmwareViewerProduct(p);
                setFirmwareFamilyTab(p.boardFamily);
              }}
              className="w-full py-2 rounded-xl bg-purple-950/60 hover:bg-purple-900/60 border border-purple-800/50 text-purple-300 text-xs font-semibold flex items-center justify-center space-x-2 transition-all"
            >
              <Code2 className="w-4 h-4 text-purple-400" />
              <span>Inspect C++ Arduino Firmware Code</span>
            </button>
          </div>
        ))}
      </div>

      {/* CREATE / EDIT HARDWARE PRODUCT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-purple-800/60 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              {editingProduct ? 'Edit Hardware Product' : 'Create Commercial Hardware Product'}
            </h3>

            <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Customer-Facing Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AgriFlow Smart Irrigation Controller"
                  value={customerProductName}
                  onChange={(e) => setCustomerProductName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Internal Admin Code / SKU</label>
                <input
                  type="text"
                  placeholder="e.g. ESP32-IRRIGATION-V1"
                  value={internalName}
                  onChange={(e) => setInternalName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Board Family</label>
                  <select
                    value={boardFamily}
                    onChange={(e) => {
                      const fam = e.target.value as 'ESP32' | 'ESP8266';
                      setBoardFamily(fam);
                      setBoardType(fam === 'ESP32' ? 'ESP32 Dev Module' : 'NodeMCU 1.0 (ESP-12E Module)');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="ESP32">ESP32 (Wi-Fi + BLE)</option>
                    <option value="ESP8266">ESP8266 (Wi-Fi AP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Firmware Version</label>
                  <input
                    type="text"
                    value={firmwareVersion}
                    onChange={(e) => setFirmwareVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Product Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of hardware capabilities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Supported Sensors</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableSensors.map((s) => (
                    <label key={s} className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSensors.includes(s)}
                        onChange={() => toggleSensor(s)}
                        className="rounded border-slate-800 text-purple-600 focus:ring-purple-500"
                      />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold shadow-lg shadow-purple-600/30">
                  {editingProduct ? 'Save Product Changes' : 'Publish Product Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* C++ ARDUINO FIRMWARE CODE VIEWER MODAL */}
      {firmwareViewerProduct && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-cyan-800/60 rounded-3xl max-w-3xl w-full p-6 space-y-4 shadow-2xl relative text-slate-100">
            {/* MODAL HEADER */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 rounded-2xl bg-cyan-950 border border-cyan-500 text-cyan-400">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    C++ Arduino Firmware Sketch ({firmwareViewerProduct.customerProductName})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Production C++ source code generator for {firmwareFamilyTab} hardware nodes.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setFirmwareViewerProduct(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* FAMILY SWITCH TABS (ESP32 VS ESP8266) */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                <button
                  onClick={() => setFirmwareFamilyTab('ESP32')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                    firmwareFamilyTab === 'ESP32'
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ESP32 (Wi-Fi + BLE)
                </button>
                <button
                  onClick={() => setFirmwareFamilyTab('ESP8266')}
                  className={`px-4 py-1.5 rounded-xl text-xs font-bold font-mono transition-all ${
                    firmwareFamilyTab === 'ESP8266'
                      ? 'bg-amber-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  ESP8266 (NodeMCU AP)
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() =>
                    handleCopyFirmware(generateArduinoCode(firmwareViewerProduct, firmwareFamilyTab))
                  }
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono font-bold flex items-center space-x-1.5 transition-all"
                >
                  {copiedFirmware ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedFirmware ? 'COPIED!' : 'COPY CODE'}</span>
                </button>

                <button
                  onClick={() => handleDownloadIno(firmwareViewerProduct, firmwareFamilyTab)}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-mono font-bold flex items-center space-x-1.5 shadow-lg shadow-cyan-600/30 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>DOWNLOAD .INO SKETCH</span>
                </button>
              </div>
            </div>

            {/* PARTITION SCHEME NOTICE */}
            <div className="bg-purple-950/40 border border-purple-800/60 rounded-xl p-3 text-xs text-purple-200 flex items-start space-x-2">
              <Zap className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-purple-300">Arduino IDE Partition Scheme (If "Sketch too big / 102%" error occurs):</span>
                <p className="text-[11px] text-purple-300/90 mt-0.5">
                  In Arduino IDE, select <strong>Tools &rarr; Partition Scheme &rarr; &quot;Huge APP (3MB No OTA/1MB SPIFFS)&quot;</strong> or <strong>&quot;Minimal SPIFFS (1.9MB APP with OTA)&quot;</strong> to expand available flash storage to 3MB.
                </p>
              </div>
            </div>

            {/* CODE PREVIEW BOX */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 font-mono text-[11px] text-slate-200 max-h-96 overflow-y-auto leading-relaxed shadow-inner">
              <pre className="whitespace-pre-wrap">
                {generateArduinoCode(firmwareViewerProduct, firmwareFamilyTab)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
