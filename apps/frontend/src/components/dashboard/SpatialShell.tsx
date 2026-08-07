'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Box,
  Activity,
  Cpu,
  Zap,
  BrainCircuit,
  ShieldCheck,
  Search,
  AlertOctagon,
  CloudRain,
  Radio,
  Power,
  Calendar,
  Sun,
  Moon,
  Menu,
  X,
} from 'lucide-react';
import { useSpatialStore, SpatialStoreState } from '../../store/useSpatialStore';
import { StatusIndicator } from '../ui/StatusIndicator';
import { SpatialButton } from '../ui/SpatialButton';

type ViewKey = SpatialStoreState['activeView'];

interface NavItem {
  key: ViewKey;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
}

const NAV_ITEMS: NavItem[] = [
  { key: 'SPATIAL_3D', label: 'Dashboard', shortLabel: 'Dash', icon: <Box size={18} /> },
  { key: 'PUMPS', label: 'Pumps', shortLabel: 'Pumps', icon: <Power size={18} /> },
  { key: 'SCHEDULES', label: 'Schedules', shortLabel: 'Sched', icon: <Calendar size={18} /> },
  { key: 'TELEMETRY', label: 'Telemetry', shortLabel: 'Telem', icon: <Activity size={18} /> },
  { key: 'DEVICES', label: 'Devices', shortLabel: 'Devs', icon: <Cpu size={18} /> },
  { key: 'AUTOMATION', label: 'Rules', shortLabel: 'Rules', icon: <Zap size={18} /> },
  { key: 'AI_INSIGHTS', label: 'AI Insights', shortLabel: 'AI', icon: <BrainCircuit size={18} /> },
  { key: 'AUDIT_LOGS', label: 'Audit', shortLabel: 'Audit', icon: <ShieldCheck size={18} /> },
];

const BOTTOM_TAB_ITEMS = NAV_ITEMS.slice(0, 4);
const DRAWER_EXTRA_ITEMS = NAV_ITEMS.slice(4);

interface SpatialShellProps {
  children: React.ReactNode;
  onOpenCommandPalette?: () => void;
}

export function SpatialShell({ children, onOpenCommandPalette }: SpatialShellProps) {
  const {
    activeView,
    setActiveView,
    emergencyStop,
    toggleEmergencyStop,
    rainOverride,
    toggleRainOverride,
    themeMode,
    toggleThemeMode,
  } = useSpatialStore();

  const [timeString, setTimeString] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    setTimeString(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const interval = setInterval(() => {
      setTimeString(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && drawerOpen) setDrawerOpen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drawerOpen]);

  const handleNavClick = useCallback((key: ViewKey) => {
    setActiveView(key);
    setDrawerOpen(false);
  }, [setActiveView]);

  return (
    <div className={clsx('flex flex-col md:flex-row h-[100dvh] max-h-[100dvh] w-full overflow-hidden transition-colors duration-300', themeMode === 'dark' ? 'dark bg-[#090d16]' : 'bg-[#dbe2ef]')}>
      {/* ─── Skip to Content ─── */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* ─── Desktop Left Hardware Rack Sidebar ─── */}
      <aside
        className="hidden md:flex flex-col items-center w-[72px] flex-shrink-0 py-4 gap-2 skeuo-panel rounded-none border-r border-slate-400 dark:border-slate-800 z-20 shadow-2xl"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand Icon Module */}
        <div className="flex flex-col items-center mb-3 relative">
          <div className="w-12 h-12 rounded-xl skeuo-pressed flex items-center justify-center text-sky-600 dark:text-cyan-400 shadow-inner">
            <Radio size={22} className="animate-pulse" />
          </div>
          <span className="text-[9px] font-mono font-extrabold tracking-widest text-slate-900 dark:text-slate-100 uppercase mt-1">
            AETHER
          </span>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-2.5 flex-1 w-full px-2" aria-label="Dashboard views">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveView(item.key)}
                title={item.label}
                aria-current={isActive ? 'page' : undefined}
                aria-label={`Navigate to ${item.label}`}
                className={clsx(
                  'w-12 h-12 rounded-xl flex flex-col items-center justify-center transition-all duration-150 group mx-auto',
                  isActive
                    ? 'skeuo-button-active text-sky-600 dark:text-cyan-400 font-extrabold'
                    : 'skeuo-button text-slate-900 dark:text-slate-200 hover:text-sky-600 dark:hover:text-cyan-400 font-bold'
                )}
              >
                <span>{item.icon}</span>
                <span className="text-[7px] font-mono tracking-tighter uppercase mt-0.5 truncate max-w-[44px] font-bold">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Search Command Button */}
        <button
          onClick={onOpenCommandPalette}
          title="Command Palette (Ctrl+K)"
          aria-label="Open command palette"
          className="w-12 h-12 rounded-xl flex items-center justify-center skeuo-button text-slate-900 dark:text-slate-200 hover:text-sky-600 dark:hover:text-cyan-400 font-bold"
        >
          <Search size={18} />
        </button>
      </aside>

      {/* ─── Main Area ─── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 h-full overflow-hidden">
        {/* ─── Top Bar Console ─── */}
        <header className="flex items-center justify-between h-14 px-3 md:px-6 flex-shrink-0 skeuo-panel rounded-none border-b border-slate-400 dark:border-slate-800 z-10">
          {/* Left Section */}
          <div className="flex items-center gap-3 md:gap-5 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden w-9 h-9 rounded-lg skeuo-button flex items-center justify-center text-slate-900 dark:text-slate-100 font-bold"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
            >
              <Menu size={18} />
            </button>

            <div className="flex items-center gap-2">
              <span className="skeuo-rivet hidden sm:inline-block" />
              <h1 className="text-xs md:text-sm font-mono font-extrabold tracking-[0.25em] text-slate-900 dark:text-slate-100 uppercase truncate">
                {NAV_ITEMS.find((n) => n.key === activeView)?.label ?? 'Dashboard'}
              </h1>
            </div>
            
            <div className="hidden sm:block h-5 w-px bg-slate-400 dark:bg-slate-700" />
            <div className="hidden sm:block">
              <StatusIndicator status="online" label="GATEWAY LIVE" size="sm" />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-2 md:gap-3">
            {/* Theme Switcher Toggle */}
            <SpatialButton
              variant="ghost"
              size="sm"
              icon={themeMode === 'light' ? <Sun size={14} className="text-amber-500" /> : <Moon size={14} className="text-cyan-400" />}
              active={themeMode === 'dark'}
              onClick={toggleThemeMode}
            >
              <span className="hidden sm:inline">{themeMode === 'light' ? 'LIGHT' : 'DARK'}</span>
            </SpatialButton>

            {/* Emergency Stop */}
            <SpatialButton
              variant={emergencyStop ? 'danger' : 'ghost'}
              size="sm"
              icon={<AlertOctagon size={14} />}
              active={emergencyStop}
              onClick={toggleEmergencyStop}
            >
              <span className="hidden sm:inline">{emergencyStop ? 'E-STOP ON' : 'E-STOP'}</span>
            </SpatialButton>

            {/* Rain Override */}
            <SpatialButton
              variant={rainOverride ? 'primary' : 'ghost'}
              size="sm"
              icon={<CloudRain size={14} />}
              active={rainOverride}
              onClick={toggleRainOverride}
            >
              <span className="hidden sm:inline">{rainOverride ? 'RAIN ON' : 'RAIN'}</span>
            </SpatialButton>

            <div className="hidden md:block h-5 w-px bg-slate-400 dark:bg-slate-700" />

            {/* Live Glass Clock */}
            <div className="hidden md:flex items-center px-3 py-1 skeuo-glass-bezel text-sky-400 dark:text-cyan-300 font-mono text-xs tracking-widest font-bold">
              <span suppressHydrationWarning>{timeString || '--:--:--'}</span>
            </div>
          </div>
        </header>

        {/* ─── Content Workspace ─── */}
        <main
          id="main-content"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 md:p-5 lg:p-6 pb-28 md:pb-6 touch-pan-y"
          role="main"
          aria-label="Dashboard content"
        >
          {children}
        </main>
      </div>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 skeuo-panel rounded-none border-t border-slate-400 dark:border-slate-800 mobile-bottom-nav"
        role="navigation"
        aria-label="Quick navigation"
      >
        <div className="flex items-center justify-around px-1 py-1">
          {BOTTOM_TAB_ITEMS.map((item) => {
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                aria-current={isActive ? 'page' : undefined}
                aria-label={item.label}
                className={clsx(
                  'flex flex-col items-center justify-center min-w-[56px] h-[52px] rounded-xl transition-all duration-150',
                  isActive
                    ? 'skeuo-button-active text-sky-600 dark:text-cyan-400 font-bold'
                    : 'text-slate-600 dark:text-slate-400'
                )}
              >
                <span className={clsx(isActive && 'scale-110 transition-transform')}>{item.icon}</span>
                <span className="text-[8px] font-mono uppercase mt-0.5 tracking-tight">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}

          <button
            onClick={() => setDrawerOpen(true)}
            aria-label="More navigation options"
            aria-expanded={drawerOpen}
            className={clsx(
              'flex flex-col items-center justify-center min-w-[56px] h-[52px] rounded-xl transition-all',
              DRAWER_EXTRA_ITEMS.some(i => i.key === activeView)
                ? 'skeuo-button-active text-sky-600 dark:text-cyan-400 font-bold'
                : 'text-slate-600 dark:text-slate-400'
            )}
          >
            <Menu size={18} />
            <span className="text-[8px] font-mono uppercase mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* ─── Mobile Drawer ─── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          id="mobile-drawer"
        >
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-[280px] max-w-[80vw] h-full skeuo-panel rounded-none flex flex-col animate-slide-in-left shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-slate-400 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Radio size={20} className="text-sky-600 dark:text-cyan-400 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-widest text-slate-800 dark:text-slate-100 uppercase">
                  AETHERCROP
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 rounded-lg skeuo-button flex items-center justify-center text-slate-600 hover:text-red-500"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-2" aria-label="Full navigation">
              {NAV_ITEMS.map((item) => {
                const isActive = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavClick(item.key)}
                    aria-current={isActive ? 'page' : undefined}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-150 min-h-[44px]',
                      isActive
                        ? 'skeuo-button-active text-sky-600 dark:text-cyan-400 font-bold'
                        : 'skeuo-button text-slate-700 dark:text-slate-300'
                    )}
                  >
                    {item.icon}
                    <span className="text-xs font-mono uppercase tracking-wider">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-400 dark:border-slate-800 space-y-3">
              <button
                onClick={() => { onOpenCommandPalette?.(); setDrawerOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl skeuo-button text-slate-700 dark:text-slate-300 min-h-[44px]"
                aria-label="Open command palette"
              >
                <Search size={18} />
                <span className="text-xs font-mono uppercase tracking-wider">Search (Ctrl+K)</span>
              </button>

              <div className="flex items-center justify-between">
                <StatusIndicator status="online" label="GATEWAY" size="sm" />
                <span
                  suppressHydrationWarning
                  className="text-[10px] font-mono text-slate-600 dark:text-slate-400 tabular-nums font-bold"
                >
                  {timeString || '--:--:--'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes slideInLeft {
          from { transform: translateX(-100%); }
          to { transform: translateX(0); }
        }
        .animate-slide-in-left {
          animation: slideInLeft 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
