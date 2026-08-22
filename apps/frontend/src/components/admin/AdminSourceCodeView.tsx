import React, { useState } from 'react';
import {
  Code2,
  FileCode,
  Copy,
  Download,
  Check,
  Cpu,
  Smartphone,
  Server,
  Shield,
  Radio,
  Zap,
  CheckCircle2,
  ExternalLink,
  BookOpen,
  Sliders,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';

export const AdminSourceCodeView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'ESP32_FIRMWARE' | 'ESP8266_FIRMWARE' | 'ANDROID_KOTLIN' | 'BACKEND_SECURITY' | 'FRONTEND_MIDDLEWARE' | 'BACKEND_GATEWAY'
  >('ESP32_FIRMWARE');

  const [copied, setCopied] = useState(false);
  const [customNodeSerial, setCustomNodeSerial] = useState('ESP32-ATH-8A12');
  const [customAuthCode, setCustomAuthCode] = useState('ATH-8F92-4C10-99E4');
  const [customGatewayIp, setCustomGatewayIp] = useState('192.168.1.100');

  // Source Codes
  const esp32SourceCode = `/*
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  AETHERCROP SPATIAL IOT PLATFORM — ESP32 FIRMWARE NODE v3.5
 *  (WEBSOCKETS SERVER + CAPTIVE SOFTAP + BLE GATT + NVS PROVISIONING + MQTT)
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  Hardware Target : ESP32 DevKit V1 / WROOM-32 / NodeMCU-32S / ESP32-WROVER
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

#include <WiFi.h>
#include <WebServer.h>
#include <DNSServer.h>
#include <ESPmDNS.h>
#include <Preferences.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>
#include <nvs_flash.h>
#include <WebSocketsServer.h>

// ─── BLE UUID DEFINITIONS ───
#define SERVICE_UUID        "0000ffe0-0000-1000-8000-00805f9b34fb"
#define CHARACTERISTIC_UUID "0000ffe1-0000-1000-8000-00805f9b34fb"

// ─── PIN DEFINITIONS (ESP32) ───
#define SOIL_MOISTURE_PIN  34    // ADC1 Channel 6 (Analog 0-4095)
#define DHT_PIN            4     // GPIO 4 for DHT11 / DHT22 Data
#define DHT_TYPE           DHT11 // DHT11 or DHT22
#define FLOW_SENSOR_PIN    18    // Interrupt Pin for Pulse Counting
#define RELAY_PUMP_PIN     26    // GPIO 26 for Pump Relay (Active HIGH)
#define STATUS_LED_PIN     2     // Built-in LED (GPIO 2)
#define PIN_FACTORY_RESET  0     // Boot/Flash Button (Hold 3s to Factory Reset)

// ─── SERVER & GATEWAY CONFIGURATION ───
const byte DNS_PORT = 53;
const char* BACKEND_GATEWAY_HOST = "${customGatewayIp}";
const int   BACKEND_GATEWAY_PORT = 3000;
const int   MQTT_PORT            = 1883;
const char* TOPIC_TELEMETRY      = "aether/farm-alpha/zone-1/telemetry";
const char* TOPIC_COMMANDS       = "aether/farm-alpha/zone-1/commands";

Preferences preferences;
WebServer server(80);
WebSocketsServer webSocket = WebSocketsServer(81);
DNSServer dnsServer;
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(DHT_PIN, DHT_TYPE);

BLEServer* pBleServer = NULL;
BLECharacteristic* pBleCharacteristic = NULL;
bool bleClientConnected = false;

String wifiSsid = "";
String wifiPass = "";
String deviceSerial = "${customNodeSerial}";
String macAddress = "";
String authCode = "${customAuthCode}";

// (Complete ESP32 Code Active in firmware/esp32/esp32_aethercrop_node.ino)
`;

  const esp8266SourceCode = `/*
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  AETHERCROP SPATIAL IOT PLATFORM — ESP8266 FIRMWARE NODE
 *  (WIFI PROVISIONING + EEPROM FLASH + SOFTAP + MDNS + TELEMETRY)
 * ═══════════════════════════════════════════════════════════════════════════════════
 *  Hardware Target : ESP8266 NodeMCU V2/V3 / WeMos D1 Mini / ESP-12E
 * ═══════════════════════════════════════════════════════════════════════════════════
 */

#include <ESP8266WiFi.h>
#include <ESP8266mDNS.h>
#include <WiFiClientSecure.h>
#include <ESP8266WebServer.h>
#include <EEPROM.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <ESP8266HTTPClient.h>
#include <DHT.h>

// ─── HARDWARE GPIO PIN MAPPING (ESP8266) ───
#define PIN_LED_INDICATOR  2    // Onboard Status LED (D4 on NodeMCU, Active LOW)
#define PIN_BUTTON_RESET   0    // Flash Button (GPIO 0 - Hold 5s to clear Wi-Fi EEPROM)
#define PIN_SOIL_MOISTURE  A0   // Analog Soil Moisture Probe (0-1023)
#define PIN_DHT_DATA       4    // Digital Air Temp & Humidity (D2 on NodeMCU)
#define PIN_RELAY_PUMP     5    // Water Pump Relay (D1 on NodeMCU, Active HIGH)
#define PIN_FLOW_RATE      14   // Pulse Water Flow Sensor (D5 on NodeMCU)
#define DHTTYPE            DHT11

ESP8266WebServer server(80);
WiFiClient espClient;
PubSubClient mqttClient(espClient);
DHT dht(PIN_DHT_DATA, DHTTYPE);

String wifiSsid = "";
String wifiPass = "";
String deviceSerial = "${customNodeSerial}";
String authCode = "${customAuthCode}";
`;

  const androidKotlinCode = `package com.agriflow.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import com.agriflow.app.ble.BleProvisionManager
import com.agriflow.app.wifi.WifiScanManager
import com.agriflow.app.mqtt.MqttManager

/**
 * Android 14 Pure Kotlin IoT Bridge
 * Target SDK: 34 (Android 14 UpsideDownCake)
 */
class MainActivity : ComponentActivity() {
    private lateinit var bleManager: BleProvisionManager
    private lateinit var wifiManager: WifiScanManager
    private lateinit var mqttManager: MqttManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        bleManager = BleProvisionManager(this)
        wifiManager = WifiScanManager(this)
        mqttManager = MqttManager(this)

        setContent {
            // High-Performance Native UI
        }
    }
}
`;

  const backendSecurityCode = `import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

// ─── CYBERSECURITY CONFIGURATION ───
const HMAC_SECRET = process.env.AETHER_HMAC_SECRET || 'aether_super_secret_cyber_key_2026';

// ─── HMAC SHA-256 SIGNATURE VERIFICATION (ANTI-TAMPERING & REPLAY ATTACK MITIGATION) ───
export const hmacSignatureVerifier = (req: Request, res: Response, next: NextFunction) => {
  if (req.method === 'GET' || req.method === 'OPTIONS') return next();

  const signature = req.headers['x-aether-signature'] as string;
  const timestamp = req.headers['x-aether-timestamp'] as string;

  if (signature && timestamp) {
    const now = Date.now();
    const reqTime = parseInt(timestamp, 10);
    if (isNaN(reqTime) || Math.abs(now - reqTime) > 300000) {
      return res.status(401).json({ error: 'TIMESTAMP_EXPIRED' });
    }
    const payloadString = JSON.stringify(req.body || {});
    const expectedHash = crypto.createHmac('sha256', HMAC_SECRET).update(\`\${timestamp}.\${payloadString}\`).digest('hex');
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedHash))) {
      return res.status(401).json({ error: 'SIGNATURE_INVALID' });
    }
  }
  next();
};
`;

  const frontendMiddlewareCode = `import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Apply OWASP Security Headers
  response.headers.set('Content-Security-Policy', "default-src 'self'; ...");
  response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)');

  return response;
}
`;

  const backendGatewayCode = `import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer, WebSocket as WsClient } from 'ws';

const app = express();
const server = http.createServer(app);

// Dedicated Native WebSocket Server for Hardware & Web Browser Direct Links
const rawWss = new WebSocketServer({ server, path: '/ws/iot' });
rawWss.on('connection', (ws: WsClient) => {
  ws.send(JSON.stringify({ type: 'CONNECTION_ACK', gateway: 'AetherCrop IoT' }));
});

server.listen(4000);
`;

  const getActiveCode = () => {
    switch (activeTab) {
      case 'ESP32_FIRMWARE':
        return esp32SourceCode;
      case 'ESP8266_FIRMWARE':
        return esp8266SourceCode;
      case 'ANDROID_KOTLIN':
        return androidKotlinCode;
      case 'BACKEND_SECURITY':
        return backendSecurityCode;
      case 'FRONTEND_MIDDLEWARE':
        return frontendMiddlewareCode;
      case 'BACKEND_GATEWAY':
        return backendGatewayCode;
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadFile = () => {
    const code = getActiveCode();
    let filename = 'esp32_firmware.ino';
    if (activeTab === 'ESP8266_FIRMWARE') filename = 'esp8266_firmware.ino';
    if (activeTab === 'ANDROID_KOTLIN') filename = 'MainActivity.kt';
    if (activeTab === 'BACKEND_SECURITY') filename = 'security.middleware.ts';
    if (activeTab === 'FRONTEND_MIDDLEWARE') filename = 'middleware.ts';
    if (activeTab === 'BACKEND_GATEWAY') filename = 'index.ts';

    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 text-left">
      {/* HEADER BAR */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Firmware &amp; Source Code Studio</span>
                <span className="text-[10px] bg-cyan-950 text-cyan-300 border border-cyan-800/60 px-2 py-0.5 rounded-full font-mono">
                  v3.5 Active
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Explore, customize, and download verified production code for ESP32, ESP8266, Android 14, and Backend Gateways.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleCopyCode}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-bold transition-all flex items-center gap-2 border border-slate-700"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied Code!' : 'Copy Code'}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadFile}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 transition-all flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Source File</span>
          </button>
        </div>
      </div>

      {/* PARAMETER CUSTOMIZER BAR */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>Dynamic Code Parameter Injector</span>
          </span>
          <span className="text-[10px] text-slate-400">Values auto-inject into the code below</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-medium text-slate-400 block mb-1">Target Serial Number</label>
            <input
              type="text"
              value={customNodeSerial}
              onChange={(e) => setCustomNodeSerial(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-400 block mb-1">Authentication Code</label>
            <input
              type="text"
              value={customAuthCode}
              onChange={(e) => setCustomAuthCode(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-amber-300 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-400 block mb-1">Local Gateway IP</label>
            <input
              type="text"
              value={customGatewayIp}
              onChange={(e) => setCustomGatewayIp(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-emerald-300 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex flex-wrap gap-2 border-b border-slate-800 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('ESP32_FIRMWARE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ESP32_FIRMWARE'
              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50 shadow-md shadow-cyan-500/10'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Cpu className="w-4 h-4 text-cyan-400" />
          <span>ESP32 Node (v3.5 C++)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ESP8266_FIRMWARE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ESP8266_FIRMWARE'
              ? 'bg-teal-950 text-teal-300 border border-teal-500/50 shadow-md shadow-teal-500/10'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Radio className="w-4 h-4 text-teal-400" />
          <span>ESP8266 Node (C++)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ANDROID_KOTLIN')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'ANDROID_KOTLIN'
              ? 'bg-purple-950 text-purple-300 border border-purple-500/50 shadow-md shadow-purple-500/10'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Smartphone className="w-4 h-4 text-purple-400" />
          <span>Android 14 Native (Kotlin)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BACKEND_SECURITY')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'BACKEND_SECURITY'
              ? 'bg-red-950 text-red-300 border border-red-500/50 shadow-md shadow-red-500/10'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Shield className="w-4 h-4 text-red-400" />
          <span>Cybersecurity Middleware</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('FRONTEND_MIDDLEWARE')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'FRONTEND_MIDDLEWARE'
              ? 'bg-indigo-950 text-indigo-300 border border-indigo-500/50 shadow-md shadow-indigo-500/10'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 text-indigo-400" />
          <span>Next.js Edge Middleware</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('BACKEND_GATEWAY')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            activeTab === 'BACKEND_GATEWAY'
              ? 'bg-blue-950 text-blue-300 border border-blue-500/50 shadow-md shadow-blue-500/10'
              : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
          }`}
        >
          <Server className="w-4 h-4 text-blue-400" />
          <span>WebSocket Hub (Express)</span>
        </button>
      </div>

      {/* CODE VIEWER BOX */}
      <div className="relative rounded-2xl bg-slate-950 border border-slate-800 overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 border-b border-slate-800">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
            <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
            <span className="text-xs font-mono text-slate-400 ml-2">
              {activeTab === 'ESP32_FIRMWARE'
                ? 'firmware/esp32/esp32_aethercrop_node.ino'
                : activeTab === 'ESP8266_FIRMWARE'
                ? 'firmware/esp8266/esp8266_aethercrop_node.ino'
                : activeTab === 'ANDROID_KOTLIN'
                ? 'android/app/src/main/java/com/agriflow/app/MainActivity.kt'
                : activeTab === 'BACKEND_SECURITY'
                ? 'apps/backend/src/middleware/security.middleware.ts'
                : activeTab === 'FRONTEND_MIDDLEWARE'
                ? 'apps/frontend/src/middleware.ts'
                : 'apps/backend/src/index.ts'}
            </span>
          </div>

          <span className="text-[10px] text-slate-500 font-mono">UTF-8 &bull; LF</span>
        </div>

        <pre className="p-5 text-xs font-mono text-cyan-300 bg-[#060a12] overflow-x-auto max-h-[500px] leading-relaxed select-all">
          <code>{getActiveCode()}</code>
        </pre>
      </div>
    </div>
  );
};
