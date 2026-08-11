import { NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from './crypto';

export interface GlobalUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  role: string;
  accountId: string;
  status: 'ACTIVE' | 'DISABLED' | 'SUSPENDED';
  mustChangePassword?: boolean;
  createdAt: string;
  lastLogin?: string;
}

const CLOUD_DB_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fe7c738771714';

// Pre-seeded salted hashes with Admin Bootstrap from environment variables
const seedDefaultUsers = (): GlobalUserRecord[] => {
  const initialAdminId = process.env.ADMIN_INITIAL_USER_ID || 'admin';
  const initialAdminPass = process.env.ADMIN_INITIAL_PASSWORD || 'admin@1234';
  const initialAdminEmail = process.env.ADMIN_INITIAL_EMAIL || 'admin@agritech.com';

  const adminCreds = hashPassword(initialAdminPass);
  const karthikCreds = hashPassword('karthik@547');
  const custCreds = hashPassword('password123');


  return [
    {
      id: initialAdminId,
      name: 'System Super Administrator',
      email: initialAdminEmail,
      passwordHash: adminCreds.hash,
      salt: adminCreds.salt,
      role: 'SUPER_ADMIN',
      accountId: 'account-system-admin',
      status: 'ACTIVE',
      mustChangePassword: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'usr-admin-01',
      name: 'Karthik Nataraj',
      email: 'karthiknataraj547@gmail.com',
      passwordHash: karthikCreds.hash,
      salt: karthikCreds.salt,
      role: 'FARM_OWNER',
      accountId: 'account-farm-alpha',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'usr-admin-02',
      name: 'Customer Operator',
      email: 'customer@aethercrop.io',
      passwordHash: custCreds.hash,
      salt: custCreds.salt,
      role: 'USER',
      accountId: 'account-farm-beta',
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    },
  ];
};

let usersCache: GlobalUserRecord[] = seedDefaultUsers();

// Reliable, Awaited Cloud Database Fetch with auto-healing for admin@agritech.com
async function fetchUsersFromCloudDB(): Promise<GlobalUserRecord[]> {
  try {
    const res = await fetch(CLOUD_DB_URL, {
      headers: { 'Cache-Control': 'no-cache' },
      cache: 'no-store',
    });

    if (res.ok) {
      const json: any = await res.json();
      if (json?.data?.users && Array.isArray(json.data.users) && json.data.users.length > 0) {
        usersCache = json.data.users;
      }
    }

    // Merge default seeded users if missing from cloud DB
    const seedUsers = seedDefaultUsers();
    let needsSave = false;

    for (const seedUser of seedUsers) {
      const existing = usersCache.find(
        (u) => u.email.toLowerCase() === seedUser.email.toLowerCase() || u.id === seedUser.id
      );
      if (!existing) {
        usersCache.push(seedUser);
        needsSave = true;
      }
    }

    // Auto-heal / Ensure admin@agritech.com with admin@1234 exists
    const adminEmail = (process.env.ADMIN_INITIAL_EMAIL || 'admin@agritech.com').toLowerCase();
    const adminPass = process.env.ADMIN_INITIAL_PASSWORD || 'admin@1234';
    
    let adminUser = usersCache.find(u => u.email.toLowerCase() === adminEmail || u.email.toLowerCase() === 'admin@agritech.com' || u.id === 'admin');
    
    if (!adminUser) {
      const creds = hashPassword(adminPass);
      adminUser = {
        id: 'admin',
        name: 'System Super Administrator',
        email: adminEmail,
        passwordHash: creds.hash,
        salt: creds.salt,
        role: 'SUPER_ADMIN',
        accountId: 'account-system-admin',
        status: 'ACTIVE',
        mustChangePassword: false,
        createdAt: new Date().toISOString(),
      };
      usersCache.push(adminUser);
      needsSave = true;
    } else {
      // Verify password matches adminPass, if not update passwordHash & salt
      const isMatch = verifyPassword(adminPass, adminUser.passwordHash, adminUser.salt);
      if (!isMatch || (adminUser as any).password === 'admin@1234' || adminUser.email !== adminEmail) {
        const creds = hashPassword(adminPass);
        adminUser.email = adminEmail;
        adminUser.passwordHash = creds.hash;
        adminUser.salt = creds.salt;
        adminUser.role = 'SUPER_ADMIN';
        adminUser.status = 'ACTIVE';
        adminUser.mustChangePassword = false;
        needsSave = true;
      }
    // Auto-heal / Ensure karthiknataraj547@gmail.com with karthik@547 exists & is valid
    let karthikUser = usersCache.find((u) => u.email.toLowerCase() === 'karthiknataraj547@gmail.com');
    if (!karthikUser) {
      const kCreds = hashPassword('karthik@547');
      karthikUser = {
        id: 'usr-admin-01',
        name: 'Karthik Nataraj',
        email: 'karthiknataraj547@gmail.com',
        passwordHash: kCreds.hash,
        salt: kCreds.salt,
        role: 'FARM_OWNER',
        accountId: 'account-farm-alpha',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
      };
      usersCache.push(karthikUser);
      needsSave = true;
    } else {
      const isMatch = verifyPassword('karthik@547', karthikUser.passwordHash, karthikUser.salt);
      if (!isMatch || (karthikUser as any).password === 'karthik@547') {
        const kCreds = hashPassword('karthik@547');
        karthikUser.passwordHash = kCreds.hash;
        karthikUser.salt = kCreds.salt;
        karthikUser.status = 'ACTIVE';
        delete (karthikUser as any).password;
        needsSave = true;
      }
    }

    if (needsSave) {
      await saveUsersToCloudDB(usersCache);
    }
  } catch (e) {
    console.error('[Auth Cloud DB] Fetch error:', e);
  }
  return usersCache;
}

// Reliable, Awaited Cloud Database Write with Account Synchronization
async function saveUsersToCloudDB(users: GlobalUserRecord[]): Promise<boolean> {
  try {
    usersCache = users;
    const getRes = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    const existingJson = getRes.ok ? await getRes.json() : {};
    const existingData = existingJson?.data || {};
    const existingAccounts: any[] = Array.isArray(existingData.accounts) ? existingData.accounts : [];

    // Ensure an Account entry exists for every user
    const updatedAccounts = [...existingAccounts];
    for (const u of users) {
      const accId = u.accountId || `account-${u.id}`;
      const accExists = updatedAccounts.some((a) => a.id === accId);
      if (!accExists) {
        updatedAccounts.push({
          id: accId,
          name: `${u.name}'s Farm Enterprise`,
          slug: u.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
          ownerId: u.id,
          status: 'ACTIVE',
          maxDevices: 50,
          maxUsers: 10,
          maxTelemetryRate: 120,
          createdAt: u.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }
    }

    const putRes = await fetch(CLOUD_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aether Users DB',
        data: {
          ...existingData,
          users,
          accounts: updatedAccounts,
        },
      }),
    });

    return putRes.ok;
  } catch (err) {
    console.error('[Auth Cloud DB] Save error:', err);
    return false;
  }
}


export async function GET() {
  const users = await fetchUsersFromCloudDB();
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

    // ALWAYS AWAIT fresh cloud database users list to prevent stale password mismatch
    const users = await fetchUsersFromCloudDB();

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

      if (user.status === 'DISABLED') {
        return NextResponse.json({ success: false, message: 'This account has been disabled by an administrator.' }, { status: 403 });
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
          await saveUsersToCloudDB(users);
        }
      }

      if (!isMatch) {
        return NextResponse.json({ success: false, message: 'Incorrect password.' }, { status: 401 });
      }

      user.lastLogin = new Date().toISOString();
      if (!user.accountId) {
        user.accountId = `account-${user.id}`;
      }
      await saveUsersToCloudDB(users);

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
        if (!users[existingIndex].accountId) {
          users[existingIndex].accountId = `acc-${Date.now().toString(36)}`;
        }
        user = users[existingIndex];
      } else {
        user = {
          id: `usr-${Date.now().toString().slice(-6)}`,
          name: name?.trim() || targetEmail.split('@')[0],
          email: targetEmail,
          passwordHash: hash,
          salt,
          role: 'USER',
          accountId: `acc-${Date.now().toString(36)}`,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
        };
        users.push(user);
      }

      // MUST AWAIT cloud database write so Vercel Serverless runtime doesn't freeze the PUT request
      await saveUsersToCloudDB(users);

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

      // MUST AWAIT cloud database write
      await saveUsersToCloudDB(users);
      return NextResponse.json({ success: true, message: 'Password updated securely in Cloud DB.' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
