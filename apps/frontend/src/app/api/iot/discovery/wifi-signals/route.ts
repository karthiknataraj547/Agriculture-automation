import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DetectedWifiSignal {
  ssid: string;
  bssid: string;
  signalPercent: number;
  rssi: number;
  channel?: number;
  band?: string;
  isHardwareNode: boolean;
  boardFamily: 'ESP32' | 'ESP8266' | 'GENERIC_IOT';
  serialNumber: string;
  authCode: string;
  productName: string;
}

export async function GET() {
  const detectedSignals: DetectedWifiSignal[] = [];

  try {
    const isWindows = process.platform === 'win32';
    const isLinux = process.platform === 'linux';
    const isMac = process.platform === 'darwin';

    if (isWindows) {
      const { stdout } = await execAsync('netsh wlan show networks mode=bssid', { timeout: 4000 });
      const blocks = stdout.split(/SSID\s+\d+\s+:\s+/i);

      for (let i = 1; i < blocks.length; i++) {
        const block = blocks[i];
        const lines = block.split('\n').map((l) => l.trim());
        const ssid = lines[0] || '';

        if (!ssid) continue;

        const bssidMatch = block.match(/BSSID\s+\d+\s+:\s+([0-9a-fA-F:]{17})/i);
        const signalMatch = block.match(/Signal\s+:\s+(\d+)%/i);
        const bandMatch = block.match(/Band\s+:\s+([^\r\n]+)/i);
        const channelMatch = block.match(/Channel\s+:\s+(\d+)/i);

        const bssid = bssidMatch ? bssidMatch[1].toUpperCase() : 'CC:50:E3:8A:12:34';
        const signalPercent = signalMatch ? parseInt(signalMatch[1], 10) : 75;
        const rssi = Math.round((signalPercent / 2) - 100);
        const band = bandMatch ? bandMatch[1].trim() : '2.4 GHz';
        const channel = channelMatch ? parseInt(channelMatch[1], 10) : 1;

        const isHardware =
          /agri|aether|esp32|esp8266|node|sensor|farm|ath|iot|setup/i.test(ssid) ||
          bssid.startsWith('CC:50:E3') ||
          bssid.startsWith('24:6F:28') ||
          bssid.startsWith('84:CC:A8');

        const cleanSsidMac = (bssid.replace(/[^0-9A-Z]/g, '')).slice(-4) || '8A12';
        const isEsp8266 = /esp8266|nodemcu/i.test(ssid);
        const boardFamily = isEsp8266 ? 'ESP8266' : 'ESP32';
        const serialNumber = isHardware
          ? (ssid.toUpperCase().startsWith('AGRI-') || ssid.toUpperCase().startsWith('ESP32-') ? ssid : `${boardFamily}-${cleanSsidMac}`)
          : `NODE-${cleanSsidMac}`;

        detectedSignals.push({
          ssid,
          bssid,
          signalPercent,
          rssi,
          channel,
          band,
          isHardwareNode: isHardware,
          boardFamily,
          serialNumber,
          authCode: `ATH-${cleanSsidMac}-99E4`,
          productName: isHardware ? 'AgriFlow Smart Irrigation Controller' : `Wi-Fi Access Point (${ssid})`
        });
      }
    } else if (isLinux) {
      try {
        const { stdout } = await execAsync('nmcli -t -f SSID,BSSID,SIGNAL,SECURITY dev wifi', { timeout: 3000 });
        const lines = stdout.split('\n').filter(Boolean);
        for (const line of lines) {
          const parts = line.split(':');
          if (parts.length >= 3) {
            const ssid = parts[0];
            const bssid = parts.slice(1, 7).join(':');
            const signalPercent = parseInt(parts[7] || '70', 10);
            if (!ssid) continue;

            const isHardware = /agri|aether|esp32|esp8266|node|setup/i.test(ssid);
            detectedSignals.push({
              ssid,
              bssid,
              signalPercent,
              rssi: Math.round((signalPercent / 2) - 100),
              isHardwareNode: isHardware,
              boardFamily: 'ESP32',
              serialNumber: `AGRI-${ssid.replace(/[^A-Za-z0-9]/g, '')}`,
              authCode: 'ATH-8F92-4C10-99E4',
              productName: 'AgriFlow Smart Irrigation Controller'
            });
          }
        }
      } catch (e) {}
    }
  } catch (err: any) {
    console.warn('[Wi-Fi Air Scanner error]', err.message);
  }

  // Sort hardware nodes first, then by signal strength descending
  detectedSignals.sort((a, b) => {
    if (a.isHardwareNode && !b.isHardwareNode) return -1;
    if (!a.isHardwareNode && b.isHardwareNode) return 1;
    return b.signalPercent - a.signalPercent;
  });

  return NextResponse.json({
    success: true,
    count: detectedSignals.length,
    signals: detectedSignals
  });
}
