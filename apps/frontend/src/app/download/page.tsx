'use client';

import React from 'react';
import { Download, Monitor, Smartphone, ShieldCheck, Cpu, ArrowLeft, CheckCircle2, Zap, Radio } from 'lucide-react';
import Link from 'next/link';

export default function AppDownloadPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* BACKGROUND DECORATIVE GLOWS */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-gradient-to-tr from-purple-900/30 to-indigo-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-4xl w-full space-y-8 relative z-10">
        {/* HEADER */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-mono text-emerald-400 font-bold uppercase tracking-wider">Official Release v2.0</span>
          </div>
        </div>

        {/* HERO TITLE */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 text-xs font-bold shadow-lg shadow-purple-900/20">
            <ShieldCheck className="w-4 h-4 text-purple-400" />
            <span>Official Native Software Packages (No Browser Dependencies)</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight">
            Download <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-cyan-400 to-emerald-400">AgriFlow Native Apps</span>
          </h1>
          <p className="text-sm md:text-base text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Install AgriFlow natively on your Laptop/PC or Mobile Phone. Native executable binaries contain built-in Bluetooth BLE drivers, completely eliminating browser permissions.
          </p>
        </div>

        {/* DOWNLOAD CARDS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
          {/* CARD 1: WINDOWS DESKTOP .EXE */}
          <div className="bg-slate-900/90 border border-purple-500/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative group hover:border-purple-500 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-purple-600/30">
                <Monitor className="w-7 h-7" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold text-white">Windows Desktop Software</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-xs font-mono font-bold">
                    .EXE Installer
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Standalone Windows application for Laptops & PCs (Windows 10/11 x64). Embeds native Windows Win32 Bluetooth BLE stack.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Bypasses browser prompts & permissions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Direct Bluetooth BLE GATT & USB COM Port Access</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Offline telemetry caching & background sync</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 space-y-3">
              <a
                href="/downloads/AgriFlow-Setup.exe"
                download="AgriFlow-Setup.exe"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs shadow-xl shadow-purple-600/30 flex items-center justify-center space-x-2 transition-all group-hover:scale-[1.02]"
              >
                <Download className="w-4 h-4" />
                <span>Download AgriFlow-Setup.exe (Windows PC)</span>
              </a>
              <div className="text-[11px] text-center text-slate-500 font-mono">
                Version 2.0.0 | 64-bit Executable | Size: ~65 MB
              </div>
            </div>
          </div>

          {/* CARD 2: ANDROID MOBILE .APK */}
          <div className="bg-slate-900/90 border border-cyan-500/40 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl relative group hover:border-cyan-500 transition-all flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-600 to-emerald-600 flex items-center justify-center text-white shadow-xl shadow-cyan-600/30">
                <Smartphone className="w-7 h-7" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold text-white">Android Mobile App</h3>
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40 text-xs font-mono font-bold">
                    .APK Package
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Standalone Android Application package for smartphones & tablets (Android 8.0+). Embeds native Android Bluetooth Manager.
                </p>
              </div>

              <div className="space-y-2 pt-2 text-xs text-slate-300">
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Native Android Bluetooth BLE background scanner</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Push notifications for pump motion & low soil moisture</span>
                </div>
                <div className="flex items-center space-x-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Full screen UI optimized for field operations</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t border-slate-800 space-y-3">
              <a
                href="/downloads/agriflow-mobile.apk"
                download="agriflow-mobile.apk"
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white font-bold text-xs shadow-xl shadow-cyan-600/30 flex items-center justify-center space-x-2 transition-all group-hover:scale-[1.02]"
              >
                <Download className="w-4 h-4" />
                <span>Download agriflow-mobile.apk (Android)</span>
              </a>
              <div className="text-[11px] text-center text-slate-500 font-mono">
                Version 2.0.0 | Android APK Package | Size: ~45 MB
              </div>
            </div>
          </div>
        </div>

        {/* INSTALLATION INSTRUCTIONS BOX */}
        <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2 text-xs font-bold text-white">
            <Cpu className="w-4 h-4 text-purple-400" />
            <span>Hardware Provisioning Compatibility Summary</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400">
            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-bold text-purple-300">Windows PC / Laptop Setup (.EXE):</div>
              <p className="text-[11px] leading-relaxed">
                Run <strong className="text-white">AgriFlow-Setup.exe</strong>. The app launches as a native software program. Bluetooth BLE scanning will operate directly via Windows Bluetooth API without any browser prompt.
              </p>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-1">
              <div className="font-bold text-cyan-300">Android Phone Setup (.APK):</div>
              <p className="text-[11px] leading-relaxed">
                Download <strong className="text-white">agriflow-mobile.apk</strong> on your smartphone. Tap Install (allow unknown sources if prompted). The app will run natively with full Bluetooth BLE permissions enabled.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
