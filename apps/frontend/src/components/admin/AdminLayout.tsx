import React from 'react';
import { useAdminStore, AdminViewType } from '@/store/useAdminStore';
import {
  LayoutDashboard,
  Users,
  Building2,
  Cpu,
  FileSpreadsheet,
  Activity,
  AlertTriangle,
  Settings,
  LogOut,
  ShieldCheck,
  Search,
  Bell,
  RefreshCw,
  Lock,
  Bot,
  Zap,
  Radio,
  Server,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { adminUser, activeView, setActiveView, logoutAdmin, fetchAdminData, isLoading } = useAdminStore();

  const navItems: { id: AdminViewType; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'OVERVIEW', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'USERS', label: 'User Management', icon: Users },
    { id: 'DEVICES', label: 'Devices', icon: Cpu },
    { id: 'TELEMETRY', label: 'Telemetry', icon: Activity },
    { id: 'COMMANDS', label: 'Commands', icon: Zap },
    { id: 'ALERTS', label: 'Alerts', icon: AlertTriangle },
    { id: 'AUTOMATION', label: 'Automation', icon: Bot },
    { id: 'MQTT', label: 'MQTT', icon: Radio },
    { id: 'FIRMWARE', label: 'Firmware', icon: RefreshCw },
    { id: 'HEALTH', label: 'System Health', icon: Server },
    { id: 'AUDIT', label: 'Audit Logs', icon: FileSpreadsheet },
    { id: 'SETTINGS', label: 'System Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 flex flex-col font-sans selection:bg-purple-500/30">
      {/* TOP HEADER BAR */}
      <header className="h-16 border-b border-slate-800/80 bg-slate-950/70 backdrop-blur-xl px-6 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-purple-400">
              AetherCrop Admin
            </span>
            <span className="ml-2 text-[10px] uppercase font-extrabold tracking-wider bg-purple-950/80 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/30">
              Enterprise Control Panel
            </span>
          </div>
        </div>

        {/* Global Admin Search & Actions */}
        <div className="flex items-center space-x-4">
          <div className="relative hidden md:block">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Global Search (Users, Devices, Accounts)..."
              className="bg-slate-900/80 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 w-72 transition-all"
            />
          </div>

          <button
            onClick={() => fetchAdminData()}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all"
            title="Refresh Admin Data"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          </button>

          <button className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-amber-400 transition-all relative">
            <Bell className="w-4 h-4" />
            <span className="w-2 h-2 rounded-full bg-amber-500 absolute top-1.5 right-1.5 animate-ping" />
          </button>

          {/* Admin Profile & Logout */}
          <div className="pl-3 border-l border-slate-800 flex items-center space-x-3">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-200">{adminUser?.name || 'Administrator'}</div>
              <div className="text-[10px] text-purple-400 font-mono font-medium">{adminUser?.role || 'SUPER_ADMIN'}</div>
            </div>

            <button
              onClick={logoutAdmin}
              className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-800/40 text-red-400 hover:bg-red-900/50 hover:border-red-700 transition-all text-xs font-medium"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* BODY SHELL WITH SIDEBAR */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <aside className="w-64 border-r border-slate-800/80 bg-slate-950/40 backdrop-blur-md p-4 flex flex-col justify-between shrink-0">
          <div className="space-y-1">
            <div className="px-3 py-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
              Navigation
            </div>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                    isActive
                      ? 'bg-purple-600/20 border border-purple-500/40 text-purple-300 shadow-md shadow-purple-900/20'
                      : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* SYSTEM SECURITY BADGE */}
          <div className="p-3 rounded-2xl bg-gradient-to-b from-purple-950/30 to-slate-900/50 border border-purple-800/30 text-xs">
            <div className="flex items-center space-x-2 text-purple-300 font-semibold mb-1">
              <Lock className="w-3.5 h-3.5 text-purple-400" />
              <span>Tenant Isolation Active</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              RBAC authorization layer & database level account scoping active across all endpoints.
            </p>
          </div>
        </aside>

        {/* MAIN CONTENT CANVAS */}
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-b from-[#070b14] via-[#090e1c] to-[#060a12]">
          {children}
        </main>
      </div>
    </div>
  );
};
