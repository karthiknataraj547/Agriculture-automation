import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Wifi,
  Search,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Radio,
  RefreshCw,
  AlertCircle,
  X,
  Bluetooth,
  ExternalLink,
  ShieldCheck,
  Zap,
  Layers,
  MapPin,
  Check,
  Plus,
} from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';

interface AgriHardwareProvisioningWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AgriHardwareProvisioningWizard: React.FC<AgriHardwareProvisioningWizardProps> = ({
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);

  // Form & Category States
  const [nodeName, setNodeName] = useState('AgriFlow Node Pro');
  const [selectedCategory, setSelectedCategory] = useState<string>('Irrigation');

  // Products List
  const [productsList, setProductsList] = useState<any[]>([
    {
      id: 'prod_agriflow_v1',
      customerProductName: 'AgriFlow Smart Irrigation Controller',
      boardFamily: 'ESP32',
      description: 'Commercial high-precision irrigation controller with dual relay outputs & analog soil probe inputs.',
      supportedSensors: ['Soil Moisture', 'Temperature', 'Humidity', 'PIR Motion', 'Water Flow'],
    },
    {
      id: 'prod_agrisense_nodemcu',
      customerProductName: 'AgriSense Soil & Climate Monitor',
      boardFamily: 'ESP8266',
      description: 'Compact Wi-Fi AP provisioning node for real-time soil moisture and environmental metrics.',
      supportedSensors: ['Soil Moisture', 'Temperature', 'Humidity', 'Water Flow'],
    },
  ]);

  const [selectedProduct, setSelectedProduct] = useState<any>(productsList[0]);

  // Wi-Fi credentials
  const [wifiSsid, setWifiSsid] = useState('Farm_Mesh_WiFi_5G');
  const [wifiPass, setWifiPass] = useState('agrifarm2026');

  // Discovery & Scanning
  const [isScanning, setIsScanning] = useState(true);
  const [discoveredDevices, setDiscoveredDevices] = useState<any[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<any | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [bleServer, setBleServer] = useState<any>(null);
  const [claimSessionId, setClaimSessionId] = useState<string>('');

  // Local Wi-Fi networks scanned from the hardware
  const [scannedSsids, setScannedSsids] = useState<string[]>([]);
  const [isLoadingSsids, setIsLoadingSsids] = useState<boolean>(false);
  const [isManualSsid, setIsManualSsid] = useState<boolean>(false);

  // Poll available SSIDs from the hardware when Step 2 is entered
  useEffect(() => {
    if (step === 2 && selectedDevice?.isSoftAP) {
      setIsLoadingSsids(true);
      setScannedSsids([]);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      // Try local python proxy on port 4001 first to bypass secure HTTPS mixed-content blocks
      fetch('http://localhost:4001/wifi-scan', { signal: controller.signal })
        .catch(() => fetch('http://192.168.4.1/wifi-scan', { signal: controller.signal }))
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data)) {
            const ssids = data.map((n: any) => n.ssid).filter(Boolean);
            setScannedSsids(Array.from(new Set(ssids)));
            if (ssids.length > 0) {
              setWifiSsid(ssids[0]);
              setIsManualSsid(false);
            } else {
              setIsManualSsid(true);
            }
          }
          setIsLoadingSsids(false);
        })
        .catch((err) => {
          console.warn('[WiFi scan endpoint offline or blocked, checking discovery cache]', err);
          if (selectedDevice?.wifiNetworks && Array.isArray(selectedDevice.wifiNetworks) && selectedDevice.wifiNetworks.length > 0) {
            const ssids = selectedDevice.wifiNetworks.map((n: any) => typeof n === 'string' ? n : n.ssid).filter(Boolean);
            setScannedSsids(Array.from(new Set(ssids)));
            setWifiSsid(ssids[0]);
            setIsManualSsid(false);
          } else {
            setIsManualSsid(true);
          }
          setIsLoadingSsids(false);
        });
    }
  }, [step, selectedDevice]);

  // Circular connection progress
  const [connectionProgress, setConnectionProgress] = useState<number>(0);
  const [connectionStage, setConnectionStage] = useState<'IDLE' | 'PAIRING' | 'CLOUD' | 'MQTT' | 'SUCCESS' | 'FAILED'>('IDLE');
  
  // Custom Assignments
  const [selectedSensors, setSelectedSensors] = useState<string[]>(['Soil Moisture', 'Temperature', 'Humidity']);
  const [selectedFarm, setSelectedFarm] = useState('North Commercial Farm');
  const [selectedZone, setSelectedZone] = useState('Zone A (Corn & Wheat Sector)');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const isBluetoothSupported = typeof window !== 'undefined' && !!(navigator as any).bluetooth;

  // Auto-scan on mount (exactly like Wipro Smart app)
  useEffect(() => {
    // Start session
    fetch('/api/iot/devices/claim-session', { method: 'POST' })
      .then((r) => r.json())
      .then((d) => {
        if (d.claimSessionId) setClaimSessionId(d.claimSessionId);
      })
      .catch(() => {});

    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => {
        if (d.products && d.products.length > 0) {
          setProductsList(d.products);
          setSelectedProduct(d.products[0]);
        }
      })
      .catch(() => {});

    runAutoDiscovery();
  }, []);

  const runAutoDiscovery = async () => {
    setIsScanning(true);
    setScanError(null);

    // 1. Probe SoftAP via local proxy (port 4001) — this bypasses HTTPS Mixed Content blocks
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2500);
      const pingRes = await fetch('http://localhost:4001/ping', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (pingRes.ok) {
        const pingData = await pingRes.json();
        const apNode = {
          serialNumber: pingData.serial || 'AGRI-SETUP-HOTSPOT',
          macAddress: pingData.mac || 'CC:50:E3:8A:12:34',
          boardFamily: selectedProduct.boardFamily,
          rssi: -30,
          mode: 'Wi-Fi SoftAP (via Local Proxy)',
          isSoftAP: true,
          productName: selectedProduct.customerProductName || 'AgriFlow Smart Irrigation Controller'
        };
        setDiscoveredDevices([apNode]);
        setSelectedDevice(apNode);
        setIsScanning(false);
        return;
      }
    } catch (e) {
      console.log('[Local proxy SoftAP probe failed]', e);
    }

    // 2. Direct SoftAP probe (only works when NOT on HTTPS — e.g. localhost dev server)
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1500);
      const pingRes = await fetch('http://192.168.4.1/ping', { signal: controller.signal });
      clearTimeout(timeoutId);
      if (pingRes.ok) {
        const pingData = await pingRes.json();
        const apNode = {
          serialNumber: pingData.serial || 'AGRI-SETUP-HOTSPOT',
          macAddress: pingData.mac || 'CC:50:E3:8A:12:34',
          boardFamily: selectedProduct.boardFamily,
          rssi: -35,
          mode: 'Wi-Fi SoftAP Direct (192.168.4.1)',
          isSoftAP: true,
          productName: 'AgriFlow Smart Irrigation Controller'
        };
        setDiscoveredDevices([apNode]);
        setSelectedDevice(apNode);
        setIsScanning(false);
        return;
      }
    } catch (e) {}

    // 3. Fallback Cloud Discovery Daemon Probe
    try {
      const res = await fetch('/api/iot/discovery');
      const data = await res.json();
      if (data.nodes && data.nodes.length > 0) {
        const matchingNodes = data.nodes.filter((n: any) => n.status !== 'FAKE');
        if (matchingNodes.length > 0) {
          const matched = matchingNodes.map((n: any) => ({
            ...n,
            productName: n.boardFamily === 'ESP32' ? 'AgriFlow Smart Irrigation Controller' : 'AgriSense Soil & Climate Monitor'
          }));
          setDiscoveredDevices(matched);
          setSelectedDevice(matched[0]);
          setIsScanning(false);
          return;
        }
      }
    } catch (e) {}

    setIsScanning(false);
  };

  // BLE scan triggered explicitly when clicking scan button
  const handleExplicitBleScan = async () => {
    if (!isBluetoothSupported) {
      setScanError('Bluetooth setup is not supported in this browser. Please use Chrome/Edge or select manual Wi-Fi setup.');
      return;
    }
    setIsScanning(true);
    try {
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [
          { namePrefix: 'AGRI' },
          { services: ['0000ffe0-0000-1000-8000-00805f9b34fb'] },
        ],
        optionalServices: ['0000ffe0-0000-1000-8000-00805f9b34fb'],
      });

      if (device && device.gatt) {
        const server = await device.gatt.connect();
        setBleServer(server);

        let serialName = device.name || `AGRI-ESP32-${device.id.slice(0, 6)}`;
        let macAddr = device.id;

        try {
          const service = await server.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
          const infoChar = await service.getCharacteristic('0000ffe1-0000-1000-8000-00805f9b34fb');
          const valBuf = await infoChar.readValue();
          const infoText = new TextDecoder().decode(valBuf);
          const parsed = JSON.parse(infoText);
          if (parsed.serialNumber) serialName = parsed.serialNumber;
          if (parsed.macAddress) macAddr = parsed.macAddress;
        } catch (e) {}

        const bleNode = {
          serialNumber: serialName,
          macAddress: macAddr,
          boardFamily: 'ESP32',
          rssi: -40,
          mode: 'Bluetooth BLE GATT Hardware',
          productName: 'AgriFlow Smart Irrigation Controller'
        };

        setDiscoveredDevices([bleNode]);
        setSelectedDevice(bleNode);
        setIsScanning(false);
      }
    } catch (err) {
      setIsScanning(false);
    }
  };

  // CONNECT DEVICE AND RUN WIPRO-STYLE COUNTDOWN PROGRESS (0% TO 100%)
  const startConnectionFlow = async () => {
    setStep(3); // Connection progress step
    setConnectionStage('PAIRING');
    setConnectionProgress(10);
    setFeedback(null);

    // 1. Transmit via BLE
    if (bleServer && bleServer.connected) {
      try {
        const service = await bleServer.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
        const ssidChar = await service.getCharacteristic('0000ffe8-0000-1000-8000-00805f9b34fb');
        const credsPayload = JSON.stringify({ ssid: wifiSsid, password: wifiPass });
        await ssidChar.writeValue(new TextEncoder().encode(credsPayload));

        const cmdChar = await service.getCharacteristic('0000ffe9-0000-1000-8000-00805f9b34fb');
        await cmdChar.writeValue(new TextEncoder().encode('CONNECT'));
      } catch (e) {
        console.error('[BLE Transmit Error]', e);
      }
    }

    // 2. Transmit via SoftAP
    if (selectedDevice?.isSoftAP) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        
        // Try local proxy first (port 4001) to bypass secure HTTPS mixed-content blocks
        try {
          await fetch(
            `http://localhost:4001/setup?ssid=${encodeURIComponent(wifiSsid)}&password=${encodeURIComponent(wifiPass)}`,
            {
              method: 'POST',
              mode: 'cors',
              signal: controller.signal
            }
          );
        } catch {
          // Fall back to direct microcontroller endpoint
          await fetch(
            `http://192.168.4.1/setup?ssid=${encodeURIComponent(wifiSsid)}&password=${encodeURIComponent(wifiPass)}`,
            {
              method: 'POST',
              mode: 'cors',
              signal: controller.signal
            }
          );
        }
        
        clearTimeout(timeoutId);
        console.log('[SoftAP fetch transmit ok]');
      } catch (e) {
        console.warn('[SoftAP credential transmit failed]', e);
        // Retry once more through the proxy with a longer timeout
        try {
          const retry = new AbortController();
          const retryTimeout = setTimeout(() => retry.abort(), 5000);
          await fetch(
            `http://localhost:4001/setup?ssid=${encodeURIComponent(wifiSsid)}&password=${encodeURIComponent(wifiPass)}`,
            { method: 'POST', mode: 'cors', signal: retry.signal }
          );
          clearTimeout(retryTimeout);
          console.log('[SoftAP credential retry via proxy ok]');
        } catch (retryErr) {
          console.error('[SoftAP credential push failed completely]', retryErr);
        }
      }
    }

    // Start status polling loop
    let pollInterval: any;
    let localProgress = 10;
    const maxPollTime = 30000;
    const pollStartTime = Date.now();

    pollInterval = setInterval(async () => {
      // Check for timeout
      if (Date.now() - pollStartTime > maxPollTime) {
        clearInterval(pollInterval);
        setConnectionStage('FAILED');
        setFeedback({ type: 'error', message: 'Connection timed out. Please verify your Wi-Fi router is on and range is sufficient.' });
        setStep(2); // Go back to credentials entry
        return;
      }

      let currentDeviceState = 'WIFI_CONNECTING';
      let errorReason = 'NONE';

      // A. Polling via BLE GATT characteristics
      if (bleServer && bleServer.connected) {
        try {
          const service = await bleServer.getPrimaryService('0000ffe0-0000-1000-8000-00805f9b34fb');
          
          const statusChar = await service.getCharacteristic('0000ffe3-0000-1000-8000-00805f9b34fb');
          const valBuf = await statusChar.readValue();
          currentDeviceState = new TextDecoder().decode(valBuf);

          const errChar = await service.getCharacteristic('0000ffea-0000-1000-8000-00805f9b34fb');
          const errBuf = await errChar.readValue();
          errorReason = new TextDecoder().decode(errBuf);
        } catch (e) {
          console.warn('[BLE status poll failed]', e);
        }
      }
      // B. Polling via SoftAP Web Server endpoint
      else if (selectedDevice?.isSoftAP) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);
          
          let statusRes;
          try {
            statusRes = await fetch('http://localhost:4001/status', { signal: controller.signal });
          } catch {
            statusRes = await fetch('http://192.168.4.1/status', { signal: controller.signal });
          }
          
          clearTimeout(timeoutId);
          if (statusRes && statusRes.ok) {
            const data = await statusRes.json();
            currentDeviceState = data.status || 'WIFI_CONNECTING';
            errorReason = data.error || 'NONE';
          }
        } catch (e) {
          // If the network switches or SoftAP turns off, check if backend cloud discovery registers the node
          console.warn('[SoftAP connection dropped, polling database discovery as fallback...]', e);
        }
      }

      // Handle Wi-Fi authentication/connection failure
      if (errorReason === 'WIFI_AUTH_FAILED' || currentDeviceState === 'ERROR') {
        clearInterval(pollInterval);
        setConnectionStage('FAILED');
        setFeedback({
          type: 'error',
          message: 'Wi-Fi connection failed. Please verify your SSID network name and security password and try again.'
        });
        setStep(2); // Bounce back to step 2 with inputs preserved
        return;
      }

      // Handle progress FSM states
      if (currentDeviceState === 'WIFI_CONNECTING') {
        localProgress = Math.min(localProgress + 4, 45); // smoothly creep up to 45%
        setConnectionProgress(localProgress);
        setConnectionStage('PAIRING');
      } else if (currentDeviceState === 'WIFI_CONNECTED' || currentDeviceState === 'CLOUD_REGISTERING') {
        localProgress = Math.min(localProgress + 6, 75); // smoothly creep up to 75%
        setConnectionProgress(localProgress);
        setConnectionStage('CLOUD');
      } else if (currentDeviceState === 'MQTT_CONNECTING' || currentDeviceState === 'ONLINE') {
        clearInterval(pollInterval);
        
        // Register securely on Cloud API
        try {
          await fetch('/api/iot/devices/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              serialNumber: selectedDevice?.serialNumber || `AGRI-${selectedProduct.boardFamily}-DEVICE`,
              macAddress: selectedDevice?.macAddress || 'CC:50:E3:8A:12:34',
              boardFamily: selectedProduct.boardFamily,
              productId: selectedProduct.id,
              firmwareVersion: '3.2.0',
              wifiSsid,
              claimSessionId,
            }),
          });
        } catch (e) {}

        // Animate smoothly to 100% success state
        let finalProg = localProgress;
        const finalInterval = setInterval(() => {
          finalProg += 5;
          if (finalProg >= 100) {
            clearInterval(finalInterval);
            setConnectionProgress(100);
            setConnectionStage('SUCCESS');
            setTimeout(() => {
              setStep(4); // Advance to configuration step
            }, 1000);
          } else {
            setConnectionProgress(finalProg);
          }
        }, 50);
      }
    }, 1500);
  };

  // FINAL SETUP COMPLETE SUBMISSION
  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    setFeedback(null);

    const activeUser = useAuthStore.getState().user;
    let token = '';
    if (activeUser) {
      token = Buffer.from(JSON.stringify(activeUser)).toString('base64');
    } else if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('aether_active_session_user') || localStorage.getItem('aether_active_session_user');
      if (stored) {
        token = Buffer.from(stored).toString('base64');
      }
    }

    try {
      const res = await fetch('/api/devices/claim', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          deviceName: nodeName,
          productId: selectedProduct.id,
          productName: selectedProduct.customerProductName,
          boardFamily: selectedProduct.boardFamily,
          boardType: selectedProduct.boardType || 'ESP32 Dev Module',
          serialNumber: selectedDevice?.serialNumber || `AGRI-${selectedProduct.boardFamily}-DEVICE`,
          macAddress: selectedDevice?.macAddress || 'CC:50:E3:8A:12:34',
          wifiSsid,
          selectedSensors,
          farmId: selectedFarm === 'North Commercial Farm' ? 'farm-north' : 'farm-south',
          zoneId: selectedZone.includes('Zone A') ? 'zone-a' : 'zone-b',
          claimSessionId,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setFeedback({ type: 'success', message: 'Device claimed & setup complete!' });
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: data.message || 'Claim command failed.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Connection error during final setup.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleSensor = (sensor: string) => {
    setSelectedSensors((prev) =>
      prev.includes(sensor) ? prev.filter((s) => s !== sensor) : [...prev, sensor]
    );
  };

  return (
    <div className="fixed inset-0 bg-[#090d16]/90 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-[#111827] border border-slate-800 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative text-slate-100 font-sans">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Add Device</h2>
              <p className="text-xs text-slate-400">Discovering nearby wireless hardware</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {feedback && (
          <div
            className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
              feedback.type === 'success'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                : 'bg-red-950/80 text-red-300 border border-red-800/60'
            }`}
          >
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            )}
            <span>{feedback.message}</span>
          </div>
        )}

        {/* STEP 1: SCAN & CHOOSE (WIPRO AUTO SCAN DASHBOARD) */}
        {step === 1 && (
          <div className="space-y-5">
            {/* AUTO SCAN AREA */}
            <div className="p-5 rounded-2xl bg-slate-950/50 border border-purple-500/20 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
                  Auto Scanning (BLE & Wi-Fi)
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-purple-950/60 border border-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Bluetooth className="w-3 h-3 text-purple-400" /> BLE
                  </span>
                  <span className="text-[10px] bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                    <Wifi className="w-3 h-3 text-indigo-400" /> Wi-Fi
                  </span>
                  {isScanning && <RefreshCw className="w-3.5 h-3.5 text-purple-400 animate-spin" />}
                </div>
              </div>

              {discoveredDevices.length > 0 ? (
                discoveredDevices.map((device) => (
                  <div
                    key={device.serialNumber}
                    className="p-4 rounded-xl bg-[#1f2937] border border-emerald-500/40 flex items-center justify-between shadow-lg animate-scale-up"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                        <Cpu className="w-5 h-5 animate-pulse" />
                      </div>
                      <div className="text-left">
                        <div className="text-xs font-bold text-white">{device.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{device.serialNumber}</div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDevice(device);
                        setStep(2); // Go directly to Wi-Fi entry
                      }}
                      className="px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all flex items-center space-x-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                  </div>
                ))
              ) : (
                <div className="text-center py-4 space-y-4">
                  <div className="text-xs text-slate-400">Searching for wireless hardware...</div>
                  
                  {/* Troubleshooting Guide */}
                  <div className="text-left bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 space-y-2 text-[11px] text-slate-300">
                    <div className="font-bold text-slate-200">Device Discovery Tips:</div>
                    <ul className="list-disc pl-4 space-y-1 text-slate-400">
                      <li>Verify your physical board is powered on.</li>
                      <li>Check status LED: It should **blink rapidly** (200ms).</li>
                      <li>If the LED is solid or off, **hold the Boot/Flash button on the board for 5 seconds** until the LED flashes to enter Setup Mode.</li>
                      <li>If connecting via Wi-Fi, **connect your computer/phone to the AGRI-SETUP-XXXX hotspot (Password: agrifarm2026)** to scan and provision it.</li>
                      <li>Ensure your computer/phone's wireless systems (Wi-Fi & Bluetooth) are enabled.</li>
                    </ul>
                  </div>

                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleExplicitBleScan}
                      className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-2.5 mx-auto"
                    >
                      <Bluetooth className="w-4 h-4 text-purple-200" />
                      <span className="text-purple-400 font-normal">|</span>
                      <Wifi className="w-4 h-4 text-indigo-200" />
                      <span>Scan BLE & Wi-Fi Devices</span>
                    </button>
                  </div>
                </div>
              )}

              {scanError && (
                <div className="p-3 bg-red-950/40 border border-red-900/40 rounded-xl text-left text-red-300 text-[11px] flex items-start space-x-1.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{scanError}</span>
                </div>
              )}
            </div>

            {/* MANUAL CATEGORIES LIST */}
            <div className="space-y-3">
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider text-left">Add Manually</div>
              <div className="grid grid-cols-3 gap-2.5">
                {productsList.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setSelectedProduct(p);
                      setSelectedDevice({
                        serialNumber: `AGRI-${p.boardFamily}-MANUAL`,
                        macAddress: 'CC:50:E3:8A:00:00',
                        boardFamily: p.boardFamily,
                        isSoftAP: true
                      });
                      setStep(2); // Direct to Wi-Fi setup page
                    }}
                    className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/10 cursor-pointer text-center space-y-2 transition-all flex flex-col items-center"
                  >
                    <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-300 flex items-center justify-center">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div className="text-[10px] font-bold text-white leading-tight">{p.customerProductName.split(' ')[0]} Node</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: ENTER WI-FI DETAILS */}
        {step === 2 && (
          <div className="space-y-4 text-left">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Enter Wi-Fi Password</h3>
              <p className="text-xs text-slate-400">
                AgriFlow needs Wi-Fi details to register and stream telemetry data.
              </p>
            </div>

            <div className="space-y-3.5 pt-1">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">
                  SSID {isLoadingSsids && <span className="text-[10px] text-purple-400 font-bold animate-pulse ml-1.5">(Scanning nearby networks...)</span>}
                </label>
                
                {scannedSsids.length > 0 && !isManualSsid ? (
                  <div className="relative">
                    <select
                      value={wifiSsid}
                      onChange={(e) => {
                        if (e.target.value === '__manual__') {
                          setIsManualSsid(true);
                          setWifiSsid('');
                        } else {
                          setWifiSsid(e.target.value);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono appearance-none"
                    >
                      {scannedSsids.map((ssid) => (
                        <option key={ssid} value={ssid}>
                          {ssid}
                        </option>
                      ))}
                      <option value="__manual__">-- Type SSID Manually --</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                      <ChevronRight className="w-4 h-4 transform rotate-90" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <input
                      type="text"
                      required
                      value={wifiSsid}
                      onChange={(e) => setWifiSsid(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                      placeholder="Enter Wi-Fi network SSID"
                    />
                    {scannedSsids.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsManualSsid(false);
                          setWifiSsid(scannedSsids[0]);
                        }}
                        className="text-[10px] text-purple-400 hover:text-purple-300 font-bold hover:underline"
                      >
                        ← Back to scanned networks list
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-1/2 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startConnectionFlow}
                className="w-1/2 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: CONNECTION PROGRESS COUNTDOWN CIRCLE (0% TO 100%) */}
        {step === 3 && (
          <div className="space-y-6 text-center py-4 flex flex-col items-center">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Connecting Device</h3>
              <p className="text-xs text-slate-400">Keep the device powered and close to your router.</p>
            </div>

            {/* CIRCULAR SVG PROGRESS */}
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="56"
                  stroke="#1e293b"
                  strokeWidth="8"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="56"
                  stroke="url(#purpleGrad)"
                  strokeWidth="8"
                  fill="transparent"
                  strokeDasharray={351.8}
                  strokeDashoffset={351.8 - (351.8 * connectionProgress) / 100}
                  strokeLinecap="round"
                  className="transition-all duration-300"
                />
                <defs>
                  <linearGradient id="purpleGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="100%" stopColor="#6366f1" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute flex flex-col items-center justify-center">
                <span className="text-2xl font-black text-white">{connectionProgress}%</span>
                <span className="text-[10px] text-purple-400 font-bold uppercase tracking-widest mt-0.5">Progress</span>
              </div>
            </div>

            {/* THREE PROGRESS CHECKMARKS */}
            <div className="w-full max-w-xs text-left space-y-3.5 pt-2">
              <div className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                  connectionProgress >= 30 ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700 text-slate-500'
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                </div>
                <span className={`text-xs font-semibold ${connectionProgress >= 30 ? 'text-white' : 'text-slate-500'}`}>
                  Connecting device...
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                  connectionProgress >= 70 ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700 text-slate-500'
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                </div>
                <span className={`text-xs font-semibold ${connectionProgress >= 70 ? 'text-white' : 'text-slate-500'}`}>
                  Registering on Cloud Gateway...
                </span>
              </div>

              <div className="flex items-center space-x-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs border ${
                  connectionProgress === 100 ? 'bg-emerald-500 border-emerald-400 text-slate-950' : 'border-slate-700 text-slate-500'
                }`}>
                  <Check className="w-3.5 h-3.5 stroke-[2.5px]" />
                </div>
                <span className={`text-xs font-semibold ${connectionProgress === 100 ? 'text-white' : 'text-slate-500'}`}>
                  Initializing Device settings...
                </span>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: RENAMING & DEVICE ASSIGNMENT (FINAL STAGE) */}
        {step === 4 && (
          <div className="space-y-4 text-left">
            <div className="space-y-1 text-center">
              <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
              <h3 className="text-sm font-bold text-white">Added Successfully</h3>
              <p className="text-xs text-slate-400">Device configured on farm profile.</p>
            </div>

            <div className="space-y-4 pt-1">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Device Name</label>
                <input
                  type="text"
                  required
                  value={nodeName}
                  onChange={(e) => setNodeName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-semibold"
                />
              </div>

              {/* SENSORS MAPPING */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1.5">Configure Active Sensors</label>
                <div className="grid grid-cols-2 gap-2">
                  {selectedProduct.supportedSensors?.map((sensor: string) => (
                    <label
                      key={sensor}
                      className={`p-2.5 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${
                        selectedSensors.includes(sensor)
                          ? 'bg-purple-950/30 border-purple-500 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedSensors.includes(sensor)}
                        onChange={() => toggleSensor(sensor)}
                        className="rounded border-slate-800 text-purple-600 focus:ring-purple-500"
                      />
                      <span className="text-[11px] font-semibold">{sensor}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* FARM SELECT */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Target Farm</label>
                <select
                  value={selectedFarm}
                  onChange={(e) => setSelectedFarm(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="North Commercial Farm">North Commercial Farm</option>
                  <option value="South Organic Greenhouse">South Organic Greenhouse</option>
                </select>
              </div>

              {/* ZONE SELECT */}
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Zone / Sector</label>
                <select
                  value={selectedZone}
                  onChange={(e) => setSelectedZone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Zone A (Corn & Wheat Sector)">Zone A (Corn & Wheat Sector)</option>
                  <option value="Zone B (Drip Fertigation)">Zone B (Drip Fertigation)</option>
                </select>
              </div>
            </div>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleCompleteSetup}
              className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-1.5"
            >
              {isSubmitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
              <span>Done</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
