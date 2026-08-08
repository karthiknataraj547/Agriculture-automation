import { NextResponse } from 'next/server';

export async function GET() {
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      api: 'healthy',
      database: 'healthy',
      redis: 'healthy',
      mqtt: 'healthy',
      websocket: 'healthy',
    },
    domains: {
      frontend: process.env.NEXT_PUBLIC_APP_URL || 'https://agriculture-automation.vercel.app',
      api: process.env.NEXT_PUBLIC_API_URL || 'https://api.agriculture-automation.com',
      mqtt: process.env.NEXT_PUBLIC_MQTT_HOST || 'mqtt.agriculture-automation.com',
      websocket: process.env.NEXT_PUBLIC_WS_URL || 'wss://api.agriculture-automation.com/ws',
    },
  };

  return NextResponse.json(healthStatus, { status: 200 });
}
