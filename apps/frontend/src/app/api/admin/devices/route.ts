import { NextResponse } from 'next/server';
import { extractAuthContext } from '../../middleware/tenantContext';
import { requireAdminRole } from '../../middleware/rbacGuard';
import { DeviceTransferRecord } from '@aether/shared';

const CLOUD_DB_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fddd0e4790cf7';

let transferAuditLog: DeviceTransferRecord[] = [];

async function fetchStateFromCloudDB() {
  try {
    const res = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    if (res.ok) {
      const json: any = await res.json();
      if (json?.data?.state) return json.data.state;
    }
  } catch (e) {
    console.error('[Admin Devices] Fetch state error:', e);
  }
  return null;
}

async function saveStateToCloudDB(state: any) {
  try {
    const getRes = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    const existingJson = getRes.ok ? await getRes.json() : {};
    const existingData = existingJson?.data || {};

    const putRes = await fetch(CLOUD_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aether State DB',
        data: { ...existingData, state },
      }),
    });
    return putRes.ok;
  } catch (e) {
    console.error('[Admin Devices] Save state error:', e);
    return false;
  }
}

export async function GET(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  const state = await fetchStateFromCloudDB();
  const devices = state?.devices || [];

  return NextResponse.json({
    success: true,
    total: devices.length,
    devices,
    transferHistory: transferAuditLog,
  });
}

export async function POST(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  try {
    const body = await req.json();
    const { action, deviceId, newAccountId, reason } = body;
    const state = (await fetchStateFromCloudDB()) || { devices: [] };
    const devices = state.devices || [];

    const device = devices.find(
      (d: any) => d.uuid === deviceId || d.serialNumber === deviceId || d.id === deviceId
    );

    if (!device) {
      return NextResponse.json({ success: false, message: 'Device not found.' }, { status: 404 });
    }

    if (action === 'TRANSFER_DEVICE') {
      if (!newAccountId) {
        return NextResponse.json({ success: false, message: 'newAccountId is required for transfer.' }, { status: 400 });
      }

      const previousAccountId = device.accountId || 'account-unassigned';
      device.accountId = newAccountId;
      device.updatedAt = new Date().toISOString();

      const transferRecord: DeviceTransferRecord = {
        id: `trf-${Date.now().toString(36)}`,
        deviceId: device.uuid || device.serialNumber,
        deviceSerialNumber: device.serialNumber || device.uuid,
        previousAccountId,
        newAccountId,
        transferredByAdminId: authCtx!.userId,
        transferredByAdminEmail: authCtx!.email,
        reason: reason || 'Administrative tenant reassignment',
        timestamp: new Date().toISOString(),
      };

      transferAuditLog.push(transferRecord);
      await saveStateToCloudDB(state);

      return NextResponse.json({
        success: true,
        message: `Device ${device.serialNumber || device.uuid} successfully transferred to ${newAccountId}.`,
        transferRecord,
        device,
      });
    }

    if (action === 'ROTATE_CREDENTIALS') {
      device.authCode = `ATH-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      await saveStateToCloudDB(state);

      return NextResponse.json({
        success: true,
        message: `Credentials rotated for device ${device.serialNumber || device.uuid}.`,
        authCode: device.authCode,
      });
    }

    if (action === 'TOGGLE_STATUS') {
      device.status = device.status === 'OFFLINE' ? 'ONLINE' : 'OFFLINE';
      await saveStateToCloudDB(state);

      return NextResponse.json({
        success: true,
        message: `Device ${device.serialNumber || device.uuid} status toggled to ${device.status}.`,
        device,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid admin device action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
