import { TelemetryReading } from '@aether/shared';

export class TelemetryService {
  private static instance: TelemetryService;
  private readingsBuffer: TelemetryReading[] = [];
  private latestReadingsByZone: Map<string, TelemetryReading> = new Map();
  private maxHistoryPerZone = 200;

  private constructor() {}

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  public recordReading(reading: TelemetryReading): void {
    this.readingsBuffer.push(reading);
    this.latestReadingsByZone.set(reading.zoneId, reading);

    // Keep memory clean, slice history
    if (this.readingsBuffer.length > 5000) {
      this.readingsBuffer = this.readingsBuffer.slice(-2000);
    }
  }

  public getLatestReadingForZone(zoneId: string): TelemetryReading | undefined {
    return this.latestReadingsByZone.get(zoneId);
  }

  public getAllLatestReadings(): TelemetryReading[] {
    return Array.from(this.latestReadingsByZone.values());
  }

  public getHistoryForZone(zoneId: string, limit = 50): TelemetryReading[] {
    return this.readingsBuffer
      .filter((r) => r.zoneId === zoneId)
      .slice(-limit);
  }

  public getAggregatedStats(farmId: string) {
    const readings = this.getAllLatestReadings().filter((r) => r.farmId === farmId);
    if (readings.length === 0) {
      return {
        avgSoilMoisture: 0,
        avgTemperature: 0,
        avgTankLevel: 0,
        totalWaterFlow: 0,
        totalSensorsOnline: 0
      };
    }

    const sumMoisture = readings.reduce((acc, r) => acc + r.soilMoisture, 0);
    const sumTemp = readings.reduce((acc, r) => acc + r.airTemperature, 0);
    const sumTank = readings.reduce((acc, r) => acc + r.tankLevelPercent, 0);
    const sumFlow = readings.reduce((acc, r) => acc + r.waterFlowRate, 0);

    return {
      avgSoilMoisture: Math.round(sumMoisture / readings.length),
      avgTemperature: Number((sumTemp / readings.length).toFixed(1)),
      avgTankLevel: Math.round(sumTank / readings.length),
      totalWaterFlow: Number(sumFlow.toFixed(1)),
      totalSensorsOnline: readings.length * 8 // 8 sensor channels per hardware node
    };
  }
}
