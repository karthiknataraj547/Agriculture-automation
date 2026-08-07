'use client';

import React, { useState } from 'react';
import { Calendar, Clock, Plus, Trash2, Check, Play, Pause, MapPin, Droplet } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';
import { useSpatialStore } from '../../store/useSpatialStore';
import { IrrigationSchedule } from '@aether/shared';

const ALL_DAYS: ('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[] = [
  'MON',
  'TUE',
  'WED',
  'THU',
  'FRI',
  'SAT',
  'SUN',
];

export function SchedulePanel() {
  const { schedules, addSchedule, toggleSchedule, deleteSchedule } = useSpatialStore();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [zoneId, setZoneId] = useState('zone-1');
  const [startTime, setStartTime] = useState('06:00');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [daysOfWeek, setDaysOfWeek] = useState<('MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN')[]>([
    'MON',
    'WED',
    'FRI',
  ]);

  const zoneNames: Record<string, string> = {
    'zone-1': 'Zone 1: Corn Field',
    'zone-2': 'Zone 2: Soybean Sector',
    'zone-3': 'Zone 3: Vineyard East',
    'zone-4': 'Zone 4: Orchard North',
  };

  const handleToggleDay = (day: 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT' | 'SUN') => {
    if (daysOfWeek.includes(day)) {
      setDaysOfWeek(daysOfWeek.filter((d) => d !== day));
    } else {
      setDaysOfWeek([...daysOfWeek, day]);
    }
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newSch: IrrigationSchedule = {
      id: `sch-${Date.now()}`,
      name: name.trim(),
      enabled: true,
      farmId: 'farm-01',
      zoneId,
      zoneName: zoneNames[zoneId] || zoneId,
      pumpId: `pump-${zoneId.replace('zone-', '')}`,
      startTime,
      durationMinutes: Number(durationMinutes),
      daysOfWeek,
      targetMoistureMin: 35,
      status: 'SCHEDULED',
    };

    addSchedule(newSch);
    setName('');
    setIsAdding(false);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Calendar size={16} className="text-cyber-cyan" />
          <span className="text-xs font-mono uppercase tracking-[0.15em] text-slate-700 font-bold">
            Automated Pump Irrigation Scheduler
          </span>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl neu-button text-xs font-mono font-bold text-cyber-cyan hover:text-sky-700"
        >
          <Plus size={14} />
          CREATE NEW SCHEDULE
        </button>
      </div>

      {/* Add Schedule Form */}
      {isAdding && (
        <GlassCard variant="glow" padding="lg" className="border-cyber-cyan/40">
          <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-800 mb-4">
            ➕ Create New Irrigation Schedule
          </h3>

          <form onSubmit={handleCreateSchedule} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  Schedule Title
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Morning Crop Deep Hydration"
                  className="w-full px-3 py-2 text-xs font-mono text-slate-800 neu-pressed rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  Target Zone
                </label>
                <select
                  value={zoneId}
                  onChange={(e) => setZoneId(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono text-slate-800 neu-pressed rounded-xl focus:outline-none"
                >
                  <option value="zone-1">Zone 1: Corn Field</option>
                  <option value="zone-2">Zone 2: Soybean Sector</option>
                  <option value="zone-3">Zone 3: Vineyard East</option>
                  <option value="zone-4">Zone 4: Orchard North</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  Start Time (24h)
                </label>
                <input
                  type="time"
                  required
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono text-slate-800 neu-pressed rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1">
                  Run Duration (Minutes)
                </label>
                <input
                  type="number"
                  min={5}
                  max={240}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs font-mono text-slate-800 neu-pressed rounded-xl focus:outline-none"
                />
              </div>
            </div>

            {/* Days of Week Selector */}
            <div>
              <label className="block text-[10px] font-mono uppercase text-slate-500 mb-1.5">
                Repeat Days
              </label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map((day) => {
                  const selected = daysOfWeek.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => handleToggleDay(day)}
                      className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-all ${
                        selected
                          ? 'neu-button-active text-cyber-cyan'
                          : 'neu-button text-slate-500'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-xs font-mono rounded-xl neu-button text-slate-500"
              >
                CANCEL
              </button>
              <button
                type="submit"
                className="px-5 py-2 text-xs font-mono font-bold rounded-xl neu-button text-cyber-cyan"
              >
                SAVE SCHEDULE
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Schedules List */}
      <div className="space-y-3">
        {schedules.map((sch) => (
          <GlassCard key={sch.id} variant="default" padding="md">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => toggleSchedule(sch.id)}
                  title={sch.enabled ? 'Pause Schedule' : 'Enable Schedule'}
                  className={`w-9 h-9 rounded-xl flex items-center justify-center neu-button ${
                    sch.enabled ? 'text-cyber-emerald' : 'text-slate-400'
                  }`}
                >
                  {sch.enabled ? <Play size={16} /> : <Pause size={16} />}
                </button>

                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold text-slate-800">{sch.name}</h4>
                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded-md font-bold ${
                        sch.enabled
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {sch.enabled ? 'ACTIVE' : 'PAUSED'}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-[10px] font-mono text-slate-500 mt-1">
                    <span className="flex items-center gap-1">
                      <MapPin size={10} className="text-cyber-cyan" />
                      {sch.zoneName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock size={10} className="text-slate-500" />
                      {sch.startTime} ({sch.durationMinutes} mins)
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Days Badges */}
                <div className="hidden sm:flex items-center gap-1">
                  {sch.daysOfWeek.map((day) => (
                    <span
                      key={day}
                      className="text-[9px] font-mono px-1.5 py-0.5 rounded neu-pressed text-slate-700 font-medium"
                    >
                      {day}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => deleteSchedule(sch.id)}
                  className="p-2 rounded-xl neu-button text-slate-400 hover:text-red-600 transition-colors"
                  title="Delete Schedule"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}
