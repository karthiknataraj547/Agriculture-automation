import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { TelemetryService } from './services/telemetry.service';
import { RulesEngine } from './services/rules.engine';
import { AiAnalyticsEngine } from './services/ai.analytics';
import { IoTDeviceManager } from './services/device.manager';
import { AuditService } from './services/audit.service';
import { ESP32Simulator } from './services/simulator';
import { UserRole, TelemetryReading } from '@aether/shared';

import { MqttGatewayService } from './services/mqtt.service';

const app = express();
const server = http.createServer(app);

const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 4000;

// Singletons
const telemetryService = TelemetryService.getInstance();
const rulesEngine = RulesEngine.getInstance();
const aiEngine = AiAnalyticsEngine.getInstance();
const deviceManager = IoTDeviceManager.getInstance();
const auditService = AuditService.getInstance();
const mqttGateway = MqttGatewayService.getInstance();

// -------------------------------------------------------------
// WebSocket Gateway
// -------------------------------------------------------------
io.on('connection', (socket) => {
  console.log(`[WebSocket] Spatial UI Client connected: ${socket.id}`);

  // Send initial snapshot
  socket.emit('telemetry:snapshot', telemetryService.getAllLatestReadings());
  socket.emit('devices:list', deviceManager.getAllDevices());
  socket.emit('insights:list', aiEngine.getLatestInsights('farm-alpha'));
  socket.emit('rules:list', rulesEngine.getRules());

  socket.on('actuate:pump', (data) => {
    console.log(`[Actuation] Pump command received:`, data);
    auditService.logAction('usr-admin-01', 'Alex Mercer', UserRole.SUPER_ADMIN, 'ACTUATE_PUMP', data.targetId, data);
    io.emit('actuation:event', { type: 'PUMP', targetId: data.targetId, state: data.state, timestamp: new Date().toISOString() });

    // Publish MQTT Actuation Command to physical microcontrollers
    mqttGateway.publishActuationCommand('aether/farm-alpha/zone-1/pump/command', {
      status: data.state === 'RUNNING' || data.state === 'ON' ? 'RUNNING' : 'STOPPED',
      pumpId: data.targetId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('actuate:valve', (data) => {
    console.log(`[Actuation] Valve command received:`, data);
    auditService.logAction('usr-admin-01', 'Alex Mercer', UserRole.SUPER_ADMIN, 'ACTUATE_VALVE', data.targetId, data);
    io.emit('actuation:event', { type: 'VALVE', targetId: data.targetId, state: data.state, timestamp: new Date().toISOString() });

    // Publish MQTT Actuation Command to physical microcontrollers
    mqttGateway.publishActuationCommand('aether/farm-alpha/zone-1/valve/command', {
      status: data.state === 'OPEN' || data.state === 'ON' ? 'OPEN' : 'CLOSED',
      valveId: data.targetId,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('disconnect', () => {
    console.log(`[WebSocket] Spatial UI Client disconnected: ${socket.id}`);
  });
});

// Start ESP32 IoT Simulator & Broadcast to Socket.io
ESP32Simulator.start((reading, ruleLogs) => {
  io.emit('telemetry:stream', reading);
  if (ruleLogs.length > 0) {
    io.emit('rules:triggered', ruleLogs);
  }
  const aggregated = telemetryService.getAggregatedStats('farm-alpha');
  io.emit('telemetry:aggregated', aggregated);
});

// -------------------------------------------------------------
// REST API Gateway Routes
// -------------------------------------------------------------

// System Health & Gateway Info
app.get('/api/v1/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    version: '1.0.0-pro',
    services: {
      mqttBroker: 'CONNECTED',
      timescaleDb: 'ACTIVE',
      rulesEngine: 'OPERATIONAL',
      aiAnalytics: 'ONLINE',
      simulator: 'RUNNING'
    },
    uptimeSeconds: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

// Telemetry Endpoints
app.post('/api/v1/telemetry/ingest', (req, res) => {
  const { deviceId, authCode, zoneId, soilMoisture, airTemperature, humidity, waterFlowRate, tankLevelPercent } = req.body;

  if (!deviceId || !authCode) {
    return res.status(400).json({ error: 'deviceId and authCode are required.' });
  }

  const isValid = deviceManager.verifyDeviceAuthCode(deviceId, authCode);
  if (!isValid) {
    return res.status(401).json({ error: 'Unauthorized: Invalid Auth Code for hardware node.' });
  }

  const reading: TelemetryReading = {
    deviceId,
    farmId: 'farm-alpha',
    zoneId: zoneId || 'zone-1',
    soilMoisture: Number(soilMoisture ?? 45),
    soilTemperature: 22,
    airTemperature: Number(airTemperature ?? 28),
    humidity: Number(humidity ?? 60),
    ph: 6.8,
    ec: 1.4,
    waterFlowRate: Number(waterFlowRate ?? 0),
    waterPressure: 42,
    tankLevelPercent: Number(tankLevelPercent ?? 85),
    nitrogen: 120,
    phosphorus: 45,
    potassium: 110,
    rainRate: Number(req.body.rainRate ?? 0),
    windSpeed: 8,
    windDirection: 180,
    solarIrradiance: 750,
    uvIndex: 5,
    leafWetness: 12,
    solarVoltage: 13.8,
    batteryLevelPercent: Number(req.body.batteryLevelPercent ?? 95),
    signalRssi: -58,
    timestamp: new Date().toISOString()
  };

  telemetryService.recordReading(reading);
  const ruleLogs = rulesEngine.evaluateReading(reading);

  io.emit('telemetry:stream', reading);
  if (ruleLogs.length > 0) {
    io.emit('rules:triggered', ruleLogs);
  }
  const aggregated = telemetryService.getAggregatedStats('farm-alpha');
  io.emit('telemetry:aggregated', aggregated);

  res.status(200).json({ status: 'INGESTED', reading, rulesTriggered: ruleLogs.length });
});

app.get('/api/v1/telemetry/latest', (req, res) => {
  res.json(telemetryService.getAllLatestReadings());
});

app.get('/api/v1/telemetry/history/:zoneId', (req, res) => {
  const { zoneId } = req.params;
  const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
  res.json(telemetryService.getHistoryForZone(zoneId, limit));
});

app.get('/api/v1/telemetry/stats/:farmId', (req, res) => {
  const { farmId } = req.params;
  res.json(telemetryService.getAggregatedStats(farmId));
});

// Device Endpoints
app.get('/api/v1/devices', (req, res) => {
  res.json(deviceManager.getAllDevices());
});

app.post('/api/v1/devices/register', (req, res) => {
  const device = deviceManager.registerOrUpdateDevice(req.body);
  auditService.logAction('usr-admin-01', 'Alex Mercer', UserRole.SUPER_ADMIN, 'REGISTER_DEVICE', device.uuid, device);
  io.emit('devices:list', deviceManager.getAllDevices());
  res.status(201).json(device);
});

app.post('/api/v1/devices/verify-auth', (req, res) => {
  const { serialNumber, authCode } = req.body;
  if (!serialNumber || !authCode) {
    return res.status(400).json({ authenticated: false, error: 'serialNumber and authCode are required.' });
  }

  const isValid = deviceManager.verifyDeviceAuthCode(serialNumber, authCode);
  if (isValid) {
    return res.json({ authenticated: true, status: 'CONNECTED', message: 'Device hardware paired successfully.' });
  } else {
    return res.status(401).json({ authenticated: false, status: 'REJECTED', error: 'Invalid Auth Code for device.' });
  }
});

// Rules Engine Endpoints
app.get('/api/v1/rules', (req, res) => {
  res.json(rulesEngine.getRules());
});

app.post('/api/v1/rules', (req, res) => {
  rulesEngine.addRule(req.body);
  auditService.logAction('usr-admin-01', 'Alex Mercer', UserRole.SUPER_ADMIN, 'CREATE_RULE', req.body.id || 'new-rule', req.body);
  io.emit('rules:list', rulesEngine.getRules());
  res.status(201).json(req.body);
});

// AI Analytics Endpoints
app.get('/api/v1/ai/insights/:farmId', (req, res) => {
  res.json(aiEngine.getLatestInsights(req.params.farmId));
});

app.post('/api/v1/ai/chat', (req, res) => {
  const { question, farmContext } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'Question parameter is required.' });
  }
  const result = aiEngine.askLocalAgronomistAI(question, farmContext);
  res.json(result);
});

// Security & Audit Endpoints
app.get('/api/v1/audit/logs', (req, res) => {
  res.json(auditService.getLogs());
});

server.listen(PORT, () => {
  mqttGateway.start(1883, io);
  console.log(`=================================================================`);
  console.log(`  AETHERCROP / TERRAPULSE SPATIAL IOT BACKEND GATEWAY ACTIVE    `);
  console.log(`  Port: ${PORT}`);
  console.log(`  WebSocket Gateway: ws://localhost:${PORT}`);
  console.log(`  MQTT Broker: mqtt://localhost:1883 (ESP32/Arduino/Pi Hardware)  `);
  console.log(`=================================================================`);
});
