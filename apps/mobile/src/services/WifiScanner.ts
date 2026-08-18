import { PermissionsAndroid, Platform, NativeModules } from 'react-native';

export interface MobileDiscoveredSignal {
  ssid: string;
  bssid: string;
  signalPercent: number;
  rssi: number;
  isHardwareNode: boolean;
  boardFamily: 'ESP32' | 'ESP8266' | 'GENERIC_IOT';
  serialNumber: string;
  authCode: string;
  productName: string;
}

const { WifiScannerModule } = NativeModules;

export class MobileWifiScanner {
  public static async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.requestMultiple([
          PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
          PermissionsAndroid.PERMISSIONS.ACCESS_COARSE_LOCATION,
          ...(Platform.Version >= 33 ? [PermissionsAndroid.PERMISSIONS.NEARBY_WIFI_DEVICES] : []),
        ]);

        return (
          granted[PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION] ===
            PermissionsAndroid.RESULTS.GRANTED
        );
      } catch (err) {
        console.warn('[Wifi Permissions Error]', err);
        return false;
      }
    }
    return true;
  }

  public static async scanNearbyWifiSignals(): Promise<MobileDiscoveredSignal[]> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Location and Wi-Fi permissions are required to scan for hardware signals.');
    }

    // Try custom native Wi-Fi module first
    if (WifiScannerModule && WifiScannerModule.scanWifiNetworks) {
      try {
        const rawSignals = await WifiScannerModule.scanWifiNetworks();
        return rawSignals.map((item: any) => this.formatSignal(item));
      } catch (e) {
        console.warn('[Native Module Scan Failed]', e);
      }
    }

    // Fallback: React Native Wi-Fi Reborn if installed
    try {
      const WifiManager = require('react-native-wifi-reborn').default;
      if (WifiManager && WifiManager.loadWifiList) {
        const list = await WifiManager.loadWifiList();
        return list.map((item: any) => this.formatSignal(item));
      }
    } catch (e) {}

    // Fallback: Query Backend Gateway Discovery API
    try {
      const res = await fetch('http://192.168.1.100:4000/api/v1/devices/wifi-air-scan');
      if (res.ok) {
        const data = await res.json();
        return data.signals || [];
      }
    } catch (e) {}

    return [];
  }

  private static formatSignal(item: any): MobileDiscoveredSignal {
    const ssid = item.SSID || item.ssid || 'UNKNOWN';
    const bssid = item.BSSID || item.bssid || 'CC:50:E3:8A:12:34';
    const rawLevel = item.level !== undefined ? item.level : item.rssi || -45;
    const signalPercent = Math.min(Math.max(2 * (rawLevel + 100), 0), 100);

    const isHardware =
      /agri|aether|esp32|esp8266|node|setup|sensor/i.test(ssid) ||
      bssid.toUpperCase().startsWith('CC:50:E3') ||
      bssid.toUpperCase().startsWith('24:6F:28');

    const cleanMac = bssid.replace(/[^0-9A-Za-z]/g, '').slice(-4).toUpperCase() || '8A12';
    const isEsp8266 = /esp8266|8266/i.test(ssid);
    const boardFamily = isEsp8266 ? 'ESP8266' : 'ESP32';
    const serialNumber = isHardware ? (ssid.toUpperCase().startsWith('AGRI-') ? ssid : `${boardFamily}-${cleanMac}`) : `NODE-${cleanMac}`;

    return {
      ssid,
      bssid,
      signalPercent,
      rssi: rawLevel,
      isHardwareNode: isHardware,
      boardFamily,
      serialNumber,
      authCode: `ATH-${cleanMac}-99E4`,
      productName: isHardware ? 'AgriFlow Smart Irrigation Controller' : `Wi-Fi (${ssid})`
    };
  }

  public static async pushWifiCredentials(
    targetIp: string,
    ssid: string,
    pass: string,
    authCode: string
  ): Promise<{ success: boolean; message: string }> {
    const ip = targetIp || '192.168.4.1';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);

    try {
      const res = await fetch(`http://${ip}/api/wifi/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid, password: pass, authCode }),
        signal: controller.signal
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        return { success: true, message: data.message || 'Credentials saved to NVS flash!' };
      }
    } catch (e) {
      clearTimeout(timeout);
    }

    return { success: false, message: 'Could not push credentials to hardware.' };
  }

  public static async checkHardwareStatus(targetIp: string): Promise<any> {
    const ip = targetIp || '192.168.4.1';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    try {
      const res = await fetch(`http://${ip}/api/wifi/status`, { signal: controller.signal });
      clearTimeout(timeout);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      clearTimeout(timeout);
    }
    return null;
  }
}
