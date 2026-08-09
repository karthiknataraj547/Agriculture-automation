import { NextResponse } from 'next/server';

interface TelemetryPacket {
  deviceId: string;
  authCode?: string;
  zoneId?: string;
  soilMoisture?: number;
  airTemperature?: number;
  humidity?: number;
  waterFlowRate?: number;
  tankLevelPercent?: number;
  pumpRunning?: boolean;
  batteryLevel?: number;
  rssi?: number;
  timestamp?: string;
}

interface HardwareDeviceRecord {
  uuid: string;
  serialNumber: string;
  name: string;
  status: 'ONLINE' | 'OFFLINE';
  zoneId: string;
  mqttTopic: string;
  authCode: string;
  lastSeen: string;
  batteryLevel: number;
  signalRssi: number;
  firmwareVersion: string;
  sensorsAttached: string[];
}

// Global Memory Cache for Live Hardware Telemetry
declare global {
  var _aether_hardware_telemetry: Map<string, TelemetryPacket> | undefined;
  var _aether_hardware_devices: Map<string, HardwareDeviceRecord> | undefined;
}

if (!global._aether_hardware_telemetry) {
  global._aether_hardware_telemetry = new Map();
}
if (!global._aether_hardware_devices) {
  global._aether_hardware_devices = new Map();
}

const liveTelemetry = global._aether_hardware_telemetry!;
const liveDevices = global._aether_hardware_devices!;

// ─── POST /api/telemetry (Hardware Ingestion API) ───
export async function POST(req: Request) {
  try {
    const body: TelemetryPacket = await req.json();

    if (!body.deviceId) {
      return NextResponse.json({ success: false, error: 'Missing deviceId in telemetry payload' }, { status: 400 });
    }

    const deviceId = body.deviceId;
    const nowIso = new Date().toISOString();
    const isEsp8266 = deviceId.toLowerCase().includes('8266');

    // Update Live Telemetry Record
    const updatedPacket: TelemetryPacket = {
      ...body,
      zoneId: body.zoneId || 'zone-1',
      timestamp: nowIso,
      soilMoisture: body.soilMoisture !== undefined ? body.soilMoisture : 0,
      airTemperature: body.airTemperature !== undefined ? body.airTemperature : 0,
      humidity: body.humidity !== undefined ? body.humidity : 0,
      waterFlowRate: body.waterFlowRate !== undefined ? body.waterFlowRate : 0,
      tankLevelPercent: body.tankLevelPercent !== undefined ? body.tankLevelPercent : 0,
      batteryLevel: body.batteryLevel !== undefined ? body.batteryLevel : 100,
      rssi: body.rssi !== undefined ? body.rssi : -60,
    };

    liveTelemetry.set(deviceId, updatedPacket);

    // Auto-register / update hardware node status in live devices inventory
    const existingDev = liveDevices.get(deviceId);
    if (existingDev) {
      existingDev.status = 'ONLINE';
      existingDev.lastSeen = nowIso;
      existingDev.batteryLevel = updatedPacket.batteryLevel!;
      existingDev.signalRssi = updatedPacket.rssi!;
      if (body.authCode) existingDev.authCode = body.authCode;
    } else {
      liveDevices.set(deviceId, {
        uuid: deviceId,
        serialNumber: `SN-${deviceId.toUpperCase()}`,
        name: `${isEsp8266 ? 'ESP8266' : 'ESP32'} Hardware Node (${deviceId})`,
        status: 'ONLINE',
        zoneId: updatedPacket.zoneId || 'zone-1',
        mqttTopic: `aether/farm-alpha/${updatedPacket.zoneId || 'zone-1'}/telemetry`,
        authCode: body.authCode || `ATH-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
        lastSeen: nowIso,
        batteryLevel: updatedPacket.batteryLevel!,
        signalRssi: updatedPacket.rssi!,
        firmwareVersion: isEsp8266 ? 'v2.4.1-esp8266' : 'v2.4.1-esp32',
        sensorsAttached: ['SOIL_MOISTURE', 'AIR_TEMP', 'HUMIDITY', 'WATER_FLOW'],
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Hardware telemetry ingested successfully',
      deviceId,
      timestamp: nowIso,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Invalid JSON format' }, { status: 400 });
  }
}

// ─── DELETE /api/telemetry (Remove Hardware Node) ───
export async function DELETE(req: Request) {
  try {
    const { deviceId } = await req.json();
    if (deviceId) {
      liveDevices.delete(deviceId);
      liveTelemetry.delete(deviceId);
      // Also check by lowercase or serial match
      for (const key of Array.from(liveDevices.keys())) {
        if (key === deviceId || key.includes(deviceId) || deviceId.includes(key)) {
          liveDevices.delete(key);
          liveTelemetry.delete(key);
        }
      }
    }
    return NextResponse.json({ success: true, message: `Device ${deviceId} deleted cleanly` });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Deletion failed' }, { status: 400 });
  }
}

// ─── GET /api/telemetry (Web App Hardware State Reader) ───
export async function GET() {
  const now = Date.now();
  const HEARTBEAT_TIMEOUT_MS = 10000; // 10 seconds

  const telemetryArray: TelemetryPacket[] = [];
  const devicesArray: HardwareDeviceRecord[] = [];

  for (const [id, dev] of liveDevices.entries()) {
    const lastSeenMs = new Date(dev.lastSeen).getTime();
    if (now - lastSeenMs > HEARTBEAT_TIMEOUT_MS) {
      dev.status = 'OFFLINE';
    } else {
      dev.status = 'ONLINE';
    }
    devicesArray.push(dev);
  }

  for (const packet of liveTelemetry.values()) {
    telemetryArray.push(packet);
  }

  const onlineDevices = devicesArray.filter((d) => d.status === 'ONLINE');
  const validSoilReadings = telemetryArray.map((t) => t.soilMoisture || 0);
  const validTempReadings = telemetryArray.map((t) => t.airTemperature || 0);
  const validFlowReadings = telemetryArray.map((t) => t.waterFlowRate || 0);
  const validTankReadings = telemetryArray.map((t) => t.tankLevelPercent || 0);

  const avgSoilMoisture =
    validSoilReadings.length > 0
      ? round1(validSoilReadings.reduce((a, b) => a + b, 0) / validSoilReadings.length)
      : 0;

  const avgTemperature =
    validTempReadings.length > 0
      ? round1(validTempReadings.reduce((a, b) => a + b, 0) / validTempReadings.length)
      : 0;

  const totalWaterFlow =
    validFlowReadings.length > 0
      ? round1(validFlowReadings.reduce((a, b) => a + b, 0))
      : 0;

  const avgTankLevel =
    validTankReadings.length > 0
      ? round1(validTankReadings.reduce((a, b) => a + b, 0) / validTankReadings.length)
      : 0;

  return NextResponse.json({
    success: true,
    hardwareConnected: onlineDevices.length > 0,
    devices: devicesArray,
    telemetry: telemetryArray,
    stats: {
      avgSoilMoisture,
      avgTemperature,
      avgTankLevel,
      totalWaterFlow,
      totalSensorsOnline: onlineDevices.length,
    },
  });
}

function round1(val: number): number {
  return Math.round(val * 10) / 10;
}
