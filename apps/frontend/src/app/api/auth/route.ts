import { NextResponse } from 'next/server';

export interface GlobalUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
}

// Persistent Cloud Database Object ID
const GLOBAL_CLOUD_DB_ID = 'ff8081819f7e10ae019fddd0e4790cf7';
const CLOUD_DB_URL = `https://api.restful-api.dev/objects/${GLOBAL_CLOUD_DB_ID}`;

// In-memory cache for ultra-fast response with fallback sync
let memoryUsersCache: GlobalUser[] = [
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

async function fetchGlobalUsersFromCloudDB(): Promise<GlobalUser[]> {
  try {
    const res = await fetch(CLOUD_DB_URL, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.users && Array.isArray(json.data.users) && json.data.users.length > 0) {
        memoryUsersCache = json.data.users;
        return json.data.users;
      }
    }
  } catch (err) {
    console.error('[Cloud DB] Failed to fetch users from Cloud Database:', err);
  }
  return memoryUsersCache;
}

async function saveGlobalUsersToCloudDB(users: GlobalUser[]): Promise<boolean> {
  memoryUsersCache = users;
  try {
    const res = await fetch(CLOUD_DB_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache',
      },
      body: JSON.stringify({
        name: 'Aether Users DB',
        data: { users },
      }),
    });
    if (res.ok) {
      console.log(`[Cloud DB] Saved ${users.length} users globally.`);
      return true;
    }
  } catch (err) {
    console.error('[Cloud DB] Failed to save users to Cloud Database:', err);
  }
  return false;
}

// GET /api/auth (Health check & Cloud DB status)
export async function GET() {
  const users = await fetchGlobalUsersFromCloudDB();
  return NextResponse.json({
    status: 'ONLINE',
    cloudDbStatus: 'CONNECTED',
    totalUsersRegistered: users.length,
    userEmails: users.map((u) => u.email),
  });
}

// POST /api/auth?action=login | register | update-password
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'login';
    const body = await request.json();

    // Fetch live users from persistent Cloud Database
    const users = await fetchGlobalUsersFromCloudDB();

    if (action === 'register') {
      const { name, email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { success: false, message: 'Email/username and password are required.' },
          { status: 400 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user account already exists by email or name
      const existingIndex = users.findIndex(
        (u) => u.email.toLowerCase() === normalizedEmail || u.name.toLowerCase() === normalizedEmail
      );

      if (existingIndex !== -1) {
        // Update password globally for existing user
        users[existingIndex].password = password;
        if (name && name.trim()) {
          users[existingIndex].name = name.trim();
        }
        await saveGlobalUsersToCloudDB(users);
        const { password: _, ...userWithoutPass } = users[existingIndex];
        return NextResponse.json({
          success: true,
          message: 'Account updated globally across all devices! You can now log in.',
          user: userWithoutPass,
        });
      }

      const newUser: GlobalUser = {
        id: `usr-global-${Date.now().toString().slice(-6)}`,
        name: name ? name.trim() : normalizedEmail.split('@')[0],
        email: normalizedEmail,
        password,
        role: 'Farm Owner & System Administrator',
        createdAt: new Date().toISOString(),
      };

      users.push(newUser);
      await saveGlobalUsersToCloudDB(users);

      const { password: _, ...userWithoutPass } = newUser;
      return NextResponse.json({
        success: true,
        message: 'Account created globally! You can now log in from any device.',
        user: userWithoutPass,
      });
    }

    if (action === 'login') {
      const { email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { success: false, message: 'Please enter your email/username and password.' },
          { status: 400 }
        );
      }

      const normalizedInput = email.trim().toLowerCase();

      // Search persistent Cloud Database for account match by email or name
      let user = users.find(
        (u) => u.email.toLowerCase() === normalizedInput || u.name.toLowerCase() === normalizedInput
      );

      // If user not found yet, perform fresh refetch from Cloud DB
      if (!user) {
        const freshUsers = await fetchGlobalUsersFromCloudDB();
        user = freshUsers.find(
          (u) => u.email.toLowerCase() === normalizedInput || u.name.toLowerCase() === normalizedInput
        );
      }

      if (!user) {
        return NextResponse.json(
          {
            success: false,
            message: `No account found for "${email}". Click "Set Password" to register your account globally.`,
          },
          { status: 404 }
        );
      }

      if (user.password !== password) {
        return NextResponse.json(
          { success: false, message: 'Incorrect password. Please verify your password and try again.' },
          { status: 401 }
        );
      }

      const { password: _, ...userWithoutPass } = user;
      return NextResponse.json({
        success: true,
        message: 'Authentication successful.',
        user: userWithoutPass,
      });
    }

    if (action === 'update-password') {
      const { email, oldPassword, newPassword } = body;

      if (!email || !newPassword) {
        return NextResponse.json(
          { success: false, message: 'Email and new password are required.' },
          { status: 400 }
        );
      }

      const normalizedInput = email.trim().toLowerCase();
      const user = users.find(
        (u) => u.email.toLowerCase() === normalizedInput || u.name.toLowerCase() === normalizedInput
      );

      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User account not found.' },
          { status: 404 }
        );
      }

      if (oldPassword && user.password !== oldPassword) {
        return NextResponse.json(
          { success: false, message: 'Current password does not match.' },
          { status: 401 }
        );
      }

      user.password = newPassword;
      await saveGlobalUsersToCloudDB(users);

      return NextResponse.json({
        success: true,
        message: 'Password updated globally across all devices!',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action parameter.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Global Auth API] Error:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
