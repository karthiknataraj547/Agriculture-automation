'use client';

import React from 'react';
import { clsx } from 'clsx';
import { Zap, Power, ToggleLeft, ToggleRight, AlertTriangle } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useSpatialStore } from '../../store/useSpatialStore';

export function RulesPanel() {
  const { rules } = useSpatialStore();

  if (rules.length === 0) {
    return (
      <GlassCard variant="default" padding="lg">
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Zap size={32} className="text-slate-600" />
          <p className="text-sm text-slate-500">No automation rules loaded</p>
          <p className="text-[10px] text-slate-600 font-mono">
            Connect to backend to load active rules
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Zap size={14} className="text-cyber-amber" />
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 font-medium">
            Automation Rules Engine
          </span>
        </div>
        <span className="text-[10px] font-mono text-cyber-emerald">
          {rules.filter((r) => r.enabled).length} Active
        </span>
      </div>

      {/* Rules List */}
      <div className="space-y-3">
        {rules.map((rule) => (
          <GlassCard key={rule.id} variant="default" padding="md">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div
                  className={clsx(
                    'w-7 h-7 rounded-lg flex items-center justify-center border',
                    rule.enabled
                      ? 'bg-cyber-emerald/10 border-cyber-emerald/30 text-cyber-emerald'
                      : 'bg-obsidian-800/60 border-white/[0.06] text-slate-600'
                  )}
                >
                  <Power size={12} />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-300">{rule.name}</p>
                  <p className="text-[9px] font-mono text-slate-600">
                    {rule.id} · {rule.zoneId ? rule.zoneId.toUpperCase() : 'ALL ZONES'} · {rule.conditionLogic}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {rule.enabled ? (
                  <ToggleRight size={20} className="text-cyber-emerald" />
                ) : (
                  <ToggleLeft size={20} className="text-slate-600" />
                )}
              </div>
            </div>

            {/* Conditions */}
            <div className="mb-2">
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-1.5">
                IF ({rule.conditionLogic})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rule.conditions.map((c, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-obsidian-800/60 border border-white/[0.06] text-[10px] font-mono text-cyber-cyan"
                  >
                    <AlertTriangle size={8} className="text-cyber-amber" />
                    {String(c.metric)} {c.operator} {c.value}
                  </span>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div>
              <p className="text-[9px] font-mono text-slate-600 uppercase tracking-wider mb-1.5">
                THEN
              </p>
              <div className="flex flex-wrap gap-1.5">
                {rule.actions.map((a, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-cyber-emerald/5 border border-cyber-emerald/20 text-[10px] font-mono text-cyber-emerald"
                  >
                    <Zap size={8} />
                    {a.type} → {a.targetId}
                  </span>
                ))}
              </div>
            </div>

            {/* Last Triggered */}
            {rule.lastTriggered && (
              <div className="mt-2 pt-2 border-t border-white/[0.04]">
                <span className="text-[9px] font-mono text-slate-600">
                  Last triggered: {new Date(rule.lastTriggered).toLocaleString()}
                </span>
              </div>
            )}
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
