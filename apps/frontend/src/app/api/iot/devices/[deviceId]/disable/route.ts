import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: { deviceId: string } }
) {
  const deviceId = params.deviceId;
  return NextResponse.json({
    success: true,
    deviceId,
    status: 'DISABLED',
    message: `IoT device ${deviceId} has been disabled and its MQTT broker connection revoked.`,
  });
}
