'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Activity, Droplets, Thermometer, Beaker, Leaf } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { SpatialButton } from '../ui/SpatialButton';
import { useSpatialStore } from '../../store/useSpatialStore';

interface DataPoint {
  time: string;
  soilMoisture: number;
  airTemperature: number;
  humidity: number;
  ec: number;
  ph: number;
  waterFlowRate: number;
  tankLevel: number;
}

type ChartMetric = 'soilMoisture' | 'airTemperature' | 'humidity' | 'waterFlowRate';

const CHART_CONFIGS: Record<
  ChartMetric,
  { label: string; color: string; unit: string; icon: React.ReactNode; domain: [number, number] }
> = {
  soilMoisture: {
    label: 'Soil Moisture',
    color: '#00f3ff',
    unit: '%',
    icon: <Droplets size={12} />,
    domain: [0, 100],
  },
  airTemperature: {
    label: 'Air Temperature',
    color: '#ff6b35',
    unit: '°C',
    icon: <Thermometer size={12} />,
    domain: [10, 50],
  },
  humidity: {
    label: 'Humidity',
    color: '#00ff9d',
    unit: '%',
    icon: <Leaf size={12} />,
    domain: [20, 100],
  },
  waterFlowRate: {
    label: 'Water Flow Rate',
    color: '#8a2be2',
    unit: 'L/min',
    icon: <Beaker size={12} />,
    domain: [0, 30],
  },
};

const MAX_POINTS = 40;

export function TelemetryCharts() {
  const { latestReadings, selectedZoneId } = useSpatialStore();
  const [activeMetric, setActiveMetric] = useState<ChartMetric>('soilMoisture');
  const [history, setHistory] = useState<DataPoint[]>([]);
  const historyRef = useRef(history);
  historyRef.current = history;

  // Accumulate incoming telemetry as chart history
  useEffect(() => {
    const reading = latestReadings.get(selectedZoneId);
    if (!reading) return;

    const point: DataPoint = {
      time: new Date(reading.timestamp).toLocaleTimeString('en-US', {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
      soilMoisture: reading.soilMoisture,
      airTemperature: reading.airTemperature,
      humidity: reading.humidity,
      ec: reading.ec,
      ph: reading.ph,
      waterFlowRate: reading.waterFlowRate,
      tankLevel: reading.tankLevelPercent,
    };

    setHistory((prev) => {
      const next = [...prev, point];
      return next.length > MAX_POINTS ? next.slice(-MAX_POINTS) : next;
    });
  }, [latestReadings, selectedZoneId]);

  const config = CHART_CONFIGS[activeMetric];

  return (
    <GlassCard variant="default" padding="md">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-cyber-cyan" />
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 font-medium">
            Live Telemetry — {selectedZoneId.toUpperCase()}
          </span>
        </div>
        <div className="flex gap-1 overflow-x-auto pb-1 -mb-1 scrollbar-hide" role="tablist" aria-label="Telemetry metrics">
          {(Object.keys(CHART_CONFIGS) as ChartMetric[]).map((key) => (
            <SpatialButton
              key={key}
              size="sm"
              variant={activeMetric === key ? 'primary' : 'ghost'}
              icon={CHART_CONFIGS[key].icon}
              active={activeMetric === key}
              onClick={() => setActiveMetric(key)}
            >
              <span className="hidden sm:inline">{CHART_CONFIGS[key].label}</span>
            </SpatialButton>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="h-[180px] sm:h-[220px] md:h-[260px] w-full" role="img" aria-label={`${config.label} chart showing live telemetry data`}>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={history} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              <linearGradient id={`grad-${activeMetric}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={config.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke="rgba(148, 163, 184, 0.15)"
              strokeDasharray="3 3"
              vertical={false}
            />
            <XAxis
              dataKey="time"
              tick={{ fontSize: 9, fill: '#64748b' }}
              axisLine={{ stroke: 'rgba(148, 163, 184, 0.2)' }}
              tickLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={config.domain}
              tick={{ fontSize: 9, fill: '#64748b' }}
              axisLine={false}
              tickLine={false}
              width={35}
            />
            <Tooltip
              contentStyle={{
                background: '#f0f5fc',
                border: '1px solid rgba(255, 255, 255, 0.8)',
                borderRadius: '12px',
                fontSize: '11px',
                color: '#1e293b',
                boxShadow: '6px 6px 16px #b8c4d8, -6px -6px 16px #ffffff',
              }}
              labelStyle={{ color: '#475569', fontSize: '10px', fontFamily: 'monospace' }}
              formatter={(value: number) => [`${value} ${config.unit}`, config.label]}
            />
            <Area
              type="monotone"
              dataKey={activeMetric}
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#grad-${activeMetric})`}
              dot={false}
              activeDot={{
                r: 4,
                stroke: config.color,
                strokeWidth: 2,
                fill: '#ffffff',
              }}
              animationDuration={400}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Live value footer */}
      <div className="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-between">
        <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">
          Latest Reading
        </span>
        <span
          className="text-sm font-bold tabular-nums"
          style={{ color: config.color }}
        >
          {history.length > 0 ? (history[history.length - 1] as any)[activeMetric] : '—'}{' '}
          {config.unit}
        </span>
      </div>
    </GlassCard>
  );
}
