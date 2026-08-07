import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export interface GlobalUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: string;
  createdAt: string;
}

// Global in-memory user registry with default fallback user
declare global {
  var __GLOBAL_USERS_DB__: GlobalUser[] | undefined;
}

const DB_PATH = process.env.VERCEL
  ? path.join('/tmp', 'aether_global_users.json')
  : path.join(process.cwd(), '.users_db.json');

function loadUsers(): GlobalUser[] {
  if (globalThis.__GLOBAL_USERS_DB__) {
    return globalThis.__GLOBAL_USERS_DB__;
  }

  let users: GlobalUser[] = [
    {
      id: 'usr-admin-01',
      name: 'Alex Mercer',
      email: 'customer@aethercrop.io',
      password: 'password123',
      role: 'Farm Owner & System Administrator',
      createdAt: new Date().toISOString(),
    },
  ];

  try {
    if (fs.existsSync(DB_PATH)) {
      const data = fs.readFileSync(DB_PATH, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed) && parsed.length > 0) {
        users = parsed;
      }
    }
  } catch (err) {
    console.error('[Global Auth DB] Failed to load disk storage:', err);
  }

  globalThis.__GLOBAL_USERS_DB__ = users;
  return users;
}

function saveUsers(users: GlobalUser[]) {
  globalThis.__GLOBAL_USERS_DB__ = users;
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Global Auth DB] Failed to save disk storage:', err);
  }
}

// GET /api/auth (Health / check)
export async function GET(request: Request) {
  const users = loadUsers();
  return NextResponse.json({
    status: 'ONLINE',
    totalUsersRegistered: users.length,
  });
}

// POST /api/auth?action=login | register | update-password
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'login';
    const body = await request.json();

    const users = loadUsers();

    if (action === 'register') {
      const { name, email, password } = body;

      if (!email || !password) {
        return NextResponse.json(
          { success: false, message: 'Email and password are required.' },
          { status: 400 }
        );
      }

      const normalizedEmail = email.trim().toLowerCase();

      // Check if user already exists
      const existing = users.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (existing) {
        // If existing user exists, update password globally for them
        existing.password = password;
        if (name) existing.name = name;
        saveUsers(users);
        const { password: _, ...userWithoutPass } = existing;
        return NextResponse.json({
          success: true,
          message: 'Account updated successfully across all devices!',
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
      saveUsers(users);

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

      const normalizedEmail = email.trim().toLowerCase();

      // Search user by email or username
      const user = users.find(
        (u) => u.email.toLowerCase() === normalizedEmail || u.name.toLowerCase() === normalizedEmail
      );

      if (!user) {
        return NextResponse.json(
          {
            success: false,
            message: 'No account found with this email/username. Click "Set Password" to register your account globally.',
          },
          { status: 404 }
        );
      }

      if (user.password !== password) {
        return NextResponse.json(
          { success: false, message: 'Invalid password. Please check your credentials.' },
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

      const normalizedEmail = email.trim().toLowerCase();
      const user = users.find((u) => u.email.toLowerCase() === normalizedEmail);

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
      saveUsers(users);

      return NextResponse.json({
        success: true,
        message: 'Password updated globally across all devices!',
      });
    }

    return NextResponse.json(
      { success: false, message: 'Unknown action parameter.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[Global Auth API] Error handling request:', error);
    return NextResponse.json(
      { success: false, message: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
