'use client';

import React, { useState } from 'react';
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
    <div className="min-h-screen w-full flex items-center justify-center p-4 bg-[#e6ecf5] dark:bg-[#0b0f19] transition-colors duration-300">
      <div className="w-full max-w-md space-y-4">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl neu-button text-cyber-cyan mb-1 shadow-lg">
            <Radio size={28} className="animate-pulse" />
          </div>
          <h1 className="text-xl font-mono font-bold tracking-[0.25em] text-slate-800 dark:text-slate-100 uppercase">
            AETHERCROP SPATIAL
          </h1>
          <p className="text-xs text-slate-500 font-mono">
            Precision Irrigation & Hardware Automation System
          </p>

          {/* Global Access Indicator Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full neu-pressed text-[10px] font-mono text-cyber-cyan font-semibold mt-1">
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
                  ? 'neu-button text-cyber-cyan font-bold shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
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
                  ? 'neu-button text-cyber-cyan font-bold shadow-md'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Set Password
            </button>
          </div>

          {/* Form Banner */}
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {mode === 'LOGIN' && 'Customer Login Portal'}
              {mode === 'CREATE_ACCOUNT' && 'Create Account & Password'}
              {mode === 'FORGOT_PASS' && 'Reset Customer Password'}
            </h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              {mode === 'LOGIN' && 'Sign in with your registered account credentials from any device.'}
              {mode === 'CREATE_ACCOUNT' && 'Create your customer account & password stored globally in cloud database.'}
              {mode === 'FORGOT_PASS' && 'Specify your new customer password below.'}
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div
              className="p-3 mb-4 rounded-xl neu-pressed border border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-mono flex items-start gap-2 animate-shake"
              role="alert"
            >
              <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Success Alert */}
          {successMessage && (
            <div
              className="p-3 mb-4 rounded-xl neu-pressed border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-mono flex items-start gap-2"
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
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                  Full Name / Operator Name
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl neu-pressed text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                  />
                </div>
              </div>
            )}

            {/* Email Address */}
            {mode !== 'FORGOT_PASS' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                  Email Address / Username
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <Mail size={16} />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@aethercrop.io"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl neu-pressed text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                  />
                </div>
              </div>
            )}

            {/* Old Password (Forgot Mode Only) */}
            {mode === 'FORGOT_PASS' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                  Current Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <KeyRound size={16} />
                  </span>
                  <input
                    type="password"
                    required
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl neu-pressed text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                  />
                </div>
              </div>
            )}

            {/* Customer Password Input */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-500">
                  {mode === 'CREATE_ACCOUNT'
                    ? 'Create Customer Password'
                    : mode === 'FORGOT_PASS'
                    ? 'New Customer Password'
                    : 'Customer Password'}
                </label>
                {mode === 'LOGIN' && (
                  <button
                    type="button"
                    onClick={() => setMode('FORGOT_PASS')}
                    className="text-[10px] font-mono text-cyber-cyan hover:underline"
                  >
                    Reset Password?
                  </button>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-slate-400">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === 'CREATE_ACCOUNT'
                      ? 'Type your custom password'
                      : 'Enter password'
                  }
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl neu-pressed text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {/* Password Strength Bar (Create or Reset Mode) */}
              {mode !== 'LOGIN' && password.length > 0 && (
                <div className="mt-2 space-y-1">
                  <div className="flex justify-between text-[9px] font-mono text-slate-500">
                    <span>Password Strength:</span>
                    <span className="font-bold">{strength.label}</span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex gap-1">
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength.score >= 1 ? strength.color : 'bg-transparent'
                      } ${strength.score >= 1 ? 'w-1/4' : 'w-0'}`}
                    />
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength.score >= 2 ? strength.color : 'bg-transparent'
                      } ${strength.score >= 2 ? 'w-1/4' : 'w-0'}`}
                    />
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength.score >= 3 ? strength.color : 'bg-transparent'
                      } ${strength.score >= 3 ? 'w-1/4' : 'w-0'}`}
                    />
                    <div
                      className={`h-full transition-all duration-300 ${
                        strength.score >= 4 ? strength.color : 'bg-transparent'
                      } ${strength.score >= 4 ? 'w-1/4' : 'w-0'}`}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Confirm Password (Create Account Mode Only) */}
            {mode === 'CREATE_ACCOUNT' && (
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-wider text-slate-500 mb-1">
                  Confirm Customer Password
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-3 text-slate-400">
                    <ShieldCheck size={16} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-type your custom password"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl neu-pressed text-xs text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-cyber-cyan"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <SpatialButton
              type="submit"
              variant="primary"
              size="lg"
              disabled={isLoading}
              className="w-full mt-6 neu-convex-glow flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Connecting to Cloud DB...</span>
                </>
              ) : (
                <>
                  <span>
                    {mode === 'LOGIN' && 'Sign In to Dashboard'}
                    {mode === 'CREATE_ACCOUNT' && 'Save Account Globally'}
                    {mode === 'FORGOT_PASS' && 'Update Password'}
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </SpatialButton>
          </form>
        </GlassCard>
      </div>
    </div>
  );
}
