'use client';

import React, { useState } from 'react';
import { Power, Clock, Droplet, ShieldAlert, Play, Square, Trash2, Plus, Cpu } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { StatusIndicator } from '../ui/StatusIndicator';
import { useSpatialStore } from '../../store/useSpatialStore';
import { MotionAlertBanner } from '../alerts/MotionAlertBanner';

export function PumpControlPanel() {
  const { pumps, devices, togglePumpState, setPumpState, deletePump, emergencyStop, setActiveView } = useSpatialStore();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filter pumps to strictly require that their associated hardware device is currently registered in the web tool
  const validDeviceUuids = new Set(devices.map((d) => d.uuid));
  const validDeviceSerials = new Set(devices.map((d) => d.serialNumber));
  const activePumps = pumps.filter(
    (p) =>
      p.deviceId &&
      (validDeviceUuids.has(p.deviceId) || validDeviceSerials.has(p.deviceId))
  );

  const runningCount = activePumps.filter((p) => p.status === 'RUNNING').length;

  return (
    <div className="space-y-4">
      {/* Motion Intrusion Banner */}
      <MotionAlertBanner />

      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 skeuo-panel p-3.5 rounded-xl">
        <div className="flex items-center gap-2.5">
          <span className="skeuo-rivet" />
          <Power size={18} className="text-sky-600 dark:text-cyan-400" />
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-slate-900 dark:text-slate-100 font-extrabold">
            MASTER PUMP ACTUATOR CONSOLE
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="skeuo-led skeuo-led-cyan" />
            <span className="text-xs font-mono font-extrabold text-emerald-700 dark:text-emerald-400 tracking-wider">
              {runningCount} / {activePumps.length} PUMPS ONLINE
            </span>
          </div>
          <button
            onClick={() => setActiveView('DEVICES')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl neu-button text-xs font-mono font-extrabold text-cyber-cyan hover:text-sky-700"
          >
            <Plus size={14} />
            <span>ADD PUMP NODE</span>
          </button>
        </div>
      </div>

      {/* Emergency Stop Alert if active */}
      {emergencyStop && (
        <div
          className="p-4 rounded-xl skeuo-panel border-2 border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 text-xs font-mono font-extrabold flex items-center gap-3 shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <ShieldAlert size={18} className="text-rose-600 animate-bounce flex-shrink-0" />
          <span>EMERGENCY INTERRUPT ACTIVE — HARDWARE RELAYS LOCKED</span>
        </div>
      )}

      {/* Empty State Banner if no pumps exist */}
      {activePumps.length === 0 && (
        <GlassCard variant="glow" padding="lg" className="border-cyber-cyan/30 text-center py-10">
          <div className="w-14 h-14 rounded-2xl neu-pressed flex items-center justify-center text-cyber-cyan mx-auto mb-3">
            <Power size={28} />
          </div>
          <h3 className="text-sm font-mono font-extrabold uppercase tracking-wider text-slate-900 dark:text-slate-100 mb-1">
            NO WATER PUMP ACTUATORS CONFIGURED
          </h3>
          <p className="text-xs font-mono text-slate-500 max-w-md mx-auto mb-4">
            Water pumps are attached per device node. Click below to provision an ESP32 or NodeMCU board with a Water Pump Relay enabled.
          </p>
          <button
            onClick={() => setActiveView('DEVICES')}
            className="px-5 py-2.5 rounded-xl bg-sky-600 dark:bg-cyan-500 text-white font-mono text-xs font-extrabold uppercase tracking-wider shadow-md hover:bg-sky-700 transition-all inline-flex items-center gap-2"
          >
            <Cpu size={16} />
            <span>PROVISION PUMP DEVICE NODE</span>
          </button>
        </GlassCard>
      )}

      {/* Pumps Console Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {activePumps.map((pump) => {
          const isRunning = pump.status === 'RUNNING';
          const isConfirmingDelete = confirmDeleteId === pump.id;

          return (
            <GlassCard
              key={pump.id}
              variant={isRunning ? 'glow' : 'default'}
              padding="lg"
              rivets={true}
            >
              {/* Card Top Console Bar */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center skeuo-pressed ${
                      isRunning ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <Power size={20} className={isRunning ? 'drop-shadow-[0_0_8px_#22c55e]' : ''} />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold tracking-wider text-slate-900 dark:text-slate-100 font-mono uppercase">
                      {pump.name}
                    </h3>
                    <p className="text-xs font-mono text-slate-700 dark:text-slate-300 font-bold mt-0.5">
                      {pump.zoneName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <StatusIndicator
                    status={isRunning ? 'online' : 'offline'}
                    label={isRunning ? 'ACTIVE' : 'STANDBY'}
                    size="sm"
                  />

                  {/* Delete Pump Button */}
                  {isConfirmingDelete ? (
                    <button
                      onClick={() => deletePump(pump.id)}
                      className="px-2 py-1 rounded bg-rose-600 text-white text-[10px] font-mono font-bold hover:bg-rose-700 shadow-sm"
                      title="Confirm delete"
                    >
                      CONFIRM DELETE
                    </button>
                  ) : (
                    <button
                      onClick={() => setConfirmDeleteId(pump.id)}
                      className="p-1.5 rounded-lg neu-button text-slate-400 hover:text-rose-600 transition-all"
                      title="Delete pump console card"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Physical Glass Viewport LCD Displays */}
              <div className="grid grid-cols-2 gap-3 my-4">
                {/* Flow Rate Display */}
                <div className="p-3 rounded-lg skeuo-glass-bezel text-center">
                  <div className="flex items-center justify-center gap-1.5 text-sky-400 mb-1">
                    <Droplet size={14} />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-300 font-bold">Flow Telemetry</span>
                  </div>
                  <span className="text-base font-bold font-mono text-sky-300 tabular-nums drop-shadow-md">
                    {pump.flowRateLmin.toFixed(1)} <span className="text-[10px] text-slate-400">L/min</span>
                  </span>
                </div>

                {/* Runtime Meter */}
                <div className="p-3 rounded-lg skeuo-glass-bezel text-center">
                  <div className="flex items-center justify-center gap-1.5 text-amber-400 mb-1">
                    <Clock size={14} />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-300 font-bold">Duty Meter</span>
                  </div>
                  <span className="text-base font-bold font-mono text-amber-300 tabular-nums drop-shadow-md">
                    {pump.runtimeMinutes} <span className="text-[10px] text-slate-400">mins</span>
                  </span>
                </div>
              </div>

              {/* Explicit Push-Button Controls */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  disabled={emergencyStop}
                  onClick={() => setPumpState(pump.id, 'RUNNING')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] rounded-xl text-xs font-mono font-extrabold transition-all cursor-pointer ${
                    isRunning
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'neu-button text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/10'
                  } ${emergencyStop ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Play size={14} className="fill-current" />
                  <span>START PUMP</span>
                </button>

                <button
                  type="button"
                  disabled={emergencyStop}
                  onClick={() => setPumpState(pump.id, 'OFF')}
                  className={`flex items-center justify-center gap-1.5 py-2.5 min-h-[44px] rounded-xl text-xs font-mono font-extrabold transition-all cursor-pointer ${
                    !isRunning
                      ? 'bg-rose-600 text-white shadow-md'
                      : 'neu-button text-rose-700 dark:text-rose-400 hover:bg-rose-500/10'
                  } ${emergencyStop ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  <Square size={14} className="fill-current" />
                  <span>STOP PUMP</span>
                </button>
              </div>

              {/* Physical Actuation Control Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-300 dark:border-slate-800">
                <span className="text-[10px] font-mono text-slate-800 dark:text-slate-200 uppercase font-extrabold tracking-wider">
                  {pump.manualOverride ? '⚡ MANUAL OVERRIDE' : '🤖 AUTO SCHEDULE'}
                </span>

                {/* 3D Mechanical Toggle Switch Control */}
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-slate-100">
                    {isRunning ? 'ON' : 'OFF'}
                  </span>
                  <div
                    onClick={() => !emergencyStop && togglePumpState(pump.id)}
                    className={`skeuo-switch-track cursor-pointer ${isRunning ? 'active' : ''} ${emergencyStop ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={isRunning ? 'Turn Off' : 'Start Pump'}
                    role="switch"
                    aria-checked={isRunning}
                    tabIndex={0}
                  >
                    <div className="skeuo-switch-handle" />
                  </div>
                </div>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
