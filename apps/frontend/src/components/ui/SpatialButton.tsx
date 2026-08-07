'use client';

import React from 'react';
import { clsx } from 'clsx';

interface SpatialButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost' | 'danger' | 'success';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  children?: React.ReactNode;
  active?: boolean;
}

const variantTextColors = {
  primary: 'text-sky-600 dark:text-cyan-400 border-sky-500/50 hover:border-sky-500',
  ghost: 'text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-cyan-400',
  danger: 'text-rose-600 dark:text-rose-400 border-rose-500/50 hover:border-rose-500',
  success: 'text-emerald-600 dark:text-emerald-400 border-emerald-500/50 hover:border-emerald-500',
};

const sizeStyles = {
  sm: 'text-[10px] px-3 py-1.5 gap-1.5 rounded-lg',
  md: 'text-xs px-4 py-2 gap-2 rounded-lg',
  lg: 'text-sm px-6 py-2.5 gap-2.5 rounded-xl',
};

export function SpatialButton({
  variant = 'ghost',
  size = 'md',
  icon,
  children,
  active,
  className,
  ...props
}: SpatialButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center justify-center font-mono font-semibold uppercase tracking-wider',
        'skeuo-button transition-all duration-150',
        'disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none',
        variantTextColors[variant],
        sizeStyles[size],
        active && 'skeuo-button-active',
        className
      )}
      {...props}
    >
      {icon && <span className="flex-shrink-0 drop-shadow-sm">{icon}</span>}
      {children}
    </button>
  );
}
