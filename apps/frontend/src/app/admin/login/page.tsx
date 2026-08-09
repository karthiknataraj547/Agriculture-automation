'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAdminStore } from '@/store/useAdminStore';
import { ShieldCheck, Lock, ArrowRight, CheckCircle2, AlertTriangle } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const { setAdminSession } = useAdminStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [mustChange, setMustChange] = useState(false);
  const [tempUser, setTempUser] = useState<any>(null);
  const [tempToken, setTempToken] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'admin-login', email, password }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.success && data.user) {
        if (data.mustChangePassword) {
          setMustChange(true);
          setTempUser(data.user);
          setTempToken(data.token);
        } else {
          setAdminSession(data.user, data.token);
          router.push('/admin');
        }
      } else {
        setErrorMsg(data.message || 'Admin authentication failed.');
      }
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg('Connection error.');
    }
  };

  const handlePasswordChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const res = await fetch('/api/admin/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tempToken}`,
        },
        body: JSON.stringify({ action: 'change-password', newPassword }),
      });

      const data = await res.json();
      setIsLoading(false);

      if (data.success) {
        setAdminSession({ ...tempUser, mustChangePassword: false }, tempToken);
        router.push('/admin');
      } else {
        setErrorMsg(data.message || 'Password update failed.');
      }
    } catch {
      setIsLoading(false);
      setErrorMsg('Connection issue.');
    }
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex items-center justify-center p-4 selection:bg-purple-500/30">
      <div className="max-w-md w-full p-8 rounded-3xl bg-slate-900/60 border border-slate-800 backdrop-blur-xl shadow-2xl space-y-6">
        {/* BRANDING HEADER */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-500 to-blue-500 flex items-center justify-center mx-auto shadow-xl shadow-purple-500/20">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-purple-400">
            AetherCrop Admin Console
          </h1>
          <p className="text-xs text-slate-400">
            {mustChange
              ? 'Security Policy Enforcement: Password update required on initial login.'
              : 'Enter your system administrator credentials.'}
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/80 border border-red-800/60 text-red-300 text-xs font-mono flex items-center space-x-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* LOGIN FORM */}
        {!mustChange ? (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Admin Email / ID</label>
              <input
                type="text"
                required
                placeholder="admin@aethercrop.io or admin"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Master Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Authenticating Admin...' : 'Authenticate Admin Session'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          /* INITIAL PASSWORD CHANGE FORM */
          <form onSubmit={handlePasswordChangeSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">New Master Password</label>
              <input
                type="password"
                required
                placeholder="Minimum 8 characters..."
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-300 block mb-1">Confirm New Password</label>
              <input
                type="password"
                required
                placeholder="Confirm password..."
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/30 transition-all flex items-center justify-center space-x-2"
            >
              <span>{isLoading ? 'Updating Password...' : 'Save & Proceed to Admin Panel'}</span>
              <CheckCircle2 className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
