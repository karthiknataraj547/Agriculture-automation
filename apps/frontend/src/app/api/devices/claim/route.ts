import { NextResponse } from 'next/server';
import { extractAuthContext, AuthenticatedUserContext } from '../../middleware/tenantContext';
import { UserRole } from '@aether/shared';

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
  }
  return false;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    let authCtx = extractAuthContext(req);
    if (!authCtx && body.userSession) {
      authCtx = body.userSession;
    }
    if (!authCtx) {
      authCtx = {
        accountId: 'acc_demo_user',
        role: UserRole.SUPER_ADMIN,
        userId: 'usr-admin-01',
        email: 'admin@agriflow.io',
        name: 'Administrator'
      };
    }

    const { deviceName, productId, productName, wifiSsid, selectedSensors, farmId, zoneId, serialNumber, macAddress, authCode } = body;

    if (!serialNumber && !macAddress) {
      return NextResponse.json({ success: false, message: 'No physical hardware paired. Scan or enter a valid MAC / Serial.' }, { status: 400 });
    }

    const data = await fetchStateFromCloudDB();
    const state = data.state || { devices: [] };
    const devices = state.devices || [];

    const newDeviceId = `node_${Date.now().toString(36)}`;
    const physicalSerial = serialNumber || `AGRI-${(body.boardFamily || 'ESP32').toUpperCase()}-${macAddress.replace(/[^A-Z0-9]/g, '').slice(-6)}`;

    const newDevice = {
      uuid: newDeviceId,
      name: deviceName || 'Agricultural Node',
      serialNumber: physicalSerial,
      macAddress: macAddress || physicalSerial,
      productId: productId || 'prod_agriflow_v1',
      customerProductName: productName || 'AgriFlow Smart Irrigation Controller',
      boardFamily: body.boardFamily || 'ESP32',
      boardType: body.boardType || 'ESP32 Dev Module',
      firmwareVersion: '2.0.0-PROVISION',
      status: 'ONLINE',
      accountId: authCtx.accountId || 'acc_demo_user',
      farmId: farmId || 'farm-alpha',
      zoneId: zoneId || 'zone-1',
      wifiSsid: wifiSsid || 'Farm_Mesh_WiFi',
      configuredSensors: selectedSensors || ['Soil Moisture', 'Temperature', 'Humidity', 'Flow Rate'],
      lastSeen: new Date().toISOString(),
      authCode: authCode || 'ATH-8F92-4C10-99E4',
      capabilities: {
        wifi: true,
        ble: body.boardFamily === 'ESP32',
        soilMoisture: true,
        dht: true,
        relay: true,
      },
    };

    // Remove any previous instance of this physical serial
    const filtered = devices.filter((d: any) => d.serialNumber !== physicalSerial && d.uuid !== newDeviceId);
    filtered.push(newDevice);

    state.devices = filtered;
    data.state = state;

    await saveStateToCloudDB(data);

    // Sync with Express backend device manager on port 4000
    try {
      await fetch('http://localhost:4000/api/v1/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: newDeviceId,
          serialNumber: physicalSerial,
          macAddress: newDevice.macAddress,
          boardFamily: newDevice.boardFamily,
          boardType: newDevice.boardType,
          productId: newDevice.productId,
          firmwareVersion: newDevice.firmwareVersion,
          status: 'ONLINE',
          name: newDevice.name,
          farmId: newDevice.farmId,
          zoneId: newDevice.zoneId,
          authCode: newDevice.authCode
        }),
      });
    } catch (e) {
      console.warn('[Claim sync with local backend failed]', e);
    }

    return NextResponse.json({
      success: true,
      message: `Physical Hardware '${newDevice.name}' (${newDevice.serialNumber}) successfully claimed into account!`,
      device: newDevice,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Provisioning error' }, { status: 500 });
  }
}
