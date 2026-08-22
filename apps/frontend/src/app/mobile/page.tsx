'use client';

import React from 'react';
import { AndroidPhoneSimulator } from '@/components/mobile/AndroidPhoneSimulator';
import Link from 'next/link';
import { ArrowLeft, Smartphone, ShieldCheck, Download, Code2 } from 'lucide-react';

export default function MobileAppPage() {
  return (
    <div className="min-h-screen bg-[#070b14] text-slate-100 font-sans p-4 md:p-8 flex flex-col items-center justify-center relative overflow-hidden">
      {/* BACKGROUND DECORATIVE GLOW */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-cyan-900/20 via-indigo-900/20 to-purple-900/10 blur-[130px] rounded-full pointer-events-none" />

      <div className="max-w-5xl w-full space-y-6 relative z-10">
        {/* TOP BAR */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center space-x-2 transition-all shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Farm Twin</span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/download"
              className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-cyan-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Get APK Package</span>
            </Link>

            <Link
              href="/admin"
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md"
            >
              <Code2 className="w-3.5 h-3.5" />
              <span>Admin Code Studio</span>
            </Link>
          </div>
        </div>

        {/* HERO TITLE */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-300 text-xs font-bold shadow-lg shadow-cyan-900/20">
            <Smartphone className="w-4 h-4 text-cyan-400" />
            <span>Interactive Android 14 Smartphone Studio</span>
          </div>
          <h1 className="text-2xl md:text-4xl font-extrabold text-white tracking-tight">
            AgriFlow <span className="bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-emerald-400 to-indigo-400">Mobile Application</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-400 max-w-xl mx-auto">
            Test and interact with the complete native Android Kotlin application right in your browser. Live Bluetooth, WebSockets, Moisture Dials, and Pump Pulse actuation.
          </p>
        </div>

        {/* INTERACTIVE ANDROID SMARTPHONE SIMULATOR */}
        <AndroidPhoneSimulator />
      </div>
    </div>
  );
}
