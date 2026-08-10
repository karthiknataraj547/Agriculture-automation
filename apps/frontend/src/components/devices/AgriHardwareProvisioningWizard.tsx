import React, { useState, useEffect } from 'react';
import { useSpatialStore } from '@/store/useSpatialStore';
import {
  Cpu,
  Wifi,
  Search,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Radio,
  Sliders,
  Layers,
  Sparkles,
  RefreshCw,
  Lock,
  Box,
  Activity,
  AlertCircle,
  X,
} from 'lucide-react';

interface AgriHardwareProvisioningWizardProps {
  onClose: () => void;
  onSuccess: () => void;
}

export const AgriHardwareProvisioningWizard: React.FC<AgriHardwareProvisioningWizardProps> = ({
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState(1);

  // Form State
  const [nodeName, setNodeName] = useState('North Field Pump');

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

  // Discovery simulation
  const [isScanning, setIsScanning] = useState(false);
  const [foundDevice, setFoundDevice] = useState<any | null>(null);

  // Connected Sensors selection
  const [selectedSensors, setSelectedSensors] = useState<string[]>(['Soil Moisture', 'Temperature', 'Humidity']);

  // Farm & Zone assignment
  const [selectedFarm, setSelectedFarm] = useState('North Commercial Farm');
  const [selectedZone, setSelectedZone] = useState('Zone A (Corn & Wheat Sector)');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    // Fetch products from API if available
    fetch('/api/admin/products')
      .then((r) => r.json())
      .then((d) => {
        if (d.products && d.products.length > 0) {
          setProductsList(d.products);
          setSelectedProduct(d.products[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleScanForDevice = () => {
    setIsScanning(true);
    setFoundDevice(null);
    setTimeout(() => {
      setIsScanning(false);
      setFoundDevice({
        serialNumber: `AGRI-${selectedProduct.boardFamily}-${Math.floor(100000 + Math.random() * 900000)}`,
        rssi: -48,
        mode: selectedProduct.boardFamily === 'ESP32' ? 'BLE_PLUS_WIFI' : 'WIFI_AP_AGRI_SETUP',
      });
    }, 2500);
  };

  const toggleSensor = (sensor: string) => {
    setSelectedSensors((prev) =>
      prev.includes(sensor) ? prev.filter((s) => s !== sensor) : [...prev, sensor]
    );
  };

  const handleCompleteSetup = async () => {
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const res = await fetch('/api/devices/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          deviceName: nodeName,
          productId: selectedProduct.id,
          productName: selectedProduct.customerProductName,
          boardFamily: selectedProduct.boardFamily,
          boardType: selectedProduct.boardType,
          wifiSsid,
          selectedSensors,
          farmId: 'farm-north',
          zoneId: 'zone-a',
        }),
      });

      const data = await res.json();
      if (data.success) {
        setFeedback({ type: 'success', message: data.message });
        setTimeout(() => {
          onSuccess();
        }, 1200);
      } else {
        setFeedback({ type: 'error', message: data.message || 'Provisioning failed.' });
      }
    } catch (e: any) {
      setFeedback({ type: 'error', message: e.message || 'Connection error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-slate-900 border border-purple-800/60 rounded-3xl max-w-xl w-full p-6 space-y-6 shadow-2xl relative text-slate-100 font-sans">
        {/* HEADER BAR */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Agriculture Node Provisioning</h2>
              <p className="text-xs text-slate-400">Step {step} of 8 — Simple Pair & Setup</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* STEP PROGRESS BAR */}
        <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-purple-600 to-cyan-400 h-full transition-all duration-500"
            style={{ width: `${(step / 8) * 100}%` }}
          />
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

        {/* STEP 1: NODE NAME */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Step 1: Name Your Agricultural Node</h3>
              <p className="text-xs text-slate-400">
                Give a friendly nickname to identify this controller (e.g. North Field Pump, Soil Probe 1).
              </p>
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Node Nickname</label>
              <input
                type="text"
                required
                value={nodeName}
                onChange={(e) => setNodeName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-semibold"
                placeholder="e.g. North Field Pump"
              />
            </div>
          </div>
        )}

        {/* STEP 2: SELECT COMMERCIAL PRODUCT */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Step 2: Select Agriculture Controller Product</h3>
              <p className="text-xs text-slate-400">Choose the company hardware product you are setting up.</p>
            </div>

            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {productsList.map((p) => (
                <div
                  key={p.id}
                  onClick={() => setSelectedProduct(p)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                    selectedProduct?.id === p.id
                      ? 'bg-purple-950/40 border-purple-500 shadow-lg shadow-purple-900/20'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="font-bold text-white text-xs">{p.customerProductName}</div>
                    <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                      {p.boardFamily} Mode
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{p.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: WI-FI CREDENTIALS */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Step 3: Farm Wi-Fi Credentials</h3>
              <p className="text-xs text-slate-400">
                Enter your farm network Wi-Fi SSID and password so the controller can connect.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Farm Wi-Fi Name (SSID)</label>
                <input
                  type="text"
                  required
                  value={wifiSsid}
                  onChange={(e) => setWifiSsid(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Wi-Fi Password</label>
                <input
                  type="password"
                  required
                  value={wifiPass}
                  onChange={(e) => setWifiPass(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: FIND & DISCOVER HARDWARE */}
        {step === 4 && (
          <div className="space-y-4 text-center py-2">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Step 4: Scan & Discover Hardware Node</h3>
              <p className="text-xs text-slate-400">
                {selectedProduct.boardFamily === 'ESP32'
                  ? 'Searching for nearby ESP32 Bluetooth / Wi-Fi provisioning signals...'
                  : 'Searching for ESP8266 AGRI-SETUP-XXXX Wi-Fi Access Point...'}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col items-center space-y-4">
              {isScanning ? (
                <div className="flex flex-col items-center space-y-2">
                  <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                  <span className="text-xs text-slate-300 font-mono">Scanning nearby signals...</span>
                </div>
              ) : foundDevice ? (
                <div className="space-y-3 text-center">
                  <div className="w-12 h-12 rounded-full bg-emerald-950 border border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">{selectedProduct.customerProductName} Discovered!</div>
                    <div className="text-[11px] text-cyan-400 font-mono">Serial: {foundDevice.serialNumber}</div>
                    <div className="text-[10px] text-emerald-400 font-mono">Signal Strength: {foundDevice.rssi} dBm (Excellent)</div>
                  </div>
                </div>
              ) : (
                <button
                  onClick={handleScanForDevice}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 flex items-center space-x-2"
                >
                  <Search className="w-4 h-4" />
                  <span>Start Hardware Discovery</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: CONNECT & TRANSMIT WI-FI CONFIG */}
        {step === 5 && (
          <div className="space-y-4 text-center py-2">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Step 5: Provision Wi-Fi Credentials to Controller</h3>
              <p className="text-xs text-slate-400">
                Transmitting farm network credentials securely to controller...
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-center space-x-2 text-emerald-400 font-mono text-xs font-bold">
                <Wifi className="w-5 h-5 animate-pulse" />
                <span>Wi-Fi Credentials Transmitted</span>
              </div>
              <div className="text-[11px] text-slate-300">
                Controller connecting to network <span className="text-purple-400 font-mono font-bold">{wifiSsid}</span>...
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: SELECT ACTIVE SENSORS */}
        {step === 6 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Step 6: Select Active Field Sensors</h3>
              <p className="text-xs text-slate-400">Check which sensors are physically wired to this node.</p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {selectedProduct.supportedSensors?.map((sensor: string) => (
                <label
                  key={sensor}
                  className={`p-3 rounded-xl border flex items-center space-x-3 cursor-pointer transition-all ${
                    selectedSensors.includes(sensor)
                      ? 'bg-purple-950/40 border-purple-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedSensors.includes(sensor)}
                    onChange={() => toggleSensor(sensor)}
                    className="rounded border-slate-800 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="text-xs font-semibold">{sensor}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {/* STEP 7: SELECT FARM & ZONE */}
        {step === 7 && (
          <div className="space-y-4">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Step 7: Assign Farm & Irrigation Zone</h3>
              <p className="text-xs text-slate-400">Assign this node to a specific farm location and sector.</p>
            </div>

            <div className="space-y-3">
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

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Irrigation Zone / Sector</label>
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
          </div>
        )}

        {/* STEP 8: COMPLETE SETUP */}
        {step === 8 && (
          <div className="space-y-4 text-center py-2">
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-white">Step 8: Complete Agriculture Node Pairing</h3>
              <p className="text-xs text-slate-400">Review settings and complete provisioning.</p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-left font-mono text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Node Name:</span>
                <span className="text-white font-bold">{nodeName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Controller Product:</span>
                <span className="text-purple-400 font-bold">{selectedProduct.customerProductName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Assigned Zone:</span>
                <span className="text-cyan-400 font-bold">{selectedZone}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Active Sensors:</span>
                <span className="text-emerald-400 font-bold">{selectedSensors.join(', ')}</span>
              </div>
            </div>
          </div>
        )}

        {/* FOOTER BUTTONS */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <button
            disabled={step === 1}
            onClick={() => setStep((s) => s - 1)}
            className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold disabled:opacity-30 disabled:cursor-not-allowed flex items-center space-x-1"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </button>

          {step < 8 ? (
            <button
              disabled={step === 4 && !foundDevice}
              onClick={() => setStep((s) => s + 1)}
              className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 flex items-center space-x-1 disabled:opacity-40"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              disabled={isSubmitting}
              onClick={handleCompleteSetup}
              className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center space-x-1.5"
            >
              {isSubmitting ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>{isSubmitting ? 'Provisioning Node...' : 'Complete & Launch Node'}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
