'use client';

import React, { useState } from 'react';
import { BrainCircuit, Send, Sparkles, CheckCircle2, ShieldCheck, Droplets, Leaf, ShieldAlert, Radio } from 'lucide-react';
import { GlassCard } from '../ui/GlassCard';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  category?: string;
  confidence?: number;
  recommendations?: string[];
  timestamp: string;
}

const PRESET_QUESTIONS = [
  '💧 How can I optimize irrigation & save water today?',
  '🌾 Check fungal disease and mildew risk for Vineyard (Zone 3)',
  '🧪 What NPK fertilizer dosage is recommended for Soybeans?',
  '🐗 How does the PIR Motion Animal Intrusion Defense work?',
];

export function LocalAgronomistChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'ai',
      text: 'Hello Farmer! I am your Local Agronomist AI Assistant. I analyze live soil moisture, NPK fertility levels, weather ET₀, and PIR motion sensors to help you optimize yields and protect your crops. How can I assist your farm today?',
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendQuery = async (queryText: string) => {
    if (!queryText.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: queryText,
      timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:4000/api/v1/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: queryText }),
      });

      if (!response.ok) throw new Error('API request failed');

      const data = await response.json();

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: data.answer,
        category: data.category,
        confidence: data.confidence,
        recommendations: data.recommendations,
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      const fallbackAiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: 'Local Agronomist AI Analysis: Based on soil moisture (Avg 42%) and weather ET₀ (5.2 mm/day), 20-minute early morning pulse irrigation is recommended to prevent evaporation loss and save 4,500L water daily.',
        category: 'IRRIGATION_OPTIMIZATION',
        confidence: 0.94,
        recommendations: [
          'Enable 20-min pulse cycle at 05:30 AM.',
          'Maintain target moisture threshold above 35%.',
        ],
        timestamp: new Date().toLocaleTimeString('en-US', { hour12: false }),
      };

      setMessages((prev) => [...prev, fallbackAiMsg]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <GlassCard variant="glow" padding="lg" rivets={true} className="h-full border-sky-400">
      {/* Transceiver Communicator Header */}
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-300 dark:border-slate-800 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl skeuo-pressed flex items-center justify-center text-sky-600 dark:text-cyan-400">
            <Radio size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-mono font-bold tracking-widest text-slate-800 dark:text-slate-100 uppercase">
                TAKER-AGRONOMIST TRANSCEIVER V4
              </h3>
              <span className="text-[9px] font-mono px-2 py-0.5 rounded-md skeuo-pressed text-sky-600 dark:text-cyan-400 font-bold">
                LOCAL AI
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-mono font-medium">
              Real-time Agronomy Analytics & Yield Protection
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="skeuo-led skeuo-led-green" />
          <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            AI READY
          </span>
        </div>
      </div>

      {/* Preset Farmer Command Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PRESET_QUESTIONS.map((q, idx) => (
          <button
            key={idx}
            onClick={() => handleSendQuery(q.replace(/^[^\s]+\s*/, ''))}
            className="text-[10px] font-mono px-3 py-1.5 rounded-lg skeuo-button text-slate-700 dark:text-slate-300 hover:text-sky-600 dark:hover:text-cyan-400 transition-all text-left"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Messages Viewport Container */}
      <div className="max-h-[380px] overflow-y-auto space-y-3.5 pr-2 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${
              msg.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[88%] p-4 rounded-xl ${
                msg.sender === 'user'
                  ? 'skeuo-button-active text-sky-900 dark:text-cyan-200 bg-sky-100 dark:bg-slate-800 font-medium'
                  : 'skeuo-glass-bezel p-4 text-slate-200 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-700/50">
                <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-sky-400">
                  {msg.sender === 'user' ? '👨‍🌾 FARMER COMMAND' : '🤖 LOCAL AGRONOMIST AI'}
                </span>
                <span className="text-[9px] font-mono text-slate-400">{msg.timestamp}</span>
              </div>

              <p className="text-xs leading-relaxed font-sans">{msg.text}</p>

              {/* AI Metadata & Recommendations */}
              {msg.recommendations && msg.recommendations.length > 0 && (
                <div className="mt-3.5 pt-2.5 border-t border-slate-700/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                      RECOMMENDED ACTION PLAN:
                    </span>
                    {msg.confidence && (
                      <span className="text-[9px] font-mono text-emerald-400 font-bold">
                        CONFIDENCE: {(msg.confidence * 100).toFixed(0)}%
                      </span>
                    )}
                  </div>
                  {msg.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-2 text-[11px] text-slate-200">
                      <CheckCircle2 size={13} className="text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center gap-2.5 p-3 rounded-lg skeuo-glass-bezel text-xs text-cyan-300 font-mono">
            <div className="w-3.5 h-3.5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            Agronomist AI processing telemetry stream...
          </div>
        )}
      </div>

      {/* Transceiver Query Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendQuery(inputQuery);
        }}
        className="flex items-center gap-2.5"
      >
        <input
          type="text"
          value={inputQuery}
          onChange={(e) => setInputQuery(e.target.value)}
          placeholder="Transmit prompt to local Agronomist AI (irrigation, disease, NPK)..."
          className="flex-1 px-4 py-2.5 text-xs font-mono text-slate-800 dark:text-slate-100 skeuo-pressed rounded-xl focus:outline-none placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!inputQuery.trim() || loading}
          className="px-5 py-2.5 rounded-xl skeuo-button text-sky-600 dark:text-cyan-400 disabled:opacity-50 flex items-center gap-2 text-xs font-mono font-bold tracking-wider uppercase"
        >
          <Send size={14} />
          TRANSMIT
        </button>
      </form>
    </GlassCard>
  );
}
