import { DeviceStatus, IoTDevice } from '@aether/shared';

export class IoTDeviceManager {
  private static instance: IoTDeviceManager;
  private devices: Map<string, IoTDevice> = new Map();

  private constructor() {
    this.seedDefaultDevices();
  }

  public static getInstance(): IoTDeviceManager {
    if (!IoTDeviceManager.instance) {
      IoTDeviceManager.instance = new IoTDeviceManager();
    }
    return IoTDeviceManager.instance;
  }

  private seedDefaultDevices() {
    const initialDevices: IoTDevice[] = [
      {
        uuid: 'esp32-node-alpha-01',
        serialNumber: 'SN-ESP32-9901-A',
        name: 'Zone 1 Spatial ESP32 Node (Soil Depth & Flow)',
        macAddress: '24:0A:C4:00:11:01',
        firmwareVersion: 'v2.4.1-pro',
        status: DeviceStatus.ONLINE,
        farmId: 'farm-alpha',
        zoneId: 'zone-1',
        ownerId: 'usr-admin-01',
        mqttTopic: 'farms/farm-alpha/devices/esp32-node-alpha-01/telemetry',
        lastSeen: new Date().toISOString(),
        batteryLevel: 94,
        signalRssi: -62,
        otaStatus: 'IDLE',
        location: { lat: 37.7749, lng: -122.4194, elevation: 42 },
        sensorsAttached: ['SOIL_MOISTURE', 'SOIL_TEMP', 'AIR_TEMP', 'HUMIDITY', 'EC', 'PH', 'WATER_PRESSURE', 'FLOW_RATE'],
        authCode: 'ATH-8F92-4C10-99E4'
      },
      {
        uuid: 'esp8266-node-beta-01',
        serialNumber: 'SN-ESP8266-8801-B',
        name: 'Zone 1 Secondary ESP8266 Sensor Node (NodeMCU)',
        macAddress: '84:F3:EB:00:22:01',
        firmwareVersion: 'v2.4.1-pro',
        status: DeviceStatus.ONLINE,
        farmId: 'farm-alpha',
        zoneId: 'zone-1',
        ownerId: 'usr-admin-01',
        mqttTopic: 'farms/farm-alpha/devices/esp8266-node-beta-01/telemetry',
        lastSeen: new Date().toISOString(),
        batteryLevel: 91,
        signalRssi: -65,
        otaStatus: 'IDLE',
        location: { lat: 37.7750, lng: -122.4192, elevation: 42 },
        sensorsAttached: ['SOIL_MOISTURE', 'AIR_TEMP', 'HUMIDITY', 'FLOW_RATE'],
        authCode: 'ATH-7A12-98F1-44B2'
      },
      {
        uuid: 'esp32-node-alpha-02',
        serialNumber: 'SN-ESP32-9902-B',
        name: 'Zone 2 ESP32 Crop Canopy Node',
        macAddress: '24:0A:C4:00:11:02',
        firmwareVersion: 'v2.4.1-pro',
        status: DeviceStatus.ONLINE,
        farmId: 'farm-alpha',
        zoneId: 'zone-2',
        ownerId: 'usr-admin-01',
        mqttTopic: 'farms/farm-alpha/devices/esp32-node-alpha-02/telemetry',
        lastSeen: new Date().toISOString(),
        batteryLevel: 88,
        signalRssi: -68,
        otaStatus: 'IDLE',
        location: { lat: 37.7752, lng: -122.4198, elevation: 44 },
        sensorsAttached: ['SOIL_MOISTURE', 'LEAF_WETNESS', 'AIR_TEMP', 'HUMIDITY', 'NPK'],
        authCode: 'ATH-7A12-98F1-55C3'
      },
      {
        uuid: 'esp32-node-alpha-03',
        serialNumber: 'SN-ESP32-9903-C',
        name: 'Main Pumping Station ESP32 Controller',
        macAddress: '24:0A:C4:00:11:03',
        firmwareVersion: 'v2.5.0-pro',
        status: DeviceStatus.ONLINE,
        farmId: 'farm-alpha',
        zoneId: 'zone-3',
        ownerId: 'usr-admin-01',
        mqttTopic: 'farms/farm-alpha/devices/esp32-node-alpha-03/telemetry',
        lastSeen: new Date().toISOString(),
        batteryLevel: 100,
        signalRssi: -55,
        otaStatus: 'IDLE',
        location: { lat: 37.7745, lng: -122.4190, elevation: 40 },
        sensorsAttached: ['TANK_LEVEL', 'WATER_PRESSURE', 'FLOW_RATE', 'SOLAR_VOLT', 'VALVE_ACTUATOR'],
        authCode: 'ATH-4C99-31E2-88D1'
      },
      {
        uuid: 'esp32-weather-01',
        serialNumber: 'SN-ESP32-9904-W',
        name: 'Hyper-Local ESP32 Weather Station',
        macAddress: '24:0A:C4:00:11:04',
        firmwareVersion: 'v2.4.1-pro',
        status: DeviceStatus.ONLINE,
        farmId: 'farm-alpha',
        zoneId: 'zone-4',
        ownerId: 'usr-admin-01',
        mqttTopic: 'farms/farm-alpha/devices/esp32-weather-01/telemetry',
        lastSeen: new Date().toISOString(),
        batteryLevel: 98,
        signalRssi: -58,
        otaStatus: 'IDLE',
        location: { lat: 37.7755, lng: -122.4185, elevation: 50 },
        sensorsAttached: ['WIND_SPEED', 'WIND_DIR', 'RAIN_RATE', 'SOLAR_IRRADIANCE', 'UV_INDEX'],
        authCode: 'ATH-19B4-78AA-33E9'
      }
    ];

    for (const d of initialDevices) {
      this.devices.set(d.uuid, d);
    }
  }

  public getAllDevices(): IoTDevice[] {
    return Array.from(this.devices.values());
  }

  public getDeviceByUuid(uuid: string): IoTDevice | undefined {
    return this.devices.get(uuid);
  }

  public registerOrUpdateDevice(device: Partial<IoTDevice> & { uuid: string; serialNumber: string }): IoTDevice {
    const generatedAuthCode =
      device.authCode ||
      'ATH-' +
        Math.random().toString(36).substring(2, 6).toUpperCase() +
        '-' +
        Math.random().toString(36).substring(2, 6).toUpperCase();

    const existing = this.devices.get(device.uuid);
    if (existing) {
      const updated = {
        ...existing,
        ...device,
        authCode: existing.authCode || generatedAuthCode,
        lastSeen: new Date().toISOString()
      };
      this.devices.set(device.uuid, updated);
      return updated;
    } else {
      const newDev: IoTDevice = {
        uuid: device.uuid,
        serialNumber: device.serialNumber,
        name: device.name || `Device-${device.serialNumber}`,
        macAddress: device.macAddress || '00:00:00:00:00:00',
        firmwareVersion: device.firmwareVersion || 'v1.0.0',
        status: DeviceStatus.ONLINE,
        farmId: device.farmId || 'farm-alpha',
        zoneId: device.zoneId || 'zone-1',
        ownerId: device.ownerId || 'usr-admin-01',
        mqttTopic: `farms/${device.farmId || 'farm-alpha'}/devices/${device.uuid}/telemetry`,
        authCode: generatedAuthCode,
        lastSeen: new Date().toISOString(),
        batteryLevel: 100,
        signalRssi: -60,
        otaStatus: 'IDLE',
        location: device.location || { lat: 0, lng: 0, elevation: 0 },
        sensorsAttached: device.sensorsAttached || []
      };
      this.devices.set(device.uuid, newDev);
      return newDev;
    }
  }

  public verifyDeviceAuthCode(serialOrUuid: string, authCode: string): boolean {
    for (const dev of this.devices.values()) {
      if (
        (dev.uuid === serialOrUuid || dev.serialNumber === serialOrUuid) &&
        dev.authCode === authCode
      ) {
        return true;
      }
    }
    return false;
  }

  public updateHeartbeat(uuid: string, battery: number, rssi: number): void {
    const dev = this.devices.get(uuid);
    if (dev) {
      dev.lastSeen = new Date().toISOString();
      dev.batteryLevel = battery;
      dev.signalRssi = rssi;
      dev.status = DeviceStatus.ONLINE;
    }
  }
}
