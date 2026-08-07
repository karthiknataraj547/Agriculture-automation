'use client';

import React from 'react';
import { Power, Activity, Clock, Droplet, ShieldAlert, Cpu } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { StatusIndicator } from '../ui/StatusIndicator';
import { useSpatialStore } from '../../store/useSpatialStore';
import { MotionAlertBanner } from '../alerts/MotionAlertBanner';

export function PumpControlPanel() {
  const { pumps, togglePumpState, emergencyStop } = useSpatialStore();

  const runningCount = pumps.filter((p) => p.status === 'RUNNING').length;

  return (
    <div>
      {/* Motion Intrusion Banner */}
      <MotionAlertBanner />

      {/* Console Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5 skeuo-panel p-3.5 rounded-xl">
        <div className="flex items-center gap-2.5">
          <span className="skeuo-rivet" />
          <Power size={18} className="text-sky-600 dark:text-cyan-400" />
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-slate-800 dark:text-slate-100 font-bold">
            MASTER PUMP ACTUATOR CONSOLE
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="skeuo-led skeuo-led-cyan" />
          <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tracking-wider">
            {runningCount} / {pumps.length} PUMPS ONLINE
          </span>
        </div>
      </div>

      {/* Emergency Stop Alert if active */}
      {emergencyStop && (
        <div
          className="p-4 mb-5 rounded-xl skeuo-panel border-2 border-rose-500 bg-rose-500/10 text-rose-600 dark:text-rose-400 text-xs font-mono font-bold flex items-center gap-3 shadow-lg"
          role="alert"
          aria-live="assertive"
        >
          <ShieldAlert size={18} className="text-rose-600 animate-bounce flex-shrink-0" />
          <span>EMERGENCY INTERRUPT ACTIVE — HARDWARE RELAYS LOCKED</span>
        </div>
      )}

      {/* Pumps Console Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {pumps.map((pump) => {
          const isRunning = pump.status === 'RUNNING';

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
                      isRunning ? 'text-emerald-500' : 'text-slate-400'
                    }`}
                  >
                    <Power size={20} className={isRunning ? 'drop-shadow-[0_0_8px_#22c55e]' : ''} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold tracking-wide text-slate-800 dark:text-slate-100 font-mono uppercase">{pump.name}</h3>
                    <p className="text-[10px] font-mono text-slate-500 font-semibold">{pump.zoneName}</p>
                  </div>
                </div>

                <StatusIndicator
                  status={isRunning ? 'online' : 'offline'}
                  label={isRunning ? 'ACTIVE' : 'STANDBY'}
                  size="sm"
                />
              </div>

              {/* Physical Glass Viewport LCD Displays */}
              <div className="grid grid-cols-2 gap-3 my-4">
                {/* Flow Rate Display */}
                <div className="p-3 rounded-lg skeuo-glass-bezel text-center">
                  <div className="flex items-center justify-center gap-1.5 text-sky-400 mb-1">
                    <Droplet size={14} />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold">Flow Telemetry</span>
                  </div>
                  <span className="text-base font-bold font-mono text-sky-300 tabular-nums drop-shadow-md">
                    {pump.flowRateLmin.toFixed(1)} <span className="text-[10px] text-slate-400">L/min</span>
                  </span>
                </div>

                {/* Runtime Meter */}
                <div className="p-3 rounded-lg skeuo-glass-bezel text-center">
                  <div className="flex items-center justify-center gap-1.5 text-amber-400 mb-1">
                    <Clock size={14} />
                    <span className="text-[9px] font-mono uppercase tracking-wider text-slate-400 font-bold">Duty Meter</span>
                  </div>
                  <span className="text-base font-bold font-mono text-amber-300 tabular-nums drop-shadow-md">
                    {pump.runtimeMinutes} <span className="text-[10px] text-slate-400">mins</span>
                  </span>
                </div>
              </div>

              {/* Physical Actuation Control Bar */}
              <div className="flex items-center justify-between pt-3 border-t border-slate-300 dark:border-slate-800">
                <span className="text-[9px] font-mono text-slate-500 uppercase font-bold tracking-wider">
                  {pump.manualOverride ? '⚡ MANUAL OVERRIDE' : '🤖 AUTO SCHEDULE'}
                </span>

                {/* 3D Mechanical Toggle Switch Control */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono font-bold text-slate-600 dark:text-slate-400">
                    {isRunning ? 'ON' : 'OFF'}
                  </span>
                  <div
                    onClick={() => !emergencyStop && togglePumpState(pump.id)}
                    className={`skeuo-switch-track ${isRunning ? 'active' : ''} ${emergencyStop ? 'opacity-50 cursor-not-allowed' : ''}`}
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
