import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: { deviceId: string } }
) {
  const deviceId = params.deviceId;
  return NextResponse.json({
    success: true,
    deviceId,
    status: 'ONLINE',
    message: `IoT device ${deviceId} has been enabled and reactivated.`,
  });
}
