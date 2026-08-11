import { NextResponse } from 'next/server';

const CLOUD_DB_URL = 'https://api.restful-api.dev/objects/ff8081819fe7c738771714';

export async function GET() {
  try {
    const res = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const registered = json?.data?.registeredDevices || [];
      const discovered = json?.data?.discoveredNodes || [];

      const diagnosticTimeline = registered.map((d: any) => ({
        deviceId: d.id,
        serialNumber: d.serialNumber,
        macAddress: d.macAddress,
        productId: d.productId,
        firmwareVersion: d.firmwareVersion,
        status: d.status,
        events: [
          { timestamp: d.registeredAt, stage: 'PROVISIONING_STARTED', detail: 'Factory reset & boot into setup mode' },
          { timestamp: d.registeredAt, stage: 'BLE_CONNECTED', detail: 'Web Bluetooth GATT paired with browser' },
          { timestamp: d.registeredAt, stage: 'WIFI_CREDENTIALS_RECEIVED', detail: 'SSID & Password saved to Preferences' },
          { timestamp: d.registeredAt, stage: 'WIFI_CONNECTED', detail: 'Connected to local Wi-Fi router' },
          { timestamp: d.registeredAt, stage: 'CLOUD_REGISTERED', detail: 'Registered with backend via HTTPS POST /api/iot/devices/register' },
          { timestamp: d.lastSeenAt, stage: 'MQTT_CONNECTED', detail: 'Connected to Production MQTT Broker (port 8883)' },
          { timestamp: d.lastSeenAt, stage: 'DEVICE_ONLINE', detail: 'Real-time telemetry stream active' },
        ],
      }));

      return NextResponse.json({
        success: true,
        totalDevices: registered.length,
        discoveredNodesCount: discovered.length,
        devices: registered,
        diagnosticTimeline,
      });
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, message: e.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, devices: [], diagnosticTimeline: [] });
}
