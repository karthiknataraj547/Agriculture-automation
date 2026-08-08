import { create } from 'zustand';
import { TelemetryReading, IoTDevice, DeviceStatus, AIInsight, AutomationRule, IrrigationSchedule } from '@aether/shared';

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
  lastUserActionTime: number;
  isCloudHydrated: boolean;

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
  setThemeMode: (mode: 'light' | 'dark') => void;
  
  // Pump Actions
  togglePumpState: (pumpId: string) => void;
  setPumpState: (pumpId: string, status: 'RUNNING' | 'OFF') => void;
  
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
  forceCloudSync: (email: string) => Promise<void>;
}

const STORAGE_STATE_KEY = 'aether_farm_persisted_state';
const STORAGE_VIEW_KEY = 'aether_active_view_device';
const STORAGE_THEME_KEY = 'aether_theme_mode';

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

const DEFAULT_DEVICES: IoTDevice[] = [];

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

const getInitialThemeMode = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  try {
    const saved = localStorage.getItem(STORAGE_THEME_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
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
  devices: initialLocal?.devices && Array.isArray(initialLocal.devices) ? initialLocal.devices : DEFAULT_DEVICES,
  insights: [],
  rules: initialLocal?.rules || [],
  pumps: initialLocal?.pumps || ZERO_PUMPS,
  schedules: initialLocal?.schedules || ZERO_SCHEDULES,
  motionAlert: null,
  themeMode: getInitialThemeMode(),
  emergencyStop: initialLocal?.emergencyStop || false,
  rainOverride: initialLocal?.rainOverride || false,
  isZeroDataMode: true,
  lastUserActionTime: 0,
  isCloudHydrated: false,

  setActiveView: (view) => {
    set({ activeView: view });
    if (typeof window !== 'undefined') {
      sessionStorage.getItem(STORAGE_VIEW_KEY);
      sessionStorage.setItem(STORAGE_VIEW_KEY, view);
      localStorage.setItem(STORAGE_VIEW_KEY, view);
    }
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
  
  setDevices: (devices) => {
    set({ devices, lastUserActionTime: Date.now() });
    get().syncStateToCloud();
  },

  setInsights: (insights) => set({ insights }),
  
  setRules: (rules) => {
    set({ rules, lastUserActionTime: Date.now() });
    get().syncStateToCloud();
  },

  toggleEmergencyStop: () => {
    set((state) => {
      const nextEmergency = !state.emergencyStop;
      const updatedPumps = state.pumps.map((p) =>
        nextEmergency ? { ...p, status: 'OFF' as const, flowRateLmin: 0 } : p
      );
      return { emergencyStop: nextEmergency, pumps: updatedPumps, lastUserActionTime: Date.now() };
    });
    get().syncStateToCloud();
  },

  toggleRainOverride: () => {
    set((state) => ({ rainOverride: !state.rainOverride, lastUserActionTime: Date.now() }));
    get().syncStateToCloud();
  },

  toggleThemeMode: () => {
    set((state) => {
      const nextMode = state.themeMode === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_THEME_KEY, nextMode);
        if (nextMode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
      return { themeMode: nextMode };
    });
  },

  setThemeMode: (mode) => {
    set({ themeMode: mode });
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_THEME_KEY, mode);
      if (mode === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  },

  togglePumpState: (pumpId) => {
    set((state) => {
      const updatedPumps = state.pumps.map((p) => {
        if (p.id === pumpId) {
          const nextStatus = p.status === 'RUNNING' ? ('OFF' as const) : ('RUNNING' as const);
          return {
            ...p,
            status: nextStatus,
            manualOverride: true,
            flowRateLmin: nextStatus === 'RUNNING' ? 14.5 : 0,
          };
        }
        return p;
      });
      return { pumps: updatedPumps, lastUserActionTime: Date.now() };
    });
    get().syncStateToCloud();
  },

  setPumpState: (pumpId, status) => {
    set((state) => {
      const updatedPumps = state.pumps.map((p) => {
        if (p.id === pumpId) {
          return {
            ...p,
            status,
            manualOverride: true,
            flowRateLmin: status === 'RUNNING' ? 14.5 : 0,
          };
        }
        return p;
      });
      return { pumps: updatedPumps, lastUserActionTime: Date.now() };
    });
    get().syncStateToCloud();
  },

  addSchedule: (schedule) => {
    set((state) => ({ schedules: [schedule, ...state.schedules], lastUserActionTime: Date.now() }));
    get().syncStateToCloud();
  },

  toggleSchedule: (scheduleId) => {
    set((state) => ({
      schedules: state.schedules.map((s) =>
        s.id === scheduleId
          ? { ...s, enabled: !s.enabled, status: !s.enabled ? ('SCHEDULED' as const) : ('PAUSED' as const) }
          : s
      ),
      lastUserActionTime: Date.now(),
    }));
    get().syncStateToCloud();
  },

  deleteSchedule: (scheduleId) => {
    set((state) => ({
      schedules: state.schedules.filter((s) => s.id !== scheduleId),
      lastUserActionTime: Date.now(),
    }));
    get().syncStateToCloud();
  },

  triggerMotionAlert: (zoneId, zoneName, message) => {
    set({
      motionAlert: {
        active: true,
        zoneId,
        zoneName,
        timestamp: new Date().toISOString(),
        message: message || 'Wild animal detected in crop field area! System auto-triggering deterrent sirens.',
      },
    });
  },

  dismissMotionAlert: () => set({ motionAlert: null }),

  resetAllDataToZero: () => {
    set({
      latestReadings: ZERO_TELEMETRY_MAP,
      aggregatedStats: {
        avgSoilMoisture: 0,
        avgTemperature: 0,
        avgTankLevel: 0,
        totalWaterFlow: 0,
        totalSensorsOnline: 0,
      },
      devices: [],
      pumps: ZERO_PUMPS,
      schedules: ZERO_SCHEDULES,
      emergencyStop: false,
      rainOverride: false,
      isZeroDataMode: true,
      lastUserActionTime: Date.now(),
    });
    get().syncStateToCloud();
  },

  syncStateToCloud: async (emailArg) => {
    if (typeof window === 'undefined') return;

    const state = get();

    // Persist domain state locally
    const toSave = {
      pumps: state.pumps,
      schedules: state.schedules,
      rules: state.rules,
      devices: state.devices,
      emergencyStop: state.emergencyStop,
      rainOverride: state.rainOverride,
    };
    try {
      localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(toSave));
    } catch (e) {
      console.error('Local state saving error', e);
    }

    let email = emailArg;
    if (!email) {
      try {
        const storedSession = sessionStorage.getItem('aether_active_session_user') || localStorage.getItem('aether_active_session_user');
        if (storedSession) {
          const parsed = JSON.parse(storedSession);
          email = parsed.email;
        }
      } catch {}
    }

    if (!email) return;

    try {
      await fetch('/api/state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, state: toSave }),
      });
    } catch (err) {
      console.warn('Sync to backend failed:', err);
    }
  },

  loadGlobalStateForUser: async (email) => {
    if (!email || typeof window === 'undefined') return;
    const currentState = get();
    
    // Protection: If user performed an action within the last 2.5 seconds, defer GET polling overwrite
    if (Date.now() - currentState.lastUserActionTime < 2500) {
      return;
    }

    try {
      const res = await fetch(`/api/state?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success && data.state) {
        const cloudState = data.state;

        // Double check user action timestamp before setting state
        if (Date.now() - get().lastUserActionTime < 2500) {
          return;
        }

        set((state) => ({
          pumps: cloudState.pumps || state.pumps,
          schedules: cloudState.schedules || state.schedules,
          rules: cloudState.rules || state.rules,
          devices: Array.isArray(cloudState.devices) ? cloudState.devices : state.devices,
          emergencyStop: cloudState.emergencyStop !== undefined ? cloudState.emergencyStop : state.emergencyStop,
          rainOverride: cloudState.rainOverride !== undefined ? cloudState.rainOverride : state.rainOverride,
          isCloudHydrated: true,
        }));
        localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(cloudState));
      }
    } catch (err) {
      console.warn('Load global state failed:', err);
    }
  },

  forceCloudSync: async (email) => {
    if (!email || typeof window === 'undefined') return;
    try {
      const res = await fetch(`/api/state?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (data.success && data.state) {
        const cloudState = data.state;
        set({
          pumps: cloudState.pumps || ZERO_PUMPS,
          schedules: cloudState.schedules || ZERO_SCHEDULES,
          rules: cloudState.rules || [],
          devices: Array.isArray(cloudState.devices) ? cloudState.devices : [],
          emergencyStop: cloudState.emergencyStop || false,
          rainOverride: cloudState.rainOverride || false,
          isCloudHydrated: true,
          lastUserActionTime: 0,
        });
        localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(cloudState));
      }
    } catch (err) {
      console.warn('Force cloud sync failed:', err);
    }
  },
}));
