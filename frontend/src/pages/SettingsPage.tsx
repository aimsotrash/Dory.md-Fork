import {
  Settings, Brain, Bell, Clock, Shield, Palette,
  ToggleLeft, ToggleRight, ChevronRight, Info,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useTheme, type Theme } from '@/contexts/ThemeContext';

interface Toggle {
  label: string;
  description: string;
  value: boolean;
}

function ToggleRow({
  label,
  description,
  value,
  onChange,
}: Toggle & { onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-slate-200">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button onClick={() => onChange(!value)} className="shrink-0 transition-all duration-200">
        {value ? (
          <ToggleRight size={28} style={{ color: 'var(--primary)' }} />
        ) : (
          <ToggleLeft size={28} className="text-slate-600" />
        )}
      </button>
    </div>
  );
}

export function SettingsPage() {
  const { theme, setTheme } = useTheme();

  const [toggles, setToggles] = useState({
    discoveryPolling: true,
    quizReminders: true,
    decayAlerts: true,
    useMocks: true,
    compactCards: false,
    autoIngest: false,
  });

  const [pollInterval, setPollInterval] = useState('30');

  function set(key: keyof typeof toggles) {
    return (v: boolean) => setToggles((p) => ({ ...p, [key]: v }));
  }

  const sections = [
    {
      icon: Brain,
      title: 'Memory engine',
      color: 'text-nebula-400',
      bg: 'rgba(124,58,237,0.1)',
      rows: [
        { key: 'autoIngest', label: 'Auto-ingest clipboard', description: 'Automatically capture copied text as memory chunks' },
        { key: 'decayAlerts', label: 'Decay alerts', description: 'Warn when a chunk drops below 30% retention' },
      ],
    },
    {
      icon: Bell,
      title: 'Notifications',
      color: 'text-flare-400',
      bg: 'rgba(249,115,22,0.1)',
      rows: [
        { key: 'discoveryPolling', label: 'Discovery notifications', description: 'Poll for forgotten memories every few minutes' },
        { key: 'quizReminders', label: 'Quiz reminders', description: 'Remind you to quiz when retention drops' },
      ],
    },
    {
      icon: Shield,
      title: 'Developer',
      color: 'text-pulsar-400',
      bg: 'rgba(8,145,178,0.1)',
      rows: [
        { key: 'useMocks', label: 'Use mock data', description: 'Run without a backend — all data is local' },
        { key: 'compactCards', label: 'Compact chunk cards', description: 'Show truncated content to fit more on screen' },
      ],
    },
  ] as const;

  const themeOptions: { id: Theme; label: string; colors: string[] }[] = [
    { id: 'cosmos', label: 'Cosmos', colors: ['#7c3aed', '#0891b2', '#f97316'] },
    { id: 'midnight', label: 'Midnight', colors: ['#3b82f6', '#06b6d4', '#8b5cf6'] },
    { id: 'aurora', label: 'Aurora', colors: ['#10b981', '#06b6d4', '#a78bfa'] },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-cosmos-800 border border-cosmos-700 flex items-center justify-center">
          <Settings size={16} className="text-slate-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-500">Configure your Memory OS</p>
        </div>
      </div>

      {sections.map(({ icon: Icon, title, color, bg, rows }) => (
        <div key={title} className="gcard p-5 space-y-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: bg }}>
              <Icon size={13} className={color} />
            </div>
            <h2 className="text-sm font-semibold text-slate-200">{title}</h2>
          </div>
          <div className="divide-y divide-cosmos-700/40">
            {rows.map(({ key, label, description }) => (
              <ToggleRow
                key={key}
                label={label}
                description={description}
                value={toggles[key as keyof typeof toggles]}
                onChange={set(key as keyof typeof toggles)}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Poll interval */}
      <div className="gcard p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-pulsar-500/10 flex items-center justify-center">
            <Clock size={13} className="text-pulsar-400" />
          </div>
          <h2 className="text-sm font-semibold text-slate-200">Discovery poll interval</h2>
        </div>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={10}
            max={120}
            step={10}
            value={pollInterval}
            onChange={(e) => setPollInterval(e.target.value)}
            className="flex-1"
            style={{ accentColor: 'var(--primary)' }}
          />
          <span className="text-sm font-mono w-16 text-right" style={{ color: 'var(--primary)' }}>{pollInterval}s</span>
        </div>
        <p className="text-xs text-slate-600">How often Dory checks for forgotten memories in the background</p>
      </div>

      {/* Theme */}
      <div className="gcard p-5 space-y-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-flare-500/10 flex items-center justify-center">
            <Palette size={13} className="text-flare-400" />
          </div>
          <h2 className="text-sm font-semibold text-slate-200">Color theme</h2>
        </div>
        <div className="flex gap-2">
          {themeOptions.map(({ id, label, colors }) => (
            <button
              key={id}
              onClick={() => setTheme(id)}
              className={cn(
                'flex-1 py-3 rounded-lg border text-xs font-medium transition-all duration-200',
                theme === id
                  ? 'text-white'
                  : 'border-cosmos-700 bg-cosmos-800/40 text-slate-500 hover:text-slate-300 hover:border-cosmos-600'
              )}
              style={theme === id ? {
                background: `linear-gradient(135deg, ${colors[0]}22 0%, ${colors[1]}15 100%)`,
                borderColor: `${colors[0]}55`,
                color: colors[0],
              } : {}}
            >
              <div className="flex justify-center gap-1 mb-1.5">
                {colors.map((c) => (
                  <div key={c} className="w-3 h-3 rounded-full" style={{ background: c }} />
                ))}
              </div>
              {label}
              {theme === id && (
                <div className="text-[10px] mt-0.5 opacity-70">Active</div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* About */}
      <div className="gcard p-4 flex items-center gap-3">
        <Info size={14} className="text-slate-600 shrink-0" />
        <div className="flex-1">
          <p className="text-xs text-slate-500">
            Dory.md v0.1.0 — UWB Hacks 2026 · Track 2: Human Experience
          </p>
        </div>
        <ChevronRight size={13} className="text-slate-700" />
      </div>
    </div>
  );
}
