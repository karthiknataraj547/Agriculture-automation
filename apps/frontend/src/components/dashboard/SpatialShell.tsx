'use client';

import React, { useState, useEffect } from 'react';
import { clsx } from 'clsx';
import Link from 'next/link';
import {
  Box,
  Cpu,
  Zap,
  Radio,
  Sliders,
  FileText,
  Menu,
  X,
  AlertOctagon,
  CloudRain,
  Sun,
  Moon,
  User,
  LogOut,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Globe,
  Power,
  Calendar,
  Activity,
  Download,
  Smartphone,
} from 'lucide-react';
import { SpatialButton } from '../ui/SpatialButton';
import { GlassCard } from '../ui/GlassCard';
import { useSpatialStore } from '../../store/useSpatialStore';
import { useAuthStore } from '../../store/useAuthStore';

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

  // Adaptive System Theme Listener & Root HTML Class Sync
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const syncTheme = (isDark: boolean) => {
      const saved = localStorage.getItem('aether_theme_mode');
      const isDarkActive = saved ? saved === 'dark' : isDark;
      if (isDarkActive) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    syncTheme(mediaQuery.matches);

    const listener = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('aether_theme_mode')) {
        syncTheme(e.matches);
        useSpatialStore.setState({ themeMode: e.matches ? 'dark' : 'light' });
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  const NAV_ITEMS = [
    { key: 'SPATIAL_3D' as const, label: '3D Spatial Twin', icon: <Box size={16} /> },
    { key: 'DEVICES' as const, label: 'IoT Devices', icon: <Cpu size={16} /> },
    { key: 'PUMPS' as const, label: 'Pump Console', icon: <Power size={16} /> },
    { key: 'SCHEDULES' as const, label: 'Schedules', icon: <Calendar size={16} /> },
    { key: 'TELEMETRY' as const, label: 'Telemetry Stream', icon: <Zap size={16} /> },
    { key: 'AUTOMATION' as const, label: 'Automation Rules', icon: <Sliders size={16} /> },
    { key: 'AI_INSIGHTS' as const, label: 'AI Crop Insights', icon: <Radio size={16} /> },
    { key: 'DIAGNOSTICS' as const, label: 'IoT Diagnostics', icon: <Activity size={16} /> },
    { key: 'AUDIT_LOGS' as const, label: 'System Audit', icon: <FileText size={16} /> },
  ];

  const handleNavClick = (viewKey: (typeof NAV_ITEMS)[number]['key']) => {
    setActiveView(viewKey);
    setDrawerOpen(false);
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMessage(null);

    if (!oldPass || !newPass) {
      setPassMessage({ type: 'error', text: 'Please fill in all password fields.' });
      return;
    }

    const res = await updatePassword(oldPass, newPass);
    if (res.success) {
      setPassMessage({ type: 'success', text: 'Password updated successfully!' });
      setOldPass('');
      setNewPass('');
      setTimeout(() => {
        setChangePassOpen(false);
        setPassMessage(null);
      }, 1500);
    } else {
      setPassMessage({ type: 'error', text: res.message || 'Password change failed.' });
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#e6ecf5] dark:bg-[#0b0f19] text-slate-800 dark:text-slate-100 transition-colors duration-300 font-sans">
      {/* ─── DESKTOP SIDEBAR ─── */}
      <aside className="hidden lg:flex flex-col w-[240px] h-full bg-white/70 dark:bg-[#0b0f19]/80 backdrop-blur-md border-r border-slate-200 dark:border-slate-800 flex-shrink-0 z-20 transition-colors duration-300">
        {/* Brand */}
        <div className="flex items-center justify-between h-16 px-5 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl neu-pressed flex items-center justify-center text-sky-600 dark:text-cyber-cyan">
              <Radio size={16} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-xs font-mono font-extrabold tracking-[0.2em] text-slate-900 dark:text-slate-100 uppercase">
                AETHERCROP
              </h1>
              <span className="text-[9px] font-mono text-emerald-600 dark:text-emerald-400 font-bold block">
                SPATIAL IOT V2.5
              </span>
            </div>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="flex-1 overflow-y-auto p-3 space-y-1.5" aria-label="Main navigation">
          {NAV_ITEMS.map((item) => {
            const isActive = activeView === item.key;
            return (
              <button
                key={item.key}
                onClick={() => handleNavClick(item.key)}
                aria-current={isActive ? 'page' : undefined}
                className={clsx(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-mono uppercase font-bold transition-all min-h-[44px]',
                  isActive
                    ? 'neu-button-active text-sky-700 dark:text-cyber-cyan font-extrabold'
                    : 'neu-button text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100'
                )}
              >
                {item.icon}
                <span className="text-xs font-mono uppercase tracking-wider">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800">
          <div className="p-2.5 rounded-xl neu-pressed text-[10px] font-mono text-slate-600 dark:text-slate-400 space-y-1">
            <div className="flex items-center justify-between font-bold">
              <span>AUTO SYNC</span>
              <span className="text-emerald-700 dark:text-emerald-400">ACTIVE</span>
            </div>
            <p className="truncate text-slate-800 dark:text-slate-200 font-bold">{user?.email}</p>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between h-14 md:h-16 px-4 md:px-6 bg-white/80 dark:bg-[#0b0f19]/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex-shrink-0 z-10 transition-colors duration-300">
          {/* Mobile hamburger + Title */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 rounded-xl neu-button text-slate-800 dark:text-slate-200 min-h-[44px] min-w-[44px] flex items-center justify-center font-bold"
              aria-label="Open navigation menu"
            >
              <Menu size={20} />
            </button>

            <div className="min-w-0">
              <h2 className="text-xs md:text-sm font-mono font-extrabold uppercase tracking-widest text-slate-900 dark:text-slate-100 truncate">
                {NAV_ITEMS.find((i) => i.key === activeView)?.label || 'Dashboard'}
              </h2>
              <span className="hidden sm:inline text-[9px] font-mono text-slate-600 dark:text-slate-400 font-bold">
                LOGGED IN AS: <strong className="text-sky-600 dark:text-cyber-cyan">{user?.email}</strong>
              </span>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2">
            {/* Official Android Mobile App */}
            <Link
              href="/mobile"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white font-mono text-[11px] font-bold shadow-md shadow-cyan-600/30 flex items-center space-x-1.5 transition-all"
            >
              <Smartphone size={13} />
              <span className="hidden sm:inline">ANDROID APP</span>
            </Link>

            {/* Official App Downloads Button (.EXE & .APK) */}
            <Link
              href="/download"
              className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-mono text-[11px] font-bold shadow-md shadow-purple-600/30 flex items-center space-x-1.5 transition-all"
            >
              <Download size={13} />
              <span className="hidden sm:inline">APPS (.EXE / .APK)</span>
            </Link>

            {/* Theme Toggle Button */}
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

            <div className="hidden md:block h-4 w-px bg-slate-200 dark:bg-slate-700" />

            {/* USER PROFILE & AUTH BUTTON */}
            <button
              onClick={() => setUserModalOpen(true)}
              className="flex items-center gap-2 px-2.5 py-1 rounded-xl neu-button text-slate-900 dark:text-slate-100 hover:text-sky-600 dark:hover:text-cyber-cyan transition-all font-bold"
              title="User Account & Password Settings"
            >
              <div className="w-6 h-6 rounded-lg neu-pressed flex items-center justify-center text-sky-600 dark:text-cyber-cyan">
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
          className="flex-1 overflow-y-auto p-3 md:p-6 bg-[#f1f5f9] dark:bg-[#090d16] transition-colors duration-300"
          tabIndex={-1}
        >
          {children}
        </main>

        {/* ─── Footer Status Bar (Desktop) ─── */}
        <footer className="hidden md:flex items-center justify-between h-8 px-5 bg-white dark:bg-[#0b0f19] border-t border-slate-200 dark:border-slate-800 text-[10px] font-mono text-slate-800 dark:text-slate-300 flex-shrink-0 font-bold">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              SYSTEM OPERATIONAL
            </span>
            <span>ACCOUNT: {user?.email}</span>
            <span>AUTO SYNC: ACTIVE</span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-slate-800 dark:text-slate-300 font-bold">{timeString} UTC</span>
            <span className="text-sky-700 dark:text-cyber-cyan font-bold">AES-256 SECURE CLOUD</span>
          </div>
        </footer>
      </div>

      {/* ─── MOBILE DRAWER OVERLAY ─── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />

          <div className="relative w-[280px] max-w-[80vw] h-full bg-white dark:bg-[#0b0f19] shadow-2xl flex flex-col animate-slide-in-left border-r border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Radio size={20} className="text-sky-600 dark:text-cyber-cyan animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-widest text-slate-900 dark:text-slate-100 uppercase">
                  AETHERCROP
                </span>
              </div>
              <button
                onClick={() => setDrawerOpen(false)}
                className="w-9 h-9 rounded-lg neu-button flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-red-500 font-bold"
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
                      'w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-mono uppercase font-bold transition-all min-h-[44px]',
                      isActive
                        ? 'neu-button-active text-sky-700 dark:text-cyber-cyan font-extrabold'
                        : 'neu-button text-slate-800 dark:text-slate-200 hover:text-slate-900 dark:hover:text-slate-100'
                    )}
                  >
                    {item.icon}
                    <span className="text-xs font-mono uppercase tracking-wider">{item.label}</span>
                  </button>
                );
              })}
            </nav>

            <div className="p-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
              <button
                onClick={() => { logout(); setDrawerOpen(false); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl neu-button text-red-600 dark:text-red-400 text-xs font-mono uppercase font-bold min-h-[44px]"
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
            <GlassCard variant="default" padding="lg" className="border border-slate-300 dark:border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-300/40 dark:border-slate-700/40">
                <div className="flex items-center gap-2">
                  <User size={18} className="text-sky-600 dark:text-cyber-cyan" />
                  <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Customer Account
                  </h2>
                </div>
                <button
                  onClick={() => setUserModalOpen(false)}
                  className="w-8 h-8 rounded-lg neu-button flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-red-500 font-bold"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-3 mb-6">
                <div className="p-3 rounded-xl neu-pressed space-y-1">
                  <p className="text-[9px] font-mono text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">Operator Name</p>
                  <p className="text-xs font-extrabold text-slate-900 dark:text-slate-100">{user?.name || 'Customer'}</p>
                </div>
                <div className="p-3 rounded-xl neu-pressed space-y-1">
                  <p className="text-[9px] font-mono text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">Logged-in Email Account</p>
                  <p className="text-xs font-mono font-extrabold text-sky-600 dark:text-cyber-cyan">{user?.email || 'customer@aethercrop.io'}</p>
                </div>
                <div className="p-3 rounded-xl neu-pressed space-y-1 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] font-mono text-slate-600 dark:text-slate-400 uppercase tracking-wider font-bold">Cloud Account Sync</p>
                    <p className="text-xs font-mono text-emerald-700 dark:text-emerald-400 font-bold">Automatic Background Sync</p>
                  </div>
                  <Globe size={16} className="text-sky-600 dark:text-cyber-cyan animate-pulse" />
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
            <GlassCard variant="default" padding="lg" className="border border-sky-500/40 dark:border-cyber-cyan/40 shadow-2xl">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-300/40 dark:border-slate-700/40">
                <div className="flex items-center gap-2">
                  <KeyRound size={18} className="text-sky-600 dark:text-cyber-cyan" />
                  <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                    Change Password
                  </h3>
                </div>
                <button
                  onClick={() => { setChangePassOpen(false); setPassMessage(null); }}
                  className="w-8 h-8 rounded-lg neu-button flex items-center justify-center text-slate-700 dark:text-slate-300 hover:text-red-500 font-bold"
                >
                  <X size={16} />
                </button>
              </div>

              {passMessage && (
                <div
                  className={`p-2.5 mb-4 rounded-xl neu-pressed text-xs font-mono font-bold flex items-center gap-2 ${
                    passMessage.type === 'error' ? 'text-red-700 dark:text-red-400 bg-red-500/10' : 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10'
                  }`}
                >
                  {passMessage.type === 'error' ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
                  <span>{passMessage.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 font-bold mb-1">
                    Current Password
                  </label>
                  <input
                    type="password"
                    required
                    value={oldPass}
                    onChange={(e) => setOldPass(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full px-3 py-2 rounded-xl neu-pressed text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 font-bold mb-1">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full px-3 py-2 rounded-xl neu-pressed text-xs text-slate-900 dark:text-slate-100 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => { setChangePassOpen(false); setPassMessage(null); }}
                    className="px-4 py-2 rounded-xl neu-button text-xs font-mono font-bold text-slate-600 dark:text-slate-400"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl neu-button text-xs font-mono font-bold text-sky-600 dark:text-cyber-cyan"
                  >
                    Update Password
                  </button>
                </div>
              </form>
            </GlassCard>
          </div>
        </div>
      )}
    </div>
  );
}
