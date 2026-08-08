'use client';

import React, { useState, useEffect } from 'react';
import {
  Lock,
  Mail,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  Radio,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Loader2,
  Globe,
} from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { SpatialButton } from '../ui/SpatialButton';
import { useAuthStore } from '../../store/useAuthStore';

export function LoginPage() {
  const { login, registerCustomerAccount, updatePassword, isLoading } = useAuthStore();

  const [mode, setMode] = useState<'LOGIN' | 'CREATE_ACCOUNT' | 'FORGOT_PASS'>('LOGIN');

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [oldPassword, setOldPassword] = useState('');
  
  // UI states
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // System Theme Adaptive Sync
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const saved = localStorage.getItem('aether_theme_mode');
    const isDark = saved ? saved === 'dark' : mediaQuery.matches;
    
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  // Password strength meter
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: 'None', color: 'bg-slate-300' };
    if (pass.length < 4) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (pass.length < 8) return { score: 2, label: 'Fair', color: 'bg-amber-500' };
    if (/[A-Z]/.test(pass) && /[0-9]/.test(pass) && pass.length >= 8) {
      return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
    }
    return { score: 3, label: 'Good', color: 'bg-cyber-cyan' };
  };

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (mode === 'LOGIN') {
      if (!email || !password) {
        setErrorMessage('Please enter both email/username and password.');
        return;
      }
      const result = await login(password, email);
      if (!result.success) {
        setErrorMessage(result.message || 'Login failed.');
      }
    } else if (mode === 'CREATE_ACCOUNT') {
      if (!email || !password) {
        setErrorMessage('Email/username and password are required.');
        return;
      }

      if (password !== confirmPassword) {
        setErrorMessage('Passwords do not match. Please re-enter your password.');
        return;
      }

      const result = await registerCustomerAccount(name || 'Customer Operator', email, password);
      if (!result.success) {
        setErrorMessage(result.message || 'Registration failed.');
      } else {
        setSuccessMessage('Customer account created globally! Logging in...');
      }
    } else if (mode === 'FORGOT_PASS') {
      const result = await updatePassword(oldPassword, password);
      if (!result.success) {
        setErrorMessage(result.message || 'Password update failed.');
      } else {
        setSuccessMessage('Customer password updated successfully! You can now log in.');
        setMode('LOGIN');
      }
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#e2e8f0] dark:bg-[#0b0f19] transition-colors duration-300">
      <div className="w-full max-w-md space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl neu-button text-sky-600 dark:text-cyber-cyan mb-1 shadow-lg">
            <Radio size={28} className="animate-pulse" />
          </div>
          <h1 className="text-xl font-mono font-bold tracking-[0.25em] text-slate-900 dark:text-slate-100 uppercase">
            AETHERCROP SPATIAL
          </h1>
          <p className="text-xs text-slate-700 dark:text-slate-300 font-mono font-semibold">
            Precision Irrigation & Hardware Automation System
          </p>

          {/* Global Access Indicator Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full neu-pressed text-[10px] font-mono text-sky-700 dark:text-cyber-cyan font-bold mt-1">
            <Globe size={12} />
            <span>GLOBAL CLOUD AUTHENTICATION</span>
          </div>
        </div>

        {/* Main Auth Card */}
        <GlassCard variant="default" padding="lg" className="border border-white/60 shadow-2xl">
          {/* Mode Tabs */}
          <div className="flex rounded-xl neu-pressed p-1 mb-6" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'LOGIN'}
              onClick={() => {
                setMode('LOGIN');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider uppercase rounded-lg transition-all ${
                mode === 'LOGIN'
                  ? 'neu-button text-sky-700 dark:text-cyber-cyan font-bold shadow-md'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 font-bold'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'CREATE_ACCOUNT'}
              onClick={() => {
                setMode('CREATE_ACCOUNT');
                setErrorMessage(null);
                setSuccessMessage(null);
              }}
              className={`flex-1 py-2 text-xs font-mono font-bold tracking-wider uppercase rounded-lg transition-all ${
                mode === 'CREATE_ACCOUNT'
                  ? 'neu-button text-sky-700 dark:text-cyber-cyan font-bold shadow-md'
                  : 'text-slate-700 dark:text-slate-300 hover:text-slate-900 font-bold'
              }`}
            >
              Set Password
            </button>
          </div>

          {/* Form Banner */}
          <div className="mb-4">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {mode === 'LOGIN' && 'Customer Login Portal'}
              {mode === 'CREATE_ACCOUNT' && 'Create Account & Password'}
              {mode === 'FORGOT_PASS' && 'Reset Customer Password'}
            </h2>
            <p className="text-[11px] text-slate-700 dark:text-slate-300 font-medium mt-0.5">
              {mode === 'LOGIN' && 'Sign in with your registered account credentials from any device.'}
              {mode === 'CREATE_ACCOUNT' && 'Create your customer account & password stored globally in cloud database.'}
              {mode === 'FORGOT_PASS' && 'Specify your new customer password below.'}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              className="p-3 mb-4 rounded-xl neu-pressed border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 text-xs font-mono font-bold flex items-start gap-2 animate-shake"
              role="alert"
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div
              className="p-3 mb-4 rounded-xl neu-pressed border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-xs font-mono font-bold flex items-start gap-2"
              role="status"
            >
              <CheckCircle2 size={16} className="flex-shrink-0 mt-0.5" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Customer Name (Create Account Only) */}
            {mode === 'CREATE_ACCOUNT' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 font-bold mb-1">
                  Full Name / Operator Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full pl-9 pr-3 py-2 text-xs neu-pressed font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-500 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Email / Username */}
            <div>
              <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 font-bold mb-1">
                Email / User ID
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter email or user ID"
                  required
                  className="w-full pl-9 pr-3 py-2 text-xs neu-pressed font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-500 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-xl"
                />
              </div>
            </div>

            {/* Current Password (Forgot Pass Only) */}
            {mode === 'FORGOT_PASS' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 font-bold mb-1">
                  Current Password
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs neu-pressed font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-500 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 font-bold">
                  {mode === 'FORGOT_PASS' ? 'New Password' : 'Password'}
                </label>
                {mode === 'LOGIN' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('FORGOT_PASS');
                      setErrorMessage(null);
                      setSuccessMessage(null);
                    }}
                    className="text-[10px] font-mono text-sky-700 dark:text-cyber-cyan hover:underline font-bold"
                  >
                    Reset Password?
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={mode === 'CREATE_ACCOUNT' ? 'Create customer password' : 'Enter password'}
                  required
                  className="w-full pl-9 pr-10 py-2 text-xs neu-pressed font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-500 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-xl"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength (Create Account) */}
              {mode === 'CREATE_ACCOUNT' && password && (
                <div className="mt-2 space-y-1">
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-slate-700 dark:text-slate-300 font-semibold">Security Level:</span>
                    <span className="font-bold text-slate-900 dark:text-slate-100">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-300 dark:bg-slate-700 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={`h-full flex-1 rounded-full transition-colors ${
                          step <= strength.score ? strength.color : 'bg-transparent'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (Create Account Only) */}
            {mode === 'CREATE_ACCOUNT' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-800 dark:text-slate-200 font-bold mb-1">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600 dark:text-slate-400 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter password"
                    required
                    className="w-full pl-9 pr-3 py-2 text-xs neu-pressed font-mono text-slate-900 dark:text-slate-100 placeholder:text-slate-500 font-bold focus:outline-none focus:ring-1 focus:ring-sky-500 rounded-xl"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <SpatialButton
              variant="primary"
              size="lg"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2"
              icon={isLoading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
            >
              {isLoading ? (
                'Processing...'
              ) : mode === 'LOGIN' ? (
                'Sign In'
              ) : mode === 'CREATE_ACCOUNT' ? (
                'Create Account & Password'
              ) : (
                'Update Customer Password'
              )}
            </SpatialButton>
          </form>

          {/* Global Database Security Note */}
          <div className="mt-6 pt-4 border-t border-slate-300 dark:border-slate-800 text-center space-y-1">
            <div className="flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-700 dark:text-slate-300 font-semibold">
              <ShieldCheck size={13} className="text-sky-600 dark:text-cyber-cyan" />
              <span>AES-256-GCM + PBKDF2 Military-Grade Security</span>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-400 font-mono">
              Accounts access farm data globally across all authorized devices.
            </p>
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
