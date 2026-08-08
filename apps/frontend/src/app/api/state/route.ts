import { NextResponse } from 'next/server';
import { encryptPayload, decryptPayload } from '../auth/crypto';

const STATE_DB_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fddd0e4790cf7';

// In-memory state store cache
let stateStoreCache: Record<string, string> = {};

async function fetchStateFromCloud(): Promise<Record<string, string>> {
  try {
    const res = await fetch(STATE_DB_URL, {
      headers: { 'Cache-Control': 'no-cache' },
      cache: 'no-store',
    });

    if (res.ok) {
      const json = await res.json();
      if (json?.data?.farmStates) {
        stateStoreCache = json.data.farmStates;
      }
    }
  } catch (e) {
    console.error('[Cloud DB] fetchStateFromCloud error:', e);
  }
  return stateStoreCache;
}

async function saveStateToCloud(states: Record<string, string>): Promise<boolean> {
  try {
    stateStoreCache = states;
    const getRes = await fetch(STATE_DB_URL, { cache: 'no-store' });
    const existingJson = getRes.ok ? await getRes.json() : {};
    const existingData = existingJson?.data || {};

    const putRes = await fetch(STATE_DB_URL, {
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

    return putRes.ok;
  } catch (err) {
    console.error('[Cloud DB] saveStateToCloud error:', err);
    return false;
  }
}

// GET /api/state?email=... (Reliable cross-device state fetch)
export async function GET(req: Request) {
  try {
    const email = new URL(req.url).searchParams.get('email');
    if (!email) {
      return NextResponse.json({ success: false, message: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Always fetch fresh state from cloud DB to guarantee cross-device sync
    const currentStates = await fetchStateFromCloud();

    const encryptedData = currentStates[normalizedEmail];
    if (!encryptedData) {
      return NextResponse.json({ success: true, state: null });
    }

    const decryptedState = decryptPayload(encryptedData);
    return NextResponse.json({ success: true, state: decryptedState });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Failed to retrieve state' }, { status: 500 });
  }
}

// POST /api/state (Save state globally for account across laptop & mobile)
export async function POST(req: Request) {
  try {
    const { email, state } = await req.json();

    if (!email || !state) {
      return NextResponse.json({ success: false, message: 'Email and state required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Encrypt state payload using AES-256-GCM before saving
    stateStoreCache[normalizedEmail] = encryptPayload(state);

    // MUST AWAIT on Vercel Serverless so execution context is not frozen before network PUT completes
    await saveStateToCloud(stateStoreCache);

    return NextResponse.json({ success: true, message: 'State saved globally' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Failed to save state' }, { status: 500 });
  }
}
