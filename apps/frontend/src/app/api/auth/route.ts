import { NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from './crypto';

export interface GlobalUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: string;
  createdAt: string;
}

const CLOUD_DB_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fddd0e4790cf7';

// Pre-seeded salted hashes for default accounts
const seedDefaultUsers = (): GlobalUserRecord[] => {
  const adminCreds = hashPassword('password123');
  const custCreds = hashPassword('password123');
  return [
    {
      id: 'usr-admin-01',
      name: 'Karthik Nataraj',
      email: 'karthiknataraj547@gmail.com',
      passwordHash: adminCreds.hash,
      salt: adminCreds.salt,
      role: 'Farm Owner & System Administrator',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'usr-admin-02',
      name: 'Customer Admin',
      email: 'customer@aethercrop.io',
      passwordHash: custCreds.hash,
      salt: custCreds.salt,
      role: 'Farm Operator',
      createdAt: new Date().toISOString(),
    },
  ];
};

let usersCache: GlobalUserRecord[] = seedDefaultUsers();
let isSyncing = false;

async function syncFromCloudDB(): Promise<GlobalUserRecord[]> {
  if (isSyncing) return usersCache;
  isSyncing = true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 600);
    const res = await fetch(CLOUD_DB_URL, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    }).finally(() => clearTimeout(timeout));

    if (res.ok) {
      const json: any = await res.json();
      if (json?.data?.users?.length) {
        usersCache = json.data.users;
      }
    }
  } catch {
    // Return cache on delay
  } finally {
    isSyncing = false;
  }
  return usersCache;
}

function syncToCloudDBAsync(users: GlobalUserRecord[]) {
  usersCache = users;
  fetch(CLOUD_DB_URL, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : {}))
    .then((json: any) => {
      const existingStates = json?.data?.farmStates || {};
      return fetch(CLOUD_DB_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Aether Users DB',
          data: {
            users,
            farmStates: existingStates,
          },
        }),
      });
    })
    .catch(() => {});
}

export async function GET() {
  const users = await syncFromCloudDB();
  return NextResponse.json(
    { status: 'ONLINE', security: 'PBKDF2+AES-256-GCM', count: users.length },
    {
      headers: {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
      },
    }
  );
}

export async function POST(req: Request) {
  try {
    const action = new URL(req.url).searchParams.get('action') || 'login';
    const body = await req.json();
    const { name, email, password, oldPassword, newPassword } = body;

    const targetEmail = (email || '').trim().toLowerCase();

    // Fast sync attempt
    const users = usersCache.length > 2 ? usersCache : await Promise.race([
      syncFromCloudDB(),
      new Promise<GlobalUserRecord[]>((resolve) => setTimeout(() => resolve(usersCache), 150))
    ]);

    const findUser = (str: string) =>
      users.find((u) => u.email.toLowerCase() === str || u.name.toLowerCase() === str);

    if (action === 'login') {
      if (!targetEmail || !password) {
        return NextResponse.json({ success: false, message: 'Email and password required.' }, { status: 400 });
      }

      const user = findUser(targetEmail);
      if (!user) {
        return NextResponse.json({ success: false, message: `No account found for "${email}". Click "Set Password" to create.` }, { status: 404 });
      }

      let isMatch = false;
      if (user.passwordHash && user.salt) {
        isMatch = verifyPassword(password, user.passwordHash, user.salt);
      } else if ((user as any).password) {
        isMatch = (user as any).password === password;
        if (isMatch) {
          const { hash, salt } = hashPassword(password);
          user.passwordHash = hash;
          user.salt = salt;
          delete (user as any).password;
          syncToCloudDBAsync(users);
        }
      }

      if (!isMatch) {
        return NextResponse.json({ success: false, message: 'Incorrect password.' }, { status: 401 });
      }

      const { passwordHash: _, salt: __, ...sanitizedUser } = user;
      return NextResponse.json({ success: true, user: sanitizedUser });
    }

    if (action === 'register') {
      if (!targetEmail || !password) {
        return NextResponse.json({ success: false, message: 'Email and password required.' }, { status: 400 });
      }

      const existingIndex = users.findIndex((u) => u.email.toLowerCase() === targetEmail || u.name.toLowerCase() === targetEmail);
      const { hash, salt } = hashPassword(password);
      let user: GlobalUserRecord;

      if (existingIndex !== -1) {
        users[existingIndex].passwordHash = hash;
        users[existingIndex].salt = salt;
        delete (users[existingIndex] as any).password;
        if (name?.trim()) users[existingIndex].name = name.trim();
        user = users[existingIndex];
      } else {
        user = {
          id: `usr-${Date.now().toString().slice(-6)}`,
          name: name?.trim() || targetEmail.split('@')[0],
          email: targetEmail,
          passwordHash: hash,
          salt,
          role: 'Farm Owner & System Administrator',
          createdAt: new Date().toISOString(),
        };
        users.push(user);
      }

      syncToCloudDBAsync(users);
      const { passwordHash: _, salt: __, ...sanitizedUser } = user;
      return NextResponse.json({ success: true, user: sanitizedUser });
    }

    if (action === 'update-password') {
      const user = findUser(targetEmail);
      if (!user) return NextResponse.json({ success: false, message: 'User not found.' }, { status: 404 });

      if (oldPassword && user.passwordHash && user.salt) {
        if (!verifyPassword(oldPassword, user.passwordHash, user.salt)) {
          return NextResponse.json({ success: false, message: 'Current password mismatch.' }, { status: 401 });
        }
      }

      const { hash, salt } = hashPassword(newPassword);
      user.passwordHash = hash;
      user.salt = salt;
      delete (user as any).password;

      syncToCloudDBAsync(users);
      return NextResponse.json({ success: true, message: 'Password updated securely.' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
