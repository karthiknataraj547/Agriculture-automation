import { NextResponse } from 'next/server';
import { DeviceCapabilities } from '@aether/shared';

export async function GET(
  req: Request,
  { params }: { params: { deviceId: string } }
) {
  const deviceId = params.deviceId || 'esp32-node-zone-1';

  const capabilities: DeviceCapabilities = {
    deviceId,
    deviceSerialNumber: `SN-${deviceId.toUpperCase()}`,
    firmwareVersion: deviceId.includes('8266') ? 'v2.4.1-esp8266' : 'v2.4.1-esp32',
    sensors: [
      { id: `${deviceId}-soil-01`, type: 'SOIL_MOISTURE', name: 'Capacitive Soil Moisture Probe', unit: '%', dataType: 'number' },
      { id: `${deviceId}-temp-01`, type: 'TEMPERATURE', name: 'DHT Air Temperature Sensor', unit: '°C', dataType: 'number' },
      { id: `${deviceId}-hum-01`, type: 'HUMIDITY', name: 'DHT Humidity Sensor', unit: '%', dataType: 'number' },
      { id: `${deviceId}-flow-01`, type: 'WATER_FLOW', name: 'YF-S201 Water Flow Sensor', unit: 'L/min', dataType: 'number' },
      { id: `${deviceId}-pir-01`, type: 'PIR_MOTION', name: 'PIR Intrusion Detection Sensor', unit: 'state', dataType: 'boolean' },
    ],
    actuators: [
      { id: `${deviceId}-relay-pump-01`, type: 'PUMP', name: 'Water Pump Relay (Pin 26 / D1)', currentStatus: 'OFF' },
      { id: `${deviceId}-siren-01`, type: 'SIREN', name: 'Wild Animal Deterrent Siren', currentStatus: 'OFF' },
    ],
  };

  return NextResponse.json({
    success: true,
    capabilities,
  });
}
