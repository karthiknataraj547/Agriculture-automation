import { TelemetryReading } from '@aether/shared';
import { TelemetryService } from './telemetry.service';
import { RulesEngine } from './rules.engine';
import { AiAnalyticsEngine } from './ai.analytics';
import { IoTDeviceManager } from './device.manager';

export class ESP32Simulator {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static callbackFn: ((reading: TelemetryReading, ruleLogs: any[]) => void) | null = null;
  private static zeroMode = true;

  public static setZeroMode(enable: boolean): void {
    this.zeroMode = enable;
  }

  public static isZeroMode(): boolean {
    return this.zeroMode;
  }

  public static start(onBroadcast?: (reading: TelemetryReading, ruleLogs: any[]) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.callbackFn = onBroadcast || null;

    const telemetryService = TelemetryService.getInstance();
    const rulesEngine = RulesEngine.getInstance();
    const aiEngine = AiAnalyticsEngine.getInstance();
    const deviceManager = IoTDeviceManager.getInstance();

    const zones = [
      { id: 'zone-1', name: 'Corn Field Sector A', baseMoisture: 0, baseTemp: 0 },
      { id: 'zone-2', name: 'Soybean Sector B', baseMoisture: 0, baseTemp: 0 },
      { id: 'zone-3', name: 'Vineyard East', baseMoisture: 0, baseTemp: 0 },
      { id: 'zone-4', name: 'Orchard North', baseMoisture: 0, baseTemp: 0 },
      { id: 'zone-5', name: 'Hydroponic Greenhouse', baseMoisture: 0, baseTemp: 0 }
    ];

    let step = 0;

    this.timer = setInterval(() => {
      step++;
      const currentZone = zones[step % zones.length];
      const deviceId = `esp32-node-alpha-0${(step % 3) + 1}`;

      const reading: TelemetryReading = this.zeroMode
        ? {
            deviceId,
            farmId: 'farm-alpha',
            zoneId: currentZone.id,
            timestamp: new Date().toISOString(),
            soilMoisture: 0,
            soilMoistureDepth30cm: 0,
            soilMoistureDepth60cm: 0,
            soilTemperature: 0,
            airTemperature: 0,
            humidity: 0,
            ec: 0,
            ph: 0,
            waterFlowRate: 0,
            waterPressure: 0,
            tankLevelPercent: 0,
            nitrogen: 0,
            phosphorus: 0,
            potassium: 0,
            rainRate: 0,
            windSpeed: 0,
            windDirection: 0,
            solarIrradiance: 0,
            uvIndex: 0,
            leafWetness: 0,
            solarVoltage: 0,
            batteryLevelPercent: 0,
            signalRssi: 0
          }
        : {
            deviceId,
            farmId: 'farm-alpha',
            zoneId: currentZone.id,
            timestamp: new Date().toISOString(),
            soilMoisture: 0,
            soilMoistureDepth30cm: 0,
            soilMoistureDepth60cm: 0,
            soilTemperature: 0,
            airTemperature: 0,
            humidity: 0,
            ec: 0,
            ph: 0,
            waterFlowRate: 0,
            waterPressure: 0,
            tankLevelPercent: 0,
            nitrogen: 0,
            phosphorus: 0,
            potassium: 0,
            rainRate: 0,
            windSpeed: 0,
            windDirection: 0,
            solarIrradiance: 0,
            uvIndex: 0,
            leafWetness: 0,
            solarVoltage: 0,
            batteryLevelPercent: 0,
            signalRssi: 0
          };

      // 1. Telemetry Ingestion
      telemetryService.recordReading(reading);

      // 2. Heartbeat update
      deviceManager.updateHeartbeat(deviceId, reading.batteryLevelPercent, reading.signalRssi);

      // 3. Rules Evaluation
      const ruleLogs = rulesEngine.evaluateReading(reading);

      // 4. AI Anomaly check
      aiEngine.analyzeTelemetry(reading);

      // 5. Broadcast to WebSocket & Subscriptions
      if (this.callbackFn) {
        this.callbackFn(reading, ruleLogs);
      }
    }, 1500);
  }

  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }
}
