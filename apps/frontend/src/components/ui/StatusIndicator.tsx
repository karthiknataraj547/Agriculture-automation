'use client';

import React from 'react';
import { clsx } from 'clsx';

type Status = 'online' | 'offline' | 'warning' | 'critical' | 'maintenance';

interface StatusIndicatorProps {
  status: Status;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const statusLedMap: Record<Status, { class: string; label: string }> = {
  online: {
    class: 'skeuo-led-green',
    label: 'Online',
  },
  offline: {
    class: 'skeuo-led-off',
    label: 'Offline',
  },
  warning: {
    class: 'skeuo-led-amber',
    label: 'Warning',
  },
  critical: {
    class: 'skeuo-led-red',
    label: 'Critical',
  },
  maintenance: {
    class: 'skeuo-led-cyan',
    label: 'Maintenance',
  },
};

const sizeStyles = {
  sm: { dot: 'w-2.5 h-2.5', text: 'text-[10px]' },
  md: { dot: 'w-3 h-3', text: 'text-xs' },
  lg: { dot: 'w-3.5 h-3.5', text: 'text-sm' },
};

export function StatusIndicator({
  status,
  label,
  size = 'md',
  pulse = true,
  className,
}: StatusIndicatorProps) {
  const config = statusLedMap[status];
  const sz = sizeStyles[size];

  return (
    <div className={clsx('flex items-center gap-2', className)}>
      <span className={clsx('relative inline-flex items-center justify-center')}>
        {pulse && (status === 'online' || status === 'critical') && (
          <span
            className={clsx(
              'absolute inset-0 rounded-full animate-ping opacity-75',
              config.class
            )}
          />
        )}
        <span className={clsx('skeuo-led', config.class, sz.dot)} />
      </span>
      {label !== undefined && (
        <span className={clsx('font-mono font-semibold tracking-wide uppercase', sz.text, 'text-slate-700 dark:text-slate-300')}>
          {label ?? config.label}
        </span>
      )}
    </div>
  );
}
