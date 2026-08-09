import React, { useState } from 'react';
import { useAdminStore } from '@/store/useAdminStore';
import {
  Building2,
  Plus,
  Sliders,
  Cpu,
  Users,
  Activity,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const AdminAccountsView: React.FC = () => {
  const { accountsList, fetchAdminData, token } = useAdminStore();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newAccName, setNewAccName] = useState('');
  const [maxDevs, setMaxDevs] = useState(25);
  const [maxUsersCount, setMaxUsersCount] = useState(5);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/accounts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE_ACCOUNT',
          name: newAccName,
          maxDevices: maxDevs,
          maxUsers: maxUsersCount,
        }),
      });
      if (res.ok) {
        setShowCreateModal(false);
        setNewAccName('');
        await fetchAdminData();
      }
    } catch (err) {
      console.error('Create account error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* TITLE & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-purple-400" />
            Tenant Accounts & Resource Quotas
          </h1>
          <p className="text-xs text-slate-400">
            Multi-tenant organization boundary enforcement and resource capacity limits.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Tenant Account</span>
        </button>
      </div>

      {/* ACCOUNTS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {accountsList.map((acc) => (
          <div
            key={acc.id}
            className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4 relative overflow-hidden group hover:border-purple-500/40 transition-all"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <div className="text-sm font-bold text-slate-100">{acc.name}</div>
                <div className="text-[11px] font-mono text-purple-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> {acc.id}
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-[10px] font-semibold uppercase">
                {acc.status}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center font-mono">
              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">Max Devices</div>
                <div className="text-sm font-bold text-cyan-400 mt-0.5">{acc.maxDevices}</div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">Max Users</div>
                <div className="text-sm font-bold text-purple-400 mt-0.5">{acc.maxUsers}</div>
              </div>

              <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="text-[10px] text-slate-500">Max Telemetry</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">{acc.maxTelemetryRate}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* CREATE ACCOUNT MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-400" />
              Provision New Tenant Account
            </h3>

            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Account / Organization Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Acme Commercial Ag Corp"
                  value={newAccName}
                  onChange={(e) => setNewAccName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Max Devices</label>
                  <input
                    type="number"
                    value={maxDevs}
                    onChange={(e) => setMaxDevs(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-slate-300 block mb-1">Max Users</label>
                  <input
                    type="number"
                    value={maxUsersCount}
                    onChange={(e) => setMaxUsersCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold"
                >
                  Create Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
