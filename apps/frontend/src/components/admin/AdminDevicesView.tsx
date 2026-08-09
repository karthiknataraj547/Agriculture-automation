import React, { useState } from 'react';
import { useAdminStore } from '@/store/useAdminStore';
import {
  Cpu,
  Search,
  Building2,
  RefreshCw,
  ArrowRightLeft,
  KeyRound,
  Wifi,
  WifiOff,
  Terminal,
  CheckCircle2,
} from 'lucide-react';

export const AdminDevicesView: React.FC = () => {
  const { devicesList, accountsList, transferDevice, rotateDeviceCredentials, fetchAdminData } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [transferDevId, setTransferDevId] = useState<string | null>(null);
  const [targetAccId, setTargetAccId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [rotatedAuthCode, setRotatedAuthCode] = useState<{ id: string; code: string } | null>(null);

  const filteredDevices = devicesList.filter((d) => {
    return (
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.uuid?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.accountId?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferDevId || !targetAccId) return;

    const ok = await transferDevice(transferDevId, targetAccId, transferReason);
    if (ok) {
      setTransferDevId(null);
      setTargetAccId('');
      setTransferReason('');
    }
  };

  const handleRotate = async (devId: string) => {
    const code = await rotateDeviceCredentials(devId);
    if (code) {
      setRotatedAuthCode({ id: devId, code });
    }
  };

  return (
    <div className="space-y-6">
      {/* TITLE & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Cpu className="w-6 h-6 text-purple-400" />
            Global IoT Devices Administration
          </h1>
          <p className="text-xs text-slate-400">
            Cross-tenant ESP32/ESP8266 node directory, credential management, and hardware reassignment.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Serial, UUID, Account..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 w-72"
          />
        </div>
      </div>

      {/* ROTATED AUTH CODE SUCCESS BANNER */}
      {rotatedAuthCode && (
        <div className="p-4 rounded-xl bg-purple-950/80 border border-purple-500/50 text-purple-200 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center space-x-2">
            <KeyRound className="w-4 h-4 text-purple-400" />
            <span>
              Credentials rotated for <strong>{rotatedAuthCode.id}</strong>! New Auth Token:{' '}
              <strong className="text-white bg-slate-950 px-2 py-0.5 rounded border border-purple-400">
                {rotatedAuthCode.code}
              </strong>
            </span>
          </div>
          <button onClick={() => setRotatedAuthCode(null)} className="text-slate-400 hover:text-white">
            Dismiss
          </button>
        </div>
      )}

      {/* DEVICES TABLE */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800/80">
              <tr>
                <th className="px-5 py-3.5">Device Node</th>
                <th className="px-5 py-3.5">Assigned Tenant</th>
                <th className="px-5 py-3.5">Hardware / Chip</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Last Telemetry</th>
                <th className="px-5 py-3.5 text-right">Admin Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredDevices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-xs font-sans">
                    No matching devices registered across any tenant accounts.
                  </td>
                </tr>
              ) : (
                filteredDevices.map((d) => {
                  const isOnline = d.status === 'ONLINE';
                  const devId = d.uuid || d.serialNumber;

                  return (
                    <tr key={devId} className="hover:bg-slate-800/30 transition-colors">
                      {/* DEVICE NODE */}
                      <td className="px-5 py-4 font-sans">
                        <div className="font-semibold text-slate-100">{d.name || d.serialNumber}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{d.serialNumber || d.uuid}</div>
                      </td>

                      {/* ASSIGNED TENANT */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px]">
                          <Building2 className="w-3 h-3 text-purple-400" />
                          <span>{d.accountId || 'account-farm-alpha'}</span>
                        </span>
                      </td>

                      {/* HARDWARE / CHIP */}
                      <td className="px-5 py-4">
                        <div className="text-slate-200">{d.boardFamily || 'ESP8266'}</div>
                        <div className="text-[10px] text-slate-500">{d.firmwareVersion || 'v1.4.2'}</div>
                      </td>

                      {/* STATUS */}
                      <td className="px-5 py-4 font-sans">
                        {isOnline ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                            <Wifi className="w-3 h-3" />
                            <span>Online</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-slate-400 bg-slate-950 border border-slate-800 px-2.5 py-0.5 rounded-full text-[10px] font-semibold">
                            <WifiOff className="w-3 h-3" />
                            <span>Offline</span>
                          </span>
                        )}
                      </td>

                      {/* LAST TELEMETRY */}
                      <td className="px-5 py-4 text-[11px] text-slate-400">
                        {d.lastSeen ? new Date(d.lastSeen).toLocaleTimeString() : 'Just now'}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-5 py-4 text-right font-sans">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => handleRotate(devId)}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-600/30 text-slate-300 hover:text-purple-300 transition-all"
                            title="Rotate Auth Token"
                          >
                            <KeyRound className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => setTransferDevId(devId)}
                            className="px-2.5 py-1 rounded-lg bg-purple-950/80 border border-purple-700/60 text-purple-300 hover:bg-purple-900/90 text-xs font-semibold flex items-center space-x-1 transition-all"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            <span>Reassign Tenant</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DEVICE TRANSFER MODAL */}
      {transferDevId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-purple-400" />
              Transfer Device Between Accounts
            </h3>

            <form onSubmit={handleTransferSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Target Account ID</label>
                <select
                  required
                  value={targetAccId}
                  onChange={(e) => setTargetAccId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="">-- Select Destination Account --</option>
                  {accountsList.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.id})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Audit Reason</label>
                <textarea
                  rows={2}
                  required
                  placeholder="Reason for administrative device reassignment..."
                  value={transferReason}
                  onChange={(e) => setTransferReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setTransferDevId(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
