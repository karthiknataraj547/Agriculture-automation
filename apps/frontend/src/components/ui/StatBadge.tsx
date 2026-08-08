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
  normal: 'text-sky-600 dark:text-cyan-400 bg-sky-50 dark:bg-sky-950/50 border-sky-200 dark:border-sky-800',
  warning: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
  critical: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-800',
  success: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
};

const valueColors = {
  normal: 'text-sky-700 dark:text-cyan-400',
  warning: 'text-amber-700 dark:text-amber-400',
  critical: 'text-rose-700 dark:text-rose-400',
  success: 'text-emerald-700 dark:text-emerald-400',
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
    <div className={clsx('flex items-center gap-2.5 min-w-0 p-1', className)}>
      {/* Glare-Free Icon Socket */}
      <div
        className={clsx(
          'flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center border shadow-xs',
          severityColors[severity]
        )}
      >
        {icon}
      </div>

      {/* Crystal Clear LCD Display Text */}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] uppercase tracking-wider text-slate-700 dark:text-slate-300 font-mono font-extrabold truncate">
          {label}
        </p>
        <div className="flex items-baseline gap-1">
          <span
            className={clsx(
              'text-base sm:text-lg font-mono font-extrabold tabular-nums',
              valueColors[severity]
            )}
          >
            {displayValue}
          </span>
          {unit && (
            <span className="text-[10px] text-slate-800 dark:text-slate-200 font-mono font-extrabold">{unit}</span>
          )}
          {trend && (
            <span
              className={clsx(
                'text-[10px] ml-1 font-mono font-bold',
                trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
                trend === 'down' && 'text-rose-600 dark:text-rose-400',
                trend === 'stable' && 'text-slate-500'
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
