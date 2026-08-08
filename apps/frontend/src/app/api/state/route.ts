import { NextResponse } from 'next/server';
import { encryptPayload, decryptPayload } from '../auth/crypto';

const STATE_DB_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fddd0e4790cf7';

// In-memory state store
let stateStoreCache: Record<string, string> = {};
let isSyncingState = false;

async function fetchStateFromCloud(): Promise<Record<string, string>> {
  if (isSyncingState) return stateStoreCache;
  isSyncingState = true;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500); // 3.5s timeout for mobile connection stability
    const res = await fetch(STATE_DB_URL, {
      signal: controller.signal,
      headers: { 'Cache-Control': 'no-cache' },
    }).finally(() => clearTimeout(timeout));

    if (res.ok) {
      const json = await res.json();
      if (json?.data?.farmStates) {
        stateStoreCache = json.data.farmStates;
      }
    }
  } catch (e) {
    // Return cached state on network delay
  } finally {
    isSyncingState = false;
  }
  return stateStoreCache;
}

function saveStateToCloudAsync(states: Record<string, string>) {
  stateStoreCache = states;
  fetch(STATE_DB_URL, { cache: 'no-store' })
    .then((r) => (r.ok ? r.json() : {}))
    .then((json: any) => {
      const existingData = json?.data || {};
      return fetch(STATE_DB_URL, {
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
    })
    .catch(() => {});
}

// GET /api/state?email=... (Reliable multi-device sync)
export async function GET(req: Request) {
  try {
    const email = new URL(req.url).searchParams.get('email');
    if (!email) {
      return NextResponse.json({ success: false, message: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Always sync cloud state if not in memory cache
    if (!stateStoreCache[normalizedEmail]) {
      await fetchStateFromCloud();
    } else {
      fetchStateFromCloud().catch(() => {});
    }

    const encryptedData = stateStoreCache[normalizedEmail];
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

    // Save encrypted state to cloud DB asynchronously
    saveStateToCloudAsync(stateStoreCache);

    return NextResponse.json({ success: true, message: 'State saved globally' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Failed to save state' }, { status: 500 });
  }
}
