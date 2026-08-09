import React, { useState } from 'react';
import { useAdminStore } from '@/store/useAdminStore';
import {
  AlertTriangle,
  ShieldAlert,
  Power,
  Lock,
  Building2,
  CheckCircle2,
  AlertOctagon,
} from 'lucide-react';

export const AdminEmergencyControls: React.FC = () => {
  const { triggerEmergencyAction } = useAdminStore();
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [reason, setReason] = useState('');
  const [targetId, setTargetId] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ success: boolean; text: string } | null>(null);

  const handleTrigger = async () => {
    if (!selectedAction || !reason) return;
    const ok = await triggerEmergencyAction(selectedAction, reason, targetId);

    if (ok) {
      setStatusMsg({
        success: true,
        text: `EMERGENCY ACTION '${selectedAction}' TRIGGERED SUCCESSFULLY WITH AUDIT LOG.`,
      });
      setSelectedAction(null);
      setReason('');
      setTargetId('');
    } else {
      setStatusMsg({
        success: false,
        text: 'Failed to dispatch emergency command.',
      });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* TITLE */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-red-400 flex items-center gap-2">
          <ShieldAlert className="w-7 h-7 text-red-500" />
          High-Security Emergency Controls
        </h1>
        <p className="text-xs text-slate-400">
          Executive administrative overrides for immediate risk mitigation, physical actuator shutdown, and platform safety.
        </p>
      </div>

      {statusMsg && (
        <div
          className={`p-4 rounded-xl text-xs font-mono border flex items-center space-x-2 ${
            statusMsg.success
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-red-950/80 border-red-500/50 text-red-300'
          }`}
        >
          {statusMsg.success ? <CheckCircle2 className="w-4 h-4" /> : <AlertOctagon className="w-4 h-4" />}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* EMERGENCY ACTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* GLOBAL PUMP STOP */}
        <div className="p-5 rounded-2xl bg-red-950/20 border border-red-900/40 space-y-3 relative">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <Power className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-mono font-bold bg-red-950 text-red-400 border border-red-800 px-2 py-0.5 rounded">
              High Impact
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Global Pump Emergency Shutdown</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Dispatches an immediate hardware interrupt across all active farm nodes, forcing all pump relays to LOW (STOPPED).
            </p>
          </div>

          <button
            onClick={() => setSelectedAction('GLOBAL_PUMP_STOP')}
            className="w-full py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-lg shadow-red-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <Power className="w-4 h-4" />
            <span>TRIGGER GLOBAL PUMP STOP</span>
          </button>
        </div>

        {/* MAINTENANCE MODE */}
        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-900/40 space-y-3 relative">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <Lock className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-mono font-bold bg-amber-950 text-amber-400 border border-amber-800 px-2 py-0.5 rounded">
              Platform Lockdown
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">System Maintenance Mode</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Restricts access exclusively to SUPER_ADMIN users while performing infrastructure upgrades or system diagnostics.
            </p>
          </div>

          <button
            onClick={() => setSelectedAction('MAINTENANCE_MODE')}
            className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow-lg shadow-amber-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <Lock className="w-4 h-4" />
            <span>ENABLE MAINTENANCE MODE</span>
          </button>
        </div>

        {/* DISABLE TENANT ACCOUNT */}
        <div className="p-5 rounded-2xl bg-purple-950/20 border border-purple-900/40 space-y-3 relative">
          <div className="flex items-center justify-between">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400">
              <Building2 className="w-5 h-5" />
            </div>
            <span className="text-[10px] uppercase font-mono font-bold bg-purple-950 text-purple-400 border border-purple-800 px-2 py-0.5 rounded">
              Tenant Quarantine
            </span>
          </div>

          <div>
            <h3 className="text-base font-bold text-white">Quarantine Tenant Account</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Immediately revokes all active user sessions and disconnects hardware MQTT pipelines for a target tenant account.
            </p>
          </div>

          <button
            onClick={() => setSelectedAction('DISABLE_ACCOUNT')}
            className="w-full py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2"
          >
            <Building2 className="w-4 h-4" />
            <span>QUARANTINE TENANT</span>
          </button>
        </div>
      </div>

      {/* CONFIRMATION DIALOG */}
      {selectedAction && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-red-800/80 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center space-x-3 text-red-400">
              <AlertOctagon className="w-6 h-6" />
              <h3 className="text-lg font-bold text-white">Confirm High-Security Trigger</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to execute <strong className="text-red-400 font-mono">{selectedAction}</strong>. An immutable entry will be written to the system audit trail.
            </p>

            {selectedAction === 'DISABLE_ACCOUNT' && (
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Target Account ID</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. account-farm-alpha"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Mandatory Audit Reason</label>
              <textarea
                rows={3}
                required
                placeholder="Detail the security or operational justification (minimum 5 characters)..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={reason.trim().length < 5}
                onClick={handleTrigger}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-xs font-bold"
              >
                EXECUTE EMERGENCY OVERRIDE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
