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
  User,
  LogOut,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Globe,
} from 'lucide-react';
import { useSpatialStore, SpatialStoreState } from '../../store/useSpatialStore';
import { useAuthStore } from '../../store/useAuthStore';
import { StatusIndicator } from '../ui/StatusIndicator';
import { SpatialButton } from '../ui/SpatialButton';
import { GlassCard } from '../ui/GlassCard';

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

  const { user, logout, updatePassword } = useAuthStore();

  const [timeString, setTimeString] = useState<string>('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userModalOpen, setUserModalOpen] = useState(false);

  // Password change state
  const [changePassOpen, setChangePassOpen] = useState(false);
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMessage, setPassMessage] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Live clock
  useEffect(() => {
    setTimeString(new Date().toLocaleTimeString('en-US', { hour12: false }));
    const interval = setInterval(() => {
      setTimeString(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (drawerOpen) setDrawerOpen(false);
        if (userModalOpen) setUserModalOpen(false);
        if (changePassOpen) setChangePassOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [drawerOpen, userModalOpen, changePassOpen]);

  const handleNavClick = useCallback((key: ViewKey) => {
    setActiveView(key);
    setDrawerOpen(false);
  }, [setActiveView]);

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);
    const result = await updatePassword(oldPass, newPass);
    if (!result.success) {
      setPassMessage({ type: 'error', text: result.message || 'Password update failed.' });
    } else {
      setPassMessage({ type: 'success', text: 'Customer password updated globally!' });
      setOldPass('');
      setNewPass('');
      setTimeout(() => {
        setChangePassOpen(false);
        setPassMessage(null);
      }, 2000);
    }
  };

  return (
    <div className={clsx('flex flex-col md:flex-row h-[100dvh] max-h-[100dvh] w-full overflow-hidden transition-colors duration-300', themeMode === 'dark' ? 'dark bg-[#0b0f19]' : 'bg-[#e6ecf5]')}>
      {/* Skip to Content */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* ─── Desktop Left Sidebar ─── */}
      <aside
        className="hidden md:flex flex-col items-center w-[68px] flex-shrink-0 py-4 gap-1 bg-[#e6ecf5] dark:bg-[#0b0f19] border-r border-white/80 dark:border-white/10 shadow-[6px_0_16px_#b6c3d7] z-20"
        role="navigation"
        aria-label="Main navigation"
      >
        {/* Brand Icon */}
        <div className="flex flex-col items-center mb-4">
          <div className="w-10 h-10 rounded-xl neu-button flex items-center justify-center text-cyber-cyan font-bold">
            <Radio size={20} className="animate-pulse" />
          </div>
          <span className="text-[8px] font-mono font-bold tracking-widest text-slate-500 uppercase mt-1">
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
                  'w-11 h-11 rounded-xl flex flex-col items-center justify-center transition-all duration-200 group mx-auto',
                  isActive
                    ? 'neu-button-active text-cyber-cyan font-bold'
                    : 'neu-button text-slate-500 hover:text-slate-700'
                )}
              >
                <span>{item.icon}</span>
                <span className="text-[7px] font-mono tracking-tighter uppercase mt-0.5 truncate max-w-[40px]">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Search Button */}
        <button
          onClick={onOpenCommandPalette}
          title="Command Palette (Ctrl+K)"
          aria-label="Open command palette"
          className="w-11 h-11 rounded-xl flex items-center justify-center neu-button text-slate-500 hover:text-cyber-cyan transition-all duration-200"
        >
          <Search size={18} />
        </button>
      </aside>

      {/* ─── Main Area ─── */}
      <div className="flex flex-col flex-1 min-w-0 min-h-0 h-full overflow-hidden">
        {/* ─── Top Bar ─── */}
        <header className="flex items-center justify-between h-12 md:h-12 px-3 md:px-5 flex-shrink-0 bg-[#e6ecf5] dark:bg-[#0b0f19] border-b border-white/80 dark:border-white/10 shadow-[0_4px_12px_#b6c3d7] z-10">
          {/* Left Section */}
          <div className="flex items-center gap-2 md:gap-4 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="md:hidden w-9 h-9 rounded-lg neu-button flex items-center justify-center text-slate-600 dark:text-slate-300"
              aria-label="Open navigation menu"
              aria-expanded={drawerOpen}
              aria-controls="mobile-drawer"
            >
              <Menu size={18} />
            </button>

            <h1 className="text-xs font-mono font-bold tracking-[0.2em] text-slate-800 dark:text-slate-100 uppercase truncate">
              {NAV_ITEMS.find((n) => n.key === activeView)?.label ?? 'Dashboard'}
            </h1>
            <div className="hidden sm:block h-4 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="hidden sm:block">
              <StatusIndicator status="online" label="GATEWAY LIVE" size="sm" />
            </div>
          </div>

          {/* Right Section */}
          <div className="flex items-center gap-1.5 md:gap-2.5">
            {/* Theme Switcher Toggle */}
            <SpatialButton
              variant="ghost"
              size="sm"
              icon={themeMode === 'light' ? <Sun size={12} className="text-amber-500" /> : <Moon size={12} className="text-sky-400" />}
              active={themeMode === 'dark'}
              onClick={toggleThemeMode}
            >
              <span className="hidden sm:inline">{themeMode === 'light' ? 'LIGHT' : 'DARK'}</span>
            </SpatialButton>

            {/* Emergency Stop */}
            <SpatialButton
              variant={emergencyStop ? 'danger' : 'ghost'}
              size="sm"
              icon={<AlertOctagon size={12} />}
              active={emergencyStop}
              onClick={toggleEmergencyStop}
            >
              <span className="hidden sm:inline">{emergencyStop ? 'E-STOP ON' : 'E-STOP'}</span>
            </SpatialButton>

            {/* Rain Override */}
            <SpatialButton
              variant={rainOverride ? 'primary' : 'ghost'}
              size="sm"
              icon={<CloudRain size={12} />}
              active={rainOverride}
              onClick={toggleRainOverride}
            >
              <span className="hidden sm:inline">{rainOverride ? 'RAIN ON' : 'RAIN'}</span>
            </SpatialButton>

            <div className="hidden md:block h-4 w-px bg-slate-300 dark:bg-slate-700" />

            {/* USER PROFILE & AUTH BUTTON */}
            <button
              onClick={() => setUserModalOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl neu-button text-slate-700 dark:text-slate-200 hover:text-cyber-cyan transition-all"
              title="User Account & Password Settings"
            >
              <div className="w-6 h-6 rounded-lg neu-pressed flex items-center justify-center text-cyber-cyan">
                <User size={14} />
              </div>
              <span className="hidden sm:inline text-xs font-mono font-bold truncate max-w-[100px]">
                {user?.name || 'Customer'}
              </span>
            </button>
          </div>
        </header>

        {/* ─── Content ─── */}
        <main
          id="main-content"
          className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 md:p-4 lg:p-5 pb-28 md:pb-5 touch-pan-y"
          role="main"
          aria-label="Dashboard content"
        >
          {children}
        </main>
      </div>

      {/* ─── Mobile Bottom Tab Bar ─── */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#e6ecf5] dark:bg-[#0b0f19] border-t border-white/80 dark:border-white/10 shadow-[0_-4px_12px_rgba(0,0,0,0.1)] mobile-bottom-nav"
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
                  'flex flex-col items-center justify-center min-w-[56px] h-[52px] rounded-xl transition-all duration-200',
                  isActive
                    ? 'text-cyber-cyan font-bold'
                    : 'text-slate-500'
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
                ? 'text-cyber-cyan font-bold'
                : 'text-slate-500'
            )}
          >
            <Menu size={18} />
            <span className="text-[8px] font-mono uppercase mt-0.5 tracking-tight">More</span>
          </button>
        </div>
      </nav>

      {/* ─── Mobile Drawer Overlay ─── */}
      {drawerOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 flex"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation menu"
          id="mobile-drawer"
        >
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-[280px] max-w-[80vw] h-full bg-[#e6ecf5] dark:bg-[#0b0f19] shadow-2xl flex flex-col animate-slide-in-left">
            <div className="flex items-center justify-between p-4 border-b border-white/80 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Radio size={20} className="text-cyber-cyan animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-widest text-slate-700 dark:text-slate-200 uppercase">
                  AETHERCROP
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 rounded-lg neu-button flex items-center justify-center text-slate-500 hover:text-red-500"
                aria-label="Close navigation menu"
              >
                <X size={18} />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-3 space-y-1.5" aria-label="Full navigation">
              {NAV_ITEMS.map((item) => {
                const isActive = activeView === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => handleNavClick(item.key)}
                    aria-current={isActive ? 'page' : undefined}
                    className={clsx(
                      'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 min-h-[44px]',
                      isActive
                        ? 'neu-button-active text-cyber-cyan font-bold'
                        : 'neu-button text-slate-600 dark:text-slate-400 hover:text-slate-800'
                    )}
                  >
                    {item.icon}
                    <span className="text-xs font-mono uppercase tracking-wider">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-white/80 dark:border-white/10 space-y-2">
              <button
                onClick={() => { logout(); setDrawerOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl neu-button text-red-600 text-xs font-mono uppercase font-bold min-h-[44px]"
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── USER PROFILE & ACCOUNT MODAL ─── */}
      {userModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm">
            <GlassCard variant="default" padding="lg" className="border border-white/80 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-300/40 dark:border-slate-700/40">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-cyber-cyan" />
                  <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Customer Account
                  </h2>
                </div>
                <button
                  onClick={() => setUserModalOpen(false)}
                  className="w-8 h-8 rounded-lg neu-button flex items-center justify-center text-slate-500 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="p-3 rounded-xl neu-pressed space-y-1">
                  <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Operator Name</p>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">{user?.name || 'Customer'}</p>
                </div>
                <div className="p-3 rounded-xl neu-pressed space-y-1">
                  <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Email Address</p>
                  <p className="text-xs font-mono text-slate-700 dark:text-slate-300">{user?.email || 'customer@aethercrop.io'}</p>
                </div>
                <div className="p-3 rounded-xl neu-pressed space-y-1 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-mono text-slate-500 uppercase tracking-wider">Global Account Status</p>
                    <p className="text-xs font-mono text-cyber-cyan font-bold">Active & Synced</p>
                  </div>
                  <Globe size={16} className="text-cyber-cyan" />
                </div>
              </div>

              <div className="space-y-2">
                <SpatialButton
                  variant="primary"
                  size="md"
                  icon={<KeyRound size={14} />}
                  onClick={() => {
                    setUserModalOpen(false);
                    setChangePassOpen(true);
                  }}
                  className="w-full justify-center"
                >
                  Change Customer Password
                </SpatialButton>

                <SpatialButton
                  variant="danger"
                  size="md"
                  icon={<LogOut size={14} />}
                  onClick={() => {
                    setUserModalOpen(false);
                    logout();
                  }}
                  className="w-full justify-center"
                >
                  Sign Out / Log Out
                </SpatialButton>
              </div>
            </GlassCard>
          </div>
        </div>
      )}

      {/* ─── CHANGE CUSTOMER PASSWORD MODAL ─── */}
      {changePassOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm">
            <GlassCard variant="default" padding="lg" className="border border-cyber-cyan/40 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-300/40 dark:border-slate-700/40">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-cyber-cyan" />
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                    Change Password
                  </h3>
                </div>
                <button
                  onClick={() => { setChangePassOpen(false); setPassMessage(null); }}
                  className="w-8 h-8 rounded-lg neu-button flex items-center justify-center text-slate-500 hover:text-red-500"
                >
                  <X size={16} />
                </button>
              </div>

              {passMessage && (
                <div
                  className={`p-2.5 mb-4 rounded-xl neu-pressed text-xs font-mono flex items-center gap-2 ${
                    passMessage.type === 'error' ? 'text-red-600 bg-red-500/10' : 'text-emerald-600 bg-emerald-500/10'
                  }`}
                >
                  {passMessage.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                  <span>{passMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 rounded-xl neu-pressed text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                    New Customer Password
                  </label>
                  <input
                    type="password"
                    required
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full px-3 py-2 rounded-xl neu-pressed text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                  />
                </div>

                <div className="flex gap-2 pt-2">
                  <SpatialButton
                    type="button"
                    variant="ghost"
                    size="md"
                    onClick={() => setChangePassOpen(false)}
                    className="flex-1 justify-center"
                  >
                    Cancel
                  </SpatialButton>
                  <SpatialButton
                    type="submit"
                    variant="primary"
                    size="md"
                    className="flex-1 justify-center"
                  >
                    Update Globally
                  </SpatialButton>
                </div>
              </form>
            </GlassCard>
          </div>
        </div>
      )}

      {/* Drawer animation */}
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
