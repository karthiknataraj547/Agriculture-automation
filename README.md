# 🌾 Agriculture Automation & Spatial 3D Smart Irrigation Platform

A state-of-the-art, full-stack **Spatial IoT Agriculture & Automated Irrigation Management Platform** featuring **Photorealistic 3D Farm Terrain Mapping**, **Light/Dark 3D Neumorphism UI**, **Manual & Automated Pump Actuation**, **PIR Motion Wildlife Defense**, **Local Agronomist AI Assistant**, and **Hardware Auth Code Pairing** for ESP32 / Arduino devices.

---

## 🌟 Key Features

1. **Photorealistic 3D Smart Farm Canvas (`Three.js / React Three Fiber`)**:
   - Procedural 3D Crop Parcels: Corn Stalks, Vineyard Trellis Rows, Apple Orchard Trees, and Soybean Sectors.
   - Master High-Capacity Farm Pump Station with twin turbine motors and real-time LED status beacons.
   - Elevated 3D Pipe Structure mounted on concrete stanchions with dynamic glowing cyan water flow animations.

2. **Light & Dark 3D Neumorphism Design System**:
   - Soft 3D Neumorphic Light Theme (`#e6ecf5`) with tactile convex buttons and inset sockets.
   - Dark Cyber-Obsidian Neumorphic Theme (`#0b0f19`) with cyan glow accents.
   - Instant 1-click Light/Dark theme toggle in the top bar.

3. **Manual & Automated Irrigation Control**:
   - Real-time Flow Rate, Totalization, Runtime Counters, and Manual Override switches.
   - Automated Irrigation Scheduler with start time, duration, and day-of-week selection.

4. **PIR Motion Sensor & Wildlife Perimeter Defense**:
   - Instant perimeter intrusion detection for wild animals (Boars, Deer, Rodents).
   - Audio-visual alert banner, flash warning beacons, and automated deterrence siren response.

5. **Hardware Auth Code Device Pairing (ESP32 / Arduino / Raspberry Pi)**:
   - System automatically generates a 16-character Hardware Auth Code (e.g., `ATH-8F92-4C10-99E4`).
   - Secure REST API authentication verification endpoint (`POST /api/v1/devices/verify-auth`).
   - Built-in ESP32 C++ firmware code generator with Soil Moisture, DHT11/22, and Relay Pump control.

6. **Local Agronomist AI Assistant**:
   - On-device local AI chat assistant for predictive crop health analytics and irrigation recommendations.

---

## 🏗️ Project Architecture & Tech Stack

- **Frontend**: Next.js 14, React 18, Three.js, React Three Fiber, Zustand, TailwindCSS, Lucide Icons
- **Backend**: Node.js, Express, Socket.IO (WebSocket Gateway), REST API
- **Shared Domain**: TypeScript Monorepo (`@aether/shared`)
- **IoT Hardware Compatibility**: ESP32, ESP8266, Arduino, Raspberry Pi (MQTT & HTTP)

---

## 🚀 Quick Start Guide

### 1. Installation
```bash
npm install
```

### 2. Run Development Servers
Start both backend gateway (Port 4000) and frontend web app (Port 3000):

```bash
# Terminal 1: Start Backend Gateway
npm run dev --workspace=apps/backend

# Terminal 2: Start Frontend Web App
npm run dev --workspace=apps/frontend
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🔌 Hardware Setup (ESP32)

1. Navigate to the **`Devices`** tab in the web tool and click **`+ PROVISION NEW DEVICE`**.
2. Note your generated **Hardware Auth Code** (e.g. `ATH-8F92-4C10-99E4`).
3. Wire your ESP32:
   - **Soil Moisture Sensor**: `GPIO 34`
   - **DHT11/22 Sensor**: `GPIO 4`
   - **Relay Module (Pump)**: `GPIO 26`
4. Copy the complete C++ firmware code from the **`🔌 HARDWARE SETUP GUIDE`** modal in the web app, flash your ESP32, and your hardware will automatically pair!

---

## 📜 License
MIT License. Created for Agriculture Automation & Smart Farming.
