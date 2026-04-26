import { useState, useCallback } from 'react';
import { QuizIntro } from '@/components/quiz/QuizIntro';
import { QuizQuestion } from '@/components/quiz/QuizQuestion';
import { QuizResults } from '@/components/quiz/QuizResults';
import { startQuiz, submitQuiz } from '@/lib/api';
import type { Category, QuizSession, QuizResults as QuizResultsType, QuizAnswer } from '@/lib/types';

type Phase = 'intro' | 'playing' | 'results';

export function QuizPage() {
  const [phase, setPhase] = useState<Phase>('intro');
  const [session, setSession] = useState<QuizSession | null>(null);
  const [results, setResults] = useState<QuizResultsType | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleStart = useCallback(async (category?: Category) => {
    setLoading(true);
    setError(null);
    try {
      const s = await startQuiz(category);
      setSession(s);
      setCurrentIndex(0);
      setAnswers([]);
      setPhase('playing');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start quiz');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleAnswer = useCallback(
    async (selectedIndex: number, timeTakenMs: number) => {
      if (!session) return;
      const q = session.questions[currentIndex];
      if (!q) return;

      const newAnswers = [
        ...answers,
        { question_id: q.id, selected_index: selectedIndex, time_taken_ms: timeTakenMs },
      ];
      setAnswers(newAnswers);

      if (currentIndex + 1 < session.questions.length) {
        setCurrentIndex((i) => i + 1);
      } else {
        setLoading(true);
        try {
          const res = await submitQuiz(session.session_id, newAnswers);
          setResults(res);
          setPhase('results');
        } catch (e) {
          setError(e instanceof Error ? e.message : 'Failed to submit quiz');
        } finally {
          setLoading(false);
        }
      }
    },
    [session, currentIndex, answers]
  );

  const handleRestart = useCallback(() => {
    setPhase('intro');
    setSession(null);
    setResults(null);
    setCurrentIndex(0);
    setAnswers([]);
    setError(null);
  }, []);

  // Load quiz history from localStorage for sidebar stats
  const history = (() => {
    try { return JSON.parse(localStorage.getItem('dory_quiz_history') ?? '[]') as { score: number; total: number; date: string }[]; }
    catch { return []; }
  })();
  const avgScore = history.length > 0
    ? Math.round(history.reduce((s, h) => s + h.score / h.total, 0) / history.length * 100)
    : null;

  return (
    <div className="flex gap-6">
      {/* Main quiz area */}
      <div className="flex-1 min-w-0">
        {error && (
          <div className="mb-4 p-3 text-sm text-red-400 rounded-xl" style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
            {error}
          </div>
        )}
        {phase === 'intro' && <QuizIntro onStart={handleStart} loading={loading} />}
        {phase === 'playing' && session && (
          <QuizQuestion
            question={session.questions[currentIndex]!}
            questionNumber={currentIndex + 1}
            total={session.questions.length}
            onAnswer={handleAnswer}
          />
        )}
        {phase === 'results' && results && session && (
          <QuizResults results={results} session={session} onRestart={handleRestart} />
        )}
      </div>

      {/* Sidebar stats */}
      <div className="w-56 shrink-0 space-y-3 pt-1">
        <div className="gcard p-4 space-y-3">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Your stats</p>
          <div className="space-y-2">
            <div>
              <p className="text-xs text-slate-500">Quizzes taken</p>
              <p className="text-2xl font-mono font-black text-white">{history.length}</p>
            </div>
            {avgScore !== null && (
              <div>
                <p className="text-xs text-slate-500">Avg score</p>
                <p className="text-2xl font-mono font-black"
                  style={{ color: avgScore >= 70 ? '#22c55e' : avgScore >= 40 ? '#eab308' : '#ef4444' }}>
                  {avgScore}%
                </p>
              </div>
            )}
          </div>
        </div>

        {history.length > 0 && (
          <div className="gcard p-4 space-y-2">
            <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest">Recent</p>
            {[...history].reverse().slice(0, 5).map((h, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-slate-600 font-mono">{h.date}</span>
                <span className="font-mono font-bold"
                  style={{ color: h.score / h.total >= 0.7 ? '#22c55e' : h.score / h.total >= 0.4 ? '#eab308' : '#ef4444' }}>
                  {h.score}/{h.total}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="gcard p-4">
          <p className="text-[10px] font-mono text-slate-600 uppercase tracking-widest mb-2">Tips</p>
          <ul className="space-y-1.5 text-[11px] text-slate-600 leading-relaxed">
            <li>• Quiz low-retention notes first</li>
            <li>• Review within 24h of learning</li>
            <li>• Spaced repetition builds memory</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
