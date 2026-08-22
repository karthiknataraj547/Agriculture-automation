'use client';

import React, { useState, useEffect } from 'react';
import {
  Smartphone,
  Wifi,
  Battery,
  Signal,
  RotateCcw,
  Zap,
  Droplets,
  Thermometer,
  Activity,
  Power,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  MapPin,
  Sparkles,
  Sliders,
  Radio,
  RadioTower,
  Bluetooth,
  Home,
  Layers,
  Settings,
  X,
  Plus
} from 'lucide-react';
import Link from 'next/link';

export const AndroidPhoneSimulator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'DASHBOARD' | 'PROVISION' | 'FARMS' | 'SETTINGS'>('DASHBOARD');
  const [deviceModel, setDeviceModel] = useState<'PIXEL' | 'SAMSUNG'>('PIXEL');
  
  // Live Telemetry States
  const [soilMoisture, setSoilMoisture] = useState<number>(54.2);
  const [airTemp, setAirTemp] = useState<number>(28.4);
  const [humidity, setHumidity] = useState<number>(62.0);
  const [batteryLevel, setBatteryLevel] = useState<number>(98);
  const [isPumpActive, setIsPumpActive] = useState<boolean>(false);
  const [pumpCountdown, setPumpCountdown] = useState<number>(0);
  const [isWsConnected, setIsWsConnected] = useState<boolean>(true);

  // Provisioning Wizard States
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3 | 4>(1);
  const [selectedBeacon, setSelectedBeacon] = useState<string>('ESP32-ATH-8A12');
  const [wifiSsid, setWifiSsid] = useState<string>('Farm_Mesh_WiFi_5G');
  const [wifiPass, setWifiPass] = useState<string>('agrifarm2026');
  const [provisionProgress, setProvisionProgress] = useState<number>(0);
  const [isScanning, setIsScanning] = useState<boolean>(false);

  // Current Time for Android Status Bar
  const [currentTime, setCurrentTime] = useState<string>('19:45');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = d.getHours().toString().padStart(2, '0');
      const m = d.getMinutes().toString().padStart(2, '0');
      setCurrentTime(`${h}:${m}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, []);

  // Pump Pulse Handler
  const handlePumpToggle = () => {
    if (isPumpActive) {
      setIsPumpActive(false);
      setPumpCountdown(0);
    } else {
      setIsPumpActive(true);
      setPumpCountdown(6);
      const countdownTimer = setInterval(() => {
        setPumpCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownTimer);
            setIsPumpActive(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  // Start Provisioning Flow in Mobile Simulator
  const startProvisioning = () => {
    setWizardStep(3);
    setProvisionProgress(25);
    setTimeout(() => setProvisionProgress(65), 1000);
    setTimeout(() => {
      setProvisionProgress(100);
      setSoilMoisture(58.4);
      setWizardStep(4);
    }, 2200);
  };

  return (
    <div className="flex flex-col items-center justify-center p-2 md:p-6 select-none font-sans">
      {/* DEVICE CONTROLS HEADER */}
      <div className="w-full max-w-md flex items-center justify-between mb-4 bg-slate-900/80 border border-slate-800 p-3 rounded-2xl backdrop-blur-md text-xs">
        <div className="flex items-center space-x-2">
          <Smartphone className="w-4 h-4 text-cyan-400" />
          <span className="font-bold text-white">Android 14 Native App Preview</span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={() => setDeviceModel(deviceModel === 'PIXEL' ? 'SAMSUNG' : 'PIXEL')}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 font-mono text-[11px] border border-slate-700"
          >
            {deviceModel === 'PIXEL' ? 'Pixel 8 Pro' : 'Galaxy S24'}
          </button>

          <Link
            href="/download"
            className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-bold text-[11px]"
          >
            Install APK
          </Link>
        </div>
      </div>

      {/* SMARTPHONE HARDWARE FRAME */}
      <div className={`relative w-[360px] sm:w-[380px] h-[750px] bg-[#090d16] rounded-[48px] border-[10px] ${
        deviceModel === 'PIXEL' ? 'border-[#1e293b]' : 'border-[#334155]'
      } shadow-[0_25px_60px_-15px_rgba(6,182,212,0.3)] overflow-hidden flex flex-col justify-between`}>
        
        {/* CAMERA PUNCH-HOLE */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-black border border-slate-800 z-50 flex items-center justify-center">
          <div className="w-1.5 h-1.5 rounded-full bg-[#0a192f]"></div>
        </div>

        {/* ANDROID STATUS BAR */}
        <div className="h-9 px-6 bg-slate-950/90 backdrop-blur-md flex items-center justify-between text-[11px] font-mono text-slate-300 z-40 pt-1">
          <span className="font-bold text-white">{currentTime}</span>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-cyan-400">5G</span>
            <Wifi className="w-3.5 h-3.5 text-cyan-400" />
            <div className="flex items-center space-x-1">
              <span className="text-[10px] font-bold">{batteryLevel}%</span>
              <Battery className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
            </div>
          </div>
        </div>

        {/* APP MAIN CONTENT SCREEN AREA */}
        <div className="flex-1 overflow-y-auto bg-[#070b14] text-slate-100 p-4 space-y-4">
          
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'DASHBOARD' && (
            <div className="space-y-4 animate-fade-in text-left">
              {/* APP BAR */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-extrabold text-white">AgriFlow Smart Node</h2>
                  <p className="text-[10px] text-slate-400 font-mono">NODE: ESP32-ATH-8A12</p>
                </div>
                <div className="px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-700/60 text-[9px] font-mono flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  WS LIVE
                </div>
              </div>

              {/* MAIN RADIAL MOISTURE GAUGE CARD */}
              <div className="p-4 rounded-3xl bg-slate-900/90 border border-slate-800 text-center space-y-3 shadow-lg shadow-cyan-500/5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  ROOT ZONE SOIL MOISTURE
                </div>

                <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" stroke="#1e293b" strokeWidth="8" fill="transparent" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#06b6d4"
                      strokeWidth="8"
                      strokeDasharray={251.32}
                      strokeDashoffset={251.32 - (251.32 * soilMoisture) / 100}
                      strokeLinecap="round"
                      fill="transparent"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-black font-mono text-white">{soilMoisture}%</span>
                    <span className="text-[9px] text-cyan-400 font-bold">OPTIMAL</span>
                  </div>
                </div>

                <div className="text-[10px] text-slate-500">Capacitive V1.2 (ADC Channel 6)</div>
              </div>

              {/* 2X2 METRICS GRID */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                    <Thermometer className="w-3 h-3 text-amber-400" />
                    <span>TEMPERATURE</span>
                  </div>
                  <div className="text-base font-bold text-amber-300 font-mono">{airTemp}°C</div>
                  <div className="text-[9px] text-slate-500">Air Sensor DHT11</div>
                </div>

                <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1">
                  <div className="text-[9px] font-bold text-slate-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-cyan-400" />
                    <span>HUMIDITY</span>
                  </div>
                  <div className="text-base font-bold text-cyan-300 font-mono">{humidity}%</div>
                  <div className="text-[9px] text-slate-500">Relative Air RH</div>
                </div>
              </div>

              {/* WATER PUMP ACTUATION BUTTON */}
              <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Power className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Pump Relay (GPIO 26)</span>
                  </span>
                  <span className={`text-[10px] font-mono font-bold ${isPumpActive ? 'text-emerald-400 animate-pulse' : 'text-slate-500'}`}>
                    {isPumpActive ? `ACTIVE (${pumpCountdown}s)` : 'IDLE'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handlePumpToggle}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isPumpActive
                      ? 'bg-red-600 hover:bg-red-500 text-white animate-pulse'
                      : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                  }`}
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>{isPumpActive ? `Stop Pump Relay (${pumpCountdown}s)` : 'Pulse Pump Relay (6s)'}</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: PROVISIONING STUDIO */}
          {activeTab === 'PROVISION' && (
            <div className="space-y-4 animate-fade-in text-left">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <h3 className="text-sm font-bold text-white">IoT Provisioning Studio</h3>
                <span className="text-[10px] text-cyan-400 font-mono">Step {wizardStep} of 4</span>
              </div>

              {wizardStep === 1 && (
                <div className="space-y-3">
                  <div className="p-3 rounded-2xl bg-blue-950/80 border border-blue-500/40 space-y-2">
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Bluetooth className="w-4 h-4 text-cyan-400" />
                      <span>Bluetooth LE Instant Connect</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setWizardStep(2)}
                      className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md"
                    >
                      Pair ESP32 via Bluetooth
                    </button>
                  </div>

                  <div className="text-[11px] font-bold text-slate-300">Detected Beacons:</div>
                  <div
                    onClick={() => {
                      setSelectedBeacon('ESP32-ATH-8A12');
                      setWizardStep(2);
                    }}
                    className="p-3 rounded-2xl bg-slate-900 border border-emerald-500/60 cursor-pointer flex items-center justify-between hover:border-emerald-400"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">AGRI-ESP32-8A12</div>
                      <div className="text-[10px] text-slate-400 font-mono">MAC: CC:50:E3:8A:12:34</div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-bold text-emerald-400">📶 98%</span>
                      <div className="text-[9px] text-slate-500">-32 dBm</div>
                    </div>
                  </div>
                </div>
              )}

              {wizardStep === 2 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-white">Enter Wi-Fi Credentials:</div>
                  <input
                    type="text"
                    value={wifiSsid}
                    onChange={(e) => setWifiSsid(e.target.value)}
                    placeholder="SSID"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <input
                    type="password"
                    value={wifiPass}
                    onChange={(e) => setWifiPass(e.target.value)}
                    placeholder="Password"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWizardStep(1)}
                      className="px-3 py-2 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold"
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      onClick={startProvisioning}
                      className="flex-1 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs"
                    >
                      Push to Hardware &rarr;
                    </button>
                  </div>
                </div>
              )}

              {wizardStep === 3 && (
                <div className="text-center py-6 space-y-4">
                  <div className="w-20 h-20 mx-auto rounded-full bg-cyan-950 border-4 border-cyan-400 flex items-center justify-center">
                    <span className="text-xl font-bold font-mono text-cyan-300">{provisionProgress}%</span>
                  </div>
                  <div className="text-xs font-bold text-white">Connecting Microcontroller...</div>
                  <div className="text-[10px] text-slate-400">Writing credentials into NVS Flash Memory</div>
                </div>
              )}

              {wizardStep === 4 && (
                <div className="p-4 rounded-2xl bg-emerald-950/60 border border-emerald-500/50 text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto animate-bounce" />
                  <div className="text-sm font-bold text-white">Hardware 100% Connected!</div>
                  <div className="text-[10px] text-slate-300">IP: 192.168.1.105 &bull; SSID: {wifiSsid}</div>
                  <button
                    type="button"
                    onClick={() => {
                      setWizardStep(1);
                      setActiveTab('DASHBOARD');
                    }}
                    className="w-full py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs"
                  >
                    View in Mobile Dashboard
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FARMS & ZONES */}
          {activeTab === 'FARMS' && (
            <div className="space-y-3 animate-fade-in text-left">
              <h3 className="text-sm font-bold text-white">North Commercial Farm</h3>
              <p className="text-[10px] text-slate-400">3 Spatial Zones Active</p>

              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Zone A (Corn &amp; Wheat)</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono">OPTIMAL</span>
                </div>
                <div className="text-[10px] text-slate-400">Moisture Target: 50% - 65%</div>
                <div className="text-xs font-bold text-cyan-300 font-mono">Current: 54.2%</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Zone B (Orchard Drip)</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-950 text-amber-300 font-mono">IRRIGATING</span>
                </div>
                <div className="text-[10px] text-slate-400">Moisture Target: 45% - 60%</div>
                <div className="text-xs font-bold text-amber-300 font-mono">Current: 42.8%</div>
              </div>

              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">Zone C (Vineyard Sector)</span>
                  <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 font-mono">OPTIMAL</span>
                </div>
                <div className="text-[10px] text-slate-400">Moisture Target: 55% - 70%</div>
                <div className="text-xs font-bold text-cyan-300 font-mono">Current: 61.0%</div>
              </div>
            </div>
          )}

          {/* TAB 4: SETTINGS */}
          {activeTab === 'SETTINGS' && (
            <div className="space-y-3 animate-fade-in text-left">
              <h3 className="text-sm font-bold text-white">Mobile Preferences</h3>
              <div className="p-3 rounded-2xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">WebSocket Link</span>
                  <span className="font-mono text-cyan-400 text-[10px]">ws://192.168.4.1:81</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">Local Gateway IP</span>
                  <span className="font-mono text-emerald-400 text-[10px]">192.168.1.100</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-300">App Version</span>
                  <span className="font-mono text-slate-400 text-[10px]">v3.5.0-KOTLIN</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ANDROID BOTTOM NAVIGATION BAR */}
        <div className="h-16 bg-slate-950 border-t border-slate-800/80 px-4 flex items-center justify-around z-40">
          <button
            type="button"
            onClick={() => setActiveTab('DASHBOARD')}
            className={`flex flex-col items-center space-y-1 transition-all ${
              activeTab === 'DASHBOARD' ? 'text-cyan-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[9px] font-bold">Dashboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('PROVISION')}
            className={`flex flex-col items-center space-y-1 transition-all ${
              activeTab === 'PROVISION' ? 'text-cyan-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[9px] font-bold">Provision</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('FARMS')}
            className={`flex flex-col items-center space-y-1 transition-all ${
              activeTab === 'FARMS' ? 'text-cyan-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[9px] font-bold">Farms</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('SETTINGS')}
            className={`flex flex-col items-center space-y-1 transition-all ${
              activeTab === 'SETTINGS' ? 'text-cyan-400 scale-105' : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[9px] font-bold">Settings</span>
          </button>
        </div>

        {/* ANDROID SYSTEM PILL / GESTURE BAR */}
        <div className="h-4 bg-slate-950 flex items-center justify-center pb-1">
          <div className="w-24 h-1 rounded-full bg-slate-600"></div>
        </div>
      </div>
    </div>
  );
};
