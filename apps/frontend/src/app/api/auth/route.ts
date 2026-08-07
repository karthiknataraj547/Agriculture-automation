import { NextResponse } from 'next/server';

export interface GlobalUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
}

const CLOUD_DB_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fddd0e4790cf7';

// Ultra-fast in-memory cache
let usersCache: GlobalUser[] = [
  {
    id: 'usr-admin-01',
    name: 'Karthik Nataraj',
    email: 'karthiknataraj547@gmail.com',
    password: 'password123',
    role: 'Farm Owner & System Administrator',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'usr-admin-02',
    name: 'Customer Admin',
    email: 'customer@aethercrop.io',
    password: 'password123',
    role: 'Farm Operator',
    createdAt: new Date().toISOString(),
  },
];

// Non-blocking background sync
let isSyncing = false;
async function syncFromCloudDB(): Promise<GlobalUser[]> {
  if (isSyncing) return usersCache;
  isSyncing = true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600); // 600ms fast timeout
    const res = await fetch(CLOUD_DB_URL, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    }).finally(() => clearTimeout(timeout));

    if (res.ok) {
      const json = await res.json();
      if (json?.data?.users?.length) {
        usersCache = json.data.users;
      }
    }
  } catch {
    // Return cached users on network delay
  } finally {
    isSyncing = false;
  }
  return usersCache;
}

function syncToCloudDBAsync(users: GlobalUser[]) {
  usersCache = users;
  fetch(CLOUD_DB_URL, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Aether Users DB', data: { users } }),
  }).catch(() => {});
}

export async function GET() {
  const users = await syncFromCloudDB();
  return NextResponse.json({ status: 'ONLINE', count: users.length });
}

export async function POST(req: Request) {
  try {
    const action = new URL(req.url).searchParams.get('action') || 'login';
    const body = await req.json();
    const { name, email, password, oldPassword, newPassword } = body;

    const targetEmail = (email || '').trim().toLowerCase();

    // Fast sync attempt (falls back immediately to memory cache if API is slow)
    const users = usersCache.length > 2 ? usersCache : await Promise.race([
      syncFromCloudDB(),
      new Promise<GlobalUser[]>((resolve) => setTimeout(() => resolve(usersCache), 150))
    ]);

    const findUser = (str: string) =>
      users.find((u) => u.email.toLowerCase() === str || u.name.toLowerCase() === str);

    if (action === 'login') {
      if (!targetEmail || !password) {
        return NextResponse.json({ success: false, message: 'Email and password required.' }, { status: 400 });
      }

      const user = findUser(targetEmail);
      if (!user) {
        return NextResponse.json({ success: false, message: `No account for "${email}". Click "Set Password" to create.` }, { status: 404 });
      }
      if (user.password !== password) {
        return NextResponse.json({ success: false, message: 'Incorrect password.' }, { status: 401 });
      }

      const { password: _, ...cleanUser } = user;
      return NextResponse.json({ success: true, user: cleanUser });
    }

    if (action === 'register') {
      if (!targetEmail || !password) {
        return NextResponse.json({ success: false, message: 'Email and password required.' }, { status: 400 });
      }

      const existingIndex = users.findIndex((u) => u.email.toLowerCase() === targetEmail || u.name.toLowerCase() === targetEmail);
      let user: GlobalUser;

      if (existingIndex !== -1) {
        users[existingIndex].password = password;
        if (name?.trim()) users[existingIndex].name = name.trim();
        user = users[existingIndex];
      } else {
        user = {
          id: `usr-${Date.now().toString().slice(-6)}`,
          name: name?.trim() || targetEmail.split('@')[0],
          email: targetEmail,
          password,
          role: 'Farm Owner & System Administrator',
          createdAt: new Date().toISOString(),
        };
        users.push(user);
      }

      syncToCloudDBAsync(users);
      const { password: _, ...cleanUser } = user;
      return NextResponse.json({ success: true, user: cleanUser });
    }

    if (action === 'update-password') {
      const user = findUser(targetEmail);
      if (!user) return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });
      if (oldPassword && user.password !== oldPassword) {
        return NextResponse.json({ success: false, message: 'Current password mismatch.' }, { status: 401 });
      }

      user.password = newPassword;
      syncToCloudDBAsync(users);
      return NextResponse.json({ success: true, message: 'Password updated.' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
