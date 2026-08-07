'use client';

import React from 'react';
import { AlertOctagon, BellRing, X, ShieldAlert, Radio } from 'lucide-react';
import { useSpatialStore } from '../../store/useSpatialStore';

export function MotionAlertBanner() {
  const { motionAlert, dismissMotionAlert, triggerMotionAlert } = useSpatialStore();

  if (!motionAlert || !motionAlert.active) {
    return (
      <div className="flex items-center justify-between px-4 py-2 mb-3 rounded-xl neu-pressed">
        <div className="flex items-center gap-2">
          <ShieldAlert size={14} className="text-cyber-emerald" />
          <span className="text-[10px] font-mono text-slate-600 font-medium uppercase tracking-wider">
            PIR Motion & Wildlife Perimeter Defense: ARMED & MONITORING
          </span>
        </div>
        <button
          onClick={() => triggerMotionAlert('zone-2', 'Zone 2: Soybean Sector', 'Simulated PIR Intrusion: Wild Boar / Deer detected in Zone 2!')}
          className="text-[9px] font-mono px-2.5 py-1 rounded-lg neu-button text-slate-600 hover:text-cyber-crimson transition-colors"
        >
          TEST MOTION ALERT
        </button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between px-4 py-3 mb-4 rounded-xl neu-convex border border-red-400/50 bg-gradient-to-r from-red-100 via-amber-50 to-red-100 shadow-[0_0_20px_rgba(220,38,38,0.25)] animate-pulse">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-red-600 text-white flex items-center justify-center flex-shrink-0 animate-bounce">
          <AlertOctagon size={18} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-red-700 tracking-wider uppercase">
              🚨 ANIMAL / WILDLIFE INTRUSION DETECTED IN {motionAlert.zoneName.toUpperCase()}
            </span>
            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-red-200 text-red-800 font-semibold">
              {motionAlert.timestamp}
            </span>
          </div>
          <p className="text-xs text-red-900 font-medium mt-0.5">
            {motionAlert.message}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={dismissMotionAlert}
          className="flex items-center gap-1 text-[10px] font-mono font-bold px-3 py-1.5 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors shadow-md"
        >
          <X size={12} />
          DISMISS ALERT
        </button>
      </div>
    </div>
  );
}
