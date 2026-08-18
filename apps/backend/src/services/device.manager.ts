import { DeviceStatus, IoTDevice } from '@aether/shared';

export interface WifiProvisionRecord {
  serialNumber: string;
  wifiSsid: string;
  authCode?: string;
  provisionedAt: string;
  nvsFlashStored: boolean;
  status: 'PENDING' | 'CONFIGURED' | 'VERIFIED';
}

export class IoTDeviceManager {
  private static instance: IoTDeviceManager;
  private devices: Map<string, IoTDevice> = new Map();
  private wifiProvisionRecords: Map<string, WifiProvisionRecord> = new Map();

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
        firmwareVersion: device.firmwareVersion || 'v2.0.0-PROVISION',
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
    if (!serialOrUuid || !authCode) return false;

    // Check existing devices
    for (const dev of this.devices.values()) {
      if (
        (dev.uuid === serialOrUuid || dev.serialNumber === serialOrUuid) &&
        dev.authCode === authCode
      ) {
        return true;
      }
    }

    // Auto-register newly paired physical hardware on first auth handshake
    if (authCode.length >= 6) {
      const newDev: IoTDevice = {
        uuid: `node_${serialOrUuid.toLowerCase().replace(/[^a-z0-9]/g, '_')}`,
        serialNumber: serialOrUuid,
        name: `Hardware Node (${serialOrUuid})`,
        macAddress: 'CC:50:E3:8A:12:34',
        firmwareVersion: 'v2.0.0-PROVISION',
        status: DeviceStatus.ONLINE,
        farmId: 'farm-alpha',
        zoneId: 'zone-1',
        ownerId: 'usr-admin-01',
        mqttTopic: `farms/farm-alpha/devices/${serialOrUuid}/telemetry`,
        authCode: authCode,
        lastSeen: new Date().toISOString(),
        batteryLevel: 98,
        signalRssi: -45,
        otaStatus: 'IDLE',
        location: { lat: 0, lng: 0, elevation: 0 },
        sensorsAttached: ['Soil Moisture', 'Temperature', 'Humidity', 'Flow Rate']
      };
      this.devices.set(newDev.uuid, newDev);
      return true;
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

  public recordWifiProvision(serialNumber: string, wifiSsid: string, authCode?: string): WifiProvisionRecord {
    const record: WifiProvisionRecord = {
      serialNumber,
      wifiSsid,
      authCode,
      provisionedAt: new Date().toISOString(),
      nvsFlashStored: true,
      status: 'CONFIGURED'
    };
    this.wifiProvisionRecords.set(serialNumber, record);
    return record;
  }

  public getWifiProvisionRecords(): WifiProvisionRecord[] {
    return Array.from(this.wifiProvisionRecords.values());
  }

  public getWifiProvisionRecordBySerial(serialNumber: string): WifiProvisionRecord | undefined {
    return this.wifiProvisionRecords.get(serialNumber);
  }
}
