import { NextResponse } from 'next/server';
import { extractAuthContext } from '../../middleware/tenantContext';
import { requireAdminRole } from '../../middleware/rbacGuard';

const CLOUD_DB_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fddd0e4790cf7';

async function fetchUsers() {
  try {
    const res = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    if (res.ok) {
      const json: any = await res.json();
      if (json?.data?.users) return json.data.users;
    }
  } catch (e) {
    console.error('[Admin Users] Fetch error:', e);
  }
  return [];
}

async function saveUsers(users: any[]) {
  try {
    const getRes = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    const existingJson = getRes.ok ? await getRes.json() : {};
    const existingData = existingJson?.data || {};

    const putRes = await fetch(CLOUD_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aether Users DB',
        data: { ...existingData, users },
      }),
    });
    return putRes.ok;
  } catch (e) {
    console.error('[Admin Users] Save error:', e);
    return false;
  }
}

export async function GET(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  const users = await fetchUsers();
  const sanitizedUsers = users.map((u: any) => {
    const { passwordHash, salt, password, ...rest } = u;
    return rest;
  });

  return NextResponse.json({
    success: true,
    total: sanitizedUsers.length,
    users: sanitizedUsers,
  });
}

export async function POST(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  try {
    const { action, userId, role, status } = await req.json();
    const users = await fetchUsers();
    const targetUser = users.find((u: any) => u.id === userId);

    if (!targetUser) {
      return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
    }

    if (action === 'TOGGLE_STATUS') {
      targetUser.status = status || (targetUser.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED');
      await saveUsers(users);
      return NextResponse.json({
        success: true,
        message: `User ${targetUser.email} status updated to ${targetUser.status}.`,
        user: targetUser,
      });
    }

    if (action === 'UPDATE_ROLE') {
      targetUser.role = role;
      await saveUsers(users);
      return NextResponse.json({
        success: true,
        message: `User ${targetUser.email} role updated to ${role}.`,
        user: targetUser,
      });
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
