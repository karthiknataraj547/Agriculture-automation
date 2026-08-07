'use client';

import React from 'react';
import { Server, Database, Zap, BrainCircuit, Radio, Shield } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { StatusIndicator } from '../ui/StatusIndicator';

interface ServiceEntry {
  name: string;
  icon: React.ReactNode;
  status: 'online' | 'warning' | 'offline';
  latency?: string;
}

const SERVICES: ServiceEntry[] = [
  { name: 'MQTT Broker', icon: <Radio size={12} />, status: 'online', latency: '2ms' },
  { name: 'TimescaleDB', icon: <Database size={12} />, status: 'online', latency: '5ms' },
  { name: 'Rules Engine', icon: <Zap size={12} />, status: 'online', latency: '1ms' },
  { name: 'AI Analytics', icon: <BrainCircuit size={12} />, status: 'online', latency: '12ms' },
  { name: 'IoT Simulator', icon: <Server size={12} />, status: 'online', latency: '—' },
  { name: 'Auth / RBAC', icon: <Shield size={12} />, status: 'online', latency: '3ms' },
];

export function SystemHealthPanel() {
  const onlineCount = SERVICES.filter((s) => s.status === 'online').length;

  return (
    <GlassCard variant="default" padding="md" className="h-full">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Server size={14} className="text-cyber-emerald" />
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 font-medium">
            System Health
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyber-emerald">
          {onlineCount}/{SERVICES.length} ACTIVE
        </span>
      </div>

      <div className="space-y-2">
        {SERVICES.map((svc) => (
          <div
            key={svc.name}
            className="flex items-center justify-between py-2 px-3 rounded-xl neu-pressed transition-all duration-200"
          >
            <div className="flex items-center gap-2">
              <span className="text-cyber-cyan">{svc.icon}</span>
              <span className="text-[11px] text-slate-300 font-medium">{svc.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {svc.latency && (
                <span className="text-[9px] font-mono text-slate-500 tabular-nums">
                  {svc.latency}
                </span>
              )}
              <StatusIndicator status={svc.status} size="sm" />
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}
