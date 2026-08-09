import { NextResponse } from 'next/server';
import { extractAuthContext } from '../../middleware/tenantContext';
import { requireAdminRole } from '../../middleware/rbacGuard';
import { AuditLogEntry, UserRole } from '@aether/shared';

const initialAuditLogs: AuditLogEntry[] = [
  {
    id: 'audit-001',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    userId: 'admin',
    userName: 'System Administrator',
    userRole: UserRole.SUPER_ADMIN,
    accountId: 'account-system-admin',
    actorId: 'admin',
    actorRole: UserRole.SUPER_ADMIN,
    action: 'ADMIN_BOOTSTRAP_INITIALIZED',
    resource: 'SYSTEM_AUTH',
    targetType: 'PLATFORM',
    targetId: 'SYSTEM',
    ipAddress: '127.0.0.1',
    userAgent: 'AetherSystemBoot',
    details: { message: 'Initial Admin Bootstrap completed with salted hash.' },
    status: 'SUCCESS',
  },
  {
    id: 'audit-002',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    userId: 'usr-admin-01',
    userName: 'Karthik Nataraj',
    userRole: UserRole.SUPER_ADMIN,
    accountId: 'account-farm-alpha',
    actorId: 'usr-admin-01',
    actorRole: UserRole.SUPER_ADMIN,
    action: 'DEVICE_REGISTERED',
    resource: 'esp32-node-zone-1',
    targetType: 'DEVICE',
    targetId: 'esp32-node-zone-1',
    ipAddress: '192.168.1.50',
    userAgent: 'AetherCropWeb/1.0',
    details: { board: 'esp32-devkit-v1', farmId: 'farm-alpha', zoneId: 'zone-1' },
    status: 'SUCCESS',
  },
];

export async function GET(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  const url = new URL(req.url);
  const search = (url.searchParams.get('q') || '').toLowerCase();
  const actionFilter = url.searchParams.get('action');

  let filtered = [...initialAuditLogs];

  if (actionFilter) {
    filtered = filtered.filter((log) => log.action === actionFilter);
  }

  if (search) {
    filtered = filtered.filter(
      (log) =>
        log.userName.toLowerCase().includes(search) ||
        log.action.toLowerCase().includes(search) ||
        log.resource.toLowerCase().includes(search) ||
        log.ipAddress.includes(search)
    );
  }

  return NextResponse.json({
    success: true,
    total: filtered.length,
    auditLogs: filtered,
  });
}
