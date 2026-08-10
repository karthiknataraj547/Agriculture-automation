import { NextResponse } from 'next/server';
import { extractAuthContext } from '../../middleware/tenantContext';

const CLOUD_DB_URL = 'https://api.restful-api.dev/objects/ff8081819fe7c738771714';

async function fetchStateFromCloudDB() {
  try {
    const res = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    if (res.ok) {
      const json: any = await res.json();
      return json?.data || {};
    }
  } catch (e) {
    console.error('[Device Claim] Fetch state error:', e);
  }
  return {};
}

async function saveStateToCloudDB(data: any) {
  try {
    const putRes = await fetch(CLOUD_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aether Agriculture Platform DB v2',
        data,
      }),
    });
    return putRes.ok;
  } catch (e) {
    console.error('[Device Claim] Save error:', e);
    return false;
  }
}

export async function POST(req: Request) {
  const authCtx = extractAuthContext(req);
  if (!authCtx) {
    return NextResponse.json({ success: false, message: 'Unauthorized. Login required to provision devices.' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { deviceName, productId, productName, wifiSsid, selectedSensors, farmId, zoneId } = body;

    const data = await fetchStateFromCloudDB();
    const state = data.state || { devices: [] };
    const devices = state.devices || [];

    const newDeviceId = `node_${Date.now().toString(36)}`;
    const serialNumber = `AGRI-${(body.boardFamily || 'ESP32').toUpperCase()}-${Math.floor(100000 + Math.random() * 900000)}`;

    const newDevice = {
      uuid: newDeviceId,
      name: deviceName || 'Agricultural Node',
      serialNumber,
      productId: productId || 'prod_agriflow_v1',
      customerProductName: productName || 'AgriFlow Smart Irrigation Controller',
      boardFamily: body.boardFamily || 'ESP32',
      boardType: body.boardType || 'ESP32 Dev Module',
      firmwareVersion: '1.4.2',
      status: 'ONLINE',
      accountId: authCtx.accountId,
      farmId: farmId || 'farm-alpha',
      zoneId: zoneId || 'zone-1',
      wifiSsid: wifiSsid || 'Farm_Mesh_WiFi',
      configuredSensors: selectedSensors || ['Soil Moisture', 'Temperature', 'Humidity'],
      lastSeen: new Date().toISOString(),
      capabilities: {
        wifi: true,
        ble: body.boardFamily === 'ESP32',
        soilMoisture: selectedSensors?.includes('Soil Moisture') ?? true,
        dht: selectedSensors?.includes('Temperature') ?? true,
        relay: true,
      },
    };

    devices.push(newDevice);
    state.devices = devices;
    data.state = state;

    await saveStateToCloudDB(data);

    return NextResponse.json({
      success: true,
      message: `Agricultural Node '${newDevice.name}' (${newDevice.customerProductName}) successfully provisioned!`,
      device: newDevice,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Provisioning error' }, { status: 500 });
  }
}
