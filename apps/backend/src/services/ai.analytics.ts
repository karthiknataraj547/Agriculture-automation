import { AIInsight, TelemetryReading } from '@aether/shared';
import { v4 as uuidv4 } from 'uuid';

export class AiAnalyticsEngine {
  private static instance: AiAnalyticsEngine;
  private insightsBuffer: AIInsight[] = [];

  private constructor() {
    this.generateInitialInsights();
  }

  public static getInstance(): AiAnalyticsEngine {
    if (!AiAnalyticsEngine.instance) {
      AiAnalyticsEngine.instance = new AiAnalyticsEngine();
    }
    return AiAnalyticsEngine.instance;
  }

  private generateInitialInsights() {
    this.insightsBuffer = [
      {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        farmId: 'farm-alpha',
        category: 'IRRIGATION_OPTIMIZATION',
        title: 'Optimal Pulse Irrigation Recommended',
        description: 'Vapor pressure deficit (VPD) indicates high transpiration rate in Zone 2 (Corn). Switching to 15-min pulse cycles will reduce evaporation loss by 22%.',
        confidenceScore: 0.94,
        impactSeverity: 'HIGH',
        suggestedAction: 'Apply 15-min pulse cycle to Zone 2 at 04:00 AM.',
        estimatedWaterSavedLiters: 4500
      },
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        farmId: 'farm-alpha',
        category: 'ANOMALY_DETECTION',
        title: 'Micro-Leak Detected in Sector 4 Pipeline',
        description: 'Water flow meter recorded 1.4 L/min persistent baseline flow during zero-valve active period. High probability of fitting seal degradation.',
        confidenceScore: 0.88,
        impactSeverity: 'MEDIUM',
        suggestedAction: 'Inspect valve coupling V4-02 on main supply line.',
        estimatedWaterSavedLiters: 1200
      },
      {
        id: uuidv4(),
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        farmId: 'farm-alpha',
        category: 'DISEASE_PREDICTION',
        title: 'Elevated Downy Mildew Risk Index',
        description: 'Leaf wetness duration (>8 hours) and relative humidity (>85%) exceed pathogeic threshold for Zone 3 (Vineyard).',
        confidenceScore: 0.91,
        impactSeverity: 'CRITICAL',
        suggestedAction: 'Schedule preventative organic bio-fungicide treatment.',
      }
    ];
  }

  public getLatestInsights(farmId: string): AIInsight[] {
    return this.insightsBuffer.filter((i) => i.farmId === farmId);
  }

  public analyzeTelemetry(reading: TelemetryReading): AIInsight | null {
    // Real-time AI Anomaly Detector
    if (reading.waterPressure > 55 && reading.waterFlowRate < 5) {
      const insight: AIInsight = {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        farmId: reading.farmId,
        category: 'ANOMALY_DETECTION',
        title: 'High Pressure Drop / Clogged Nozzle Warning',
        description: `Zone ${reading.zoneId} pressure spiked to ${reading.waterPressure} PSI with restricted flow rate. Possible clogged drip emitters.`,
        confidenceScore: 0.96,
        impactSeverity: 'HIGH',
        suggestedAction: 'Flush line filters for Zone ' + reading.zoneId
      };

      this.insightsBuffer.unshift(insight);
      if (this.insightsBuffer.length > 50) this.insightsBuffer.pop();
      return insight;
    }

    return null;
  }

  public askLocalAgronomistAI(question: string, farmContext?: any): { answer: string; confidence: number; category: string; recommendations: string[] } {
    const q = question.toLowerCase();

    if (q.includes('water') || q.includes('irrigat') || q.includes('moisture') || q.includes('save')) {
      return {
        answer: 'Based on current soil moisture sensors (Avg 42%) and ET₀ evapotranspiration (5.2 mm/day), switching Zone 1 (Corn) and Zone 4 (Orchard) to 20-minute early morning pulse cycles (05:30 AM) will optimize root absorption and save up to 4,500 Liters of water daily.',
        confidence: 0.96,
        category: 'IRRIGATION_OPTIMIZATION',
        recommendations: [
          'Enable 20-minute pulse irrigation at 05:30 AM.',
          'Maintain target moisture threshold between 35% and 60%.',
          'Avoid midday watering when solar radiation exceeds 850 W/m².'
        ]
      };
    }

    if (q.includes('disease') || q.includes('fung') || q.includes('mildew') || q.includes('pest') || q.includes('health')) {
      return {
        answer: 'AI Fungal Pathogen Predictor: Leaf wetness duration (>8 hrs) and air humidity (62%) in Zone 3 (Vineyard) present a 91% risk score for Downy Mildew. Preventive organic bio-copper treatment is advised before humidity spikes.',
        confidence: 0.91,
        category: 'DISEASE_PREDICTION',
        recommendations: [
          'Apply organic bio-fungicide to Zone 3 Vineyard leaves within 24 hours.',
          'Increase canopy airflow by pruning dense leaf clusters.',
          'Monitor leaf wetness percentage continuously.'
        ]
      };
    }

    if (q.includes('fertilizer') || q.includes('npk') || q.includes('nitrogen') || q.includes('soil')) {
      return {
        answer: 'Soil Fertility Diagnostic: Zone 2 (Soybeans) shows NPK ratio N:45, P:22, K:18 mg/kg with pH 6.4. Soybeans are nitrogen-fixing, so additional nitrogen is unnecessary. Apply potassium sulfate boost to strengthen pods.',
        confidence: 0.93,
        category: 'SOIL_FERTILITY',
        recommendations: [
          'Apply 12 kg/hectare Potassium Sulfate (K₂SO₄) fertigation.',
          'Avoid excess nitrogen to prevent leaf overgrowth.',
          'Maintain soil pH in 6.2 - 6.8 range.'
        ]
      };
    }

    if (q.includes('animal') || q.includes('motion') || q.includes('siren') || q.includes('pir') || q.includes('wildlife')) {
      return {
        answer: 'Perimeter Security Intelligence: PIR Motion Sensor is active. When wild boars or deer are detected, automated acoustic sirens and flashing floodlights trigger instantly for 30 seconds to safely deter animals without harming crops.',
        confidence: 0.98,
        category: 'WILDLIFE_DEFENSE',
        recommendations: [
          'Keep PIR Motion Defense armed between dusk and dawn (18:00 - 06:00).',
          'Verify fence line integrity around Zone 2 & Zone 3.',
          'Ensure deterrent sirens remain connected to solar backup battery.'
        ]
      };
    }

    return {
      answer: `Local Agronomist AI Analysis: All 4 zones are operating within stable parameters. Average soil moisture is 42%, temperature is 26.5°C, and 32 IoT sensors are reporting online without hardware anomalies.`,
      confidence: 0.89,
      category: 'GENERAL_AGRONOMY',
      recommendations: [
        'Continue automated irrigation schedules.',
        'Inspect pump pressure seals weekly.',
        'Review AI daily yield recommendations.'
      ]
    };
  }
}
