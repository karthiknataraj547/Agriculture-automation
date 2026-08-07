import { NextResponse } from 'next/server';
import { encryptPayload, decryptPayload } from '../auth/crypto';

// Persistent State Database ID
const STATE_DB_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fddd0e4790cf7';

// Memory cache of encrypted farm states by user email
let stateStoreCache: Record<string, string> = {};

async function fetchStateFromCloud(): Promise<Record<string, string>> {
  try {
    const res = await fetch(STATE_DB_URL, {
      cache: 'no-store',
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (res.ok) {
      const json = await res.json();
      if (json?.data?.farmStates) {
        stateStoreCache = json.data.farmStates;
        return json.data.farmStates;
      }
    }
  } catch (err) {
    console.error('[State DB] Fetch error:', err);
  }
  return stateStoreCache;
}

async function saveStateToCloud(states: Record<string, string>): Promise<boolean> {
  stateStoreCache = states;
  try {
    // First get existing DB payload
    const getRes = await fetch(STATE_DB_URL, { cache: 'no-store' });
    let existingData: any = {};
    if (getRes.ok) {
      const json = await getRes.json();
      existingData = json.data || {};
    }

    await fetch(STATE_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aether Users DB',
        data: {
          ...existingData,
          farmStates: states,
        },
      }),
    });
    return true;
  } catch (err) {
    console.error('[State DB] Save error:', err);
    return false;
  }
}

// GET /api/state?email=...
export async function GET(req: Request) {
  try {
    const email = new URL(req.url).searchParams.get('email');
    if (!email) {
      return NextResponse.json({ success: false, message: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const states = await fetchStateFromCloud();
    const encryptedData = states[normalizedEmail];

    if (!encryptedData) {
      return NextResponse.json({ success: true, state: null });
    }

    const decryptedState = decryptPayload(encryptedData);
    return NextResponse.json({ success: true, state: decryptedState });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Failed to retrieve state' }, { status: 500 });
  }
}

// POST /api/state (Save state globally for account)
export async function POST(req: Request) {
  try {
    const { email, state } = await req.json();

    if (!email || !state) {
      return NextResponse.json({ success: false, message: 'Email and state required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const states = await fetchStateFromCloud();

    // Encrypt state payload using AES-256-GCM before saving
    states[normalizedEmail] = encryptPayload(state);

    // Save encrypted state to cloud DB asynchronously
    saveStateToCloud(states).catch(() => {});

    return NextResponse.json({ success: true, message: 'State saved globally' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Failed to save state' }, { status: 500 });
  }
}
