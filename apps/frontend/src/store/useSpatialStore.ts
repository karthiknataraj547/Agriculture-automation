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
}

const INITIAL_PUMPS: PumpState[] = [
  {
    id: 'pump-1',
    name: 'Pump Main Alpha',
    zoneId: 'zone-1',
    zoneName: 'Zone 1: Corn Field',
    status: 'RUNNING',
    runtimeMinutes: 142,
    manualOverride: false,
    flowRateLmin: 28.5,
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
    runtimeMinutes: 65,
    manualOverride: false,
    flowRateLmin: 0,
  },
  {
    id: 'pump-4',
    name: 'Pump North Delta',
    zoneId: 'zone-4',
    zoneName: 'Zone 4: Orchard North',
    status: 'RUNNING',
    runtimeMinutes: 88,
    manualOverride: true,
    flowRateLmin: 23.6,
  },
];

const INITIAL_SCHEDULES: IrrigationSchedule[] = [
  {
    id: 'sch-1',
    name: 'Early Morning Deep Soak',
    enabled: true,
    farmId: 'farm-01',
    zoneId: 'zone-1',
    zoneName: 'Zone 1: Corn Field',
    pumpId: 'pump-1',
    startTime: '06:00',
    durationMinutes: 45,
    daysOfWeek: ['MON', 'WED', 'FRI'],
    targetMoistureMin: 35,
    lastRun: new Date(Date.now() - 86400000).toISOString(),
    status: 'SCHEDULED',
  },
  {
    id: 'sch-2',
    name: 'Evening Orchard Mist',
    enabled: true,
    farmId: 'farm-01',
    zoneId: 'zone-4',
    zoneName: 'Zone 4: Orchard North',
    pumpId: 'pump-4',
    startTime: '18:30',
    durationMinutes: 30,
    daysOfWeek: ['TUE', 'THU', 'SAT'],
    targetMoistureMin: 40,
    lastRun: new Date(Date.now() - 43200000).toISOString(),
    status: 'SCHEDULED',
  },
  {
    id: 'sch-3',
    name: 'Vineyard Midday Moisture Boost',
    enabled: false,
    farmId: 'farm-01',
    zoneId: 'zone-3',
    zoneName: 'Zone 3: Vineyard East',
    pumpId: 'pump-3',
    startTime: '12:00',
    durationMinutes: 20,
    daysOfWeek: ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'],
    targetMoistureMin: 30,
    status: 'PAUSED',
  },
];

export const useSpatialStore = create<SpatialStoreState>((set) => ({
  activeView: 'SPATIAL_3D',
  selectedZoneId: 'zone-1',
  selectedDeviceId: null,
  latestReadings: new Map(),
  aggregatedStats: {
    avgSoilMoisture: 42,
    avgTemperature: 26.5,
    avgTankLevel: 82,
    totalWaterFlow: 48.5,
    totalSensorsOnline: 32,
  },
  devices: [],
  insights: [],
  rules: [],
  pumps: INITIAL_PUMPS,
  schedules: INITIAL_SCHEDULES,
  motionAlert: null,
  themeMode: 'light',
  emergencyStop: false,
  rainOverride: false,

  setActiveView: (view) => set({ activeView: view }),
  setSelectedZoneId: (zoneId) => set({ selectedZoneId: zoneId }),
  setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),
  updateTelemetryStream: (reading) =>
    set((state) => {
      const nextMap = new Map(state.latestReadings);
      nextMap.set(reading.zoneId, reading);

      // Check if PIR motion / animal intrusion is detected in incoming telemetry packet
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
          message: `PIR Sensor Triggered: Wildlife/Animal Movement detected in ${zoneNames[reading.zoneId] || reading.zoneId}! Automated deterrent siren armed.`,
        };
      }

      return { latestReadings: nextMap, motionAlert: motionAlertUpdate };
    }),
  setAggregatedStats: (stats) => set({ aggregatedStats: stats }),
  setDevices: (devices) => set({ devices }),
  setInsights: (insights) => set({ insights }),
  setRules: (rules) => set({ rules }),
  toggleEmergencyStop: () =>
    set((state) => {
      const nextEmergency = !state.emergencyStop;
      // If emergency stop activated, shut off all pumps
      const updatedPumps = state.pumps.map((p) =>
        nextEmergency ? { ...p, status: 'OFF' as const, flowRateLmin: 0 } : p
      );
      return { emergencyStop: nextEmergency, pumps: updatedPumps };
    }),
  toggleRainOverride: () => set((state) => ({ rainOverride: !state.rainOverride })),
  toggleThemeMode: () =>
    set((state) => ({ themeMode: state.themeMode === 'light' ? 'dark' : 'light' })),

  // Pump actions
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
      return { pumps: updatedPumps };
    }),

  // Schedule actions
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

  // Motion Alert actions
  triggerMotionAlert: (zoneId, zoneName, message) =>
    set({
      motionAlert: {
        active: true,
        zoneId,
        zoneName,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        message:
          message ||
          `PIR Motion Sensor Alert: Wildlife intrusion detected in ${zoneName}! Sirens & flashing floodlights activated.`,
      },
    }),
  dismissMotionAlert: () => set({ motionAlert: null }),
}));
