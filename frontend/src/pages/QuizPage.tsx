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

  return (
    <div className="max-w-3xl">
      {error && (
        <div className="mb-4 glass-card p-3 text-sm text-red-400 border-red-900/30">
          {error}
        </div>
      )}

      {phase === 'intro' && (
        <QuizIntro onStart={handleStart} loading={loading} />
      )}

      {phase === 'playing' && session && (
        <QuizQuestion
          question={session.questions[currentIndex]!}
          questionNumber={currentIndex + 1}
          total={session.questions.length}
          onAnswer={handleAnswer}
        />
      )}

      {phase === 'results' && results && session && (
        <QuizResults
          results={results}
          session={session}
          onRestart={handleRestart}
        />
      )}
    </div>
  );
}
