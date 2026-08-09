'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import {
  Cpu,
  Wifi,
  BatteryMedium,
  MapPin,
  Clock,
  ChevronRight,
  Signal,
  Plus,
  BookOpen,
  X,
  Check,
  Copy,
  Terminal,
  Key,
  ShieldCheck,
  Radio,
  Trash2,
  AlertCircle,
  Settings,
  Sliders,
  Layers,
  Save,
  FileCode,
  CheckCircle2,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { StatusIndicator } from '../ui/StatusIndicator';
import { useSpatialStore } from '../../store/useSpatialStore';
import { DeviceStatus, IoTDevice } from '@aether/shared';
import { BoardSelectorWizard } from './BoardSelectorWizard';

function deviceStatusToUi(status: DeviceStatus): 'online' | 'offline' | 'warning' | 'critical' | 'maintenance' {
  switch (status) {
    case DeviceStatus.ONLINE:
      return 'online';
    case DeviceStatus.OFFLINE:
      return 'offline';
    case DeviceStatus.WARNING:
      return 'warning';
    case DeviceStatus.CRITICAL:
      return 'critical';
    case DeviceStatus.MAINTENANCE:
    case DeviceStatus.PROVISIONING:
      return 'maintenance';
    default:
      return 'offline';
  }
}

function rssiToQuality(rssi: number): { label: string; color: string; bars: number } {
  if (rssi > -50) return { label: 'Excellent', color: 'text-cyber-emerald', bars: 4 };
  if (rssi > -65) return { label: 'Good', color: 'text-cyber-cyan', bars: 3 };
  if (rssi > -75) return { label: 'Fair', color: 'text-amber-600', bars: 2 };
  return { label: 'Weak', color: 'text-red-600', bars: 1 };
}

function timeAgo(isoString: string): string {
  if (!isoString || isoString.startsWith('1970')) return 'Never';
  const diff = Date.now() - new Date(isoString).getTime();
  if (diff < 0) return 'Just now';
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
}

const SAMPLE_ESP32_CODE = `// ESP32 Farm Smart Node Firmware (Soil Sensor + DHT Temp/Humidity + Pump Relay)
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ─── Pin Configuration ───
#define SOIL_PIN    34  // Capacitive Soil Moisture Sensor (Analog A0)
#define DHT_PIN      4  // DHT11 or DHT22 Temp & Humidity Sensor
#define RELAY_PIN   26  // Relay Module Signal Pin for Water Pump
#define DHT_TYPE DHT11

// ─── Network & Authentication ───
const char* ssid = "YOUR_FARM_WIFI";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "test.mosquitto.org";
const int   mqtt_port = 1883;

const char* deviceSerialNumber = "ESP32-FARM-NODE-01";
const char* deviceAuthCode     = "ATH-8F92-4C10-99E4";
const char* telemetryTopic     = "aether/farm-alpha/zone-1/telemetry";

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  dht.begin();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }

  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    while (!client.connected()) {
      if (client.connect(deviceSerialNumber)) {
        client.subscribe("agri/prod/farm-alpha/zone-1/commands");
      } else { delay(2000); }
    }
  }
  client.loop();

  int rawSoil = analogRead(SOIL_PIN);
  float soilMoisture = map(rawSoil, 4095, 1500, 0, 100);
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();

  StaticJsonDocument<384> doc;
  doc["deviceId"] = deviceSerialNumber;
  doc["authCode"] = deviceAuthCode;
  doc["soilMoisture"] = soilMoisture;
  doc["airTemperature"] = isnan(temp) ? 0.0 : temp;
  doc["humidity"] = isnan(humidity) ? 0.0 : humidity;
  doc["pumpRunning"] = digitalRead(RELAY_PIN) == HIGH;

  char buffer[384];
  serializeJson(doc, buffer);
  client.publish(telemetryTopic, buffer);

  delay(3000);
}`;

const SAMPLE_ESP8266_CODE = `// ESP8266 (NodeMCU / D1 Mini) Farm Smart Node Firmware
#include <ESP8266WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#define SOIL_PIN    A0  // Analog Soil Moisture Probe
#define DHT_PIN     D2  // GPIO 4 for DHT Temp & Humidity Sensor
#define RELAY_PIN   D3  // GPIO 0 Signal Pin for Water Pump Relay (D3)
#define DHT_TYPE DHT11

const char* ssid = "YOUR_FARM_WIFI";
const char* password = "YOUR_WIFI_PASSWORD";
const char* mqtt_server = "test.mosquitto.org";
const int   mqtt_port = 1883;

const char* deviceSerialNumber = "ESP8266-FARM-NODE-01";
const char* deviceAuthCode     = "ATH-7A12-98F1-44B2";

WiFiClient espClient;
PubSubClient client(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

void setup() {
  Serial.begin(115200);
  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, LOW);
  dht.begin();

  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) { delay(500); }

  client.setServer(mqtt_server, mqtt_port);
}

void loop() {
  if (!client.connected()) {
    while (!client.connected()) {
      if (client.connect(deviceSerialNumber)) {
        client.subscribe("agri/prod/farm-alpha/zone-1/commands");
      } else { delay(2000); }
    }
  }
  client.loop();

  int rawSoil = analogRead(SOIL_PIN);
  float soilMoisture = map(rawSoil, 1024, 0, 0, 100);
  float temp = dht.readTemperature();
  float humidity = dht.readHumidity();

  StaticJsonDocument<384> doc;
  doc["deviceId"] = deviceSerialNumber;
  doc["authCode"] = deviceAuthCode;
  doc["soilMoisture"] = soilMoisture;
  doc["airTemperature"] = isnan(temp) ? 0.0 : temp;
  doc["humidity"] = isnan(humidity) ? 0.0 : humidity;
  doc["pumpRunning"] = digitalRead(RELAY_PIN) == HIGH;

  char buffer[384];
  serializeJson(doc, buffer);
  client.publish("agri/prod/farm-alpha/zone-1/telemetry", buffer);

  delay(3000);
}`;

export function DeviceGrid() {
  const { devices, setDevices, deleteDevice, selectedDeviceId, setSelectedDeviceId } = useSpatialStore();
  const [modalMode, setModalMode] = useState<'NONE' | 'ADD_DEVICE' | 'HARDWARE_GUIDE' | 'SHOW_AUTH_KEY' | 'EDIT_NODE'>('NONE');
  const [activeSketchTab, setActiveSketchTab] = useState<'ESP32' | 'ESP8266'>('ESP32');
  const [newDeviceAuth, setNewDeviceAuth] = useState<{ serial: string; authCode: string; name: string } | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedAuthKey, setCopiedAuthKey] = useState(false);

  // Selected Node for Settings Modal
  const [editingDevice, setEditingDevice] = useState<IoTDevice | null>(null);

  // Provision Form State
  const [deviceName, setDeviceName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [zoneId, setZoneId] = useState('zone-1');
  const [selectedBoardOption, setSelectedBoardOption] = useState<string>('esp32-dev-module');
  const [attachedSensors, setAttachedSensors] = useState<string[]>([
    'SOIL_MOISTURE',
    'WATER_FLOW',
    'PIR_MOTION',
  ]);

  // Edit Node Settings State
  const [editName, setEditName] = useState('');
  const [editSerial, setEditSerial] = useState('');
  const [editZoneId, setEditZoneId] = useState('zone-1');
  const [editBoardOption, setEditBoardOption] = useState('esp32-dev-module');
  const [editWifiSsid, setEditWifiSsid] = useState('Farm_WiFi_5G');
  const [editWifiPass, setEditWifiPass] = useState('SecurePass123');
  const [editSensors, setEditSensors] = useState<string[]>([]);
  const [confirmDeleteUuid, setConfirmDeleteUuid] = useState<string | null>(null);

  const AVAILABLE_SENSORS = [
    { id: 'SOIL_MOISTURE', label: 'Soil Moisture Probe (Analog)' },
    { id: 'TEMPERATURE', label: 'DHT Temp & Humidity' },
    { id: 'WATER_FLOW', label: 'Water Flow Pulse Sensor' },
    { id: 'PIR_MOTION', label: 'PIR Wildlife Motion' },
    { id: 'RELAY_PUMP', label: 'Water Pump Relay (Actuator)' },
    { id: 'WEATHER_STATION', label: 'Wind & Rain Gauge' },
  ];

  const handleToggleSensor = (sensorId: string) => {
    if (attachedSensors.includes(sensorId)) {
      setAttachedSensors(attachedSensors.filter((s) => s !== sensorId));
    } else {
      setAttachedSensors([...attachedSensors, sensorId]);
    }
  };

  const handleToggleEditSensor = (sensorId: string) => {
    if (editSensors.includes(sensorId)) {
      setEditSensors(editSensors.filter((s) => s !== sensorId));
    } else {
      setEditSensors([...editSensors, sensorId]);
    }
  };

  const handleOpenNodeSettings = (device: IoTDevice) => {
    setEditingDevice(device);
    setEditName(device.name);
    setEditSerial(device.serialNumber);
    setEditZoneId(device.zoneId || 'zone-1');
    setEditBoardOption(device.boardId || 'esp32-dev-module');
    setEditSensors(device.sensorsAttached || ['SOIL_MOISTURE', 'RELAY_PUMP']);
    setConfirmDeleteUuid(null);
    setModalMode('EDIT_NODE');
  };

  const handleSaveNodeSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDevice) return;

    const updated: IoTDevice[] = devices.map((d) => {
      if (d.uuid === editingDevice.uuid) {
        const family: 'ESP32' | 'ESP8266' = editBoardOption.includes('esp8266') || editBoardOption.includes('nodemcu') || editBoardOption.includes('wemos') || editBoardOption.includes('esp-01') ? 'ESP8266' : 'ESP32';
        return {
          ...d,
          name: editName.trim() || d.name,
          serialNumber: editSerial.trim() || d.serialNumber,
          zoneId: editZoneId,
          boardId: editBoardOption,
          boardFamily: family,
          sensorsAttached: editSensors,
        };
      }
      return d;
    });

    setDevices(updated);
    setModalMode('NONE');
    setEditingDevice(null);
  };

  const handleDeleteSingleDevice = (deviceUuid: string) => {
    deleteDevice(deviceUuid);
    if (editingDevice?.serialNumber) {
      deleteDevice(editingDevice.serialNumber);
    }
    setModalMode('NONE');
    setEditingDevice(null);
    setConfirmDeleteUuid(null);
  };

  const handleProvisionDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deviceName.trim() || !serialNumber.trim()) return;

    const generatedAuthCode = `ATH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const cleanSerial = serialNumber.trim();
    const devUuid = cleanSerial.toLowerCase().startsWith('esp') || cleanSerial.toLowerCase().startsWith('dev') || cleanSerial.toLowerCase().startsWith('node')
      ? cleanSerial.toLowerCase().replace(/\s+/g, '-')
      : `esp32-node-${cleanSerial.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const isEsp8266 = selectedBoardOption.includes('8266') || selectedBoardOption.includes('nodemcu') || selectedBoardOption.includes('wemos') || selectedBoardOption.includes('esp-01');

    const newDevice: IoTDevice = {
      uuid: devUuid,
      serialNumber: cleanSerial,
      name: deviceName.trim(),
      macAddress: `A4:CF:12:${Math.floor(Math.random() * 89 + 10)}:${Math.floor(
        Math.random() * 89 + 10
      )}:${Math.floor(Math.random() * 89 + 10)}`,
      firmwareVersion: isEsp8266 ? 'v2.4.1-esp8266' : 'v2.4.1-esp32',
      status: DeviceStatus.ONLINE,
      farmId: 'farm-01',
      zoneId,
      ownerId: 'usr-admin-01',
      mqttTopic: `aether/farm-01/${zoneId}/telemetry`,
      authCode: generatedAuthCode,
      lastSeen: new Date().toISOString(),
      batteryLevel: 100,
      signalRssi: -18,
      boardId: selectedBoardOption,
      boardFamily: isEsp8266 ? 'ESP8266' : 'ESP32',
      otaStatus: 'IDLE',
      location: { lat: 37.7749, lng: -122.4194, elevation: 120 },
      sensorsAttached: attachedSensors,
    };

    // Remove from deleted list if previously deleted
    const currentDeleted = useSpatialStore.getState().deletedDeviceIds || [];
    const updatedDeleted = currentDeleted.filter((id) => id !== devUuid && id !== cleanSerial);
    useSpatialStore.setState({ deletedDeviceIds: updatedDeleted });

    // Instantly append to devices list in store and activate Webtool dashboard
    const existingDevices = useSpatialStore.getState().devices;
    const filteredExisting = existingDevices.filter((d) => d.uuid !== devUuid && d.serialNumber !== cleanSerial);
    useSpatialStore.getState().setDevices([newDevice, ...filteredExisting]);
    useSpatialStore.setState({ isZeroDataMode: false });

    // Register active heartbeat in backend telemetry API gateway
    try {
      await fetch('/api/telemetry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceId: devUuid,
          authCode: generatedAuthCode,
          zoneId: newDevice.zoneId,
          soilMoisture: 45,
          airTemperature: 28.4,
          humidity: 65,
          batteryLevel: 100,
          rssi: -18,
        }),
      });
    } catch {}

    setNewDeviceAuth({
      serial: cleanSerial,
      authCode: generatedAuthCode,
      name: deviceName.trim(),
    });
    setDeviceName('');
    setSerialNumber('');
    setModalMode('SHOW_AUTH_KEY');
  };

  const handleCopyCode = () => {
    const codeToCopy = activeSketchTab === 'ESP32' ? SAMPLE_ESP32_CODE : SAMPLE_ESP8266_CODE;
    navigator.clipboard.writeText(codeToCopy);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyAuthKey = (authKey: string) => {
    navigator.clipboard.writeText(authKey);
    setCopiedAuthKey(true);
    setTimeout(() => setCopiedAuthKey(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* ESP32 / ESP8266 Microcontroller Board Selector & Firmware Provisioning Wizard */}
      <BoardSelectorWizard />

      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Cpu size={16} className="text-cyber-cyan flex-shrink-0" />
          <span className="text-xs font-mono uppercase tracking-[0.15em] text-slate-800 dark:text-slate-200 font-bold truncate">
            IoT Node Manager (ESP32 & ESP8266)
          </span>
          <span className="text-xs font-mono text-cyber-emerald font-semibold ml-2">
            {devices.filter((d) => d.status === DeviceStatus.ONLINE).length}/{devices.length} ONLINE
          </span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setModalMode('HARDWARE_GUIDE')}
            className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-xl neu-button text-xs font-mono font-bold text-slate-700 dark:text-slate-200 hover:text-cyber-cyan"
            aria-label="Open hardware setup guide"
          >
            <BookOpen size={14} />
            <span className="hidden sm:inline">HARDWARE SETUP GUIDE</span>
            <span className="sm:hidden">GUIDE</span>
          </button>
          
          <button
            onClick={() => setModalMode('ADD_DEVICE')}
            className="flex items-center gap-1.5 px-3.5 py-2 min-h-[44px] rounded-xl neu-button text-xs font-mono font-bold text-cyber-cyan hover:text-sky-700"
            aria-label="Provision a new IoT device"
          >
            <Plus size={14} />
            <span className="hidden sm:inline">PROVISION NEW DEVICE</span>
            <span className="sm:hidden">NEW DEVICE</span>
          </button>
        </div>
      </div>

      {/* Node Settings Modal */}
      {modalMode === 'EDIT_NODE' && editingDevice && (
        <GlassCard variant="glow" padding="lg" className="border-cyber-cyan/50">
          <div className="flex items-center justify-between pb-3 border-b border-slate-300/40 mb-4">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-cyber-cyan" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                ⚙️ NODE SETTINGS & HARDWARE CONFIGURATION ({editingDevice.name})
              </h3>
            </div>
            <button
              onClick={() => {
                setModalMode('NONE');
                setEditingDevice(null);
              }}
              className="p-1 rounded-lg neu-button text-slate-500 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleSaveNodeSettings} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-500 mb-1">
                  Device Node Name
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 neu-pressed rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-slate-500 mb-1">
                  Hardware Serial Number
                </label>
                <input
                  type="text"
                  required
                  value={editSerial}
                  onChange={(e) => setEditSerial(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 neu-pressed rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-cyber-cyan mb-1">
                  📡 Wi-Fi Network SSID
                </label>
                <input
                  type="text"
                  value={editWifiSsid}
                  onChange={(e) => setEditWifiSsid(e.target.value)}
                  placeholder="Wi-Fi Router Name"
                  className="w-full px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 neu-pressed rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-cyber-cyan mb-1">
                  🔒 Wi-Fi Password
                </label>
                <input
                  type="password"
                  value={editWifiPass}
                  onChange={(e) => setEditWifiPass(e.target.value)}
                  placeholder="Wi-Fi Password"
                  className="w-full px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 neu-pressed rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-amber-500 mb-1">
                  🗺️ Reallocate Crop Zone
                </label>
                <select
                  value={editZoneId}
                  onChange={(e) => setEditZoneId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 neu-pressed rounded-xl focus:outline-none bg-white dark:bg-[#0f172a]"
                >
                  <option value="zone-1">Zone 1: Corn Field</option>
                  <option value="zone-2">Zone 2: Soybean Sector</option>
                  <option value="zone-3">Zone 3: Vineyard East</option>
                  <option value="zone-4">Zone 4: Orchard North</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-cyber-cyan mb-1">
                  🔌 Microcontroller Board Option
                </label>
                <select
                  value={editBoardOption}
                  onChange={(e) => setEditBoardOption(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 neu-pressed rounded-xl focus:outline-none bg-white dark:bg-[#0f172a]"
                >
                  <optgroup label="ESP32 Family">
                    <option value="esp32-dev-module">ESP32 Dev Module (Recommended, 34 GPIO)</option>
                    <option value="esp32-wroom-32">ESP32-WROOM-32 (Xtensa LX6, 32 GPIO)</option>
                    <option value="esp32-s3-dev">ESP32-S3 Dev Module (Vector LX7, 45 GPIO)</option>
                    <option value="esp32-c3-dev">ESP32-C3 RISC-V Dev (160MHz Single-Core)</option>
                  </optgroup>
                  <optgroup label="ESP8266 Family">
                    <option value="nodemcu-1.0-esp12e">NodeMCU 1.0 ESP-12E (D3 Relay Pin)</option>
                    <option value="wemos-d1-mini">Wemos D1 Mini (Compact ESP8266)</option>
                    <option value="esp-01s">ESP-01S Ultra-Compact Module</option>
                  </optgroup>
                </select>
              </div>
            </div>

            {/* Edit Attached Sensors */}
            <div>
              <label className="block text-[10px] font-mono uppercase font-bold text-slate-500 mb-1.5">
                🌱 Add / Remove Attached Hardware Sensors
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_SENSORS.map((s) => {
                  const selected = editSensors.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleToggleEditSensor(s.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-mono text-left transition-all ${
                        selected
                          ? 'neu-button-active text-cyber-cyan font-semibold'
                          : 'neu-button text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center ${
                          selected ? 'bg-cyber-cyan text-white' : 'border border-slate-400'
                        }`}
                      >
                        {selected && <Check size={10} />}
                      </div>
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-300/40">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                {confirmDeleteUuid === editingDevice.uuid ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-rose-600 font-bold">CONFIRM DELETE?</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSingleDevice(editingDevice.uuid)}
                      className="px-3 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-mono font-bold"
                    >
                      YES, DELETE NODE
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteUuid(null)}
                      className="px-2 py-1.5 rounded-xl neu-button text-slate-500 text-xs font-mono"
                    >
                      CANCEL
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteUuid(editingDevice.uuid)}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl neu-button text-xs font-mono font-bold text-rose-600 hover:text-rose-700 w-full sm:w-auto justify-center"
                  >
                    <Trash2 size={14} />
                    <span>DELETE THIS DEVICE NODE</span>
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setModalMode('NONE');
                    setEditingDevice(null);
                  }}
                  className="px-4 py-2 text-xs font-mono rounded-xl neu-button text-slate-500"
                >
                  CANCEL
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 text-xs font-mono font-bold rounded-xl neu-button text-cyber-cyan"
                >
                  <Save size={14} />
                  <span>SAVE NODE CONFIGURATION</span>
                </button>
              </div>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Auth Code Generated Modal (Post Provisioning) */}
      {modalMode === 'SHOW_AUTH_KEY' && newDeviceAuth && (
        <GlassCard variant="glow" padding="lg" className="border-emerald-500/50 bg-emerald-50/20">
          <div className="flex items-center justify-between pb-3 border-b border-slate-300/40 mb-4">
            <div className="flex items-center gap-2">
              <ShieldCheck size={18} className="text-cyber-emerald" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                🔑 HARDWARE AUTHENTICATION KEY GENERATED
              </h3>
            </div>
            <button
              onClick={() => setModalMode('NONE')}
              className="p-1 rounded-lg neu-button text-slate-500 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-slate-700 dark:text-slate-200 font-medium">
              Device <strong className="text-slate-900 dark:text-slate-100">{newDeviceAuth.name}</strong> ({newDeviceAuth.serial}) has been provisioned! Copy the unique authentication code below and enter it in your ESP32 or ESP8266 code so your hardware can pair and connect securely.
            </p>

            <div className="p-4 rounded-xl neu-pressed flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">HARDWARE AUTH CODE</span>
                <p className="text-lg font-mono font-bold text-cyber-cyan tracking-wider">{newDeviceAuth.authCode}</p>
              </div>

              <button
                onClick={() => handleCopyAuthKey(newDeviceAuth.authCode)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl neu-button text-xs font-mono font-bold text-cyber-cyan"
              >
                {copiedAuthKey ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                {copiedAuthKey ? 'COPIED!' : 'COPY AUTH CODE'}
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-2 text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 size={16} />
                <span>Device is now ACTIVE on the Webtool Dashboard & Node Grid!</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setModalMode('HARDWARE_GUIDE')}
                  className="px-4 py-2 text-xs font-mono font-bold rounded-xl neu-button text-slate-700 dark:text-slate-200 hover:text-cyber-cyan"
                >
                  VIEW HARDWARE CODE SKETCHES
                </button>
                <button
                  onClick={() => setModalMode('NONE')}
                  className="px-5 py-2 text-xs font-mono font-bold rounded-xl bg-sky-600 dark:bg-cyan-500 text-white shadow-sm"
                >
                  DONE
                </button>
              </div>
            </div>
          </div>
        </GlassCard>
      )}

      {/* Provision Device Modal */}
      {modalMode === 'ADD_DEVICE' && (
        <GlassCard variant="glow" padding="lg" className="border-cyber-cyan/40">
          <div className="flex items-center justify-between pb-3 border-b border-slate-300/40 mb-4">
            <div className="flex items-center gap-2">
              <Plus size={16} className="text-cyber-cyan" />
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                PROVISION NEW ESP32 / ESP8266 SENSOR NODE
              </h3>
            </div>
            <button
              onClick={() => setModalMode('NONE')}
              className="p-1 rounded-lg neu-button text-slate-500 hover:text-red-600"
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleProvisionDevice} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  Device Name
                </label>
                <input
                  type="text"
                  required
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. ESP8266 Field Sensor Node"
                  className="w-full px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 neu-pressed rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  Hardware Serial Number / Chip ID
                </label>
                <input
                  type="text"
                  required
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. SN-ESP8266-8801-B"
                  className="w-full px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 neu-pressed rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase font-bold text-cyber-cyan mb-1">
                  Microcontroller Board Option
                </label>
                <select
                  value={selectedBoardOption}
                  onChange={(e) => setSelectedBoardOption(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono font-bold text-slate-800 dark:text-slate-100 neu-pressed rounded-xl focus:outline-none bg-white dark:bg-[#0f172a]"
                >
                  <optgroup label="ESP32 Family (Dual-Core 240MHz)">
                    <option value="esp32-dev-module">ESP32 Dev Module (Recommended, 34 GPIO)</option>
                    <option value="esp32-wroom-32">ESP32-WROOM-32 (Xtensa LX6, 32 GPIO)</option>
                    <option value="esp32-s3-dev">ESP32-S3 Dev Module (Vector LX7, 45 GPIO)</option>
                    <option value="esp32-c3-dev">ESP32-C3 RISC-V Dev (160MHz Single-Core)</option>
                  </optgroup>
                  <optgroup label="ESP8266 Family (80MHz WiFi)">
                    <option value="nodemcu-1.0-esp12e">NodeMCU 1.0 ESP-12E (D3 Relay Pin)</option>
                    <option value="wemos-d1-mini">Wemos D1 Mini (Compact ESP8266)</option>
                    <option value="esp-01s">ESP-01S Ultra-Compact Module</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  Assigned Crop Zone
                </label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono text-slate-800 dark:text-slate-100 neu-pressed rounded-xl focus:outline-none bg-white dark:bg-[#0f172a]"
                >
                  <option value="zone-1">Zone 1: Corn Field</option>
                  <option value="zone-2">Zone 2: Soybean Sector</option>
                  <option value="zone-3">Zone 3: Vineyard East</option>
                  <option value="zone-4">Zone 4: Orchard North</option>
                </select>
              </div>
            </div>

            {/* Attached Sensors Checkboxes */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1.5">
                Attached Hardware Sensors
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AVAILABLE_SENSORS.map((s) => {
                  const selected = attachedSensors.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => handleToggleSensor(s.id)}
                      className={`flex items-center gap-2 p-2 rounded-xl text-xs font-mono text-left transition-all ${
                        selected
                          ? 'neu-button-active text-cyber-cyan font-semibold'
                          : 'neu-button text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center ${
                          selected ? 'bg-cyber-cyan text-white' : 'border border-slate-400'
                        }`}
                      >
                        {selected && <Check size={10} />}
                      </div>
                      <span>{s.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setModalMode('NONE')}
                className="px-4 py-2 text-xs font-mono rounded-xl neu-button text-slate-500"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-mono font-bold rounded-xl neu-button text-cyber-cyan"
              >
                GENERATE AUTH CODE & PROVISION
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Devices View Container */}
      {devices.length === 0 ? (
        <GlassCard variant="default" padding="lg" className="text-center py-10">
          <Cpu size={36} className="mx-auto mb-3 text-slate-400 dark:text-slate-500" />
          <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200 mb-1">
            No IoT Hardware Devices Connected
          </h3>
          <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto mb-4 font-medium">
            Your farm device inventory is currently empty. Click below to provision your ESP32 or ESP8266 node and receive a 16-character hardware authentication key.
          </p>
          <button
            onClick={() => setModalMode('ADD_DEVICE')}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl neu-button text-xs font-mono font-extrabold text-cyber-cyan hover:text-sky-700"
          >
            <Plus size={16} />
            <span>PROVISION NEW DEVICE</span>
          </button>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {devices.map((device) => {
            const isOffline = device.status === DeviceStatus.OFFLINE || device.batteryLevel === 0;
            const signal = isOffline ? { label: 'No Signal', color: 'text-red-600 dark:text-red-400', bars: 0 } : rssiToQuality(device.signalRssi);
            const isSelected = selectedDeviceId === device.uuid;
            const authCode = device.authCode || 'ATH-8F92-4C10';
            const isEsp8266 = device.uuid.includes('8266') || device.serialNumber.includes('8266') || (device.boardId && device.boardId.includes('nodemcu'));

            return (
              <GlassCard
                key={device.uuid}
                variant={isSelected ? 'glow' : 'default'}
                padding="md"
                hover
                onClick={() => setSelectedDeviceId(isSelected ? null : device.uuid)}
              >
                {/* Top Row */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-lg neu-pressed flex items-center justify-center flex-shrink-0">
                      <Cpu size={14} className={isEsp8266 ? 'text-amber-500' : 'text-cyber-cyan'} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{device.name}</p>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-bold ${
                          isEsp8266 ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400' : 'bg-sky-100 dark:bg-sky-950/80 text-sky-700 dark:text-cyan-400'
                        }`}>
                          {isEsp8266 ? 'ESP8266' : 'ESP32'}
                        </span>
                      </div>
                      <p className="text-[9px] font-mono text-slate-500 truncate">{device.serialNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <StatusIndicator status={deviceStatusToUi(isOffline ? DeviceStatus.OFFLINE : device.status)} size="sm" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete ${device.name}?`)) {
                          handleDeleteSingleDevice(device.uuid);
                        }
                      }}
                      title="Delete Device Node"
                      className="p-1 rounded-lg neu-button text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {/* Auth Code Bar */}
                <div className="flex items-center justify-between px-2.5 py-1.5 mb-3 rounded-lg neu-pressed">
                  <div className="flex items-center gap-1.5">
                    <Key size={12} className="text-cyber-cyan" />
                    <span className="text-[9px] font-mono text-slate-500 uppercase font-bold">Auth Code:</span>
                    <span className="text-[10px] font-mono font-bold text-slate-800 dark:text-slate-100">{authCode}</span>
                  </div>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(authCode);
                    }}
                    title="Copy Auth Code for Hardware"
                    className="text-[9px] font-mono text-cyber-cyan hover:text-sky-700 flex items-center gap-1 font-bold"
                  >
                    <Copy size={9} />
                    COPY
                  </button>
                </div>

                {/* Offline Hardware Alert Banner */}
                {isOffline && (
                  <div className="p-2 mb-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-400 text-[10px] font-mono font-bold flex items-center gap-1.5">
                    <AlertCircle size={12} className="flex-shrink-0 text-red-500" />
                    <span>⚠️ HARDWARE UNREACHABLE — NO LIVE TELEMETRY RECEIVED. POWER ON BOARD.</span>
                  </div>
                )}

                {/* Metrics Row */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {/* Signal */}
                  <div className="text-center p-1.5 rounded-lg neu-pressed">
                    <Signal size={10} className={clsx('mx-auto mb-0.5', signal.color)} />
                    <p className="text-[9px] text-slate-500 font-bold">Signal</p>
                    <p className={clsx('text-[10px] font-mono font-bold', signal.color)}>
                      {isOffline ? '0 dBm' : `${device.signalRssi} dBm`}
                    </p>
                  </div>

                  {/* Battery */}
                  <div className="text-center p-1.5 rounded-lg neu-pressed">
                    <BatteryMedium
                      size={10}
                      className={clsx(
                        'mx-auto mb-0.5',
                        isOffline
                          ? 'text-red-600 dark:text-red-400'
                          : device.batteryLevel > 50
                            ? 'text-cyber-emerald'
                            : device.batteryLevel > 20
                              ? 'text-amber-600'
                              : 'text-red-600'
                      )}
                    />
                    <p className="text-[9px] text-slate-500 font-bold">Battery</p>
                    <p className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">
                      {isOffline ? '0%' : `${device.batteryLevel}%`}
                    </p>
                  </div>

                  {/* Zone */}
                  <div className="text-center p-1.5 rounded-lg neu-pressed">
                    <MapPin size={10} className="mx-auto mb-0.5 text-slate-500" />
                    <p className="text-[9px] text-slate-500 font-bold">Zone</p>
                    <p className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200 uppercase">
                      {device.zoneId}
                    </p>
                  </div>

                  {/* Last Seen */}
                  <div className="text-center p-1.5 rounded-lg neu-pressed">
                    <Clock size={10} className="mx-auto mb-0.5 text-slate-500" />
                    <p className="text-[9px] text-slate-500 font-bold">Seen</p>
                    <p className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-200">
                      {timeAgo(device.lastSeen)}
                    </p>
                  </div>
                </div>

                {/* Footer Action Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-300/40 dark:border-slate-700/40">
                  <span className="text-[9px] font-mono text-slate-500 font-bold">
                    {device.sensorsAttached ? device.sensorsAttached.length : 0} sensors
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenNodeSettings(device);
                      }}
                      className="px-2.5 py-1 rounded-lg neu-button text-[10px] font-mono font-bold text-cyber-cyan flex items-center gap-1.5 hover:text-sky-600 cursor-pointer"
                      title="Edit Wi-Fi, Zone Allocation, Sensors, and Hardware Settings"
                    >
                      <Settings size={12} />
                      <span>⚙️ NODE SETTINGS</span>
                    </button>
                  </div>
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
