import React, { useState } from 'react';
import { useAdminStore } from '@/store/useAdminStore';
import { HardwareProduct } from '@aether/shared';
import {
  Package,
  Plus,
  Trash2,
  Cpu,
  Radio,
  CheckCircle2,
  Layers,
  Sliders,
  Settings,
  Shield,
  Activity,
  Box,
} from 'lucide-react';

export const AdminHardwareProductsView: React.FC = () => {
  const { hardwareProducts, createHardwareProduct, deleteHardwareProduct } = useAdminStore();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [internalName, setInternalName] = useState('');
  const [customerProductName, setCustomerProductName] = useState('');
  const [description, setDescription] = useState('');
  const [boardFamily, setBoardFamily] = useState<'ESP32' | 'ESP8266'>('ESP32');
  const [boardType, setBoardType] = useState('ESP32 Dev Module');
  const [firmwareVersion, setFirmwareVersion] = useState('1.0.0');

  // Selected Sensors Checkbox state
  const availableSensors = ['Soil Moisture', 'Temperature', 'Humidity', 'PIR Motion', 'Water Flow', 'Water Level'];
  const availableActuators = ['Pump Relay', 'Solenoid Valve', 'Fertigation Injector'];
  const [selectedSensors, setSelectedSensors] = useState<string[]>(['Soil Moisture', 'Temperature', 'Humidity']);
  const [selectedActuators, setSelectedActuators] = useState<string[]>(['Pump Relay']);

  const toggleSensor = (sensor: string) => {
    setSelectedSensors((prev) =>
      prev.includes(sensor) ? prev.filter((s) => s !== sensor) : [...prev, sensor]
    );
  };

  const toggleActuator = (actuator: string) => {
    setSelectedActuators((prev) =>
      prev.includes(actuator) ? prev.filter((a) => a !== actuator) : [...prev, actuator]
    );
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await createHardwareProduct({
      internalName: internalName || `${boardFamily}-CUSTOM-V1`,
      customerProductName: customerProductName || 'AgriFlow Controller Pro',
      description: description || 'Commercial agriculture automation controller.',
      boardFamily,
      boardType: boardFamily === 'ESP32' ? boardType : 'NodeMCU 1.0 (ESP-12E Module)',
      firmwareVersion,
      firmwareTemplate: `${customerProductName.replace(/\s+/g, '_')}_${firmwareVersion}`,
      supportedSensors: selectedSensors,
      supportedActuators: selectedActuators,
      gpioMapping: boardFamily === 'ESP32' ? {
        soilMoisturePin: 34,
        dhtPin: 4,
        relayPumpPin: 26,
        flowRatePin: 27,
      } : {
        soilMoisturePin: 'A0',
        dhtPin: 'D2',
        relayPumpPin: 'D3',
        flowRatePin: 'D5',
      },
      hardwareCapabilities: boardFamily === 'ESP32' ? ['BLE_PROVISIONING', 'WIFI_PROVISIONING', 'MQTTS_TLS'] : ['WIFI_AP_PROVISIONING', 'MQTTS_TLS'],
      status: 'STABLE',
    });

    if (ok) {
      setShowCreateModal(false);
      setInternalName('');
      setCustomerProductName('');
      setDescription('');
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Box className="w-6 h-6 text-purple-400" />
            Hardware Products & Commercial Templates
          </h1>
          <p className="text-xs text-slate-400">
            Define commercial customer-facing products, board families (ESP32/ESP8266), GPIO mappings, and firmware versions.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all self-start"
        >
          <Plus className="w-4 h-4" />
          <span>Create Hardware Product</span>
        </button>
      </div>

      {/* PRODUCTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hardwareProducts.map((p) => (
          <div
            key={p.id}
            className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl space-y-4 shadow-xl hover:border-purple-500/40 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-bold font-mono">
                    {p.boardFamily}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-bold">
                    {p.status}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white">{p.customerProductName}</h3>
                <div className="text-xs text-purple-400 font-mono">Internal ID: {p.internalName}</div>
              </div>

              <button
                onClick={() => deleteHardwareProduct(p.id)}
                className="p-2 rounded-xl bg-slate-950 text-slate-500 hover:text-red-400 border border-slate-800 hover:border-red-800 transition-all"
                title="Delete Product Template"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">{p.description}</p>

            {/* SPECS & GPIO MAP */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 font-mono text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Board Spec:</span>
                <span className="text-slate-200 font-semibold">{p.boardType}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Firmware Version:</span>
                <span className="text-cyan-400 font-semibold">v{p.firmwareVersion}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Provisioning Mode:</span>
                <span className="text-emerald-400 font-semibold">
                  {p.boardFamily === 'ESP32' ? 'Wi-Fi + BLE' : 'Wi-Fi AP (AGRI-SETUP)'}
                </span>
              </div>
            </div>

            {/* SUPPORTED SENSORS */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400">Supported Field Sensors:</div>
              <div className="flex flex-wrap gap-1.5">
                {p.supportedSensors?.map((s) => (
                  <span
                    key={s}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 text-purple-300 border border-slate-800 text-[10px] font-mono"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* SUPPORTED ACTUATORS */}
            <div className="space-y-1.5">
              <div className="text-[11px] font-semibold text-slate-400">Actuators / Relays:</div>
              <div className="flex flex-wrap gap-1.5">
                {p.supportedActuators?.map((a) => (
                  <span
                    key={a}
                    className="px-2.5 py-1 rounded-lg bg-slate-950 text-cyan-300 border border-slate-800 text-[10px] font-mono"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE HARDWARE PRODUCT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-purple-800/60 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="w-5 h-5 text-purple-400" />
              Create Commercial Hardware Product
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Customer-Facing Product Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AgriFlow Smart Irrigation Controller"
                  value={customerProductName}
                  onChange={(e) => setCustomerProductName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Internal Admin Code / SKU</label>
                <input
                  type="text"
                  placeholder="e.g. ESP32-IRRIGATION-V1"
                  value={internalName}
                  onChange={(e) => setInternalName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Board Family</label>
                  <select
                    value={boardFamily}
                    onChange={(e) => {
                      const fam = e.target.value as 'ESP32' | 'ESP8266';
                      setBoardFamily(fam);
                      setBoardType(fam === 'ESP32' ? 'ESP32 Dev Module' : 'NodeMCU 1.0 (ESP-12E Module)');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="ESP32">ESP32 (Wi-Fi + BLE)</option>
                    <option value="ESP8266">ESP8266 (Wi-Fi AP)</option>
                  </select>
                </div>

                <div>
                  <label className="text-slate-300 block mb-1 font-semibold">Firmware Version</label>
                  <input
                    type="text"
                    value={firmwareVersion}
                    onChange={(e) => setFirmwareVersion(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Product Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief summary of hardware capabilities..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-slate-300 block mb-1 font-semibold">Supported Sensors</label>
                <div className="grid grid-cols-2 gap-2">
                  {availableSensors.map((s) => (
                    <label key={s} className="flex items-center space-x-2 text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedSensors.includes(s)}
                        onChange={() => toggleSensor(s)}
                        className="rounded border-slate-800 text-purple-600 focus:ring-purple-500"
                      />
                      <span>{s}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 text-white font-semibold shadow-lg shadow-purple-600/30">
                  Publish Product Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
