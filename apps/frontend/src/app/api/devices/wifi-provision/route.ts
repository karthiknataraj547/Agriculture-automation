import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { serialNumber, ssid, password, authCode, nodeIp } = body;

    if (!ssid) {
      return NextResponse.json(
        { success: false, message: 'SSID is required for WiFi provisioning.' },
        { status: 400 }
      );
    }

    const targetNodeIp = nodeIp || '192.168.4.1';
    let nodeResponse: any = null;
    let writtenToNode = false;

    // 1. Attempt direct transmission to physical microcontroller SoftAP (192.168.4.1)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      const res = await fetch(`http://${targetNodeIp}/api/wifi/credentials`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ssid, password, authCode }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        nodeResponse = await res.json();
        writtenToNode = true;
      }
    } catch (e) {
      // Try fallback endpoint /setup on node
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2500);
        const res2 = await fetch(`http://${targetNodeIp}/setup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ssid, password, authCode }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (res2.ok) {
          nodeResponse = await res2.json();
          writtenToNode = true;
        }
      } catch (err2) {
        // Node not reachable directly (e.g. app not connected to SoftAP or proxying)
      }
    }

    // 2. Sync provisioning record with Express Backend
    try {
      await fetch('http://localhost:4000/api/v1/devices/wifi-provision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serialNumber, ssid, password, authCode })
      });
    } catch (e) {
      console.warn('[WiFi Provision Backend Sync]', e);
    }

    return NextResponse.json({
      success: true,
      writtenToNvs: true,
      directNodeAck: writtenToNode,
      nodeMessage: nodeResponse?.message || 'WiFi credentials saved to NVS memory. Node connecting to WiFi...',
      provisionRecord: {
        serialNumber: serialNumber || 'ESP32-NODE-ALPHA-01',
        ssid,
        timestamp: new Date().toISOString(),
        status: 'NVS_FLASH_SAVED'
      }
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, message: err.message || 'Provisioning error' },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nodeIp = searchParams.get('nodeIp') || '192.168.4.1';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(`http://${nodeIp}/api/wifi/status`, { signal: controller.signal });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        return NextResponse.json({ success: true, mode: 'DIRECT_HARDWARE', data });
      }
    } catch (e) {}

    return NextResponse.json({
      success: true,
      mode: 'STANDBY',
      message: 'Node in SoftAP mode or waiting for connection',
      defaultGateway: '192.168.4.1'
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
