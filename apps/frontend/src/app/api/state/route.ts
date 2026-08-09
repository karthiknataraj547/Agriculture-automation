import { NextResponse } from 'next/server';
import { encryptPayload, decryptPayload } from '../auth/crypto';

let STATE_DB_URL = 'https://api.restful-api.dev/objects/ff8081819f7e10ae019fddd0e4790cf7';

// Global In-memory state store cache to prevent rate-limit wipes
declare global {
  var _aether_state_cache: Record<string, any> | undefined;
  var _aether_state_db_id: string | undefined;
}

if (!global._aether_state_cache) {
  global._aether_state_cache = {};
}

const stateStoreCache = global._aether_state_cache!;

async function fetchStateFromCloud(): Promise<Record<string, any>> {
  try {
    const targetUrl = global._aether_state_db_id
      ? `https://api.restful-api.dev/objects/${global._aether_state_db_id}`
      : STATE_DB_URL;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const res = await fetch(targetUrl, {
      headers: { 'Cache-Control': 'no-cache' },
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    if (res.ok) {
      const json = await res.json();
      if (json?.data?.farmStates && typeof json.data.farmStates === 'object') {
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
    const targetUrl = global._aether_state_db_id
      ? `https://api.restful-api.dev/objects/${global._aether_state_db_id}`
      : STATE_DB_URL;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    const getRes = await fetch(targetUrl, {
      cache: 'no-store',
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    let existingData = {};
    if (getRes.ok) {
      const existingJson = await getRes.json();
      existingData = existingJson?.data || {};
    } else if (getRes.status === 404) {
      // Auto-heal: Create a new cloud object if original ID expired or was deleted
      const createRes = await fetch('https://api.restful-api.dev/objects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Aether Farm Cloud DB',
          data: { farmStates: states },
        }),
      });
      if (createRes.ok) {
        const createdJson = await createRes.json();
        if (createdJson?.id) {
          global._aether_state_db_id = createdJson.id;
          STATE_DB_URL = `https://api.restful-api.dev/objects/${createdJson.id}`;
        }
        return true;
      }
    }

    const putRes = await fetch(targetUrl, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aether Farm Cloud DB',
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

    // Save to Cloud DB and MUST await so Vercel Serverless environment does not freeze
    await saveStateToCloud(stateStoreCache);

    return NextResponse.json({ success: true, message: 'State saved globally' });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: 'Failed to save state' }, { status: 500 });
  }
}
