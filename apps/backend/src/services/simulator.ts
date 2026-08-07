import { TelemetryReading } from '@aether/shared';
import { TelemetryService } from './telemetry.service';
import { RulesEngine } from './rules.engine';
import { AiAnalyticsEngine } from './ai.analytics';
import { IoTDeviceManager } from './device.manager';

export class ESP32Simulator {
  private static timer: NodeJS.Timeout | null = null;
  private static isRunning = false;
  private static callbackFn: ((reading: TelemetryReading, ruleLogs: any[]) => void) | null = null;

  public static start(onBroadcast?: (reading: TelemetryReading, ruleLogs: any[]) => void): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.callbackFn = onBroadcast || null;

    const telemetryService = TelemetryService.getInstance();
    const rulesEngine = RulesEngine.getInstance();
    const aiEngine = AiAnalyticsEngine.getInstance();
    const deviceManager = IoTDeviceManager.getInstance();

    const zones = [
      { id: 'zone-1', name: 'Corn Field Sector A', baseMoisture: 32, baseTemp: 28 },
      { id: 'zone-2', name: 'Soybean Sector B', baseMoisture: 44, baseTemp: 26 },
      { id: 'zone-3', name: 'Vineyard East', baseMoisture: 28, baseTemp: 31 },
      { id: 'zone-4', name: 'Orchard North', baseMoisture: 52, baseTemp: 25 },
      { id: 'zone-5', name: 'Hydroponic Greenhouse', baseMoisture: 65, baseTemp: 24 }
    ];

    let step = 0;

    this.timer = setInterval(() => {
      step++;
      const currentZone = zones[step % zones.length];
      const deviceId = `esp32-node-alpha-0${(step % 3) + 1}`;

      // Simulate realistic fluctuation with sinusoidal noise
      const sineVal = Math.sin(step * 0.2);
      const randomNoise = (Math.random() - 0.5) * 2;

      const soilMoisture = Math.max(15, Math.min(85, Math.round(currentZone.baseMoisture + sineVal * 4 + randomNoise)));
      const airTemp = Number((currentZone.baseTemp + sineVal * 2 + randomNoise * 0.5).toFixed(1));
      const humidity = Math.max(30, Math.min(95, Math.round(65 - sineVal * 5 + randomNoise * 2)));

      const reading: TelemetryReading = {
        deviceId,
        farmId: 'farm-alpha',
        zoneId: currentZone.id,
        timestamp: new Date().toISOString(),
        soilMoisture,
        soilMoistureDepth30cm: soilMoisture - 2,
        soilMoistureDepth60cm: soilMoisture + 5,
        soilTemperature: Number((airTemp - 2).toFixed(1)),
        airTemperature: airTemp,
        humidity,
        ec: Number((1.4 + sineVal * 0.2).toFixed(2)),
        ph: Number((6.5 + randomNoise * 0.1).toFixed(2)),
        waterFlowRate: Number((12.5 + sineVal * 3).toFixed(1)),
        waterPressure: Number((38 + sineVal * 4).toFixed(1)),
        tankLevelPercent: Math.max(10, Math.min(100, Math.round(85 - (step % 20) * 0.5))),
        nitrogen: Math.round(140 + sineVal * 10),
        phosphorus: Math.round(45 + sineVal * 5),
        potassium: Math.round(180 + sineVal * 12),
        rainRate: sineVal > 0.8 ? Number((randomNoise * 4).toFixed(1)) : 0,
        windSpeed: Number((12 + sineVal * 5).toFixed(1)),
        windDirection: Math.round((180 + sineVal * 90) % 360),
        solarIrradiance: Math.round(750 + sineVal * 150),
        uvIndex: Math.max(1, Math.round(6 + sineVal * 3)),
        leafWetness: Math.round(40 + sineVal * 20),
        solarVoltage: Number((13.8 + randomNoise * 0.2).toFixed(2)),
        batteryLevelPercent: 95,
        signalRssi: Math.round(-65 + randomNoise * 5)
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
    }, 1500); // Broadcast every 1.5 seconds for live experience
  }

  public static stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    this.isRunning = false;
  }
}
