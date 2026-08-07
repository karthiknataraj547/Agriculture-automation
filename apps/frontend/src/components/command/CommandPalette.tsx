'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { clsx } from 'clsx';
import {
  Search,
  Command,
  MapPin,
  Cpu,
  AlertOctagon,
  Zap,
  Box,
  Activity,
  X,
} from 'lucide-react';
import { useSpatialStore, SpatialStoreState } from '../../store/useSpatialStore';

interface CommandItem {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  category: string;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const {
    setActiveView,
    setSelectedZoneId,
    toggleEmergencyStop,
    toggleRainOverride,
    devices,
    setSelectedDeviceId,
  } = useSpatialStore();

  const commands: CommandItem[] = [
    // Navigation
    { id: 'nav-spatial', label: 'Spatial 3D View', description: 'Open 3D farm field canvas', icon: <Box size={14} />, category: 'Navigation', action: () => { setActiveView('SPATIAL_3D'); onClose(); } },
    { id: 'nav-telemetry', label: 'Telemetry Dashboard', description: 'Live sensor data charts', icon: <Activity size={14} />, category: 'Navigation', action: () => { setActiveView('TELEMETRY'); onClose(); } },
    { id: 'nav-devices', label: 'Device Inventory', description: 'IoT device management', icon: <Cpu size={14} />, category: 'Navigation', action: () => { setActiveView('DEVICES'); onClose(); } },
    { id: 'nav-rules', label: 'Automation Rules', description: 'IF/THEN rules engine', icon: <Zap size={14} />, category: 'Navigation', action: () => { setActiveView('AUTOMATION'); onClose(); } },

    // Zones
    { id: 'zone-1', label: 'Zone 1: Corn Field', description: 'Focus on corn field sector', icon: <MapPin size={14} />, category: 'Zones', action: () => { setSelectedZoneId('zone-1'); setActiveView('SPATIAL_3D'); onClose(); } },
    { id: 'zone-2', label: 'Zone 2: Soybean Sector', description: 'Focus on soybean sector', icon: <MapPin size={14} />, category: 'Zones', action: () => { setSelectedZoneId('zone-2'); setActiveView('SPATIAL_3D'); onClose(); } },
    { id: 'zone-3', label: 'Zone 3: Vineyard East', description: 'Focus on vineyard east', icon: <MapPin size={14} />, category: 'Zones', action: () => { setSelectedZoneId('zone-3'); setActiveView('SPATIAL_3D'); onClose(); } },
    { id: 'zone-4', label: 'Zone 4: Orchard North', description: 'Focus on orchard north', icon: <MapPin size={14} />, category: 'Zones', action: () => { setSelectedZoneId('zone-4'); setActiveView('SPATIAL_3D'); onClose(); } },

    // Emergency
    { id: 'estop', label: 'Emergency Stop', description: 'Toggle emergency stop on all pumps', icon: <AlertOctagon size={14} />, category: 'Actions', action: () => { toggleEmergencyStop(); onClose(); } },
    { id: 'rain', label: 'Rain Override', description: 'Toggle rain override mode', icon: <Zap size={14} />, category: 'Actions', action: () => { toggleRainOverride(); onClose(); } },

    // Dynamic device commands
    ...devices.map((d) => ({
      id: `dev-${d.uuid}`,
      label: d.name,
      description: `${d.serialNumber} · ${d.zoneId}`,
      icon: <Cpu size={14} />,
      category: 'Devices',
      action: () => { setSelectedDeviceId(d.uuid); setActiveView('DEVICES'); onClose(); },
    })),
  ];

  const filtered = query.trim()
    ? commands.filter(
        (c) =>
          c.label.toLowerCase().includes(query.toLowerCase()) ||
          c.description.toLowerCase().includes(query.toLowerCase()) ||
          c.category.toLowerCase().includes(query.toLowerCase())
      )
    : commands;

  // Reset selection when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, filtered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter' && filtered[selectedIndex]) {
        e.preventDefault();
        filtered[selectedIndex].action();
      } else if (e.key === 'Escape') {
        onClose();
      }
    },
    [filtered, selectedIndex, onClose]
  );

  // Global Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // Group by category
  const groups = new Map<string, CommandItem[]>();
  for (const item of filtered) {
    const list = groups.get(item.category) || [];
    list.push(item);
    groups.set(item.category, list);
  }

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className="relative w-full max-w-xl mx-4 rounded-2xl neu-convex border border-white/80 overflow-hidden"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-300/40">
          <Search size={16} className="text-cyber-cyan flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search zones, devices, actions..."
            className="flex-1 bg-transparent text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none font-mono"
          />
          <div className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 text-[8px] font-mono text-slate-500 neu-pressed rounded">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[360px] overflow-y-auto py-2">
          {filtered.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-sm text-slate-500">No results found</p>
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Try a different search term
              </p>
            </div>
          ) : (
            Array.from(groups.entries()).map(([category, items]) => (
              <div key={category}>
                <div className="px-5 py-1.5">
                  <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-slate-500 font-semibold">
                    {category}
                  </span>
                </div>
                {items.map((item) => {
                  const idx = flatIndex++;
                  const isSelected = idx === selectedIndex;
                  return (
                    <button
                      key={item.id}
                      onClick={item.action}
                      className={clsx(
                        'w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors',
                        isSelected
                          ? 'neu-pressed text-cyber-cyan font-medium'
                          : 'text-slate-700 hover:bg-slate-200/50'
                      )}
                    >
                      <span className={clsx(isSelected ? 'text-cyber-cyan' : 'text-slate-600')}>
                        {item.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{item.label}</p>
                        <p className="text-[10px] text-slate-600 truncate">{item.description}</p>
                      </div>
                      {isSelected && (
                        <kbd className="px-1.5 py-0.5 text-[8px] font-mono text-slate-600 bg-obsidian-800/60 border border-white/[0.08] rounded">
                          ↵
                        </kbd>
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-slate-300/40 bg-slate-200/40">
          <div className="flex items-center gap-3 text-[9px] font-mono text-slate-500 font-medium">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1">
            <Command size={9} className="text-slate-500" />
            <span className="text-[9px] font-mono text-slate-500 font-medium">K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
