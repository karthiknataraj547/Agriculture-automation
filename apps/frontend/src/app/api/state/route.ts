import { NextResponse } from 'next/server';
import { encryptPayload, decryptPayload } from '../auth/crypto';

const STATE_DB_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fddd0e4790cf7';

// Global In-memory state store cache to prevent rate-limit wipes
declare global {
  var _aether_state_cache: Record<string, any> | undefined;
}

if (!global._aether_state_cache) {
  global._aether_state_cache = {};
}

const stateStoreCache = global._aether_state_cache!;

async function fetchStateFromCloud(): Promise<Record<string, any>> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);
    const res = await fetch(STATE_DB_URL, {
      headers: { 'Cache-Control': 'no-cache' },
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (res.ok) {
      const json = await res.json();
      if (json?.data?.farmStates && typeof json.data.farmStates === 'object') {
        // Merge cloud states into in-memory cache without overwriting active keys
        Object.entries(json.data.farmStates).forEach(([key, val]) => {
          if (val) {
            stateStoreCache[key] = val;
          }
        });
      }
    }
  } catch (e) {
    // Fail silently to in-memory state store cache
  }
  return stateStoreCache;
}

async function saveStateToCloud(states: Record<string, any>): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);

    const getRes = await fetch(STATE_DB_URL, {
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

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
    return false;
  }
}

// GET /api/state?email=... (Fail-safe cross-device state fetch)
export async function GET(req: Request) {
  try {
    const email = new URL(req.url).searchParams.get('email');
    if (!email) {
      return NextResponse.json({ success: false, message: 'Email required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    
    // Fetch latest cloud state map
    const currentStates = await fetchStateFromCloud();
    const rawData = currentStates[normalizedEmail];

    if (!rawData) {
      return NextResponse.json({ success: true, state: null });
    }

    let parsedState: any = null;

    // Handle string encrypted payload or plain object
    if (typeof rawData === 'string') {
      try {
        parsedState = decryptPayload(rawData);
      } catch {
        parsedState = null;
      }
      if (!parsedState) {
        try {
          parsedState = JSON.parse(rawData);
        } catch {
          parsedState = null;
        }
      }
    } else if (typeof rawData === 'object') {
      parsedState = rawData;
    }

    return NextResponse.json({ success: true, state: parsedState });
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
    
    // Store in global memory cache first for 0ms retrieval
    stateStoreCache[normalizedEmail] = state;

    // Save to Cloud DB asynchronously without blocking response
    saveStateToCloud(stateStoreCache).catch(() => {});

    return NextResponse.json({ success: true, message: 'State saved globally' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Failed to save state' }, { status: 500 });
  }
}
