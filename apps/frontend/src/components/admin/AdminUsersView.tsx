import React, { useState } from 'react';
import { useAdminStore } from '@/store/useAdminStore';
import { UserRole } from '@aether/shared';
import {
  Users,
  Search,
  Shield,
  UserCheck,
  UserX,
  Edit2,
  Lock,
  Building2,
  CheckCircle2,
  XCircle,
  MoreVertical,
  KeyRound,
} from 'lucide-react';

export const AdminUsersView: React.FC = () => {
  const { usersList, toggleUserStatus, updateUserRole, isLoading } = useAdminStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [newRole, setNewRole] = useState<string>('USER');

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.accountId?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesRole = selectedRoleFilter === 'ALL' || u.role === selectedRoleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleUpdateSubmit = async (userId: string) => {
    const ok = await updateUserRole(userId, newRole);
    if (ok) setEditingUserId(null);
  };

  return (
    <div className="space-y-6">
      {/* TITLE & FILTERS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-purple-400" />
            User Management & RBAC
          </h1>
          <p className="text-xs text-slate-400">
            Inspect registered platform users, assign RBAC permissions, and manage account statuses.
          </p>
        </div>

        {/* SEARCH & ROLE FILTER */}
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search user name, email, account..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-purple-500/50 w-64"
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
            <option value="SUPPORT_ADMIN">SUPPORT_ADMIN</option>
            <option value="TECHNICIAN">TECHNICIAN</option>
            <option value="USER">USER</option>
          </select>
        </div>
      </div>

      {/* USERS TABLE */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800/80">
              <tr>
                <th className="px-5 py-3.5">User Identity</th>
                <th className="px-5 py-3.5">Tenant Account</th>
                <th className="px-5 py-3.5">RBAC Role</th>
                <th className="px-5 py-3.5">Account Status</th>
                <th className="px-5 py-3.5">Created Date</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-slate-500 text-xs font-sans">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isDisabled = u.status === 'DISABLED';
                  const isAdminRole = u.role === 'SUPER_ADMIN' || u.role === 'ADMIN';

                  return (
                    <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                      {/* USER IDENTITY */}
                      <td className="px-5 py-4 font-sans">
                        <div className="font-semibold text-slate-100 flex items-center space-x-2">
                          <span>{u.name}</span>
                          {u.mustChangePassword && (
                            <span className="text-[9px] bg-amber-950/80 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded uppercase font-mono">
                              Reset Req
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">{u.email}</div>
                      </td>

                      {/* TENANT ACCOUNT */}
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-slate-950/80 border border-slate-800 text-slate-300 text-[11px]">
                          <Building2 className="w-3 h-3 text-purple-400" />
                          <span>{u.accountId || `account-${u.id}`}</span>
                        </span>
                      </td>

                      {/* RBAC ROLE */}
                      <td className="px-5 py-4">
                        {editingUserId === u.id ? (
                          <div className="flex items-center space-x-2">
                            <select
                              value={newRole}
                              onChange={(e) => setNewRole(e.target.value)}
                              className="bg-slate-950 border border-purple-500/50 rounded px-2 py-1 text-xs text-white"
                            >
                              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
                              <option value="ADMIN">ADMIN</option>
                              <option value="SUPPORT_ADMIN">SUPPORT_ADMIN</option>
                              <option value="TECHNICIAN">TECHNICIAN</option>
                              <option value="USER">USER</option>
                              <option value="VIEWER">VIEWER</option>
                            </select>
                            <button
                              onClick={() => handleRoleUpdateSubmit(u.id)}
                              className="px-2 py-1 rounded bg-purple-600 text-white text-[11px] font-sans font-medium"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingUserId(null)}
                              className="px-2 py-1 rounded bg-slate-800 text-slate-400 text-[11px] font-sans"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span
                            className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg border text-[10px] font-semibold tracking-wider ${
                              isAdminRole
                                ? 'bg-purple-950/80 text-purple-300 border-purple-500/40'
                                : 'bg-slate-950 text-slate-300 border-slate-800'
                            }`}
                          >
                            <Shield className="w-3 h-3 text-purple-400" />
                            <span>{u.role}</span>
                          </span>
                        )}
                      </td>

                      {/* ACCOUNT STATUS */}
                      <td className="px-5 py-4 font-sans">
                        {isDisabled ? (
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

                      {/* CREATED DATE */}
                      <td className="px-5 py-4 text-[11px] text-slate-400">
                        {new Date(u.createdAt || Date.now()).toLocaleDateString()}
                      </td>

                      {/* ACTIONS */}
                      <td className="px-5 py-4 text-right font-sans">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => {
                              setEditingUserId(u.id);
                              setNewRole(u.role);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800 hover:bg-purple-600/30 text-slate-300 hover:text-purple-300 transition-all"
                            title="Edit Role"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => toggleUserStatus(u.id, u.status)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-all ${
                              isDisabled
                                ? 'bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 hover:bg-emerald-900/90'
                                : 'bg-red-950/80 border border-red-700/60 text-red-300 hover:bg-red-900/90'
                            }`}
                          >
                            {isDisabled ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Enable</span>
                              </>
                            ) : (
                              <>
                                <UserX className="w-3.5 h-3.5" />
                                <span>Disable</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
