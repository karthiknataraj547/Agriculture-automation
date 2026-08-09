import { create } from 'zustand';
import { TelemetryReading, IoTDevice, DeviceStatus, AIInsight, AutomationRule, IrrigationSchedule } from '@aether/shared';
import { useAuthStore } from './useAuthStore';

export interface PumpState {
  id: string;
  name: string;
  zoneId: string;
  zoneName: string;
  deviceId?: string;
  status: 'RUNNING' | 'OFF' | 'FAULT';
  runtimeMinutes: number;
  manualOverride: boolean;
  flowRateLmin: number;
  lastToggledAt?: number;
}

export interface MotionAlertState {
  active: boolean;
  zoneId: string;
  zoneName: string;
  timestamp: string;
  message: string;
}

export interface SpatialStoreState {
  activeView: 'SPATIAL_3D' | 'TELEMETRY' | 'AUTOMATION' | 'DEVICES' | 'AI_INSIGHTS' | 'AUDIT_LOGS' | 'PUMPS' | 'SCHEDULES' | 'DIAGNOSTICS';
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
  deletedDeviceIds: string[];
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
  deleteDevice: (deviceId: string) => void;
  setInsights: (insights: AIInsight[]) => void;
  setRules: (rules: AutomationRule[]) => void;
  toggleEmergencyStop: () => void;
  toggleRainOverride: () => void;
  toggleThemeMode: () => void;
  setThemeMode: (mode: 'light' | 'dark') => void;
  
  // Pump Actions
  togglePumpState: (pumpId: string) => void;
  setPumpState: (pumpId: string, status: 'RUNNING' | 'OFF') => void;
  deletePump: (pumpId: string) => void;
  
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
  loadGlobalStateForUser: (email?: string) => Promise<void>;
  forceCloudSync: (email?: string) => Promise<void>;
}

const STORAGE_STATE_KEY = 'aether_farm_persisted_state_v4';
const STORAGE_VIEW_KEY = 'aether_active_view_device';
const STORAGE_THEME_KEY = 'aether_theme_mode';

const ZERO_PUMPS: PumpState[] = [];

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

// Smart Pump Merger: Merge local and incoming cloud pump states using timestamp / latest status
function mergePumps(existingPumps: PumpState[], incomingPumps: any[]): PumpState[] {
  if (!incomingPumps || !Array.isArray(incomingPumps) || incomingPumps.length === 0) {
    return existingPumps;
  }

  const incomingMap = new Map<string, any>(incomingPumps.map((p) => [p.id, p]));

  return existingPumps.map((localP) => {
    const incP = incomingMap.get(localP.id);
    if (!incP) return localP;

    const localTime = localP.lastToggledAt || 0;
    const cloudTime = incP.lastToggledAt || 0;
    const activeStatus = cloudTime > localTime ? incP.status : localP.status;

    return {
      ...localP,
      ...incP,
      status: activeStatus,
      flowRateLmin: activeStatus === 'RUNNING' ? 14.5 : 0,
      manualOverride: cloudTime > localTime ? (incP.manualOverride ?? localP.manualOverride) : localP.manualOverride,
      lastToggledAt: Math.max(localTime, cloudTime),
    };
  });
}

// Smart Array Merger: Combine arrays by unique ID (allows new items from cloud, excludes deleted ones)
function mergeArrayById<T extends { id?: string; uuid?: string; serialNumber?: string }>(
  localArr: T[],
  incomingArr: any[],
  deletedIds: Set<string> = new Set()
): T[] {
  const mergedMap = new Map<string, T>();

  // 1. Add local items excluding deleted ones
  (localArr || []).forEach((item) => {
    const key = item.uuid || item.id || item.serialNumber;
    if (key && !deletedIds.has(key)) {
      mergedMap.set(key, item);
    }
  });

  // 2. Merge incoming items (add new items if missing, merge if existing, unless deleted)
  if (incomingArr && Array.isArray(incomingArr)) {
    incomingArr.forEach((item) => {
      const key = item.uuid || item.id || item.serialNumber;
      if (key && !deletedIds.has(key)) {
        const existing = mergedMap.get(key);
        if (existing) {
          mergedMap.set(key, { ...existing, ...item });
        } else {
          mergedMap.set(key, item);
        }
      }
    });
  }

  return Array.from(mergedMap.values());
}

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
  devices: initialLocal?.devices && Array.isArray(initialLocal.devices)
    ? initialLocal.devices.filter((d: any) => !(initialLocal?.deletedDeviceIds || []).includes(d.uuid) && !(initialLocal?.deletedDeviceIds || []).includes(d.serialNumber))
    : DEFAULT_DEVICES,
  deletedDeviceIds: initialLocal?.deletedDeviceIds || [],
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
    const deletedSet = new Set(get().deletedDeviceIds || []);
    const filtered = devices.filter((d) => !deletedSet.has(d.uuid) && !deletedSet.has(d.serialNumber));
    set({ devices: filtered, lastUserActionTime: Date.now() });
    get().syncStateToCloud();
  },

  deleteDevice: (deviceId) => {
    set((state) => {
      const updatedDevices = state.devices.filter(
        (d) => d.uuid !== deviceId && d.serialNumber !== deviceId
      );
      const updatedPumps = state.pumps.filter(
        (p) => p.deviceId !== deviceId && p.id !== `pump-${deviceId}`
      );
      const updatedDeletedIds = Array.from(new Set([...(state.deletedDeviceIds || []), deviceId]));
      return {
        devices: updatedDevices,
        pumps: updatedPumps,
        deletedDeviceIds: updatedDeletedIds,
        selectedDeviceId: state.selectedDeviceId === deviceId ? null : state.selectedDeviceId,
        lastUserActionTime: Date.now(),
      };
    });

    try {
      fetch('/api/telemetry', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deviceId }),
      }).catch(() => {});
    } catch {}

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
    let nextStatus: 'RUNNING' | 'OFF' = 'OFF';
    let targetZone = 'zone-1';

    set((state) => {
      const updatedPumps = state.pumps.map((p) => {
        if (p.id === pumpId) {
          nextStatus = p.status === 'RUNNING' ? ('OFF' as const) : ('RUNNING' as const);
          targetZone = p.zoneId || 'zone-1';
          return {
            ...p,
            status: nextStatus,
            manualOverride: true,
            flowRateLmin: nextStatus === 'RUNNING' ? 14.5 : 0,
            lastToggledAt: Date.now(),
          };
        }
        return p;
      });
      return { pumps: updatedPumps, lastUserActionTime: Date.now() };
    });

    // 1. Dispatch Hardware Command to API for ESP32 / NodeMCU Actuation
    fetch('/api/devices/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: `esp32-node-${targetZone}`,
        pumpId,
        commandType: String(nextStatus) === 'RUNNING' ? 'START_PUMP' : 'STOP_PUMP',
        requestedValue: nextStatus,
      }),
    }).catch(() => {});

    // 2. Instant Telemetry Cache Push for 0ms Live Flow Rate Response
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: `esp32-node-${targetZone}`,
        zoneId: targetZone,
        pumpRunning: String(nextStatus) === 'RUNNING',
        waterFlowRate: String(nextStatus) === 'RUNNING' ? 14.5 : 0,
        soilMoisture: String(nextStatus) === 'RUNNING' ? 75 : 45,
      }),
    }).catch(() => {});

    get().syncStateToCloud();
  },

  setPumpState: (pumpId, status) => {
    let targetZone = 'zone-1';

    set((state) => {
      const updatedPumps = state.pumps.map((p) => {
        if (p.id === pumpId) {
          targetZone = p.zoneId || 'zone-1';
          return {
            ...p,
            status,
            manualOverride: true,
            flowRateLmin: status === 'RUNNING' ? 14.5 : 0,
            lastToggledAt: Date.now(),
          };
        }
        return p;
      });
      return { pumps: updatedPumps, lastUserActionTime: Date.now() };
    });

    // 1. Dispatch Hardware Command
    fetch('/api/devices/command', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: `esp32-node-${targetZone}`,
        pumpId,
        commandType: status === 'RUNNING' ? 'START_PUMP' : 'STOP_PUMP',
        requestedValue: status,
      }),
    }).catch(() => {});

    // 2. Instant Telemetry Push
    fetch('/api/telemetry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        deviceId: `esp32-node-${targetZone}`,
        zoneId: targetZone,
        pumpRunning: status === 'RUNNING',
        waterFlowRate: status === 'RUNNING' ? 14.5 : 0,
      }),
    }).catch(() => {});

    get().syncStateToCloud();
  },

  deletePump: (pumpId) => {
    set((state) => ({
      pumps: state.pumps.filter((p) => p.id !== pumpId),
      lastUserActionTime: Date.now(),
    }));
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
      deletedDeviceIds: state.deletedDeviceIds,
      emergencyStop: state.emergencyStop,
      rainOverride: state.rainOverride,
    };
    try {
      localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(toSave));
      if (typeof BroadcastChannel !== 'undefined') {
        const bc = new BroadcastChannel('aether_farm_sync_channel');
        bc.postMessage({ type: 'SYNC_STATE', state: toSave });
        bc.close();
      }
    } catch (e) {}

    let email = emailArg || useAuthStore.getState().user?.email;
    if (!email) {
      try {
        const storedSession = localStorage.getItem('aether_active_session_user') || sessionStorage.getItem('aether_active_session_user');
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

  loadGlobalStateForUser: async (emailArg) => {
    const activeEmail = emailArg || useAuthStore.getState().user?.email;
    if (!activeEmail || typeof window === 'undefined') return;

    const currentState = get();
    
    // Protection: Defer GET polling overwrite if user performed action within last 500ms
    if (Date.now() - currentState.lastUserActionTime < 500) {
      return;
    }

    try {
      const res = await fetch(`/api/state?email=${encodeURIComponent(activeEmail)}`);
      const data = await res.json();

      if (data.success && data.state && typeof data.state === 'object') {
        const cloudState = data.state;

        if (Date.now() - get().lastUserActionTime < 500) {
          return;
        }

        const deletedSet = new Set([...(get().deletedDeviceIds || []), ...(cloudState.deletedDeviceIds || [])]);
        const mergedPumps = mergePumps(get().pumps, cloudState.pumps);
        const mergedDevices = mergeArrayById(get().devices, cloudState.devices || [], deletedSet);
        const mergedSchedules = mergeArrayById(get().schedules, cloudState.schedules || []);
        const mergedRules = mergeArrayById(get().rules, cloudState.rules || []);

        const updatedState = {
          pumps: mergedPumps,
          devices: mergedDevices,
          deletedDeviceIds: Array.from(deletedSet),
          schedules: mergedSchedules,
          rules: mergedRules,
          emergencyStop: cloudState.emergencyStop !== undefined ? cloudState.emergencyStop : get().emergencyStop,
          rainOverride: cloudState.rainOverride !== undefined ? cloudState.rainOverride : get().rainOverride,
          isCloudHydrated: true,
        };

        set(updatedState);
        localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify({
          pumps: mergedPumps,
          devices: mergedDevices,
          schedules: mergedSchedules,
          rules: mergedRules,
          emergencyStop: updatedState.emergencyStop,
          rainOverride: updatedState.rainOverride,
        }));
      }
    } catch (err) {
      console.warn('Load global state failed:', err);
    }
  },

  forceCloudSync: async (emailArg) => {
    const activeEmail = emailArg || useAuthStore.getState().user?.email;
    if (!activeEmail || typeof window === 'undefined') return;

    try {
      const res = await fetch(`/api/state?email=${encodeURIComponent(activeEmail)}`);
      const data = await res.json();
      const currentState = get();

      if (data.success && data.state && typeof data.state === 'object') {
        const cloudState = data.state;

        const mergedPumps = mergePumps(currentState.pumps, cloudState.pumps);
        const mergedDevices = mergeArrayById(currentState.devices, cloudState.devices || []);
        const mergedSchedules = mergeArrayById(currentState.schedules, cloudState.schedules || []);
        const mergedRules = mergeArrayById(currentState.rules, cloudState.rules || []);

        const toApply = {
          pumps: mergedPumps,
          devices: mergedDevices,
          schedules: mergedSchedules,
          rules: mergedRules,
          emergencyStop: cloudState.emergencyStop !== undefined ? cloudState.emergencyStop : currentState.emergencyStop,
          rainOverride: cloudState.rainOverride !== undefined ? cloudState.rainOverride : currentState.rainOverride,
          isCloudHydrated: true,
          lastUserActionTime: 0,
        };

        set(toApply);
        localStorage.setItem(STORAGE_STATE_KEY, JSON.stringify(toApply));
      } else {
        // Sync local storage state to cloud if cloud state empty
        get().syncStateToCloud(activeEmail);
      }
    } catch (err) {
      console.warn('Force cloud sync failed:', err);
    }
  },
}));
