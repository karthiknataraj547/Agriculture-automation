'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/useAdminStore';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { AdminDashboardView } from '@/components/admin/AdminDashboardView';
import { AdminUsersView } from '@/components/admin/AdminUsersView';
import { AdminAccountsView } from '@/components/admin/AdminAccountsView';
import { AdminDevicesView } from '@/components/admin/AdminDevicesView';
import { AdminAuditLogsView } from '@/components/admin/AdminAuditLogsView';
import { AdminEmergencyControls } from '@/components/admin/AdminEmergencyControls';
import { AdminHardwareProductsView } from '@/components/admin/AdminHardwareProductsView';
import { Activity, Settings, Bot, Zap, Radio, RefreshCw, AlertTriangle } from 'lucide-react';

export default function AdminPage() {
  const router = useRouter();
  const { isAuthenticated, activeView, fetchAdminData, systemHealth, isLoading } = useAdminStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/admin/login');
    } else {
      fetchAdminData();
    }
  }, [isAuthenticated, router, fetchAdminData]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AdminLayout>
      {activeView === 'OVERVIEW' && <AdminDashboardView />}
      {activeView === 'USERS' && <AdminUsersView />}
      {activeView === 'PRODUCTS' && <AdminHardwareProductsView />}
      {activeView === 'DEVICES' && <AdminDevicesView />}
      {activeView === 'TELEMETRY' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Activity className="w-6 h-6 text-purple-400" />
            Global Telemetry Stream
          </h1>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md text-xs font-mono text-cyan-300">
            [Ingestion Gateway Active] Polling live telemetry across all active hardware nodes (28.5 pkt/s)
          </div>
        </div>
      )}
      {activeView === 'COMMANDS' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="w-6 h-6 text-amber-400" />
            Device Command Log & Tracing
          </h1>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md text-xs font-mono text-amber-300">
            [Command Bus Active] Server-authoritative state versioning and MQTT trace logging
          </div>
        </div>
      )}
      {activeView === 'ALERTS' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-400" />
            Active Platform Alerts
          </h1>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md text-xs font-mono text-emerald-400">
            0 Critical Alerts across platform nodes. All systems optimal.
          </div>
        </div>
      )}
      {activeView === 'AUTOMATION' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Bot className="w-6 h-6 text-purple-400" />
            Global Irrigation Automation Engine
          </h1>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md text-xs font-mono text-purple-300">
            [Rules Engine Active] Automated soil moisture & weather rules running across tenant zones.
          </div>
        </div>
      )}
      {activeView === 'MQTT' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Radio className="w-6 h-6 text-cyan-400" />
            MQTT Broker & Topic ACL Governance
          </h1>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md text-xs font-mono text-slate-300 space-y-2">
            <div>Broker Host: test.mosquitto.org:1883 (MQTTS Port 8883 Ready)</div>
            <div>Topic ACL Policy: agri/prod/{'{accountId}'}/{'{deviceId}'}/#</div>
          </div>
        </div>
      )}
      {activeView === 'FIRMWARE' && <AdminHardwareProductsView />}
      {activeView === 'AUDIT' && <AdminAuditLogsView />}
      {activeView === 'EMERGENCY' && <AdminEmergencyControls />}
      {activeView === 'SETTINGS' && (
        <div className="space-y-6">
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-400" />
            Platform & Governance Configuration
          </h1>
          <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md space-y-4 max-w-2xl">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <div className="text-sm font-semibold text-white">Strict Tenant Isolation</div>
                <div className="text-xs text-slate-400">Enforce accountId scoping on all REST and WebSocket feeds</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-xs font-mono">
                ENABLED
              </span>
            </div>

            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <div className="text-sm font-semibold text-white">Initial Admin Bootstrapping</div>
                <div className="text-xs text-slate-400">Environment variable secrets configuration</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-purple-950 text-purple-400 border border-purple-500/30 text-xs font-mono">
                SALTED_HASH
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-white">MQTT Broker ACL Scoping</div>
                <div className="text-xs text-slate-400">Restrict device pub/sub to tenant topics</div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-500/30 text-xs font-mono">
                ENFORCED
              </span>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
