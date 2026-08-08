'use client';

import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Wifi,
  Radio,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Download,
  Copy,
  ChevronRight,
  Code,
  Layers,
  Settings2,
  Sparkles,
  HelpCircle,
  FileCode,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { IoTBoardDefinition } from '@aether/shared';

export function BoardSelectorWizard() {
  const [familyTab, setFamilyTab] = useState<'ESP32' | 'ESP8266'>('ESP32');
  const [boards, setBoards] = useState<IoTBoardDefinition[]>([]);
  const [selectedBoard, setSelectedBoard] = useState<IoTBoardDefinition | null>(null);

  // Form State for Wizard
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [deviceId, setDeviceId] = useState('esp32-node-zone-1');
  const [wifiSsid, setWifiSsid] = useState('Farm_WiFi_5G');
  const [wifiPass, setWifiPass] = useState('SecurePass123');
  const [mqttHost, setMqttHost] = useState('test.mosquitto.org');
  const [mqttPort, setMqttPort] = useState<number>(1883);

  // Custom Pin Configurations
  const [soilPin, setSoilPin] = useState('');
  const [dhtPin, setDhtPin] = useState('');
  const [relayPin, setRelayPin] = useState('');

  // Generated Firmware Output
  const [generatedCode, setGeneratedCode] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchBoards = async () => {
    try {
      const res = await fetch(`/api/iot/boards?family=${familyTab}`);
      const data = await res.json();
      if (data.success && data.boards) {
        setBoards(data.boards);
        if (data.boards.length > 0) {
          const defaultBoard = data.boards[0];
          setSelectedBoard(defaultBoard);
          setSoilPin(defaultBoard.recommendedPins.soilMoisturePin);
          setDhtPin(defaultBoard.recommendedPins.dhtPin);
          setRelayPin(defaultBoard.recommendedPins.relayPumpPin);
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchBoards();
  }, [familyTab]);

  const handleSelectBoard = (b: IoTBoardDefinition) => {
    setSelectedBoard(b);
    setSoilPin(b.recommendedPins.soilMoisturePin);
    setDhtPin(b.recommendedPins.dhtPin);
    setRelayPin(b.recommendedPins.relayPumpPin);
  };

  const handleGenerateFirmware = async () => {
    if (!selectedBoard) return;
    setIsGenerating(true);
    try {
      const res = await fetch('/api/iot/devices/firmware/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          boardId: selectedBoard.boardId,
          deviceId,
          wifiSsid,
          wifiPass,
          mqttBrokerHost: mqttHost,
          mqttPort,
          soilMoisturePin: soilPin,
          dhtPin,
          relayPumpPin: relayPin,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setGeneratedCode(data.cppCode);
        setStep(4);
      }
    } catch {
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadIno = () => {
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aethercrop_${selectedBoard?.boardId || 'node'}_${deviceId}.ino`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Wizard Step Indicator */}
      <div className="flex items-center justify-between p-3 rounded-2xl neu-convex border border-white/60 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Sparkles size={18} className="text-cyber-cyan animate-pulse" />
          <span className="text-xs font-mono font-extrabold uppercase tracking-widest text-slate-900 dark:text-slate-100">
            IoT Board Selector & Firmware Provisioning Wizard
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px] font-bold">
          <span className={`px-2 py-1 rounded-lg ${step === 1 ? 'bg-cyber-cyan text-slate-950' : 'neu-pressed text-slate-500'}`}>
            1. CHIPSET & BOARD
          </span>
          <ChevronRight size={12} className="text-slate-400" />
          <span className={`px-2 py-1 rounded-lg ${step === 2 ? 'bg-cyber-cyan text-slate-950' : 'neu-pressed text-slate-500'}`}>
            2. HARDWARE PINS
          </span>
          <ChevronRight size={12} className="text-slate-400" />
          <span className={`px-2 py-1 rounded-lg ${step === 3 ? 'bg-cyber-cyan text-slate-950' : 'neu-pressed text-slate-500'}`}>
            3. NETWORK CONFIG
          </span>
          <ChevronRight size={12} className="text-slate-400" />
          <span className={`px-2 py-1 rounded-lg ${step === 4 ? 'bg-cyber-cyan text-slate-950' : 'neu-pressed text-slate-500'}`}>
            4. GENERATE FIRMWARE
          </span>
        </div>
      </div>

      {/* STEP 1: Microcontroller Family & Predefined Board Selector */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Family Tabs */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setFamilyTab('ESP32')}
              className={`flex-1 py-3 rounded-2xl font-mono text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                familyTab === 'ESP32'
                  ? 'bg-sky-600 dark:bg-cyan-500 text-white shadow-md'
                  : 'neu-button text-slate-600 dark:text-slate-400'
              }`}
            >
              <Cpu size={16} />
              <span>ESP32 Microcontroller Family (Dual-Core 240MHz / BLE / 34 GPIO)</span>
            </button>

            <button
              onClick={() => setFamilyTab('ESP8266')}
              className={`flex-1 py-3 rounded-2xl font-mono text-xs font-extrabold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                familyTab === 'ESP8266'
                  ? 'bg-sky-600 dark:bg-cyan-500 text-white shadow-md'
                  : 'neu-button text-slate-600 dark:text-slate-400'
              }`}
            >
              <Cpu size={16} />
              <span>ESP8266 Microcontroller Family (80MHz / WiFi / NodeMCU / Wemos)</span>
            </button>
          </div>

          {/* Grid of Board Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {boards.map((b) => {
              const isSelected = selectedBoard?.boardId === b.boardId;
              return (
                <GlassCard
                  key={b.boardId}
                  variant={isSelected ? 'glow' : 'default'}
                  padding="md"
                  className={`cursor-pointer transition-all ${isSelected ? 'border-cyber-cyan ring-2 ring-cyber-cyan/40 scale-[1.02]' : 'hover:scale-[1.01]'}`}
                  onClick={() => handleSelectBoard(b)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <span className="text-[9px] font-mono font-extrabold uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400">
                        {b.family} • {b.architecture}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 mt-1">{b.name}</h3>
                      <p className="text-[10px] font-mono text-slate-500">{b.chip}</p>
                    </div>

                    {isSelected && <CheckCircle2 size={18} className="text-cyber-cyan" />}
                  </div>

                  {/* Specification Pill Badges */}
                  <div className="grid grid-cols-2 gap-1.5 text-[10px] font-mono my-3">
                    <div className="p-1.5 rounded-lg neu-pressed">
                      <span className="text-slate-400 block font-bold">FLASH / RAM</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{b.flashSizeMb}MB / {b.ramSizeKb}KB</span>
                    </div>
                    <div className="p-1.5 rounded-lg neu-pressed">
                      <span className="text-slate-400 block font-bold">GPIO / ADC</span>
                      <span className="font-extrabold text-slate-800 dark:text-slate-200">{b.gpioCount} Pins / {b.adcChannels} ADC</span>
                    </div>
                  </div>

                  {/* Capabilities */}
                  <div className="flex items-center gap-1.5 font-mono text-[9px] text-slate-600 dark:text-slate-400">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded neu-pressed"><Wifi size={10} /> WiFi</span>
                    {b.bluetoothSupport && <span className="flex items-center gap-1 px-1.5 py-0.5 rounded neu-pressed"><Radio size={10} /> BLE</span>}
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded neu-pressed"><Zap size={10} /> MQTT</span>
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded neu-pressed"><ShieldCheck size={10} /> TLS</span>
                  </div>
                </GlassCard>
              );
            })}
          </div>

          <div className="flex justify-end pt-2">
            <button
              onClick={() => setStep(2)}
              disabled={!selectedBoard}
              className="px-6 py-2.5 rounded-xl bg-sky-600 dark:bg-cyan-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider shadow-md hover:bg-sky-700 transition-all flex items-center gap-2"
            >
              <span>NEXT: CONFIGURE HARDWARE PINS</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: Board-Specific Valid Pin Configuration */}
      {step === 2 && selectedBoard && (
        <div className="space-y-4">
          <GlassCard variant="default" padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Settings2 size={16} className="text-cyber-cyan" />
              <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Board-Specific Pin Assignment ({selectedBoard.name})
              </h3>
            </div>

            <p className="text-[11px] font-mono text-slate-500 mb-4">
              Pin numbers are automatically filtered to match valid GPIO capabilities for <strong className="text-cyber-cyan">{selectedBoard.name}</strong>.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  SOIL MOISTURE PROBE PIN (ANALOG ADC)
                </label>
                <input
                  type="text"
                  value={soilPin}
                  onChange={(e) => setSoilPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl neu-pressed font-mono text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                />
                <span className="text-[9px] font-mono text-slate-500 mt-1 block">Recommended: {selectedBoard.recommendedPins.soilMoisturePin}</span>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  DHT11 / DHT22 SENSOR PIN (DIGITAL DATA)
                </label>
                <input
                  type="text"
                  value={dhtPin}
                  onChange={(e) => setDhtPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl neu-pressed font-mono text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                />
                <span className="text-[9px] font-mono text-slate-500 mt-1 block">Recommended: {selectedBoard.recommendedPins.dhtPin}</span>
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  RELAY PUMP PIN (DIGITAL OUTPUT)
                </label>
                <input
                  type="text"
                  value={relayPin}
                  onChange={(e) => setRelayPin(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl neu-pressed font-mono text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                />
                <span className="text-[9px] font-mono text-slate-500 mt-1 block">Recommended: {selectedBoard.recommendedPins.relayPumpPin}</span>
              </div>
            </div>
          </GlassCard>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl neu-button font-mono text-xs font-extrabold text-slate-700 dark:text-slate-300"
            >
              BACK
            </button>
            <button
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl bg-sky-600 dark:bg-cyan-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider shadow-md hover:bg-sky-700 transition-all flex items-center gap-2"
            >
              <span>NEXT: NETWORK & MQTT CREDENTIALS</span>
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: Wi-Fi & MQTTS Credentials */}
      {step === 3 && (
        <div className="space-y-4">
          <GlassCard variant="default" padding="md">
            <div className="flex items-center gap-2 mb-3">
              <Wifi size={16} className="text-cyber-cyan" />
              <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Network & MQTT Broker Credentials
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  WI-FI NETWORK SSID
                </label>
                <input
                  type="text"
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl neu-pressed font-mono text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  WI-FI PASSWORD
                </label>
                <input
                  type="password"
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl neu-pressed font-mono text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  MQTT BROKER HOSTNAME
                </label>
                <input
                  type="text"
                  value={mqttHost}
                  onChange={(e) => setMqttHost(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl neu-pressed font-mono text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                />
              </div>

              <div>
                <label className="text-[10px] font-mono font-bold text-slate-700 dark:text-slate-300 block mb-1">
                  DEVICE HARDWARE ID
                </label>
                <input
                  type="text"
                  value={deviceId}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl neu-pressed font-mono text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                />
              </div>
            </div>
          </GlassCard>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl neu-button font-mono text-xs font-extrabold text-slate-700 dark:text-slate-300"
            >
              BACK
            </button>
            <button
              onClick={handleGenerateFirmware}
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-xl bg-sky-600 dark:bg-cyan-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider shadow-md hover:bg-sky-700 transition-all flex items-center gap-2"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  <span>GENERATING C++ CODE...</span>
                </>
              ) : (
                <>
                  <Code size={16} />
                  <span>GENERATE BOARD FIRMWARE (.INO)</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* STEP 4: Generated Firmware C++ Preview & Download */}
      {step === 4 && (
        <div className="space-y-4">
          <GlassCard variant="glow" padding="md" className="border-cyber-cyan/40">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-300/40 dark:border-slate-700/40">
              <div className="flex items-center gap-2">
                <FileCode size={16} className="text-cyber-cyan" />
                <div>
                  <h3 className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Generated Arduino C++ Firmware ({selectedBoard?.name})
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    Header: <code className="text-cyber-cyan">{selectedBoard?.wifiHeader}</code> • Core: {selectedBoard?.arduinoCore}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl neu-button text-xs font-mono font-bold text-cyber-cyan"
                >
                  <Copy size={12} />
                  <span>{copied ? 'COPIED!' : 'COPY CODE'}</span>
                </button>

                <button
                  onClick={handleDownloadIno}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-sky-600 dark:bg-cyan-500 text-white text-xs font-mono font-extrabold uppercase shadow-sm"
                >
                  <Download size={12} />
                  <span>DOWNLOAD .INO</span>
                </button>
              </div>
            </div>

            {/* Code Box */}
            <pre className="p-4 rounded-xl bg-slate-950 text-slate-100 font-mono text-[11px] overflow-x-auto max-h-[400px] leading-relaxed border border-slate-800">
              <code>{generatedCode}</code>
            </pre>
          </GlassCard>

          {/* Arduino IDE Setup Guide Banner */}
          <GlassCard variant="default" padding="md">
            <div className="flex items-center gap-2 mb-2">
              <HelpCircle size={14} className="text-cyber-cyan" />
              <span className="text-xs font-mono font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                Required Arduino IDE Setup Instructions
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[10px] font-mono">
              <div className="p-2.5 rounded-xl neu-pressed">
                <span className="font-extrabold text-cyber-cyan block mb-1">1. BOARD MANAGER URL</span>
                <code className="text-[9px] text-slate-600 dark:text-slate-300 bg-slate-900/60 p-1 rounded block overflow-x-auto">
                  {selectedBoard?.boardManagerUrl}
                </code>
              </div>

              <div className="p-2.5 rounded-xl neu-pressed">
                <span className="font-extrabold text-cyber-cyan block mb-1">2. REQUIRED LIBRARIES</span>
                <div className="text-slate-600 dark:text-slate-300">
                  PubSubClient, ArduinoJson, DHT sensor library, Adafruit Unified Sensor
                </div>
              </div>
            </div>
          </GlassCard>

          <div className="flex justify-start">
            <button
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl neu-button font-mono text-xs font-extrabold text-slate-700 dark:text-slate-300"
            >
              CONFIGURE ANOTHER BOARD
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
