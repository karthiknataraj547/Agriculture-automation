import { NextResponse } from 'next/server';
import { extractAuthContext } from '../../middleware/tenantContext';
import { requireAdminRole } from '../../middleware/rbacGuard';

const CLOUD_DB_URL = 'https://api.restful-api.dev/objects/ff8081819fe7c738771714';

const defaultSeedProducts = [
  {
    id: 'prod_agriflow_v1',
    internalName: 'ESP32-IRRIGATION-V1',
    customerProductName: 'AgriFlow Smart Irrigation Controller',
    description: 'Commercial high-precision irrigation node with BLE + Wi-Fi provisioning, dual relay pump/solenoid outputs, and analog soil probes.',
    boardFamily: 'ESP32',
    boardType: 'ESP32 Dev Module',
    firmwareVersion: '1.4.2',
    firmwareTemplate: 'AgriFlow_ESP32_Standard_v1',
    supportedSensors: ['Soil Moisture', 'Temperature', 'Humidity', 'PIR Motion', 'Water Flow', 'Water Level'],
    supportedActuators: ['Pump Relay', 'Solenoid Valve'],
    gpioMapping: {
      soilMoisturePin: 34,
      dhtPin: 4,
      relayPumpPin: 26,
      flowRatePin: 27,
      pirMotionPin: 14,
    },
    hardwareCapabilities: ['BLE_PROVISIONING', 'WIFI_PROVISIONING', 'MQTTS_TLS', 'RELAY_CONTROL'],
    status: 'STABLE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'prod_agrisense_nodemcu',
    internalName: 'ESP8266-NODEMCU-V1',
    customerProductName: 'AgriSense Soil & Climate Monitor',
    description: 'Compact Wi-Fi AP provisioning agriculture controller for real-time soil moisture and environmental monitoring.',
    boardFamily: 'ESP8266',
    boardType: 'NodeMCU 1.0 (ESP-12E Module)',
    firmwareVersion: '1.2.0',
    firmwareTemplate: 'AgriSense_ESP8266_AP_v1',
    supportedSensors: ['Soil Moisture', 'Temperature', 'Humidity', 'PIR Motion', 'Water Flow'],
    supportedActuators: ['Pump Relay'],
    gpioMapping: {
      soilMoisturePin: 'A0',
      dhtPin: 'D2',
      relayPumpPin: 'D3',
      flowRatePin: 'D5',
      pirMotionPin: 'D6',
    },
    hardwareCapabilities: ['WIFI_AP_PROVISIONING', 'MQTTS_TLS', 'RELAY_CONTROL'],
    status: 'STABLE',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

async function fetchProductsFromCloudDB() {
  try {
    const res = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    if (res.ok) {
      const json: any = await res.json();
      if (json?.data?.products && Array.isArray(json.data.products) && json.data.products.length > 0) {
        return json.data.products;
      }
    }
  } catch (e) {
    console.error('[Admin Products] Fetch error:', e);
  }
  return defaultSeedProducts;
}

async function saveProductsToCloudDB(products: any[]) {
  try {
    const getRes = await fetch(CLOUD_DB_URL, { cache: 'no-store' });
    const existingJson = getRes.ok ? await getRes.json() : {};
    const existingData = existingJson?.data || {};

    const putRes = await fetch(CLOUD_DB_URL, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Aether Agriculture Platform DB v2',
        data: { ...existingData, products },
      }),
    });
    return putRes.ok;
  } catch (e) {
    console.error('[Admin Products] Save error:', e);
    return false;
  }
}

export async function GET() {
  const products = await fetchProductsFromCloudDB();
  return NextResponse.json({
    success: true,
    total: products.length,
    products,
  });
}

export async function POST(req: Request) {
  const authCtx = extractAuthContext(req);
  const guard = requireAdminRole(authCtx);
  if (!guard.allowed) return guard.errorResponse!;

  try {
    const body = await req.json();
    const { action, product } = body;
    const products = await fetchProductsFromCloudDB();

    if (action === 'CREATE_PRODUCT') {
      const newProduct = {
        ...product,
        id: `prod_${Date.now().toString(36)}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      products.push(newProduct);
      await saveProductsToCloudDB(products);
      return NextResponse.json({ success: true, message: 'Hardware product template created.', product: newProduct });
    }

    if (action === 'UPDATE_PRODUCT') {
      const index = products.findIndex((p: any) => p.id === product.id);
      if (index === -1) {
        return NextResponse.json({ success: false, message: 'Product template not found.' }, { status: 404 });
      }
      products[index] = { ...products[index], ...product, updatedAt: new Date().toISOString() };
      await saveProductsToCloudDB(products);
      return NextResponse.json({ success: true, message: 'Hardware product template updated.', product: products[index] });
    }

    if (action === 'DELETE_PRODUCT') {
      const filtered = products.filter((p: any) => p.id !== body.productId);
      await saveProductsToCloudDB(filtered);
      return NextResponse.json({ success: true, message: 'Hardware product template deleted.' });
    }

    return NextResponse.json({ success: false, message: 'Invalid action.' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ success: false, message: err.message || 'Server error' }, { status: 500 });
  }
}
