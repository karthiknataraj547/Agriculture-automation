'use client';

import React from 'react';
import { clsx } from 'clsx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glow' | 'subtle' | 'pressed';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  rivets?: boolean;
  onClick?: () => void;
}

const variantStyles = {
  default: 'skeuo-card',
  glow: 'skeuo-panel-glow',
  subtle: 'skeuo-panel',
  pressed: 'skeuo-pressed',
};

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4 lg:p-5',
  lg: 'p-5 lg:p-6',
};

export function GlassCard({
  children,
  className,
  variant = 'default',
  hover = false,
  padding = 'md',
  rivets = false,
  onClick,
}: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      className={clsx(
        'relative transition-all duration-200 text-slate-900 dark:text-slate-100 font-extrabold',
        variantStyles[variant],
        paddingStyles[padding],
        hover &&
          'cursor-pointer hover:border-sky-500 hover:shadow-[0_12px_30px_-5px_rgba(2,132,199,0.3)] hover:-translate-y-0.5',
        onClick && 'cursor-pointer',
        className
      )}
    >
      {/* Optional Skeuomorphic Corner Rivets */}
      {rivets && (
        <>
          <span className="skeuo-rivet absolute top-2 left-2 pointer-events-none" />
          <span className="skeuo-rivet absolute top-2 right-2 pointer-events-none" />
          <span className="skeuo-rivet absolute bottom-2 left-2 pointer-events-none" />
          <span className="skeuo-rivet absolute bottom-2 right-2 pointer-events-none" />
        </>
      )}
      {children}
    </div>
  );
}
