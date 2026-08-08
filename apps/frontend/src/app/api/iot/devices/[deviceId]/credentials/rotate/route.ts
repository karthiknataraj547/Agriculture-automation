import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: { deviceId: string } }
) {
  const deviceId = params.deviceId;
  const newAuthCode = `ATH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
  const newMqttPassword = `pwd_sec_${Math.random().toString(36).substring(2, 10)}`;

  return NextResponse.json({
    success: true,
    deviceId,
    credentials: {
      mqttUsername: `usr_${deviceId}`,
      mqttPassword: newMqttPassword,
      authCode: newAuthCode,
      rotatedAt: new Date().toISOString(),
    },
    message: `Secure MQTT credentials for ${deviceId} have been successfully rotated.`,
  });
}
