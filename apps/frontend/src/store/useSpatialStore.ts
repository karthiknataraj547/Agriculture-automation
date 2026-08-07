import { create } from 'zustand';
import { TelemetryReading, IoTDevice, AIInsight, AutomationRule, IrrigationSchedule } from '@aether/shared';

export interface PumpState {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  status: 'RUNNING' | 'OFF' | 'FAULT';
  runtimeMinutes: number;
  manualOverride: boolean;
  flowRateLmin: number;
}

export interface MotionAlertState {
  active: boolean;
  zoneId: string;
  zoneName: string;
  timestamp: string;
  message: string;
}

export interface SpatialStoreState {
  activeView: 'SPATIAL_3D' | 'TELEMETRY' | 'AUTOMATION' | 'DEVICES' | 'AI_INSIGHTS' | 'AUDIT_LOGS' | 'PUMPS' | 'SCHEDULES';
  selectedZoneId: string;
  selectedDeviceId: string | null;
  
  // Real-time telemetry feed
  latestReadings: Map<string, TelemetryReading>;
  aggregatedStats: {
    avgSoilMoisture: number;
    avgTemperature: number;
    avgTankLevel: number;
    totalWaterFlow: number;
    totalSensorsOnline: number;
  };
  
  // Inventory, AI & Rules
  devices: IoTDevice[];
  insights: AIInsight[];
  rules: AutomationRule[];
  
  // Pumps & Schedules
  pumps: PumpState[];
  schedules: IrrigationSchedule[];

  // Wildlife / Intrusion Alert
  motionAlert: MotionAlertState | null;
  
  // Theme Mode
  themeMode: 'light' | 'dark';

  // Controls & Overrides
  emergencyStop: boolean;
  rainOverride: boolean;
  isZeroDataMode: boolean;

  // Actions
  setActiveView: (view: SpatialStoreState['activeView']) => void;
  setSelectedZoneId: (zoneId: string) => void;
  setSelectedDeviceId: (deviceId: string | null) => void;
  updateTelemetryStream: (reading: TelemetryReading) => void;
  setAggregatedStats: (stats: SpatialStoreState['aggregatedStats']) => void;
  setDevices: (devices: IoTDevice[]) => void;
  setInsights: (insights: AIInsight[]) => void;
  setRules: (rules: AutomationRule[]) => void;
  toggleEmergencyStop: () => void;
  toggleRainOverride: () => void;
  toggleThemeMode: () => void;
  
  // Pump Actions
  togglePumpState: (pumpId: string) => void;
  
  // Schedule Actions
  addSchedule: (schedule: IrrigationSchedule) => void;
  toggleSchedule: (scheduleId: string) => void;
  deleteSchedule: (scheduleId: string) => void;
  
  // Motion Alert Actions
  triggerMotionAlert: (zoneId: string, zoneName: string, message?: string) => void;
  dismissMotionAlert: () => void;

  // Zero Data Reset Action
  resetAllDataToZero: () => void;
}

// ALL ZERO VALUE INITIALIZATION
const ZERO_PUMPS: PumpState[] = [
  {
    id: 'pump-1',
    name: 'Pump Main Alpha',
    zoneId: 'zone-1',
    zoneName: 'Zone 1: Corn Field',
    status: 'OFF',
    runtimeMinutes: 0,
    manualOverride: false,
    flowRateLmin: 0,
  },
  {
    id: 'pump-2',
    name: 'Pump Sector Beta',
    zoneId: 'zone-2',
    zoneName: 'Zone 2: Soybean Sector',
    status: 'OFF',
    runtimeMinutes: 0,
    manualOverride: false,
    flowRateLmin: 0,
  },
  {
    id: 'pump-3',
    name: 'Pump East Gamma',
    zoneId: 'zone-3',
    zoneName: 'Zone 3: Vineyard East',
    status: 'OFF',
    runtimeMinutes: 0,
    manualOverride: false,
    flowRateLmin: 0,
  },
  {
    id: 'pump-4',
    name: 'Pump North Delta',
    zoneId: 'zone-4',
    zoneName: 'Zone 4: Orchard North',
    status: 'OFF',
    runtimeMinutes: 0,
    manualOverride: false,
    flowRateLmin: 0,
  },
];

const ZERO_SCHEDULES: IrrigationSchedule[] = [
  {
    id: 'sch-1',
    name: 'Early Morning Deep Soak',
    enabled: false,
    farmId: 'farm-01',
    zoneId: 'zone-1',
    zoneName: 'Zone 1: Corn Field',
    pumpId: 'pump-1',
    startTime: '00:00',
    durationMinutes: 0,
    daysOfWeek: [],
    targetMoistureMin: 0,
    status: 'PAUSED',
  },
  {
    id: 'sch-2',
    name: 'Evening Orchard Mist',
    enabled: false,
    farmId: 'farm-01',
    zoneId: 'zone-4',
    zoneName: 'Zone 4: Orchard North',
    pumpId: 'pump-4',
    startTime: '00:00',
    durationMinutes: 0,
    daysOfWeek: [],
    targetMoistureMin: 0,
    status: 'PAUSED',
  },
  {
    id: 'sch-3',
    name: 'Vineyard Midday Moisture Boost',
    enabled: false,
    farmId: 'farm-01',
    zoneId: 'zone-3',
    zoneName: 'Zone 3: Vineyard East',
    pumpId: 'pump-3',
    startTime: '00:00',
    durationMinutes: 0,
    daysOfWeek: [],
    targetMoistureMin: 0,
    status: 'PAUSED',
  },
];

const createZeroReading = (zoneId: string): TelemetryReading => ({
  deviceId: `esp32-node-${zoneId}`,
  farmId: 'farm-alpha',
  zoneId,
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
  signalRssi: 0,
});

const ZERO_TELEMETRY_MAP = new Map<string, TelemetryReading>([
  ['zone-1', createZeroReading('zone-1')],
  ['zone-2', createZeroReading('zone-2')],
  ['zone-3', createZeroReading('zone-3')],
  ['zone-4', createZeroReading('zone-4')],
]);

export const useSpatialStore = create<SpatialStoreState>((set, get) => ({
  activeView: 'SPATIAL_3D',
  selectedZoneId: 'zone-1',
  selectedDeviceId: null,
  latestReadings: ZERO_TELEMETRY_MAP,
  aggregatedStats: {
    avgSoilMoisture: 0,
    avgTemperature: 0,
    avgTankLevel: 0,
    totalWaterFlow: 0,
    totalSensorsOnline: 0,
  },
  devices: [],
  insights: [],
  rules: [],
  pumps: ZERO_PUMPS,
  schedules: ZERO_SCHEDULES,
  motionAlert: null,
  themeMode: 'light',
  emergencyStop: false,
  rainOverride: false,
  isZeroDataMode: true,

  setActiveView: (view) => set({ activeView: view }),
  setSelectedZoneId: (zoneId) => set({ selectedZoneId: zoneId }),
  setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),

  updateTelemetryStream: (reading) =>
    set((state) => {
      // If zero data mode is explicitly turned on, maintain 0 values
      if (state.isZeroDataMode) {
        return state;
      }

      const nextMap = new Map(state.latestReadings);
      nextMap.set(reading.zoneId, reading);

      let motionAlertUpdate = state.motionAlert;
      if (reading.motionDetected) {
        const zoneNames: Record<string, string> = {
          'zone-1': 'Zone 1: Corn Field',
          'zone-2': 'Zone 2: Soybean Sector',
          'zone-3': 'Zone 3: Vineyard East',
          'zone-4': 'Zone 4: Orchard North',
        };
        motionAlertUpdate = {
          active: true,
          zoneId: reading.zoneId,
          zoneName: zoneNames[reading.zoneId] || `Zone ${reading.zoneId}`,
          timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
          message: `PIR Sensor Triggered: Movement detected in ${zoneNames[reading.zoneId] || reading.zoneId}!`,
        };
      }

      return { latestReadings: nextMap, motionAlert: motionAlertUpdate };
    }),

  setAggregatedStats: (stats) => set((state) => (state.isZeroDataMode ? state : { aggregatedStats: stats })),
  setDevices: (devices) => set({ devices }),
  setInsights: (insights) => set({ insights }),
  setRules: (rules) => set({ rules }),

  toggleEmergencyStop: () =>
    set((state) => {
      const nextEmergency = !state.emergencyStop;
      const updatedPumps = state.pumps.map((p) =>
        nextEmergency ? { ...p, status: 'OFF' as const, flowRateLmin: 0 } : p
      );
      return { emergencyStop: nextEmergency, pumps: updatedPumps };
    }),

  toggleRainOverride: () => set((state) => ({ rainOverride: !state.rainOverride })),
  toggleThemeMode: () =>
    set((state) => ({ themeMode: state.themeMode === 'light' ? 'dark' : 'light' })),

  togglePumpState: (pumpId: string) =>
    set((state) => {
      const updatedPumps = state.pumps.map((p) => {
        if (p.id === pumpId) {
          const nextStatus = p.status === 'RUNNING' ? ('OFF' as const) : ('RUNNING' as const);
          return {
            ...p,
            status: nextStatus,
            manualOverride: true,
            flowRateLmin: nextStatus === 'RUNNING' ? (p.flowRateLmin > 0 ? p.flowRateLmin : 25.0) : 0,
          };
        }
        return p;
      });
      return { pumps: updatedPumps, isZeroDataMode: false };
    }),

  addSchedule: (schedule) =>
    set((state) => ({ schedules: [schedule, ...state.schedules] })),
  toggleSchedule: (scheduleId) =>
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId
          ? {
              ...s,
              enabled: !s.enabled,
              status: !s.enabled ? ('SCHEDULED' as const) : ('PAUSED' as const),
            }
          : s
      ),
    })),
  deleteSchedule: (scheduleId) =>
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== scheduleId),
    })),

  triggerMotionAlert: (zoneId, zoneName, message) =>
    set({
      motionAlert: {
        active: true,
        zoneId,
        zoneName,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        message:
          message ||
          `PIR Motion Sensor Alert: Intrusion detected in ${zoneName}!`,
      },
    }),
  dismissMotionAlert: () => set({ motionAlert: null }),

  // Zero Data Reset Functionality
  resetAllDataToZero: () => {
    const zeroMap = new Map<string, TelemetryReading>([
      ['zone-1', createZeroReading('zone-1')],
      ['zone-2', createZeroReading('zone-2')],
      ['zone-3', createZeroReading('zone-3')],
      ['zone-4', createZeroReading('zone-4')],
    ]);

    set({
      isZeroDataMode: true,
      latestReadings: zeroMap,
      aggregatedStats: {
        avgSoilMoisture: 0,
        avgTemperature: 0,
        avgTankLevel: 0,
        totalWaterFlow: 0,
        totalSensorsOnline: 0,
      },
      pumps: ZERO_PUMPS,
      schedules: ZERO_SCHEDULES,
      motionAlert: null,
      emergencyStop: false,
      rainOverride: false,
    });
  },
}));
