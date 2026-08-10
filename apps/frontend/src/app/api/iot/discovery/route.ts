import { NextResponse } from 'next/server';

const CLOUD_DB_URL = 'https://api.restful-api.dev/objects/ff8081819fe7c738771714';

interface DiscoveredNode {
  macAddress: string;
  serialNumber: string;
  boardFamily: 'ESP32' | 'ESP8266';
  boardType: string;
  ipAddress?: string;
  rssi?: number;
  lastPing: string;
}

async function fetchDiscoveryDB(): Promise<DiscoveredNode[]> {
  try {
    const res = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    if (res.ok) {
      const json: any = await res.json();
      const nodes = json?.data?.discoveredNodes || [];
      // Filter out nodes that haven't pinged in the last 120 seconds
      const now = Date.now();
      return nodes.filter((n: DiscoveredNode) => {
        const pingTime = new Date(n.lastPing).getTime();
        return now - pingTime < 120000;
      });
    }
  } catch (e) {
    console.error('[Discovery API] Fetch error:', e);
  }
  return [];
}

async function saveDiscoveryNode(node: DiscoveredNode) {
  try {
    const getRes = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    const existingJson = getRes.ok ? await getRes.json() : {};
    const existingData = existingJson?.data || {};
    const nodes: DiscoveredNode[] = existingData.discoveredNodes || [];

    const index = nodes.findIndex((n) => n.macAddress === node.macAddress || n.serialNumber === node.serialNumber);
    if (index >= 0) {
      nodes[index] = { ...nodes[index], ...node, lastPing: new Date().toISOString() };
    } else {
      nodes.push({ ...node, lastPing: new Date().toISOString() });
    }

    await fetch(CLOUD_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aether Agriculture Platform DB v2',
        data: { ...existingData, discoveredNodes: nodes },
      }),
    });
    return true;
  } catch (e) {
    console.error('[Discovery API] Save error:', e);
    return false;
  }
}

export async function GET() {
  const activeNodes = await fetchDiscoveryDB();
  return NextResponse.json({
    success: true,
    totalDiscovered: activeNodes.length,
    nodes: activeNodes,
  });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { macAddress, serialNumber, boardFamily, boardType, ipAddress, rssi } = body;

    if (!macAddress && !serialNumber) {
      return NextResponse.json({ success: false, message: 'MAC Address or Serial Number required' }, { status: 400 });
    }

    const node: DiscoveredNode = {
      macAddress: macAddress || `MAC-${serialNumber}`,
      serialNumber: serialNumber || `AGRI-${macAddress}`,
      boardFamily: boardFamily || 'ESP32',
      boardType: boardType || 'ESP32 Dev Module',
      ipAddress: ipAddress || '192.168.1.100',
      rssi: rssi || -55,
      lastPing: new Date().toISOString(),
    };

    await saveDiscoveryNode(node);
    return NextResponse.json({ success: true, message: 'Physical hardware ping registered.', node });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Error registering ping' }, { status: 500 });
  }
}
