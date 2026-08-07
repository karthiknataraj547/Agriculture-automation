'use client';

import React from 'react';
import { clsx } from 'clsx';
import {
  BrainCircuit,
  Droplets,
  AlertTriangle,
  Bug,
  Gauge,
  Wrench,
  ArrowRight,
  TrendingDown,
  Sparkles,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useSpatialStore } from '../../store/useSpatialStore';
import { LocalAgronomistChat } from '../ai/LocalAgronomistChat';

const categoryConfig: Record<
  string,
  { icon: React.ReactNode; color: string; bg: string }
> = {
  IRRIGATION_OPTIMIZATION: {
    icon: <Droplets size={14} />,
    color: 'text-cyber-cyan',
    bg: 'neu-pressed',
  },
  ANOMALY_DETECTION: {
    icon: <AlertTriangle size={14} />,
    color: 'text-amber-600',
    bg: 'neu-pressed',
  },
  DISEASE_PREDICTION: {
    icon: <Bug size={14} />,
    color: 'text-red-600',
    bg: 'neu-pressed',
  },
  WATER_SAVING: {
    icon: <TrendingDown size={14} />,
    color: 'text-cyber-emerald',
    bg: 'neu-pressed',
  },
  HARDWARE_HEALTH: {
    icon: <Wrench size={14} />,
    color: 'text-purple-600',
    bg: 'neu-pressed',
  },
};

const severityBadge: Record<string, string> = {
  LOW: 'bg-slate-200 text-slate-700 border-slate-300',
  MEDIUM: 'bg-amber-100 text-amber-800 border-amber-300',
  HIGH: 'bg-red-100 text-red-800 border-red-300',
  CRITICAL: 'bg-red-200 text-red-900 border-red-400 font-bold',
};

export function InsightsPanel() {
  const { insights } = useSpatialStore();

  return (
    <div className="space-y-6">
      {/* Local Agronomist AI Interactive Chat */}
      <LocalAgronomistChat />

      {/* AI Insights Predictive Feed */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BrainCircuit size={16} className="text-cyber-cyan" />
            <span className="text-xs font-mono uppercase tracking-[0.15em] text-slate-800 font-bold">
              Real-Time AI Anomaly & Yield Optimization Feed
            </span>
          </div>
          <span className="text-xs font-mono text-cyber-emerald font-semibold">
            {insights.length} INSIGHTS GENERATED
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {insights.map((insight) => {
            const cat = categoryConfig[insight.category] || categoryConfig.ANOMALY_DETECTION;

            return (
              <GlassCard key={insight.id} variant="default" padding="md">
                {/* Header */}
                <div className="flex items-start gap-3 mb-3">
                  <div
                    className={clsx(
                      'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0',
                      cat.bg
                    )}
                  >
                    <span className={cat.color}>{cat.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <p className="text-xs font-bold text-slate-800 truncate">{insight.title}</p>
                      <span
                        className={clsx(
                          'flex-shrink-0 px-1.5 py-0.5 rounded text-[8px] font-mono uppercase border',
                          severityBadge[insight.impactSeverity]
                        )}
                      >
                        {insight.impactSeverity}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-600 leading-relaxed font-medium">
                      {insight.description}
                    </p>
                  </div>
                </div>

                {/* Confidence Bar */}
                <div className="mb-3 p-2 rounded-xl neu-pressed">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[8px] font-mono text-slate-500 uppercase tracking-wider font-semibold">
                      Model Confidence Score
                    </span>
                    <span className={clsx('text-[10px] font-mono font-bold', cat.color)}>
                      {(insight.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-300 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700 bg-cyber-cyan"
                      style={{ width: `${insight.confidenceScore * 100}%` }}
                    />
                  </div>
                </div>

                {/* Suggested Action */}
                <div className="flex items-start gap-2 p-2.5 rounded-xl neu-pressed">
                  <ArrowRight size={12} className="text-cyber-emerald mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] text-slate-700 font-medium">{insight.suggestedAction}</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-slate-300/40">
                  <span className="text-[8px] font-mono text-slate-500">
                    {new Date(insight.timestamp).toLocaleTimeString()}
                  </span>
                  {insight.estimatedWaterSavedLiters && (
                    <span className="text-[9px] font-mono text-cyber-emerald font-bold">
                      💧 {insight.estimatedWaterSavedLiters.toLocaleString()}L water saved
                    </span>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
