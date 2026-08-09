import { NextResponse } from 'next/server';
import { extractAuthContext } from '../../middleware/tenantContext';
import { requireAdminRole } from '../../middleware/rbacGuard';
import { Account } from '@aether/shared';

const seedAccounts: Account[] = [
  {
    id: 'account-system-admin',
    name: 'Aether Platform Administration',
    slug: 'system-admin',
    ownerId: 'admin',
    status: 'ACTIVE',
    maxDevices: 1000,
    maxUsers: 100,
    maxTelemetryRate: 1000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'account-farm-alpha',
    name: 'Farm Alpha Commercial Enterprise',
    slug: 'farm-alpha',
    ownerId: 'usr-admin-01',
    status: 'ACTIVE',
    maxDevices: 50,
    maxUsers: 10,
    maxTelemetryRate: 120,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'account-farm-beta',
    name: 'Green Valley Organic Farms',
    slug: 'farm-beta',
    ownerId: 'usr-admin-02',
    status: 'ACTIVE',
    maxDevices: 20,
    maxUsers: 5,
    maxTelemetryRate: 60,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let accountsCache: Account[] = seedAccounts;

export async function GET(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  return NextResponse.json({
    success: true,
    total: accountsCache.length,
    accounts: accountsCache,
  });
}

export async function POST(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  try {
    const body = await req.json();
    const { action, id, name, maxDevices, maxUsers, maxTelemetryRate } = body;

    if (action === 'CREATE_ACCOUNT') {
      const newAcc: Account = {
        id: `account-${Date.now().toString(36)}`,
        name: name || 'New Agriculture Tenant',
        slug: (name || 'tenant').toLowerCase().replace(/[^a-z0-9]/g, '-'),
        ownerId: authCtx!.userId,
        status: 'ACTIVE',
        maxDevices: maxDevices || 25,
        maxUsers: maxUsers || 5,
        maxTelemetryRate: maxTelemetryRate || 60,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      accountsCache.push(newAcc);
      return NextResponse.json({ success: true, message: 'Tenant Account Created', account: newAcc });
    }

    if (action === 'UPDATE_LIMITS') {
      const acc = accountsCache.find((a) => a.id === id);
      if (!acc) return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 });

      if (maxDevices !== undefined) acc.maxDevices = maxDevices;
      if (maxUsers !== undefined) acc.maxUsers = maxUsers;
      if (maxTelemetryRate !== undefined) acc.maxTelemetryRate = maxTelemetryRate;
      acc.updatedAt = new Date().toISOString();

      return NextResponse.json({ success: true, message: 'Account limits updated', account: acc });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
