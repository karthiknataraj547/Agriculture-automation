import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useSpatialStore } from '../store/useSpatialStore';
import { TelemetryReading } from '@aether/shared';

let socket: Socket | null = null;

export function useWebSocketFeed() {
  const {
    updateTelemetryStream,
    setAggregatedStats,
    setDevices,
    setInsights,
    setRules
  } = useSpatialStore();

  useEffect(() => {
    // Connect to backend WebSocket gateway
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
    socket = io(backendUrl, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('[WebSocket Client] Connected to Aether Spatial IoT Gateway');
    });

    socket.on('telemetry:stream', (reading: TelemetryReading) => {
      updateTelemetryStream(reading);
    });

    socket.on('telemetry:snapshot', (readings: TelemetryReading[]) => {
      readings.forEach((r) => updateTelemetryStream(r));
    });

    socket.on('telemetry:aggregated', (stats) => {
      setAggregatedStats(stats);
    });

    socket.on('devices:list', (devices) => {
      setDevices(devices);
    });

    socket.on('insights:list', (insights) => {
      setInsights(insights);
    });

    socket.on('rules:list', (rules) => {
      setRules(rules);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);

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
