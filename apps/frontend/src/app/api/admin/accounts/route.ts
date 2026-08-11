import { NextResponse } from 'next/server';
import { extractAuthContext } from '../../middleware/tenantContext';
import { requireAdminRole } from '../../middleware/rbacGuard';
import { Account } from '@aether/shared';

const CLOUD_DB_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fe7c738771714';

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

async function fetchAccountsFromCloudDB(): Promise<Account[]> {
  let accounts: Account[] = [];
  try {
    const res = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    if (res.ok) {
      const json: any = await res.json();
      if (json?.data?.accounts && Array.isArray(json.data.accounts)) {
        accounts = json.data.accounts;
      }
      
      const users: any[] = Array.isArray(json?.data?.users) ? json.data.users : [];
      let needsSave = false;
      
      for (const seedAcc of seedAccounts) {
        if (!accounts.some((a) => a.id === seedAcc.id)) {
          accounts.push(seedAcc);
          needsSave = true;
        }
      }

      for (const u of users) {
        const accId = u.accountId || `account-${u.id}`;
        if (!accounts.some((a) => a.id === accId)) {
          accounts.push({
            id: accId,
            name: `${u.name}'s Farm Enterprise`,
            slug: (u.name || 'tenant').toLowerCase().replace(/[^a-z0-9]/g, '-'),
            ownerId: u.id,
            status: 'ACTIVE',
            maxDevices: 50,
            maxUsers: 10,
            maxTelemetryRate: 120,
            createdAt: u.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          needsSave = true;
        }
      }

      if (needsSave) {
        await saveAccountsToCloudDB(accounts);
      }
    }
  } catch (e) {
    console.error('[Admin Accounts] Fetch error:', e);
    accounts = seedAccounts;
  }
  return accounts;
}

async function saveAccountsToCloudDB(accounts: Account[]): Promise<boolean> {
  try {
    const getRes = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    const existingJson = getRes.ok ? await getRes.json() : {};
    const existingData = existingJson?.data || {};

    const putRes = await fetch(CLOUD_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aether Users DB',
        data: {
          ...existingData,
          accounts,
        },
      }),
    });
    return putRes.ok;
  } catch (e) {
    console.error('[Admin Accounts] Save error:', e);
    return false;
  }
}

export async function GET(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  const accounts = await fetchAccountsFromCloudDB();

  return NextResponse.json({
    success: true,
    total: accounts.length,
    accounts,
  });
}

export async function POST(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  try {
    const body = await req.json();
    const { action, id, name, maxDevices, maxUsers, maxTelemetryRate } = body;
    const accounts = await fetchAccountsFromCloudDB();

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

      accounts.push(newAcc);
      await saveAccountsToCloudDB(accounts);
      return NextResponse.json({ success: true, message: 'Tenant Account Created', account: newAcc });
    }

    if (action === 'UPDATE_LIMITS') {
      const acc = accounts.find((a) => a.id === id);
      if (!acc) return NextResponse.json({ success: false, message: 'Account not found' }, { status: 404 });

      if (maxDevices !== undefined) acc.maxDevices = maxDevices;
      if (maxUsers !== undefined) acc.maxUsers = maxUsers;
      if (maxTelemetryRate !== undefined) acc.maxTelemetryRate = maxTelemetryRate;
      acc.updatedAt = new Date().toISOString();

      await saveAccountsToCloudDB(accounts);
      return NextResponse.json({ success: true, message: 'Account limits updated', account: acc });
    }

    return NextResponse.json({ success: false, message: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
