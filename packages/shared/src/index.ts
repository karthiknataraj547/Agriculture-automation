/**
 * AetherCrop / TerraPulse Shared Enterprise Domain Types & Schemas
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FARM_OWNER = 'FARM_OWNER',
  MANAGER = 'MANAGER',
  TECHNICIAN = 'TECHNICIAN',
  OPERATOR = 'OPERATOR',
  VIEWER = 'VIEWER',
  GUEST = 'GUEST'
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  WARNING = 'WARNING',
  CRITICAL = 'CRITICAL',
  MAINTENANCE = 'MAINTENANCE',
  PROVISIONING = 'PROVISIONING'
}

export enum PumpStatus {
  OFF = 'OFF',
  RUNNING = 'RUNNING',
  FAULT = 'FAULT',
  OVERRIDE_PAUSED = 'OVERRIDE_PAUSED',
  DRY_RUN_PROTECTION = 'DRY_RUN_PROTECTION'
}

export enum ValveStatus {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  FAULT = 'FAULT',
  SCHEDULED = 'SCHEDULED'
}

export enum AlertSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface TelemetryReading {
  deviceId: string;
  farmId: string;
  zoneId: string;
  timestamp: string; // ISO 8601
  
  // Soil & Environmental Metrics
  soilMoisture: number; // Percentage (%)
  soilMoistureDepth30cm?: number;
  soilMoistureDepth60cm?: number;
  soilTemperature: number; // Celsius (°C)
  airTemperature: number; // Celsius (°C)
  humidity: number; // Percentage (%)
  ec: number; // Electrical Conductivity (dS/m)
  ph: number; // pH Level (0-14)
  
  // Hydraulic Metrics
  waterFlowRate: number; // Liters / minute
  waterPressure: number; // PSI / Bar
  tankLevelPercent: number; // Percentage (%)
  
  // Chemical / NPK Metrics
  nitrogen: number; // mg/kg
  phosphorus: number; // mg/kg
  potassium: number; // mg/kg
  
  // Weather & Radiation Metrics
  rainRate: number; // mm/hour
  windSpeed: number; // km/h
  windDirection: number; // Degrees (0-360)
  solarIrradiance: number; // W/m²
  uvIndex: number;
  leafWetness: number; // Percentage (%)
  
  // System & Intrusion / Motion Detection Metrics
  motionDetected?: boolean;
  motionCount?: number;
  solarVoltage: number; // Volts (V)
  batteryLevelPercent: number; // Percentage (%)
  signalRssi: number; // dBm
}

export interface IoTDevice {
  uuid: string;
  serialNumber: string;
  name: string;
  macAddress: string;
  firmwareVersion: string;
  status: DeviceStatus;
  farmId: string;
  zoneId: string;
  ownerId: string;
  mqttTopic: string;
  authCode?: string;
  lastSeen: string;
  batteryLevel: number;
  signalRssi: number;
  otaStatus: 'IDLE' | 'DOWNLOADING' | 'APPLYING' | 'SUCCESS' | 'FAILED';
  location: {
    lat: number;
    lng: number;
    elevation: number;
  };
  sensorsAttached: string[];
}

export interface IrrigationZone {
  id: string;
  farmId: string;
  name: string;
  cropType: string;
  targetMoistureMin: number;
  targetMoistureMax: number;
  areaHectares: number;
  soilType: 'CLAY' | 'LOAM' | 'SANDY' | 'SILT' | 'PEAT';
  pumpId: string;
  valves: string[];
  status: 'OPTIMAL' | 'IRRIGATING' | 'NEEDS_WATER' | 'ALERT';
  currentMoisture: number;
  spatialCoordinates: {
    x: number;
    y: number;
    z: number;
    width: number;
    depth: number;
  };
}

export interface IrrigationSchedule {
  id: string;
  name: string;
  enabled: boolean;
  farmId: string;
  zoneId: string;
  zoneName: string;
  pumpId: string;
  startTime: string; // "HH:MM" 24h
  durationMinutes: number;
  daysOfWeek: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[];
  targetMoistureMin?: number;
  lastRun?: string;
  status: 'SCHEDULED' | 'RUNNING' | 'COMPLETED' | 'PAUSED';
}

export interface AutomationRuleCondition {
  metric: keyof TelemetryReading;
  operator: '<' | '<=' | '>' | '>=' | '==' | '!=';
  value: number;
}

export interface AutomationRuleAction {
  type: 'START_PUMP' | 'STOP_PUMP' | 'OPEN_VALVE' | 'CLOSE_VALVE' | 'NOTIFY' | 'SET_IRRIGATION_DURATION' | 'TRIGGER_SIREN' | 'ANIMAL_INTRUSION_ALERT';
  targetId: string;
  value?: any;
}

export interface AutomationRule {
  id: string;
  name: string;
  enabled: boolean;
  farmId: string;
  zoneId?: string;
  conditions: AutomationRuleCondition[];
  conditionLogic: 'AND' | 'OR';
  actions: AutomationRuleAction[];
  lastTriggered?: string;
}

export interface AIInsight {
  id: string;
  timestamp: string;
  farmId: string;
  category: 'IRRIGATION_OPTIMIZATION' | 'DISEASE_PREDICTION' | 'ANOMALY_DETECTION' | 'WATER_SAVING' | 'HARDWARE_HEALTH';
  title: string;
  description: string;
  confidenceScore: number; // 0 to 1
  impactSeverity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  suggestedAction: string;
  estimatedWaterSavedLiters?: number;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resource: string;
  ipAddress: string;
  details: Record<string, any>;
  status: 'SUCCESS' | 'FAILURE' | 'DENIED';
}

export interface WeatherData {
  temperature: number;
  humidity: number;
  condition: 'SUNNY' | 'PARTLY_CLOUDY' | 'CLOUDY' | 'RAIN' | 'STORMY';
  windSpeed: number;
  windDirectionDegrees: number;
  rainProbability: number; // 0 - 100%
  uvIndex: number;
  evapotranspirationEt0: number; // mm/day
  forecast24h: {
    time: string;
    temp: number;
    rainProb: number;
  }[];
}
