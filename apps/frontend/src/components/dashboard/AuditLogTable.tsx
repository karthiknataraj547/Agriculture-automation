'use client';

import React, { useState } from 'react';
import { clsx } from 'clsx';
import { ShieldCheck, ChevronDown, ChevronUp, User, Clock } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useSpatialStore } from '../../store/useSpatialStore';

// Simulate audit logs from backend (would come from WebSocket/REST in production)
const MOCK_AUDIT_LOGS = [
  {
    id: '1',
    timestamp: '2026-08-04T18:00:00.000Z',
    userId: 'usr-admin-01',
    userName: 'Alex Mercer',
    userRole: 'SUPER_ADMIN',
    action: 'PROVISION_DEVICE',
    resource: 'ESP32 Node Alpha 01',
    ipAddress: '192.168.1.100',
    status: 'SUCCESS' as const,
  },
  {
    id: '2',
    timestamp: '2026-08-04T17:30:00.000Z',
    userId: 'usr-admin-01',
    userName: 'Alex Mercer',
    userRole: 'SUPER_ADMIN',
    action: 'ACTUATE_PUMP_OVERRIDE',
    resource: 'Pump-Main-01 (Zone 1)',
    ipAddress: '192.168.1.100',
    status: 'SUCCESS' as const,
  },
  {
    id: '3',
    timestamp: '2026-08-04T17:00:00.000Z',
    userId: 'usr-tech-02',
    userName: 'Sarah Chen',
    userRole: 'TECHNICIAN',
    action: 'UPDATE_FIRMWARE',
    resource: 'ESP32 Node Alpha 03',
    ipAddress: '192.168.1.105',
    status: 'SUCCESS' as const,
  },
  {
    id: '4',
    timestamp: '2026-08-04T16:30:00.000Z',
    userId: 'usr-viewer-03',
    userName: 'Guest User',
    userRole: 'VIEWER',
    action: 'ACCESS_TELEMETRY',
    resource: 'Zone-2 Historical Data',
    ipAddress: '10.0.0.42',
    status: 'DENIED' as const,
  },
  {
    id: '5',
    timestamp: '2026-08-04T16:00:00.000Z',
    userId: 'usr-admin-01',
    userName: 'Alex Mercer',
    userRole: 'SUPER_ADMIN',
    action: 'CREATE_RULE',
    resource: 'Rule: Emergency Low Moisture Auto-Pump',
    ipAddress: '192.168.1.100',
    status: 'SUCCESS' as const,
  },
];

const statusColors = {
  SUCCESS: 'bg-cyber-emerald/10 text-cyber-emerald border-cyber-emerald/20',
  FAILURE: 'bg-cyber-crimson/10 text-cyber-crimson border-cyber-crimson/20',
  DENIED: 'bg-cyber-amber/10 text-cyber-amber border-cyber-amber/20',
};

const roleColors: Record<string, string> = {
  SUPER_ADMIN: 'text-cyber-crimson',
  ADMIN: 'text-cyber-amber',
  FARM_OWNER: 'text-cyber-cyan',
  MANAGER: 'text-cyber-cyan',
  TECHNICIAN: 'text-cyber-emerald',
  OPERATOR: 'text-slate-400',
  VIEWER: 'text-slate-500',
  GUEST: 'text-slate-600',
};

export function AuditLogTable() {
  const [sortAsc, setSortAsc] = useState(false);

  const logs = [...MOCK_AUDIT_LOGS].sort((a, b) => {
    const diff = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
    return sortAsc ? diff : -diff;
  });

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={14} className="text-cyber-emerald" />
          <span className="text-[10px] font-mono uppercase tracking-[0.15em] text-slate-500 font-medium">
            Security Audit Log
          </span>
        </div>
        <span className="text-[10px] font-mono text-slate-600">
          {logs.length} entries
        </span>
      </div>

      {/* Table */}
      <GlassCard variant="default" padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th
                  className="px-4 py-3 text-[9px] font-mono uppercase tracking-wider text-slate-600 cursor-pointer hover:text-cyber-cyan transition-colors"
                  onClick={() => setSortAsc(!sortAsc)}
                >
                  <div className="flex items-center gap-1">
                    Timestamp
                    {sortAsc ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
                  </div>
                </th>
                <th className="px-4 py-3 text-[9px] font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 font-extrabold">
                  User
                </th>
                <th className="px-4 py-3 text-[9px] font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 font-extrabold">
                  Role
                </th>
                <th className="px-4 py-3 text-[9px] font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 font-extrabold">
                  Action
                </th>
                <th className="px-4 py-3 text-[9px] font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 font-extrabold">
                  Resource
                </th>
                <th className="px-4 py-3 text-[9px] font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 font-extrabold">
                  IP
                </th>
                <th className="px-4 py-3 text-[9px] font-mono uppercase tracking-wider text-slate-900 dark:text-slate-100 font-extrabold">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr
                  key={log.id}
                  className="border-b border-slate-300 dark:border-slate-800 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-slate-700 dark:text-slate-400" />
                      <span suppressHydrationWarning className="text-[10px] font-mono text-slate-900 dark:text-slate-100 tabular-nums font-extrabold">
                        {new Date(log.timestamp).toLocaleString('en-US', {
                          month: 'short',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                          hour12: false,
                        })}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1.5">
                      <User size={10} className="text-slate-700 dark:text-slate-400" />
                      <span className="text-[10px] text-slate-900 dark:text-slate-100 font-extrabold">{log.userName}</span>
                    </div>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={clsx(
                        'text-[9px] font-mono font-extrabold',
                        roleColors[log.userRole] || 'text-slate-700'
                      )}
                    >
                      {log.userRole}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-mono text-sky-700 dark:text-cyan-400 font-extrabold">{log.action}</span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] text-slate-900 dark:text-slate-100 font-extrabold max-w-[200px] truncate block">
                      {log.resource}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="text-[10px] font-mono text-slate-900 dark:text-slate-100 font-extrabold tabular-nums">
                      {log.ipAddress}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={clsx(
                        'px-2 py-0.5 rounded text-[8px] font-mono font-bold uppercase border',
                        statusColors[log.status]
                      )}
                    >
                      {log.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
