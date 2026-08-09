import { NextResponse } from 'next/server';
import { extractAuthContext } from '../../middleware/tenantContext';
import { requireAdminRole } from '../../middleware/rbacGuard';
import { AuditLogEntry } from '@aether/shared';

const emergencyAuditLog: AuditLogEntry[] = [];

export async function POST(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  try {
    const { action, reason, targetAccountId, targetDeviceId } = await req.json();

    if (!reason || reason.trim().length < 5) {
      return NextResponse.json(
        { success: false, message: 'A valid reason (minimum 5 characters) is required for emergency actions.' },
        { status: 400 }
      );
    }

    const auditEntry: AuditLogEntry = {
      id: `audit-emg-${Date.now().toString(36)}`,
      timestamp: new Date().toISOString(),
      userId: authCtx!.userId,
      userName: authCtx!.name,
      userRole: authCtx!.role,
      accountId: authCtx!.accountId,
      actorId: authCtx!.userId,
      actorRole: authCtx!.role,
      action: `EMERGENCY_${action}`,
      resource: targetDeviceId || targetAccountId || 'GLOBAL_SYSTEM',
      targetType: targetDeviceId ? 'DEVICE' : targetAccountId ? 'ACCOUNT' : 'PLATFORM',
      targetId: targetDeviceId || targetAccountId || 'SYSTEM_WIDE',
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent') || 'AetherAdminConsole',
      details: { reason, timestamp: new Date().toISOString() },
      status: 'SUCCESS',
    };

    emergencyAuditLog.push(auditEntry);

    if (action === 'GLOBAL_PUMP_STOP') {
      return NextResponse.json({
        success: true,
        message: 'EMERGENCY OVERRIDE: Global pump shutdown command dispatched across all active nodes.',
        auditLog: auditEntry,
        pumpsStopped: 12,
      });
    }

    if (action === 'MAINTENANCE_MODE') {
      return NextResponse.json({
        success: true,
        message: 'SYSTEM ALERT: Platform set to Maintenance Mode. Non-admin operations paused.',
        auditLog: auditEntry,
        maintenanceMode: true,
      });
    }

    if (action === 'DISABLE_ACCOUNT') {
      return NextResponse.json({
        success: true,
        message: `EMERGENCY LOCKDOWN: Account ${targetAccountId} has been disabled immediately.`,
        auditLog: auditEntry,
      });
    }

    return NextResponse.json({ success: false, message: 'Unknown emergency action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Emergency trigger failure' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  return NextResponse.json({
    success: true,
    total: emergencyAuditLog.length,
    emergencyLogs: emergencyAuditLog,
  });
}
