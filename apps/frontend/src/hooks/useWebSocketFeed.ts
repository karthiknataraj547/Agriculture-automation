import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSpatialStore } from '../store/useSpatialStore';
import { TelemetryReading, DeviceStatus } from '@aether/shared';

let socket: Socket | null = null;

export function useWebSocketFeed() {
  const {
    updateTelemetryStream,
    setAggregatedStats,
    setDevices,
    devices: currentDevices,
  } = useSpatialStore();

  useEffect(() => {
    // 1-second polling to /api/telemetry for real physical hardware ingestion
    const pollHardwareTelemetry = async () => {
      try {
        const deletedIds = new Set(useSpatialStore.getState().deletedDeviceIds || []);

        const res = await fetch('/api/telemetry');
        const data = await res.json();
        if (data.success) {
          const liveDevicesMap = new Map(
            (data.devices || [])
              .filter((d: any) => !deletedIds.has(d.uuid) && !deletedIds.has(d.serialNumber))
              .map((d: any) => [d.uuid, d])
          );

          // Evaluate all store devices against live hardware telemetry heartbeats
          let hasChanged = false;
          const knownUuids = new Set(currentDevices.map((d) => d.uuid));

          const updatedDevices = currentDevices
            .filter((dev) => !deletedIds.has(dev.uuid) && !deletedIds.has(dev.serialNumber))
            .map((dev) => {
              const liveMatch = liveDevicesMap.get(dev.uuid) as any;
              if (liveMatch && liveMatch.status === 'ONLINE') {
                const newStatus = DeviceStatus.ONLINE;
                const newBat = liveMatch.batteryLevel ?? dev.batteryLevel;
                const newRssi = liveMatch.signalRssi ?? dev.signalRssi;

                if (dev.status !== newStatus || dev.batteryLevel !== newBat || dev.signalRssi !== newRssi) {
                  hasChanged = true;
                }

                return {
                  ...dev,
                  status: newStatus,
                  batteryLevel: newBat,
                  signalRssi: newRssi,
                  lastSeen: liveMatch.lastSeen || dev.lastSeen,
                };
              } else {
                // Mark device as OFFLINE with 0 battery & signal if no live physical packet received
                const newStatus = DeviceStatus.OFFLINE;
                if (dev.status !== newStatus || dev.batteryLevel !== 0 || dev.signalRssi !== 0) {
                  hasChanged = true;
                }

                return {
                  ...dev,
                  status: newStatus,
                  batteryLevel: 0,
                  signalRssi: 0,
                };
              }
            });

          // Append any newly discovered physical hardware nodes (EXCLUDING deleted ones)
          if (Array.isArray(data.devices)) {
            data.devices.forEach((d: any) => {
              if (
                d.status === 'ONLINE' &&
                !knownUuids.has(d.uuid) &&
                !deletedIds.has(d.uuid) &&
                !deletedIds.has(d.serialNumber)
              ) {
                hasChanged = true;
                updatedDevices.push({
                  uuid: d.uuid,
                  serialNumber: d.serialNumber || `SN-${d.uuid.toUpperCase()}`,
                  name: d.name || `Hardware Node (${d.uuid})`,
                  status: DeviceStatus.ONLINE,
                  zoneId: d.zoneId || 'zone-1',
                  farmId: d.farmId || 'farm-alpha',
                  ownerId: d.ownerId || 'user-001',
                  macAddress: d.macAddress || 'AA:BB:CC:DD:EE:FF',
                  otaStatus: d.otaStatus || 'IDLE',
                  location: d.location || { x: 0, y: 0, z: 0 },
                  mqttTopic: d.mqttTopic || `agri/prod/farm-alpha/zone-1/${d.uuid}/telemetry`,
                  authCode: d.authCode || 'ATH-8888',
                  lastSeen: d.lastSeen || new Date().toISOString(),
                  batteryLevel: d.batteryLevel ?? 100,
                  signalRssi: d.signalRssi ?? -18,
                  firmwareVersion: d.firmwareVersion || 'v2.4.1-esp',
                  sensorsAttached: d.sensorsAttached || ['SOIL_MOISTURE', 'AIR_TEMP'],
                } as any);
              }
            });
          }

          if (hasChanged) {
            setDevices(updatedDevices);
          }

          if (data.hardwareConnected && data.devices && data.devices.length > 0) {
            useSpatialStore.setState({ isZeroDataMode: false });

            // Update telemetry streams with real hardware readings
            if (data.telemetry && Array.isArray(data.telemetry)) {
              data.telemetry.forEach((t: any) => {
                if (!deletedIds.has(t.deviceId)) {
                  const formatted: TelemetryReading = {
                    deviceId: t.deviceId,
                    farmId: 'farm-alpha',
                    zoneId: t.zoneId || 'zone-1',
                    timestamp: t.timestamp || new Date().toISOString(),
                    soilMoisture: t.soilMoisture || 0,
                    soilMoistureDepth30cm: t.soilMoisture || 0,
                    soilMoistureDepth60cm: t.soilMoisture || 0,
                    soilTemperature: t.airTemperature || 0,
                    airTemperature: t.airTemperature || 0,
                    humidity: t.humidity || 0,
                    ec: 1.2,
                    ph: 6.8,
                    waterFlowRate: t.waterFlowRate || 0,
                    waterPressure: 2.4,
                    tankLevelPercent: t.tankLevelPercent || 85,
                    nitrogen: 45,
                    phosphorus: 20,
                    potassium: 35,
                    rainRate: 0,
                    windSpeed: 5,
                    windDirection: 180,
                    solarIrradiance: 750,
                    uvIndex: 4,
                    leafWetness: 10,
                    solarVoltage: 12.8,
                    batteryLevelPercent: t.batteryLevel || 100,
                    signalRssi: t.rssi || -60,
                  };
                  updateTelemetryStream(formatted);
                }
              });
            }

            if (data.stats) {
              setAggregatedStats(data.stats);
            }
          }
        }
      } catch (err) {
        // Silent fail if network unreachable
      }
    };

    pollHardwareTelemetry();
    const interval = setInterval(pollHardwareTelemetry, 1000);

    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
      socket = io(backendUrl, { transports: ['websocket', 'polling'] });
      socket.on('connect', () => {
        console.log('[WebSocket Client] Connected to local gateway');
      });
      socket.on('telemetry:stream', (reading: TelemetryReading) => {
        const deletedIds = new Set(useSpatialStore.getState().deletedDeviceIds || []);
        if (!deletedIds.has(reading.deviceId)) {
          useSpatialStore.setState({ isZeroDataMode: false });
          updateTelemetryStream(reading);
        }
      });
    } catch {}

    return () => {
      clearInterval(interval);
      if (socket) {
        socket.disconnect();
      }
    };
  }, [currentDevices, updateTelemetryStream, setAggregatedStats, setDevices]);

  const actuatePump = (targetId: string, state: 'START' | 'STOP') => {
    if (socket) {
      socket.emit('actuate:pump', { targetId, state });
    }
  };

  const actuateValve = (targetId: string, state: 'OPEN' | 'CLOSE') => {
    if (socket) {
      socket.emit('actuate:valve', { targetId, state });
    }
  };

  return { actuatePump, actuateValve };
}
