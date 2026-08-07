'use client';

import React, { useEffect, useRef, useState } from 'react';
import { clsx } from 'clsx';

interface StatBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  severity?: 'normal' | 'warning' | 'critical' | 'success';
  animate?: boolean;
  className?: string;
}

const severityColors = {
  normal: 'text-sky-600 dark:text-cyan-400',
  warning: 'text-amber-600 dark:text-amber-400',
  critical: 'text-rose-600 dark:text-rose-400',
  success: 'text-emerald-600 dark:text-emerald-400',
};

export function StatBadge({
  icon,
  label,
  value,
  unit,
  trend,
  severity = 'normal',
  animate = true,
  className,
}: StatBadgeProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValue = useRef(value);

  // Animate number transitions
  useEffect(() => {
    if (!animate || typeof value !== 'number' || typeof prevValue.current !== 'number') {
      setDisplayValue(value);
      prevValue.current = value;
      return;
    }

    const start = prevValue.current as number;
    const end = value as number;
    const duration = 600;
    const startTime = performance.now();

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = start + (end - start) * eased;

      setDisplayValue(Number.isInteger(end) ? Math.round(current) : Number(current.toFixed(1)));

      if (progress < 1) {
        requestAnimationFrame(step);
      }
    };

    requestAnimationFrame(step);
    prevValue.current = value;
  }, [value, animate]);

  return (
    <div className={clsx('flex items-center gap-3 min-w-0 skeuo-panel p-2.5 rounded-xl', className)}>
      {/* Metallic Icon Socket */}
      <div
        className={clsx(
          'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center skeuo-pressed',
          severityColors[severity]
        )}
      >
        {icon}
      </div>

      {/* Glass LCD Display Text */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-slate-500 font-mono font-semibold truncate">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <span
            className={clsx(
              'text-lg font-mono font-bold tabular-nums drop-shadow-sm',
              severityColors[severity]
            )}
          >
            {displayValue}
          </span>
          {unit && (
            <span className="text-[10px] text-slate-500 font-mono font-semibold">{unit}</span>
          )}
          {trend && (
            <span
              className={clsx(
                'text-[10px] ml-1 font-mono font-bold',
                trend === 'up' && 'text-emerald-500',
                trend === 'down' && 'text-rose-500',
                trend === 'stable' && 'text-slate-400'
              )}
            >
              {trend === 'up' ? '▲' : trend === 'down' ? '▼' : '—'}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
