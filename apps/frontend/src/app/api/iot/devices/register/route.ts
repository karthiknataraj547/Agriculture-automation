import { NextResponse } from 'next/server';

const CLOUD_DB_URL = 'https://api.restful-api.dev/objects/ff8081819fe7c738771714';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serialNumber, macAddress, boardFamily, boardType, productId, firmwareVersion } = body;

    if (!serialNumber || !macAddress) {
      return NextResponse.json({ success: false, message: 'Missing device serial or MAC' }, { status: 400 });
    }

    const deviceId = `dev_${serialNumber.replace(/[^A-Z0-9]/g, '').toLowerCase()}`;
    const mqttIdentity = `mqtt_${deviceId}`;
    const mqttTopicTelemetry = `aether/farm-north/zone-a/telemetry/${deviceId}`;
    const mqttTopicCommands = `aether/farm-north/zone-a/commands/${deviceId}`;

    // Read current DB objects
    let existingData: any = {};
    try {
      const getRes = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
      if (getRes.ok) existingData = (await getRes.json())?.data || {};
    } catch (e) {}

    const registeredDevices = existingData.registeredDevices || [];
    const index = registeredDevices.findIndex((d: any) => d.serialNumber === serialNumber || d.macAddress === macAddress);

    const deviceRecord = {
      id: deviceId,
      serialNumber,
      macAddress,
      boardFamily: boardFamily || 'ESP32',
      boardType: boardType || 'ESP32 Dev Module',
      productId: productId || 'AGRIFLOW-IRRIGATION-V1',
      firmwareVersion: firmwareVersion || '2.0.0',
      mqttIdentity,
      mqttTopicTelemetry,
      mqttTopicCommands,
      status: 'ONLINE',
      registeredAt: new Date().toISOString(),
      lastSeenAt: new Date().toISOString(),
    };

    if (index >= 0) {
      registeredDevices[index] = { ...registeredDevices[index], ...deviceRecord };
    } else {
      registeredDevices.push(deviceRecord);
    }

    // Save back to cloud storage
    await fetch(CLOUD_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aether Agriculture Platform DB v2',
        data: { ...existingData, registeredDevices },
      }),
    });

    // Sync with Express backend device manager on port 4000
    try {
      await fetch('http://localhost:4000/api/v1/devices/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: deviceId,
          serialNumber,
          macAddress,
          boardFamily: boardFamily || 'ESP32',
          boardType: boardType || 'ESP32 Dev Module',
          productId: productId || 'AGRIFLOW-IRRIGATION-V1',
          firmwareVersion: firmwareVersion || '3.2.0',
          status: 'ONLINE',
        }),
      });
    } catch (e) {
      console.warn('[Register sync with local backend failed]', e);
    }

    return NextResponse.json({
      success: true,
      message: 'Device successfully registered and provisioned on cloud backend',
      device: deviceRecord,
      mqttConfig: {
        broker: 'mqtt.agriculture-automation.com',
        port: 8883,
        clientId: mqttIdentity,
        telemetryTopic: mqttTopicTelemetry,
        commandTopic: mqttTopicCommands,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Error registering device' }, { status: 500 });
  }
}
