'use client';

import React, { useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Auth Component
import { LoginPage } from '../components/auth/LoginPage';
import { useAuthStore } from '../store/useAuthStore';

// Layout & Navigation
import { SpatialShell } from '../components/dashboard/SpatialShell';
import { CommandPalette } from '../components/command/CommandPalette';

// Dashboard Panels
import { KpiBar } from '../components/dashboard/KpiBar';
import { WeatherPanel } from '../components/dashboard/WeatherPanel';
import { SystemHealthPanel } from '../components/dashboard/SystemHealthPanel';
import { InsightsPanel } from '../components/dashboard/InsightsPanel';
import { AuditLogTable } from '../components/dashboard/AuditLogTable';

// Feature Panels
import { TelemetryCharts } from '../components/analytics/TelemetryCharts';
import { DeviceGrid } from '../components/devices/DeviceGrid';
import { RulesPanel } from '../components/rules/RulesPanel';
import { PumpControlPanel } from '../components/pumps/PumpControlPanel';
import { SchedulePanel } from '../components/schedules/SchedulePanel';
import { MotionAlertBanner } from '../components/alerts/MotionAlertBanner';
import { NativeAppInstallBanner } from '../components/common/NativeAppInstallBanner';

// Diagnostics Panels
import { IoTDiagnosticsPanel } from '../components/diagnostics/IoTDiagnosticsPanel';
import { EventTraceViewer } from '../components/diagnostics/EventTraceViewer';

// Real-time Data Hook
import { useWebSocketFeed } from '../hooks/useWebSocketFeed';

// Zustand Store
import { useSpatialStore } from '../store/useSpatialStore';

// Dynamic import for Three.js canvas (avoid SSR issues)
const FarmSpatialCanvas = dynamic(
  () => import('../components/spatial/FarmSpatialCanvas'),
  { ssr: false, loading: () => <CanvasLoader /> }
);

function CanvasLoader() {
  return (
    <div className="w-full h-[350px] md:h-[500px] lg:h-[650px] rounded-2xl neu-convex border border-white/80 flex items-center justify-center">
      <div className="flex flex-col items-center gap-3" role="status" aria-label="Loading spatial engine">
        <div className="w-8 h-8 border-2 border-cyber-cyan/30 border-t-cyber-cyan rounded-full animate-spin" />
        <span className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">
          Loading Spatial Engine...
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { isAuthenticated, user } = useAuthStore();
  const { activeView, loadGlobalStateForUser } = useSpatialStore();
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Client-side hydration check
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Crash-Proof Ultra-Fast Real-Time Polling Engine (400ms interval across devices)
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      // Immediate initial cloud state hydration on mount
      useSpatialStore.getState().forceCloudSync(user.email);

      // High-frequency 400ms polling for instant cross-device state synchronization
      const interval = setInterval(() => {
        loadGlobalStateForUser(user.email);
      }, 400);

      return () => clearInterval(interval);
    }
  }, [isAuthenticated, user, loadGlobalStateForUser]);

  // Initialize WebSocket connection
  useWebSocketFeed();

  // Ctrl+K handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setCommandPaletteOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleCloseCommandPalette = useCallback(() => {
    setCommandPaletteOpen(false);
  }, []);

  if (!isMounted) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#e6ecf5] dark:bg-[#0b0f19]">
        <div className="w-8 h-8 border-2 border-cyber-cyan/30 border-t-cyber-cyan rounded-full animate-spin" />
      </div>
    );
  }

  // Render Login Interface Page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return (
    <>
      <NativeAppInstallBanner />
      <SpatialShell onOpenCommandPalette={() => setCommandPaletteOpen(true)}>
        {/* ─── SPATIAL 3D VIEW ─── */}
        {activeView === 'SPATIAL_3D' && (
          <div className="space-y-4">
            {/* Motion Alert Banner */}
            <MotionAlertBanner />

            {/* KPI Row */}
            <KpiBar />

            {/* Main Canvas + Side Panels */}
            <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-4">
              {/* 3D Farm Canvas */}
              <FarmSpatialCanvas />

              {/* Side Stack */}
              <div className="flex flex-col gap-4">
                <WeatherPanel />
                <SystemHealthPanel />
              </div>
            </div>

            {/* Telemetry Charts */}
            <TelemetryCharts />

            {/* AI Insights */}
            <InsightsPanel />
          </div>
        )}

        {/* ─── PUMPS / MANUAL CONTROL VIEW ─── */}
        {activeView === 'PUMPS' && (
          <div className="space-y-4">
            <PumpControlPanel />
          </div>
        )}

        {/* ─── SCHEDULES VIEW ─── */}
        {activeView === 'SCHEDULES' && (
          <div className="space-y-4">
            <SchedulePanel />
          </div>
        )}

        {/* ─── TELEMETRY VIEW ─── */}
        {activeView === 'TELEMETRY' && (
          <div className="space-y-4">
            <KpiBar />
            <TelemetryCharts />
          </div>
        )}

        {/* ─── DEVICES VIEW ─── */}
        {activeView === 'DEVICES' && (
          <div className="space-y-4">
            <DeviceGrid />
          </div>
        )}

        {/* ─── AUTOMATION / RULES VIEW ─── */}
        {activeView === 'AUTOMATION' && (
          <div className="space-y-4">
            <RulesPanel />
          </div>
        )}

        {/* ─── AI INSIGHTS VIEW ─── */}
        {activeView === 'AI_INSIGHTS' && (
          <div className="space-y-4">
            <InsightsPanel />
          </div>
        )}

        {/* ─── IOT DIAGNOSTICS VIEW ─── */}
        {activeView === 'DIAGNOSTICS' && (
          <div className="space-y-4">
            <IoTDiagnosticsPanel />
            <EventTraceViewer />
          </div>
        )}

        {/* ─── AUDIT LOGS VIEW ─── */}
        {activeView === 'AUDIT_LOGS' && (
          <div className="space-y-4">
            <AuditLogTable />
          </div>
        )}
      </SpatialShell>

      {/* ─── COMMAND PALETTE ─── */}
      <CommandPalette
        isOpen={commandPaletteOpen}
        onClose={handleCloseCommandPalette}
      />
    </>
  );
}
