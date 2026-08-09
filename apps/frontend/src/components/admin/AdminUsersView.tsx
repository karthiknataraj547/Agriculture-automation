import React, { useState } from 'react';
import { useAdminStore, User360Tab } from '@/store/useAdminStore';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  Edit2,
  Building2,
  CheckCircle2,
  XCircle,
  Plus,
  ChevronRight,
  Cpu,
  Activity,
  Zap,
  AlertTriangle,
  Bot,
  Lock,
  Layers,
  FileSpreadsheet,
  Settings,
  UserPlus,
  Ban,
  RefreshCw,
  Clock,
  Radio,
  Sliders,
  ChevronDown,
} from 'lucide-react';

export const AdminUsersView: React.FC = () => {
  const {
    usersList,
    accountsList,
    devicesList,
    auditLogs,
    toggleUserStatus,
    updateUserRole,
    createCustomerAccount,
    addAccountMember,
    suspendAccount,
    selectedUser360,
    setSelectedUser360,
    active360Tab,
    setActive360Tab,
  } = useAdminStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');

  // Modals state
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [showSuspendModal, setShowSuspendModal] = useState(false);

  // Form inputs
  const [custName, setCustName] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custAccName, setCustAccName] = useState('');
  const [custRole, setCustRole] = useState('FARM_OWNER');

  const [memName, setMemName] = useState('');
  const [memEmail, setMemEmail] = useState('');
  const [memRole, setMemRole] = useState('OPERATOR');

  const [suspendReason, setSuspendReason] = useState('');

  // Filter out system admin account (admin@agritech.com) from Customer User Management
  const customerUsersList = usersList.filter(
    (u) =>
      u.email?.toLowerCase() !== 'admin@agritech.com' &&
      u.id !== 'admin'
  );

  // Filtering users across multiple entities
  const filteredUsers = customerUsersList.filter((u) => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.id?.toLowerCase().includes(term) ||
      u.accountId?.toLowerCase().includes(term) ||
      u.accountName?.toLowerCase().includes(term);

    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  // Calculate Metrics for Customer Accounts Only
  const totalUsersCount = customerUsersList.length;
  const activeUsersCount = customerUsersList.filter((u) => u.status !== 'DISABLED').length;
  const disabledUsersCount = totalUsersCount - activeUsersCount;
  const totalAccountsCount = accountsList.length || 2;
  const totalDevicesCount = devicesList.length || 4;
  const onlineDevicesCount = devicesList.filter((d) => d.status === 'ONLINE').length || 3;

  // Selected User's Account details
  const currentAccount = accountsList.find((a) => a.id === selectedUser360?.accountId) || {
    id: selectedUser360?.accountId || 'account-farm-alpha',
    name: selectedUser360?.accountName || 'Farm Alpha Commercial Enterprise',
    status: 'ACTIVE',
    maxDevices: 50,
    maxUsers: 10,
    maxTelemetryRate: 120,
    ownerId: selectedUser360?.id || 'usr-admin-01',
    createdAt: selectedUser360?.createdAt || new Date().toISOString(),
  };

  // Selected User's Account Members
  const accountMembers = usersList.filter((u) => u.accountId === currentAccount.id);

  // Selected User's Devices
  const accountDevices = devicesList.filter(
    (d) => d.accountId === currentAccount.id || (!d.accountId && currentAccount.id === 'account-farm-alpha')
  );

  const tabs: { id: User360Tab; label: string; icon: React.FC<{ className?: string }> }[] = [
    { id: 'OVERVIEW', label: 'Overview', icon: Layers },
    { id: 'ACCOUNT', label: 'Account', icon: Building2 },
    { id: 'MEMBERS', label: 'Members', icon: Users },
    { id: 'FARMS', label: 'Farms', icon: Building2 },
    { id: 'ZONES', label: 'Zones', icon: Layers },
    { id: 'DEVICES', label: 'Devices', icon: Cpu },
    { id: 'SENSORS', label: 'Sensors', icon: Radio },
    { id: 'TELEMETRY', label: 'Telemetry', icon: Activity },
    { id: 'COMMANDS', label: 'Commands', icon: Zap },
    { id: 'ALERTS', label: 'Alerts', icon: AlertTriangle },
    { id: 'AUTOMATION', label: 'Automation', icon: Bot },
    { id: 'USAGE', label: 'Usage', icon: Sliders },
    { id: 'SECURITY', label: 'Security', icon: Lock },
    { id: 'ACTIVITY', label: 'Activity', icon: FileSpreadsheet },
    { id: 'SETTINGS', label: 'Settings', icon: Settings },
  ];

  const handleCreateCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const ok = await createCustomerAccount({
      name: custName,
      email: custEmail,
      accountName: custAccName || `${custName}'s Agriculture Enterprise`,
      role: custRole,
    });
    if (ok) {
      setShowCreateCustomerModal(false);
      setCustName('');
      setCustEmail('');
      setCustAccName('');
    }
  };

  const handleAddMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount.id) return;
    const ok = await addAccountMember({
      accountId: currentAccount.id,
      name: memName,
      email: memEmail,
      role: memRole,
    });
    if (ok) {
      setShowAddMemberModal(false);
      setMemName('');
      setMemEmail('');
    }
  };

  const handleSuspendSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentAccount.id || !suspendReason) return;
    const ok = await suspendAccount(currentAccount.id, suspendReason);
    if (ok) {
      setShowSuspendModal(false);
      setSuspendReason('');
    }
  };

  return (
    <div className="space-y-6">
      {/* LANDING / HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            User & Tenant Management
          </h1>
          <p className="text-xs text-slate-400">
            Central customer control center, RBAC role assignment, multi-tenant hierarchy & 360° inspection.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateCustomerModal(true)}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs shadow-lg shadow-purple-600/30 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Provision Customer & Account</span>
          </button>
        </div>
      </div>

      {/* TOP UNIFIED KPI METRICS GRID */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="text-[10px] font-medium text-slate-400">Total Users</div>
          <div className="text-xl font-bold text-white font-mono mt-1">{totalUsersCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="text-[10px] font-medium text-slate-400">Active Users</div>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-1">{activeUsersCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="text-[10px] font-medium text-slate-400">Disabled Users</div>
          <div className="text-xl font-bold text-red-400 font-mono mt-1">{disabledUsersCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="text-[10px] font-medium text-slate-400">Total Accounts</div>
          <div className="text-xl font-bold text-purple-400 font-mono mt-1">{totalAccountsCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="text-[10px] font-medium text-slate-400">Online Devices</div>
          <div className="text-xl font-bold text-cyan-400 font-mono mt-1">{onlineDevicesCount}</div>
        </div>

        <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md">
          <div className="text-[10px] font-medium text-slate-400">Active Alerts</div>
          <div className="text-xl font-bold text-amber-400 font-mono mt-1">0</div>
        </div>
      </div>

      {/* IF A USER IS SELECTED: SHOW USER 360° INSPECTOR */}
      {selectedUser360 ? (
        <div className="space-y-6">
          {/* BREADCRUMB NAVIGATION */}
          <div className="flex items-center space-x-2 text-xs font-medium text-slate-400">
            <button onClick={() => setSelectedUser360(null)} className="hover:text-purple-400 transition-colors">
              User Management
            </button>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-white font-semibold">{selectedUser360.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
            <span className="text-purple-400 font-mono">{currentAccount.name}</span>
          </div>

          {/* USER 360° HEADER CARD */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900/80 via-slate-900/60 to-purple-950/40 border border-slate-800 backdrop-blur-xl shadow-2xl relative">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/20 shrink-0">
                  {selectedUser360.name.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center space-x-3">
                    <h2 className="text-xl font-bold text-white">{selectedUser360.name}</h2>
                    <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-semibold font-mono">
                      {selectedUser360.role}
                    </span>
                    {selectedUser360.status === 'DISABLED' ? (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/60 text-[10px] font-semibold">
                        Disabled
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60 text-[10px] font-semibold">
                        Active
                      </span>
                    )}
                  </div>

                  <div className="text-xs text-slate-400 flex items-center space-x-4 font-mono">
                    <span>Email: {selectedUser360.email}</span>
                    <span>User ID: {selectedUser360.id}</span>
                    <span>Tenant ID: {currentAccount.id}</span>
                  </div>
                </div>
              </div>

              {/* QUICK ACTIONS BAR */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                >
                  <UserPlus className="w-3.5 h-3.5 text-purple-400" />
                  <span>Add Member</span>
                </button>

                <button
                  onClick={() => toggleUserStatus(selectedUser360.id, selectedUser360.status)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all ${
                    selectedUser360.status === 'DISABLED'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-700'
                      : 'bg-red-950 text-red-300 border border-red-700'
                  }`}
                >
                  {selectedUser360.status === 'DISABLED' ? <UserCheck className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                  <span>{selectedUser360.status === 'DISABLED' ? 'Enable User' : 'Disable User'}</span>
                </button>

                <button
                  onClick={() => setShowSuspendModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-800/60 text-amber-300 hover:bg-amber-900 text-xs font-semibold flex items-center space-x-1.5 transition-all"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>Suspend Account</span>
                </button>
              </div>
            </div>

            {/* 15 INSPECTION TABS BAR */}
            <div className="flex items-center space-x-1 overflow-x-auto pt-6 border-t border-slate-800/80 mt-6 no-scrollbar">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = active360Tab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActive360Tab(tab.id)}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                        : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: OVERVIEW & ACCOUNT HIERARCHY VISUAL TREE */}
          {active360Tab === 'OVERVIEW' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400">Account Quotas</div>
                  <div className="text-lg font-bold text-white font-mono">{accountDevices.length} / {currentAccount.maxDevices} Devices</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full" style={{ width: `${(accountDevices.length / currentAccount.maxDevices) * 100}%` }} />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400">Account Members</div>
                  <div className="text-lg font-bold text-white font-mono">{accountMembers.length} / {currentAccount.maxUsers} Users</div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full" style={{ width: `${(accountMembers.length / currentAccount.maxUsers) * 100}%` }} />
                  </div>
                </div>

                <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <div className="text-xs text-slate-400">Farms Registered</div>
                  <div className="text-lg font-bold text-white font-mono">1 Farm Alpha (Zone 1)</div>
                  <div className="text-[11px] text-emerald-400 font-medium">Optimal Soil Health</div>
                </div>
              </div>

              {/* ACCOUNT HIERARCHY TREE COMPONENT */}
              <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-purple-400" />
                  Account Multi-Tenant Hierarchy Tree
                </h3>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 font-mono text-xs text-slate-300 space-y-3">
                  <div className="flex items-center space-x-2 text-purple-300 font-bold">
                    <Building2 className="w-4 h-4 text-purple-400" />
                    <span>TENANT ACCOUNT: {currentAccount.name} ({currentAccount.id})</span>
                  </div>

                  <div className="pl-6 border-l-2 border-slate-800 space-y-2">
                    <div className="text-slate-400 font-semibold flex items-center space-x-2">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>MEMBERS ({accountMembers.length}):</span>
                    </div>
                    <div className="pl-6 space-y-1 text-slate-300">
                      {accountMembers.map((m) => (
                        <div key={m.id} className="flex items-center space-x-2">
                          <span>├── {m.name} ({m.email})</span>
                          <span className="text-[10px] bg-slate-900 px-1.5 py-0.5 rounded text-purple-400">{m.role}</span>
                        </div>
                      ))}
                    </div>

                    <div className="text-slate-400 font-semibold flex items-center space-x-2 pt-2">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                      <span>FARMS & ZONES:</span>
                    </div>
                    <div className="pl-6 space-y-2 text-slate-300">
                      <div>└── Farm Alpha Commercial Zone</div>
                      <div className="pl-6 border-l border-slate-800 space-y-1">
                        <div>└── Zone 1 (Corn & Wheat Sector)</div>
                        <div className="pl-6 border-l border-slate-800 space-y-1">
                          {accountDevices.map((d) => (
                            <div key={d.uuid || d.serialNumber} className="flex items-center space-x-2 text-cyan-300">
                              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                              <span>├── Hardware Node: {d.serialNumber || d.uuid} ({d.boardFamily || 'ESP8266'})</span>
                              <span className="text-[10px] bg-emerald-950 text-emerald-400 px-1 rounded">ONLINE</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ACCOUNT DETAILS */}
          {active360Tab === 'ACCOUNT' && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 max-w-2xl">
              <h3 className="text-sm font-bold text-white">Tenant Account Metadata</h3>
              <div className="grid grid-cols-2 gap-4 text-xs font-mono">
                <div>
                  <div className="text-slate-500">Account ID</div>
                  <div className="text-white font-bold">{currentAccount.id}</div>
                </div>
                <div>
                  <div className="text-slate-500">Account Name</div>
                  <div className="text-white font-bold">{currentAccount.name}</div>
                </div>
                <div>
                  <div className="text-slate-500">Max Devices Quota</div>
                  <div className="text-purple-400 font-bold">{currentAccount.maxDevices} Devices</div>
                </div>
                <div>
                  <div className="text-slate-500">Max Users Quota</div>
                  <div className="text-purple-400 font-bold">{currentAccount.maxUsers} Members</div>
                </div>
                <div>
                  <div className="text-slate-500">Telemetry Rate Limit</div>
                  <div className="text-amber-400 font-bold">{currentAccount.maxTelemetryRate} packets/min</div>
                </div>
                <div>
                  <div className="text-slate-500">Created Date</div>
                  <div className="text-slate-300">{new Date(currentAccount.createdAt).toLocaleDateString()}</div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ACCOUNT MEMBERS */}
          {active360Tab === 'MEMBERS' && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white">Account Members ({accountMembers.length})</h3>
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold flex items-center space-x-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              </div>

              <div className="divide-y divide-slate-800/80 font-mono text-xs">
                {accountMembers.map((m) => (
                  <div key={m.id} className="py-3 flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{m.name}</div>
                      <div className="text-slate-400 text-[11px]">{m.email}</div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-950 text-purple-400 border border-slate-800 font-semibold text-[10px]">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 6: DEVICES */}
          {active360Tab === 'DEVICES' && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
              <h3 className="text-sm font-bold text-white">Account Devices ({accountDevices.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 font-mono text-xs">
                {accountDevices.map((d) => (
                  <div key={d.uuid || d.serialNumber} className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-bold text-white">{d.serialNumber || d.uuid}</div>
                      <span className="px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 text-[10px]">ONLINE</span>
                    </div>
                    <div className="text-slate-400">Board: {d.boardFamily || 'ESP8266'}</div>
                    <div className="text-slate-400">Topic: agri/prod/farm-alpha/zone-1/{d.serialNumber || d.uuid}/telemetry</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 15: SETTINGS */}
          {active360Tab === 'SETTINGS' && (
            <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4 max-w-2xl">
              <h3 className="text-sm font-bold text-white">Tenant-Scoped Configuration Settings</h3>
              <div className="space-y-4 text-xs font-sans">
                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">Telemetry Interval</div>
                    <div className="text-slate-400 text-[11px]">Hardware sampling rate for this account</div>
                  </div>
                  <span className="font-mono text-purple-400 font-bold">3 Seconds</span>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-white">OTA Firmware Policy</div>
                    <div className="text-slate-400 text-[11px]">Automatic over-the-air updates for ESP32/ESP8266</div>
                  </div>
                  <span className="font-mono text-emerald-400 font-bold">AUTOMATIC</span>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MAIN UNIFIED USER & ACCOUNT TABLE */
        <div className="space-y-4">
          {/* SEARCH & FILTERS */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Unified Search (User, Email, Account, Device...)"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 w-80"
              />
            </div>

            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-purple-500/50"
            >
              <option value="ALL">All Roles</option>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="FARM_OWNER">FARM_OWNER</option>
              <option value="USER">USER</option>
            </select>
          </div>

          {/* TABLE */}
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800/80">
                  <tr>
                    <th className="px-5 py-3.5">User Identity</th>
                    <th className="px-5 py-3.5">Tenant Account</th>
                    <th className="px-5 py-3.5">Role</th>
                    <th className="px-5 py-3.5">Status</th>
                    <th className="px-5 py-3.5">Devices / Farms</th>
                    <th className="px-5 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {filteredUsers.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setSelectedUser360(u)}
                      className="hover:bg-purple-950/20 cursor-pointer transition-colors"
                    >
                      <td className="px-5 py-4 font-sans">
                        <div className="font-semibold text-slate-100">{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>

                      <td className="px-5 py-4">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px]">
                          <Building2 className="w-3 h-3 text-purple-400" />
                          <span>{u.accountId || `account-${u.id}`}</span>
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <span className="px-2.5 py-1 rounded-lg bg-purple-950/80 text-purple-300 border border-purple-500/40 text-[10px] font-semibold">
                          {u.role}
                        </span>
                      </td>

                      <td className="px-5 py-4 font-sans">
                        {u.status === 'DISABLED' ? (
                          <span className="inline-flex items-center space-x-1 text-red-400 bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <XCircle className="w-3 h-3" />
                            <span>Disabled</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Active</span>
                          </span>
                        )}
                      </td>

                      <td className="px-5 py-4 text-slate-300 font-mono">
                        1 Device / 1 Farm
                      </td>

                      <td className="px-5 py-4 text-right font-sans">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser360(u);
                          }}
                          className="px-3 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold"
                        >
                          Inspect 360°
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PROVISION CUSTOMER & ACCOUNT MODAL */}
      {showCreateCustomerModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              Provision Customer & Account
            </h3>

            <form onSubmit={handleCreateCustomerSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ramesh Kumar"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="ramesh@agrifarm.com"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Account / Enterprise Name</label>
                <input
                  type="text"
                  placeholder="Ramesh Organic Agro Tech"
                  value={custAccName}
                  onChange={(e) => setCustAccName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateCustomerModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold">
                  Provision Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADD MEMBER MODAL */}
      {showAddMemberModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-purple-400" />
              Add Member to Account ({currentAccount.name})
            </h3>

            <form onSubmit={handleAddMemberSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Member Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Technician"
                  value={memName}
                  onChange={(e) => setMemName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Member Email</label>
                <input
                  type="email"
                  required
                  placeholder="suresh@agrifarm.com"
                  value={memEmail}
                  onChange={(e) => setMemEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Member Role</label>
                <select
                  value={memRole}
                  onChange={(e) => setMemRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="MANAGER">MANAGER</option>
                  <option value="TECHNICIAN">TECHNICIAN</option>
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold">
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUSPEND ACCOUNT MODAL */}
      {showSuspendModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-red-800 rounded-2xl max-w-md w-full p-6 space-y-4">
            <h3 className="text-lg font-bold text-red-400 flex items-center gap-2">
              <Ban className="w-5 h-5" />
              Suspend Account ({currentAccount.name})
            </h3>
            <p className="text-xs text-slate-300">
              Suspending an account blocks user logins and device commands immediately.
            </p>

            <form onSubmit={handleSuspendSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-300 block mb-1">Mandatory Suspension Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Detail the reason for account suspension..."
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSuspendModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-xl bg-red-600 text-white text-xs font-semibold">
                  Confirm Account Suspension
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
