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

  // Global State Sync
  syncStateToCloud: (email?: string) => void;
  loadGlobalStateForUser: (email: string) => Promise<void>;
}

const STORAGE_STATE_KEY = 'aether_farm_persisted_state';
const STORAGE_VIEW_KEY = 'aether_active_view';

const ZERO_PUMPS: PumpState[] = [
  { id: 'pump-1', name: 'Pump Main Alpha', zoneId: 'zone-1', zoneName: 'Zone 1: Corn Field', status: 'OFF', runtimeMinutes: 0, manualOverride: false, flowRateLmin: 0 },
  { id: 'pump-2', name: 'Pump Sector Beta', zoneId: 'zone-2', zoneName: 'Zone 2: Soybean Sector', status: 'OFF', runtimeMinutes: 0, manualOverride: false, flowRateLmin: 0 },
  { id: 'pump-3', name: 'Pump East Gamma', zoneId: 'zone-3', zoneName: 'Zone 3: Vineyard East', status: 'OFF', runtimeMinutes: 0, manualOverride: false, flowRateLmin: 0 },
  { id: 'pump-4', name: 'Pump North Delta', zoneId: 'zone-4', zoneName: 'Zone 4: Orchard North', status: 'OFF', runtimeMinutes: 0, manualOverride: false, flowRateLmin: 0 },
];

const ZERO_SCHEDULES: IrrigationSchedule[] = [
  { id: 'sch-1', name: 'Early Morning Deep Soak', enabled: false, farmId: 'farm-01', zoneId: 'zone-1', zoneName: 'Zone 1: Corn Field', pumpId: 'pump-1', startTime: '00:00', durationMinutes: 0, daysOfWeek: [], targetMoistureMin: 0, status: 'PAUSED' },
  { id: 'sch-2', name: 'Evening Orchard Mist', enabled: false, farmId: 'farm-01', zoneId: 'zone-4', zoneName: 'Zone 4: Orchard North', pumpId: 'pump-4', startTime: '00:00', durationMinutes: 0, daysOfWeek: [], targetMoistureMin: 0, status: 'PAUSED' },
  { id: 'sch-3', name: 'Vineyard Midday Moisture Boost', enabled: false, farmId: 'farm-01', zoneId: 'zone-3', zoneName: 'Zone 3: Vineyard East', pumpId: 'pump-3', startTime: '00:00', durationMinutes: 0, daysOfWeek: [], targetMoistureMin: 0, status: 'PAUSED' },
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

const getInitialView = (): SpatialStoreState['activeView'] => {
  if (typeof window === 'undefined') return 'SPATIAL_3D';
  try {
    const saved = sessionStorage.getItem(STORAGE_VIEW_KEY) || localStorage.getItem(STORAGE_VIEW_KEY);
    return (saved as any) || 'SPATIAL_3D';
  } catch {
    return 'SPATIAL_3D';
  }
};

const getLocalPersistedState = () => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_STATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

const initialLocal = getLocalPersistedState();

export const useSpatialStore = create<SpatialStoreState>((set, get) => ({
  activeView: getInitialView(),
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
  rules: initialLocal?.rules || [],
  pumps: initialLocal?.pumps || ZERO_PUMPS,
  schedules: initialLocal?.schedules || ZERO_SCHEDULES,
  motionAlert: null,
  themeMode: 'light',
  emergencyStop: initialLocal?.emergencyStop || false,
  rainOverride: initialLocal?.rainOverride || false,
  isZeroDataMode: true,

  setActiveView: (view) => {
    set({ activeView: view });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem(STORAGE_VIEW_KEY, view);
      localStorage.setItem(STORAGE_VIEW_KEY, view);
    }
    get().syncStateToCloud();
  },

  setSelectedZoneId: (zoneId) => set({ selectedZoneId: zoneId }),
  setSelectedDeviceId: (deviceId) => set({ selectedDeviceId: deviceId }),

  updateTelemetryStream: (reading) =>
    set((state) => {
      if (state.isZeroDataMode) return state;
      const nextMap = new Map(state.latestReadings);
      nextMap.set(reading.zoneId, reading);
      return { latestReadings: nextMap };
    }),

  setAggregatedStats: (stats) => set((state) => (state.isZeroDataMode ? state : { aggregatedStats: stats })),
  setDevices: (devices) => set({ devices }),
  setInsights: (insights) => set({ insights }),
  setRules: (rules) => {
    set({ rules });
    get().syncStateToCloud();
  },

  toggleEmergencyStop: () => {
    set((state) => {
      const nextEmergency = !state.emergencyStop;
      const updatedPumps = state.pumps.map((p) =>
        nextEmergency ? { ...p, status: 'OFF' as const, flowRateLmin: 0 } : p
      );
      return { emergencyStop: nextEmergency, pumps: updatedPumps };
    });
    get().syncStateToCloud();
  },

  toggleRainOverride: () => {
    set((state) => ({ rainOverride: !state.rainOverride }));
    get().syncStateToCloud();
  },

  toggleThemeMode: () =>
    set((state) => ({ themeMode: state.themeMode === 'light' ? 'dark' : 'light' })),

  togglePumpState: (pumpId: string) => {
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
    });
    get().syncStateToCloud();
  },

  addSchedule: (schedule) => {
    set((state) => ({ schedules: [schedule, ...state.schedules] }));
    get().syncStateToCloud();
  },

  toggleSchedule: (scheduleId) => {
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
    }));
    get().syncStateToCloud();
  },

  deleteSchedule: (scheduleId) => {
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== scheduleId),
    }));
    get().syncStateToCloud();
  },

  triggerMotionAlert: (zoneId, zoneName, message) =>
    set({
      motionAlert: {
        active: true,
        zoneId,
        zoneName,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
        message: message || `Intrusion detected in ${zoneName}!`,
      },
    }),
  dismissMotionAlert: () => set({ motionAlert: null }),

  resetAllDataToZero: () => {
    set({
      isZeroDataMode: true,
      latestReadings: ZERO_TELEMETRY_MAP,
      aggregatedStats: { avgSoilMoisture: 0, avgTemperature: 0, avgTankLevel: 0, totalWaterFlow: 0, totalSensorsOnline: 0 },
      pumps: ZERO_PUMPS,
      schedules: ZERO_SCHEDULES,
      motionAlert: null,
      emergencyStop: false,
      rainOverride: false,
    });
  },

  syncStateToCloud: (userEmail?: string) => {
    const state = get();
    const statePayload = {
      pumps: state.pumps,
      schedules: state.schedules,
      rules: state.rules,
      emergencyStop: state.emergencyStop,
      rainOverride: state.rainOverride,
      activeView: state.activeView,
    };

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(statePayload));
      const sessionUser = sessionStorage.getItem('aether_active_session_user') || localStorage.getItem('aether_active_session_user');
      const email = userEmail || (sessionUser ? JSON.parse(sessionUser).email : null);

      if (email) {
        fetch('/api/state', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, state: statePayload }),
        }).catch(() => {});
      }
    }
  },

  loadGlobalStateForUser: async (email: string) => {
    try {
      const res = await fetch(`/api/state?email=${encodeURIComponent(email)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.state) {
          const s = json.state;
          const current = get();

          // Only set state if values changed to prevent UI flicker
          const newPumpsStr = JSON.stringify(s.pumps || ZERO_PUMPS);
          const currentPumpsStr = JSON.stringify(current.pumps);
          const newSchedulesStr = JSON.stringify(s.schedules || ZERO_SCHEDULES);
          const currentSchedulesStr = JSON.stringify(current.schedules);

          if (
            newPumpsStr !== currentPumpsStr ||
            newSchedulesStr !== currentSchedulesStr ||
            Boolean(s.emergencyStop) !== current.emergencyStop ||
            Boolean(s.rainOverride) !== current.rainOverride
          ) {
            set({
              pumps: s.pumps || ZERO_PUMPS,
              schedules: s.schedules || ZERO_SCHEDULES,
              rules: s.rules || [],
              emergencyStop: Boolean(s.emergencyStop),
              rainOverride: Boolean(s.rainOverride),
              activeView: s.activeView || current.activeView,
            });
            if (typeof window !== 'undefined') {
              localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(s));
            }
          }
        }
      }
    } catch {
      // Silently handle polling delay
    }
  },
}));
