import { Trophy, Zap, RotateCcw, CheckCircle2, XCircle, TrendingUp, TrendingDown } from 'lucide-react';
import type { QuizResults as QuizResultsType, QuizSession } from '@/lib/types';
import { cn } from '@/lib/utils';

interface QuizResultsProps {
  results: QuizResultsType;
  session: QuizSession;
  onRestart: () => void;
}

export function QuizResults({ results, session, onRestart }: QuizResultsProps) {
  const pct = Math.round((results.score / results.total) * 100);
  const grade =
    pct >= 90 ? { label: 'Excellent!', color: '#22d3ee', emoji: '🌟' } :
    pct >= 70 ? { label: 'Good job!', color: '#7c3aed', emoji: '🎯' } :
    pct >= 50 ? { label: 'Keep going!', color: '#f97316', emoji: '📚' } :
    { label: 'Needs work', color: '#dc2626', emoji: '💪' };

  return (
    <div className="max-w-lg mx-auto space-y-6 py-6 animate-fade-in">
      <div className="text-center space-y-3">
        <div
          className="w-20 h-20 rounded-full mx-auto flex items-center justify-center text-3xl"
          style={{ background: `${grade.color}18`, border: `2px solid ${grade.color}40` }}
        >
          {grade.emoji}
        </div>
        <div>
          <h2 className="text-2xl font-bold" style={{ color: grade.color }}>
            {grade.label}
          </h2>
          <p className="text-slate-400 text-sm mt-1">
            {results.score} / {results.total} correct
          </p>
        </div>

        <div className="flex items-center justify-center gap-6 pt-2">
          <div className="text-center">
            <p className="text-3xl font-mono font-bold text-white">{pct}%</p>
            <p className="text-xs text-slate-500">Score</p>
          </div>
          <div className="w-px h-10 bg-cosmos-700" />
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Zap size={14} className="text-pulsar-400" />
              <p className="text-3xl font-mono font-bold text-pulsar-400">{results.xp_earned}</p>
            </div>
            <p className="text-xs text-slate-500">XP earned</p>
          </div>
          <div className="w-px h-10 bg-cosmos-700" />
          <div className="text-center">
            <div className="flex items-center gap-1 justify-center">
              <Trophy size={14} className="text-nebula-400" />
              <p className="text-3xl font-mono font-bold text-nebula-400">{results.streaks}</p>
            </div>
            <p className="text-xs text-slate-500">Streak</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-4 space-y-3">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Review answers</p>
        <div className="space-y-2">
          {results.results.map((r, i) => {
            const q = session.questions[i];
            if (!q) return null;
            return (
              <div
                key={r.question_id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border text-sm',
                  r.correct
                    ? 'bg-green-500/5 border-green-500/20'
                    : 'bg-red-500/5 border-red-500/20'
                )}
              >
                {r.correct ? (
                  <CheckCircle2 size={15} className="text-green-400 shrink-0 mt-0.5" />
                ) : (
                  <XCircle size={15} className="text-red-400 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-slate-300 text-xs leading-relaxed">{q.question}</p>
                  {!r.correct && (
                    <p className="text-green-400 text-xs mt-1">
                      ✓ {q.options[r.correct_index]}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1 text-xs shrink-0">
                  {r.stability_delta > 0 ? (
                    <TrendingUp size={11} className="text-green-400" />
                  ) : (
                    <TrendingDown size={11} className="text-red-400" />
                  )}
                  <span className={r.stability_delta > 0 ? 'text-green-400' : 'text-red-400'}>
                    {r.stability_delta > 0 ? '+' : ''}{r.stability_delta}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <button
        onClick={onRestart}
        className="btn-primary w-full flex items-center justify-center gap-2"
      >
        <RotateCcw size={14} />
        Quiz again
      </button>
    </div>
  );
}
