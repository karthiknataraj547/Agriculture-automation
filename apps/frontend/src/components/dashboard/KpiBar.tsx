'use client';

import React from 'react';
import {
  Droplets,
  Thermometer,
  Power,
  Waves,
  Radio,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { StatBadge } from '../ui/StatBadge';
import { useSpatialStore } from '../../store/useSpatialStore';

export function KpiBar() {
  const { aggregatedStats, pumps } = useSpatialStore();
  const runningPumpsCount = pumps.filter((p) => p.status === 'RUNNING').length;

  const kpis = [
    {
      icon: <Droplets size={18} />,
      label: 'Avg Soil Moisture',
      value: aggregatedStats.avgSoilMoisture,
      unit: '%',
      severity:
        aggregatedStats.avgSoilMoisture < 30
          ? 'critical'
          : aggregatedStats.avgSoilMoisture > 60
            ? 'success'
            : 'normal',
    },
    {
      icon: <Thermometer size={18} />,
      label: 'Avg Temperature',
      value: aggregatedStats.avgTemperature,
      unit: '°C',
      severity:
        aggregatedStats.avgTemperature > 35
          ? 'critical'
          : aggregatedStats.avgTemperature > 30
            ? 'warning'
            : 'normal',
    },
    {
      icon: <Power size={18} />,
      label: 'Active Pumps',
      value: `${runningPumpsCount}/${pumps.length}`,
      unit: 'RUNNING',
      severity: runningPumpsCount > 0 ? ('success' as const) : ('warning' as const),
    },
    {
      icon: <Waves size={18} />,
      label: 'Water Flow',
      value: aggregatedStats.totalWaterFlow,
      unit: 'L/min',
      severity: 'normal' as const,
    },
    {
      icon: <Radio size={18} />,
      label: 'Sensors Online',
      value: aggregatedStats.totalSensorsOnline,
      unit: '',
      severity: 'success' as const,
    },
  ] as const;

  return (
    <div
      className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 md:gap-3"
      role="region"
      aria-label="Key performance indicators"
    >
      {kpis.map((kpi) => (
        <GlassCard key={kpi.label} variant="subtle" padding="sm">
          <StatBadge
            icon={kpi.icon}
            label={kpi.label}
            value={kpi.value}
            unit={kpi.unit}
            severity={kpi.severity as any}
          />
        </GlassCard>
      ))}
    </div>
  );
}
