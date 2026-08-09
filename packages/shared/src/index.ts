/**
 * AetherCrop / TerraPulse Shared Enterprise Domain Types & Schemas
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  SUPPORT_ADMIN = 'SUPPORT_ADMIN',
  TECHNICIAN = 'TECHNICIAN',
  USER = 'USER',
  VIEWER = 'VIEWER',
  FARM_OWNER = 'FARM_OWNER',
  MANAGER = 'MANAGER',
  OPERATOR = 'OPERATOR',
  GUEST = 'GUEST'
}

export type Permission =
  | 'devices.read'
  | 'devices.create'
  | 'devices.update'
  | 'devices.delete'
  | 'devices.control'
  | 'devices.transfer'
  | 'telemetry.read'
  | 'farms.manage'
  | 'users.read'
  | 'users.update'
  | 'users.disable'
  | 'admin.settings'
  | 'audit.read'
  | 'emergency.control';

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  [UserRole.SUPER_ADMIN]: [
    'devices.read', 'devices.create', 'devices.update', 'devices.delete', 'devices.control', 'devices.transfer',
    'telemetry.read', 'farms.manage', 'users.read', 'users.update', 'users.disable',
    'admin.settings', 'audit.read', 'emergency.control'
  ],
  [UserRole.ADMIN]: [
    'devices.read', 'devices.create', 'devices.update', 'devices.delete', 'devices.control', 'devices.transfer',
    'telemetry.read', 'farms.manage', 'users.read', 'users.update', 'users.disable',
    'admin.settings', 'audit.read', 'emergency.control'
  ],
  [UserRole.SUPPORT_ADMIN]: [
    'devices.read', 'devices.control', 'telemetry.read', 'farms.manage', 'users.read', 'audit.read'
  ],
  [UserRole.TECHNICIAN]: [
    'devices.read', 'devices.create', 'devices.update', 'devices.control', 'telemetry.read'
  ],
  [UserRole.USER]: [
    'devices.read', 'devices.create', 'devices.update', 'devices.delete', 'devices.control',
    'telemetry.read', 'farms.manage'
  ],
  [UserRole.FARM_OWNER]: [
    'devices.read', 'devices.create', 'devices.update', 'devices.delete', 'devices.control',
    'telemetry.read', 'farms.manage'
  ],
  [UserRole.MANAGER]: [
    'devices.read', 'devices.update', 'devices.control', 'telemetry.read', 'farms.manage'
  ],
  [UserRole.OPERATOR]: [
    'devices.read', 'devices.control', 'telemetry.read'
  ],
  [UserRole.VIEWER]: [
    'devices.read', 'telemetry.read'
  ],
  [UserRole.GUEST]: [
    'devices.read', 'telemetry.read'
  ]
};

export interface Account {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  status: 'ACTIVE' | 'SUSPENDED' | 'DISABLED';
  maxDevices: number;
  maxUsers: number;
  maxTelemetryRate: number; // packets/min
  createdAt: string;
  updatedAt: string;
}

export interface AccountMembership {
  id: string;
  accountId: string;
  userId: string;
  role: UserRole;
  createdAt: string;
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

export enum CommandStatus {
  COMMAND_REQUESTED = 'COMMAND_REQUESTED',
  COMMAND_SENT = 'COMMAND_SENT',
  COMMAND_ACKNOWLEDGED = 'COMMAND_ACKNOWLEDGED',
  STATE_UPDATED = 'STATE_UPDATED',
  STATE_CONFIRMED = 'STATE_CONFIRMED',
  FAILED = 'FAILED'
}

export interface DeviceCommand {
  commandId: string;
  deviceId: string;
  accountId?: string;
  userId: string;
  userEmail: string;
  farmId: string;
  zoneId: string;
  commandType: 'START_PUMP' | 'STOP_PUMP' | 'OPEN_VALVE' | 'CLOSE_VALVE' | 'SET_DURATION' | 'REBOOT_NODE';
  requestedValue?: any;
  status: CommandStatus;
  version: number;
  createdAt: string;
  sentAt?: string;
  acknowledgedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  accountId?: string;
  actorId?: string;
  actorRole?: UserRole;
  action: string;
  resource: string;
  targetType?: string;
  targetId?: string;
  ipAddress: string;
  userAgent?: string;
  details: Record<string, any>;
  status: 'SUCCESS' | 'FAILURE' | 'DENIED';
}

export interface BoardPinDefinition {
  pinName: string;
  gpioNumber: string;
  supportedModes: ('ANALOG_IN' | 'DIGITAL_IO' | 'PWM' | 'I2C' | 'SPI')[];
  recommendedFor?: string;
}

export interface IoTBoardDefinition {
  boardId: string;
  name: string;
  family: 'ESP32' | 'ESP8266';
  chip: string;
  architecture: string;
  flashSizeMb: number;
  ramSizeKb: number;
  gpioCount: number;
  adcChannels: number;
  wifiSupport: boolean;
  bluetoothSupport: boolean;
  mqttSupport: boolean;
  tlsSupport: boolean;
  arduinoCore: string;
  boardManagerUrl: string;
  wifiHeader: '<WiFi.h>' | '<ESP8266WiFi.h>';
  requiredLibraries: string[];
  recommendedPins: {
    soilMoisturePin: string;
    dhtPin: string;
    relayPumpPin: string;
    flowRatePin: string;
    pirMotionPin: string;
  };
  validPins: BoardPinDefinition[];
}

export interface FirmwareGenerationRequest {
  deviceId: string;
  boardId: string;
  wifiSsid: string;
  wifiPass: string;
  mqttBrokerHost: string;
  mqttPort: number;
  soilMoisturePin: string;
  dhtPin: string;
  relayPumpPin: string;
  flowRatePin: string;
  pirMotionPin: string;
  dhtType: 'DHT11' | 'DHT22';
}

export interface TelemetryReading {
  deviceId: string;
  farmId: string;
  zoneId: string;
  timestamp: string; // ISO 8601
  messageId?: string;
  sequenceNumber?: number;
  
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
  accountId?: string;
  farmId: string;
  zoneId: string;
  ownerId: string;
  mqttTopic: string;
  authCode?: string;
  lastSeen: string;
  batteryLevel: number;
  signalRssi: number;
  boardId?: string;
  boardFamily?: 'ESP32' | 'ESP8266';
  otaStatus: 'IDLE' | 'DOWNLOADING' | 'APPLYING' | 'SUCCESS' | 'FAILED';
  location: {
    lat: number;
    lng: number;
    elevation: number;
  };
  sensorsAttached: string[];
  createdBy?: string;
}

export interface DeviceTransferRecord {
  id: string;
  deviceId: string;
  deviceSerialNumber: string;
  previousAccountId: string;
  newAccountId: string;
  transferredByAdminId: string;
  transferredByAdminEmail: string;
  reason?: string;
  timestamp: string;
}

export interface DeviceCapabilities {
  deviceId: string;
  deviceSerialNumber: string;
  firmwareVersion: string;
  sensors: {
    id: string;
    type: 'SOIL_MOISTURE' | 'TEMPERATURE' | 'HUMIDITY' | 'WATER_FLOW' | 'PIR_MOTION' | 'TANK_LEVEL';
    name: string;
    unit: string;
    dataType: 'number' | 'boolean';
  }[];
  actuators: {
    id: string;
    type: 'PUMP' | 'VALVE' | 'SIREN';
    name: string;
    currentStatus: string;
  }[];
}

export interface IoTConnectionDiagnostics {
  internet: 'CONNECTED' | 'DISCONNECTED';
  mqttBroker: 'CONNECTED' | 'DISCONNECTED' | 'RECONNECTING';
  mqttAuth: 'VALID' | 'INVALID';
  deviceConnection: 'ONLINE' | 'OFFLINE' | 'PARTIAL';
  lastTelemetrySeen: string;
  lastCommandAck: string;
  websocketStatus: 'CONNECTED' | 'DISCONNECTED';
  databaseHealth: 'HEALTHY' | 'DEGRADED';
  redisHealth: 'HEALTHY' | 'DEGRADED';
  deviceUptimeSeconds: number;
  rssi: number;
  ipAddress: string;
  details?: string;
}

export interface CommandTraceStep {
  step: string;
  label: string;
  timestamp: string;
  status: 'PENDING' | 'SUCCESS' | 'FAILED';
  payload?: any;
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
