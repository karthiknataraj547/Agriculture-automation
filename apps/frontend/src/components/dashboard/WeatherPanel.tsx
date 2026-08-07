'use client';

import React from 'react';
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudSun,
  Wind,
  Droplets,
  ThermometerSun,
  Eye,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useSpatialStore } from '../../store/useSpatialStore';

const ZERO_WEATHER = {
  temperature: 0,
  humidity: 0,
  condition: 'PARTLY_CLOUDY' as const,
  windSpeed: 0,
  windDirectionDegrees: 0,
  rainProbability: 0,
  uvIndex: 0,
  evapotranspirationEt0: 0,
};

const conditionIcons: Record<string, React.ReactNode> = {
  SUNNY: <Sun size={28} className="text-cyber-amber" />,
  PARTLY_CLOUDY: <CloudSun size={28} className="text-cyber-amber" />,
  CLOUDY: <Cloud size={28} className="text-slate-400" />,
  RAIN: <CloudRain size={28} className="text-cyber-cyan" />,
  STORMY: <CloudLightning size={28} className="text-cyber-crimson" />,
};

const conditionLabels: Record<string, string> = {
  SUNNY: 'Clear Skies',
  PARTLY_CLOUDY: 'Zero Activity / Calibrated',
  CLOUDY: 'Overcast',
  RAIN: 'Rain',
  STORMY: 'Thunderstorm',
};

export function WeatherPanel() {
  const { isZeroDataMode } = useSpatialStore();

  const w = isZeroDataMode
    ? ZERO_WEATHER
    : {
        temperature: 0,
        humidity: 0,
        condition: 'PARTLY_CLOUDY' as const,
        windSpeed: 0,
        windDirectionDegrees: 0,
        rainProbability: 0,
        uvIndex: 0,
        evapotranspirationEt0: 0,
      };

  return (
    <GlassCard variant="default" padding="md" className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <ThermometerSun size={14} className="text-cyber-amber" />
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 font-medium">
          Hyper-Local Weather
        </span>
      </div>

      {/* Main display */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex-shrink-0">
          {conditionIcons[w.condition]}
        </div>
        <div>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-slate-200 tabular-nums">{w.temperature}</span>
            <span className="text-xs text-slate-500">°C</span>
          </div>
          <p className="text-[10px] text-slate-500">{conditionLabels[w.condition]}</p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <MiniMetric icon={<Droplets size={10} />} label="Humidity" value={`${w.humidity}%`} />
        <MiniMetric icon={<Wind size={10} />} label="Wind" value={`${w.windSpeed} km/h`} />
        <MiniMetric icon={<CloudRain size={10} />} label="Rain Prob." value={`${w.rainProbability}%`} />
        <MiniMetric icon={<Eye size={10} />} label="UV Index" value={`${w.uvIndex}`} />
      </div>

      {/* ET0 */}
      <div className="mt-3 pt-3 border-t border-white/[0.06]">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wider">
            Evapotranspiration (ET₀)
          </span>
          <span className="text-xs font-bold text-cyber-cyan tabular-nums">
            {w.evapotranspirationEt0} mm/day
          </span>
        </div>
      </div>
    </GlassCard>
  );
}

function MiniMetric({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-2 p-2 rounded-xl neu-pressed">
      <span className="text-cyber-cyan">{icon}</span>
      <div className="min-w-0">
        <p className="text-[8px] text-slate-500 uppercase tracking-wider">{label}</p>
        <p className="text-[11px] font-medium text-slate-300 tabular-nums">{value}</p>
      </div>
    </div>
  );
}
