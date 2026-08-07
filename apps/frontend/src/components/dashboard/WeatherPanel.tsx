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

const mockWeather = {
  temperature: 28.5,
  humidity: 62,
  condition: 'PARTLY_CLOUDY' as const,
  windSpeed: 14.2,
  windDirectionDegrees: 225,
  rainProbability: 15,
  uvIndex: 6,
  evapotranspirationEt0: 5.2,
};

const conditionIcons: Record<string, React.ReactNode> = {
  SUNNY: <Sun size={28} className="text-amber-500" />,
  PARTLY_CLOUDY: <CloudSun size={28} className="text-amber-500" />,
  CLOUDY: <Cloud size={28} className="text-slate-600 dark:text-slate-400" />,
  RAIN: <CloudRain size={28} className="text-sky-600 dark:text-cyan-400" />,
  STORMY: <CloudLightning size={28} className="text-rose-600 dark:text-rose-400" />,
};

const conditionLabels: Record<string, string> = {
  SUNNY: 'Clear Skies',
  PARTLY_CLOUDY: 'Partly Cloudy',
  CLOUDY: 'Overcast',
  RAIN: 'Rain',
  STORMY: 'Thunderstorm',
};

export function WeatherPanel() {
  const w = mockWeather;

  return (
    <GlassCard variant="default" padding="md" className="h-full">
      <div className="flex items-center gap-2 mb-3">
        <ThermometerSun size={14} className="text-amber-500" />
        <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-900 dark:text-slate-100 font-extrabold">
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
            <span className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{w.temperature}</span>
            <span className="text-xs text-slate-900 dark:text-slate-100 font-bold">°C</span>
          </div>
          <p className="text-[10px] text-slate-900 dark:text-slate-200 font-bold">{conditionLabels[w.condition]}</p>
        </div>
      </div>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        <MiniMetric icon={<Droplets size={12} />} label="Humidity" value={`${w.humidity}%`} />
        <MiniMetric icon={<Wind size={12} />} label="Wind" value={`${w.windSpeed} km/h`} />
        <MiniMetric icon={<CloudRain size={12} />} label="Rain Prob." value={`${w.rainProbability}%`} />
        <MiniMetric icon={<Eye size={12} />} label="UV Index" value={`${w.uvIndex}`} />
      </div>

      {/* ET0 */}
      <div className="mt-3 pt-3 border-t border-slate-300 dark:border-slate-800">
        <div className="flex justify-between items-center">
          <span className="text-[9px] font-mono text-slate-900 dark:text-slate-100 uppercase tracking-wider font-extrabold">
            Evapotranspiration (ET₀)
          </span>
          <span className="text-xs font-extrabold text-sky-700 dark:text-cyan-400 tabular-nums">
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
      <span className="text-sky-600 dark:text-cyan-400">{icon}</span>
      <div className="min-w-0">
        <p className="text-[8px] text-slate-900 dark:text-slate-200 uppercase tracking-wider font-extrabold">{label}</p>
        <p className="text-[11px] font-extrabold text-slate-900 dark:text-slate-100 tabular-nums">{value}</p>
      </div>
    </div>
  );
}
