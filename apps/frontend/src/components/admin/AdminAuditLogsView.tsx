import React, { useState } from 'react';
import { useAdminStore } from '@/store/useAdminStore';
import {
  FileSpreadsheet,
  Search,
  Shield,
  User,
  Clock,
  Globe,
  CheckCircle2,
  XCircle,
  AlertOctagon,
} from 'lucide-react';

export const AdminAuditLogsView: React.FC = () => {
  const { auditLogs } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = auditLogs.filter((log) => {
    return (
      log.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ipAddress?.includes(searchTerm)
    );
  });

  return (
    <div className="space-y-6">
      {/* TITLE & SEARCH */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-purple-400" />
            Immutable Audit Trail & Activity Logs
          </h1>
          <p className="text-xs text-slate-400">
            System-wide security event tracking, administrative action history, and compliance logging.
          </p>
        </div>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search action, actor, IP, resource..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 w-72"
          />
        </div>
      </div>

      {/* AUDIT LOG TABLE */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800/80">
              <tr>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor Identity</th>
                <th className="px-5 py-3.5">Action Executed</th>
                <th className="px-5 py-3.5">Target Resource</th>
                <th className="px-5 py-3.5">IP Address</th>
                <th className="px-5 py-3.5 text-right">Result</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-xs font-sans">
                    No matching audit log entries recorded.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    {/* TIMESTAMP */}
                    <td className="px-5 py-4 text-[11px] text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{new Date(log.timestamp).toLocaleString()}</span>
                      </div>
                    </td>

                    {/* ACTOR IDENTITY */}
                    <td className="px-5 py-4 font-sans">
                      <div className="font-semibold text-slate-100 flex items-center space-x-1.5">
                        <User className="w-3.5 h-3.5 text-purple-400" />
                        <span>{log.userName}</span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{log.userRole}</div>
                    </td>

                    {/* ACTION EXECUTED */}
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-purple-950/60 border border-purple-800/40 text-purple-300 text-[10px] font-semibold">
                        <span>{log.action}</span>
                      </span>
                    </td>

                    {/* TARGET RESOURCE */}
                    <td className="px-5 py-4 text-slate-200">{log.resource}</td>

                    {/* IP ADDRESS */}
                    <td className="px-5 py-4 text-[11px] text-slate-400">
                      <div className="flex items-center space-x-1">
                        <Globe className="w-3 h-3 text-slate-500" />
                        <span>{log.ipAddress}</span>
                      </div>
                    </td>

                    {/* RESULT */}
                    <td className="px-5 py-4 text-right font-sans">
                      {log.status === 'SUCCESS' ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>SUCCESS</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 text-red-400 bg-red-950/60 border border-red-800/60 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          <XCircle className="w-3 h-3" />
                          <span>DENIED</span>
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
