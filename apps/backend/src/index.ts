import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { WebSocketServer, WebSocket as WsClient } from 'ws';
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

// Dedicated Native WebSocket Server for Hardware & Web Browser Direct Links
const rawWss = new WebSocketServer({ server, path: '/ws/iot' });
const connectedHardwareWs = new Map<string, WsClient>();

rawWss.on('connection', (ws: WsClient, req) => {
  console.log(`[Raw WebSocket] IoT Client Connected from ${req.socket.remoteAddress}`);

  ws.send(JSON.stringify({
    type: 'CONNECTION_ACK',
    gateway: 'AetherCrop IoT WebSocket Gateway',
    timestamp: new Date().toISOString()
  }));

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`[Raw WebSocket RX]:`, data);

      if (data.type === 'REGISTER' || data.type === 'IDENTIFY') {
        const id = data.deviceId || data.serialNumber || 'ESP32-NODE';
        connectedHardwareWs.set(id, ws);
        ws.send(JSON.stringify({ type: 'REGISTER_OK', deviceId: id }));
      } else if (data.type === 'TELEMETRY' || data.soilMoisture !== undefined) {
        const reading: TelemetryReading = {
          deviceId: data.deviceId || 'node-01',
          farmId: data.farmId || 'farm-alpha',
          zoneId: data.zoneId || 'zone-1',
          timestamp: new Date().toISOString(),
          soilMoisture: data.soilMoisture !== undefined ? data.soilMoisture : 50,
          soilTemperature: 24.5,
          airTemperature: data.airTemperature !== undefined ? data.airTemperature : 28,
          humidity: data.humidity !== undefined ? data.humidity : 60,
          ec: 1.2,
          ph: 6.8,
          waterFlowRate: data.waterFlowRate !== undefined ? data.waterFlowRate : 0,
          waterPressure: 45,
          tankLevelPercent: 88,
          nitrogen: 45,
          phosphorus: 22,
          potassium: 180,
          rainRate: 0,
          windSpeed: 8.5,
          windDirection: 180,
          solarIrradiance: 750,
          uvIndex: 5,
          leafWetness: 12,
          solarVoltage: 5.2,
          batteryLevelPercent: data.batteryLevel !== undefined ? data.batteryLevel : 98,
          signalRssi: data.rssi !== undefined ? data.rssi : -45
        };
        TelemetryService.getInstance().recordReading(reading);
        io.emit('telemetry:stream', reading);
      } else if (data.type === 'PUMP_COMMAND') {
        // Relay to all connected hardware or specific device
        rawWss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WsClient.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      } else if (data.type === 'SET_WIFI') {
        // Broadcast to target device
        rawWss.clients.forEach((client) => {
          if (client !== ws && client.readyState === WsClient.OPEN) {
            client.send(JSON.stringify(data));
          }
        });
      }
    } catch (e) {
      console.warn('[Raw WebSocket Error Parsing Message]', e);
    }
  });

  ws.on('close', () => {
    console.log(`[Raw WebSocket] IoT Client Disconnected`);
  });
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

// -------------------------------------------------------------
// WiFi Provisioning Endpoints
// -------------------------------------------------------------
app.post('/api/v1/devices/wifi-provision', (req, res) => {
  const { serialNumber, ssid, password, authCode } = req.body;
  if (!serialNumber || !ssid) {
    return res.status(400).json({
      success: false,
      error: 'serialNumber and ssid are required for WiFi provisioning.'
    });
  }

  const record = deviceManager.recordWifiProvision(serialNumber, ssid, authCode);
  auditService.logAction(
    'usr-admin-01',
    'Alex Mercer',
    UserRole.SUPER_ADMIN,
    'WIFI_PROVISION',
    serialNumber,
    { serialNumber, ssid, status: record.status }
  );

  res.status(200).json({
    success: true,
    message: `WiFi configuration for '${ssid}' recorded. Firmware writing to NVS flash...`,
    provisionRecord: record
  });
});

app.get('/api/v1/devices/wifi-status', (req, res) => {
  const { serialNumber } = req.query;
  if (serialNumber && typeof serialNumber === 'string') {
    const record = deviceManager.getWifiProvisionRecordBySerial(serialNumber);
    if (!record) {
      return res.status(404).json({ success: false, message: 'No provisioning record found for serialNumber.' });
    }
    return res.json({ success: true, record });
  }
  res.json({ success: true, records: deviceManager.getWifiProvisionRecords() });
});

app.post('/api/v1/devices/wifi-scan', (req, res) => {
  // Simulated / aggregated WiFi scan response
  res.json({
    success: true,
    timestamp: new Date().toISOString(),
    networks: [
      { ssid: 'Farm_Mesh_WiFi_5G', rssi: -45, secure: true },
      { ssid: 'AetherCrop_Orchard_Ext', rssi: -58, secure: true },
      { ssid: 'AgriTech_Field_Gateway', rssi: -64, secure: true },
      { ssid: 'Guest_Farm_IoT', rssi: -72, secure: false }
    ]
  });
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
