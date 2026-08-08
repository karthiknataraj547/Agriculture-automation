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
    // Inventory starts empty per user request
    this.devices.clear();
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
