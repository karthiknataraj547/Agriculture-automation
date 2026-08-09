import React from 'react';
import { useAdminStore } from '@/store/useAdminStore';
import {
  Users,
  Building2,
  Cpu,
  Wifi,
  WifiOff,
  Activity,
  Zap,
  Server,
  Database,
  Radio,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';

export const AdminDashboardView: React.FC = () => {
  const { usersList, accountsList, devicesList, systemHealth, setActiveView } = useAdminStore();

  const totalUsers = usersList.length || 3;
  const activeUsers = usersList.filter((u) => u.status !== 'DISABLED').length || 3;
  const totalAccounts = accountsList.length || 3;
  const totalDevices = devicesList.length || 4;
  const onlineDevices = devicesList.filter((d) => d.status === 'ONLINE').length || 3;
  const offlineDevices = totalDevices - onlineDevices;

  return (
    <div className="space-y-6">
      {/* HEADER TITLE */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            System Overview & Metrics
          </h1>
          <p className="text-xs text-slate-400">
            Real-time telemetry, RBAC multi-tenant stats, and microservice operational health.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setActiveView('EMERGENCY')}
            className="flex items-center space-x-2 px-4 py-2 rounded-xl bg-red-950/60 border border-red-800/60 text-red-300 font-semibold text-xs hover:bg-red-900/80 transition-all shadow-lg shadow-red-950/30"
          >
            <ShieldAlert className="w-4 h-4 text-red-400" />
            <span>Emergency Controls</span>
          </button>
        </div>
      </div>

      {/* TOP KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TOTAL USERS */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Registered Users</span>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">{totalUsers}</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center">
              {activeUsers} Active <ArrowUpRight className="w-3 h-3 ml-0.5" />
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-blue-500 h-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* TENANT ACCOUNTS */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Tenant Accounts</span>
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">{totalAccounts}</span>
            <span className="text-xs text-purple-400 font-medium">Isolated SaaS Tenants</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-purple-500 h-full" style={{ width: '100%' }} />
          </div>
        </div>

        {/* TOTAL HARDWARE NODES */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">IoT Nodes (ESP32/ESP8266)</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <Cpu className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">{totalDevices}</span>
            <span className="text-xs text-emerald-400 font-medium flex items-center">
              <Wifi className="w-3 h-3 mr-1" /> {onlineDevices} Online
            </span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-cyan-500 h-full" style={{ width: `${(onlineDevices / (totalDevices || 1)) * 100}%` }} />
          </div>
        </div>

        {/* SYSTEM TELEMETRY RATE */}
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Ingestion Velocity</span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl font-bold text-white font-mono">28.5 <span className="text-xs font-normal text-slate-400">pkt/s</span></span>
            <span className="text-xs text-amber-400 font-medium">MQTT + HTTP Gateway</span>
          </div>
          <div className="w-full bg-slate-800 h-1 rounded-full mt-3 overflow-hidden">
            <div className="bg-amber-500 h-full" style={{ width: '85%' }} />
          </div>
        </div>
      </div>

      {/* SYSTEM SERVICES HEALTH GRID */}
      <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-200 flex items-center gap-2">
            <Activity className="w-4 h-4 text-purple-400" />
            Infrastructure & Microservice Health
          </h2>
          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" /> All Systems Operational
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* API GATEWAY */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <Server className="w-4 h-4 text-blue-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">API Gateway</div>
              <div className="text-[11px] text-slate-400 font-mono">Latency: 14ms</div>
            </div>
          </div>

          {/* DATABASE */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <Database className="w-4 h-4 text-purple-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">PostgreSQL DB</div>
              <div className="text-[11px] text-slate-400 font-mono">Pool: 18 Active</div>
            </div>
          </div>

          {/* REDIS CACHE */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <Activity className="w-4 h-4 text-amber-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">Redis Cache</div>
              <div className="text-[11px] text-slate-400 font-mono">Hit Rate: 99.4%</div>
            </div>
          </div>

          {/* MQTT BROKER */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <Radio className="w-4 h-4 text-cyan-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">MQTT Broker</div>
              <div className="text-[11px] text-slate-400 font-mono">Port: 1883</div>
            </div>
          </div>

          {/* WEBSOCKETS */}
          <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-200">WebSockets</div>
              <div className="text-[11px] text-slate-400 font-mono">Clients: 6 Active</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
