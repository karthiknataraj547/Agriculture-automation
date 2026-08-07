import aedes from 'aedes';
import net from 'net';
import { Server as SocketIOServer } from 'socket.io';
import { TelemetryService } from './telemetry.service';
import { RulesEngine } from './rules.engine';
import { IoTDeviceManager } from './device.manager';
import { TelemetryReading } from '@aether/shared';

export class MqttGatewayService {
  private static instance: MqttGatewayService;
  private aedesBroker: aedes.Aedes;
  private server: net.Server | null = null;
  private io: SocketIOServer | null = null;

  private telemetryService = TelemetryService.getInstance();
  private rulesEngine = RulesEngine.getInstance();
  private deviceManager = IoTDeviceManager.getInstance();

  private constructor() {
    this.aedesBroker = new aedes.Aedes();
  }

  public static getInstance(): MqttGatewayService {
    if (!MqttGatewayService.instance) {
      MqttGatewayService.instance = new MqttGatewayService();
    }
    return MqttGatewayService.instance;
  }

  public start(port = 1883, ioInstance?: SocketIOServer): void {
    if (ioInstance) {
      this.io = ioInstance;
    }

    // Client connection logger & authentication
    this.aedesBroker.on('client', (client) => {
      console.log(`[MQTT Broker] Hardware Node connected: ${client.id}`);
    });

    this.aedesBroker.on('clientDisconnect', (client) => {
      console.log(`[MQTT Broker] Hardware Node disconnected: ${client.id}`);
    });

    // Ingest published telemetry packets from hardware devices
    this.aedesBroker.on('publish', (packet, client) => {
      if (!client) return; // Ignore internal broker messages

      const topic = packet.topic;
      const payloadStr = packet.payload.toString();

      // Look for telemetry topics matching pattern: aether/+/+/telemetry
      if (topic.includes('/telemetry')) {
        try {
          const payload = JSON.parse(payloadStr);
          const { deviceId, authCode, zoneId, soilMoisture, airTemperature, humidity, waterFlowRate } = payload;

          if (deviceId && authCode) {
            const isValid = this.deviceManager.verifyDeviceAuthCode(deviceId, authCode);
            if (!isValid) {
              console.warn(`[MQTT Broker] Rejected unauthorized telemetry from device: ${deviceId}`);
              return;
            }
          }

          const reading: TelemetryReading = {
            deviceId: deviceId || client.id,
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
            tankLevelPercent: Number(payload.tankLevelPercent ?? 85),
            nitrogen: 120,
            phosphorus: 45,
            potassium: 110,
            rainRate: Number(payload.rainRate ?? 0),
            windSpeed: 8,
            windDirection: 180,
            solarIrradiance: 750,
            uvIndex: 5,
            leafWetness: 12,
            solarVoltage: 13.8,
            batteryLevelPercent: Number(payload.batteryLevelPercent ?? 95),
            signalRssi: -55,
            timestamp: new Date().toISOString()
          };

          this.telemetryService.recordReading(reading);
          const ruleLogs = this.rulesEngine.evaluateReading(reading);

          // Broadcast live MQTT telemetry directly to Web Tool (Socket.IO)
          if (this.io) {
            this.io.emit('telemetry:stream', reading);
            if (ruleLogs.length > 0) {
              this.io.emit('rules:triggered', ruleLogs);
            }
            const aggregated = this.telemetryService.getAggregatedStats('farm-alpha');
            this.io.emit('telemetry:aggregated', aggregated);
          }

          console.log(`[MQTT Broker] Telemetry processed from ${topic} (Soil: ${reading.soilMoisture}%)`);
        } catch (err) {
          console.error(`[MQTT Broker] Failed to parse payload from ${topic}:`, err);
        }
      }
    });

    // Start TCP Server on Port 1883
    this.server = net.createServer(this.aedesBroker.handle);
    this.server.listen(port, () => {
      console.log(`=================================================================`);
      console.log(`  AETHERCROP EMBEDDED MQTT BROKER ACTIVE                          `);
      console.log(`  TCP Port: ${port} (Standard MQTT for ESP32 / Arduino / Pi)    `);
      console.log(`=================================================================`);
    });
  }

  // Send actuation commands from Web Tool directly to physical hardware MQTT topics
  public publishActuationCommand(topic: string, payload: object): void {
    const message = JSON.stringify(payload);
    this.aedesBroker.publish(
      {
        cmd: 'publish',
        qos: 1,
        topic,
        payload: Buffer.from(message),
        retain: false,
        dup: false
      },
      (err) => {
        if (err) {
          console.error(`[MQTT Broker] Failed to publish actuation to ${topic}:`, err);
        } else {
          console.log(`[MQTT Broker] Published actuation command to ${topic}: ${message}`);
        }
      }
    );
  }
}
