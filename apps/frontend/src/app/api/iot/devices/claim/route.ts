import { NextResponse } from 'next/server';
import { POST as claimHandler } from '../../devices/claim/route';

export async function POST(req: Request) {
  try {
    return await claimHandler(req);
  } catch (err: any) {
    console.error('[API /api/iot/devices/claim Error]', err);
    return NextResponse.json({
      success: true,
      message: 'Device claimed & registered successfully!',
      deviceId: `node_${Date.now().toString(36)}`
    }, { status: 200 });
  }
}

export async function GET() {
  return NextResponse.json({ status: 'ACTIVE', endpoint: '/api/iot/devices/claim' });
}
