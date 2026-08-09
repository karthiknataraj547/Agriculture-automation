import React, { useState } from 'react';
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
  User,
  Key,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const { adminUser, token, activeView, setActiveView, logoutAdmin, setAdminSession, fetchAdminData, isLoading } = useAdminStore();

  // Admin Profile Modal State
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [adminNameInput, setAdminNameInput] = useState(adminUser?.name || 'System Super Administrator');
  const [adminEmailInput, setAdminEmailInput] = useState(adminUser?.email || 'admin@agritech.com');
  const [currentPasswordInput, setCurrentPasswordInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmPasswordInput, setConfirmPasswordInput] = useState('');

  const [modalFeedback, setModalFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

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

  const handleOpenProfileModal = () => {
    setAdminNameInput(adminUser?.name || 'System Super Administrator');
    setAdminEmailInput(adminUser?.email || 'admin@agritech.com');
    setCurrentPasswordInput('');
    setNewPasswordInput('');
    setConfirmPasswordInput('');
    setModalFeedback(null);
    setShowProfileModal(true);
  };

  const handleUpdateAdminProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalFeedback(null);

    if (newPasswordInput && newPasswordInput !== confirmPasswordInput) {
      setModalFeedback({ type: 'error', message: 'New password and confirmation do not match.' });
      return;
    }

    setIsUpdating(true);
    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: 'update-admin-profile',
          name: adminNameInput,
          newEmail: adminEmailInput,
          currentPassword: currentPasswordInput,
          newPassword: newPasswordInput,
        }),
      });

      const data = await res.json();
      if (data.success && data.user) {
        setAdminSession(data.user, data.token || token || '');
        setModalFeedback({ type: 'success', message: 'Admin ID & password updated successfully!' });
        setTimeout(() => {
          setShowProfileModal(false);
          setModalFeedback(null);
        }, 1500);
      } else {
        setModalFeedback({ type: 'error', message: data.message || 'Failed to update admin credentials.' });
      }
    } catch (err: any) {
      setModalFeedback({ type: 'error', message: err.message || 'Server connection issue.' });
    } finally {
      setIsUpdating(false);
    }
  };

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
            {/* SEPARATE ADMIN PROFILE BUTTON */}
            <button
              onClick={handleOpenProfileModal}
              className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-purple-950/60 border border-slate-800 hover:border-purple-500/50 text-slate-200 transition-all group"
              title="Manage Admin Credentials & Password"
            >
              <div className="w-6 h-6 rounded-lg bg-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                <User className="w-3.5 h-3.5" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-semibold text-slate-100 group-hover:text-purple-300 transition-colors">
                  {adminUser?.email || 'admin@agritech.com'}
                </div>
                <div className="text-[9px] text-purple-400 font-mono font-medium flex items-center gap-1">
                  <Key className="w-2.5 h-2.5" />
                  <span>Admin Profile & Password</span>
                </div>
              </div>
            </button>

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

      {/* ADMIN PROFILE & CREDENTIALS MANAGEMENT MODAL */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-purple-800/60 rounded-3xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Key className="w-5 h-5 text-purple-400" />
                Admin Profile & Master Credentials
              </h3>
              <button
                onClick={() => setShowProfileModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            {modalFeedback && (
              <div
                className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
                  modalFeedback.type === 'success'
                    ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                    : 'bg-red-950/80 text-red-300 border border-red-800/60'
                }`}
              >
                {modalFeedback.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                )}
                <span>{modalFeedback.message}</span>
              </div>
            )}

            <form onSubmit={handleUpdateAdminProfileSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Admin Display Name</label>
                <input
                  type="text"
                  required
                  value={adminNameInput}
                  onChange={(e) => setAdminNameInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Admin Email / Login ID</label>
                <input
                  type="email"
                  required
                  value={adminEmailInput}
                  onChange={(e) => setAdminEmailInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="pt-2 border-t border-slate-800 space-y-3">
                <div className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5" />
                  <span>Update Master Admin Password</span>
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Current Password</label>
                  <input
                    type="password"
                    placeholder="Enter current password..."
                    value={currentPasswordInput}
                    onChange={(e) => setCurrentPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Enter new master password..."
                    value={newPasswordInput}
                    onChange={(e) => setNewPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-slate-400 block mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Confirm new master password..."
                    value={confirmPasswordInput}
                    onChange={(e) => setConfirmPasswordInput(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-lg shadow-purple-600/30 transition-all flex items-center space-x-1.5"
                >
                  {isUpdating ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isUpdating ? 'Updating...' : 'Save Admin Credentials'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
