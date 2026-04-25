import { BrainCircuit, Zap, Target, Clock } from 'lucide-react';
import type { Category } from '@/lib/types';
import { categoryColors } from '@/styles/theme';

const CATEGORIES: Array<{ value: Category | 'all'; label: string }> = [
  { value: 'all', label: 'All categories' },
  { value: 'technical', label: 'Technical' },
  { value: 'personal', label: 'Personal' },
  { value: 'reference', label: 'Reference' },
  { value: 'general', label: 'General' },
];

interface QuizIntroProps {
  onStart: (category?: Category) => void;
  loading?: boolean;
}

export function QuizIntro({ onStart, loading }: QuizIntroProps) {
  return (
    <div className="max-w-lg mx-auto space-y-6 py-8 animate-fade-in">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-nebula-500/20 border border-nebula-500/40 flex items-center justify-center mx-auto animate-float">
          <BrainCircuit size={28} className="text-nebula-400" />
        </div>
        <h1 className="text-2xl font-bold text-white">Quiz Mode</h1>
        <p className="text-slate-400 text-sm leading-relaxed">
          Test your knowledge with questions generated from your memories.
          Correct answers boost retention, wrong ones flag memories for review.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Target, label: 'Adaptive', sub: 'Targets weak memories', color: 'text-flare-400', bg: 'rgba(249,115,22,0.1)' },
          { icon: Zap, label: 'XP System', sub: 'Earn points per question', color: 'text-pulsar-400', bg: 'rgba(8,145,178,0.1)' },
          { icon: Clock, label: '3 min', sub: 'Average session', color: 'text-nebula-400', bg: 'rgba(124,58,237,0.1)' },
        ].map(({ icon: Icon, label, sub, color, bg }) => (
          <div key={label} className="glass-card p-3 text-center space-y-1.5">
            <div className="w-8 h-8 rounded-lg mx-auto flex items-center justify-center" style={{ background: bg }}>
              <Icon size={14} className={color} />
            </div>
            <p className="text-xs font-semibold text-slate-200">{label}</p>
            <p className="text-[10px] text-slate-500">{sub}</p>
          </div>
        ))}
      </div>

      <div className="glass-card p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Focus area</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {CATEGORIES.map(({ value, label }) => {
            const color = value !== 'all' ? categoryColors[value] : '#a78bfa';
            return (
              <button
                key={value}
                onClick={() => onStart(value === 'all' ? undefined : value)}
                disabled={loading}
                className="px-3 py-2.5 rounded-lg text-sm font-medium border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  color,
                  borderColor: `${color}40`,
                  background: `${color}12`,
                }}
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-1.5">
                    <span className="w-3 h-3 border border-current/30 border-t-current rounded-full animate-spin" />
                    Loading…
                  </span>
                ) : (
                  label
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
