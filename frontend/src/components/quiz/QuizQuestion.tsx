import { useState } from 'react';
import { CheckCircle2, XCircle, Lightbulb, ChevronRight, Timer } from 'lucide-react';
import type { QuizQuestion as QuizQuestionType } from '@/lib/types';
import { cn } from '@/lib/utils';
import { categoryColors } from '@/styles/theme';

interface QuizQuestionProps {
  question: QuizQuestionType;
  questionNumber: number;
  total: number;
  onAnswer: (selectedIndex: number, timeTakenMs: number) => void;
}

export function QuizQuestion({
  question,
  questionNumber,
  total,
  onAnswer,
}: QuizQuestionProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [startTime] = useState(Date.now());
  const catColor = categoryColors[question.category] ?? '#a78bfa';

  function handleSelect(idx: number) {
    if (revealed) return;
    setSelected(idx);
    setRevealed(true);
  }

  function handleNext() {
    if (selected === null) return;
    onAnswer(selected, Date.now() - startTime);
    setSelected(null);
    setRevealed(false);
    setShowHint(false);
  }

  const progress = ((questionNumber - 1) / total) * 100;

  return (
    <div className="max-w-lg mx-auto space-y-5 animate-fade-in">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-500 font-mono">
            {questionNumber} / {total}
          </span>
          <div className="flex items-center gap-1.5">
            <Timer size={11} className="text-slate-600" />
            <span
              className="text-xs font-medium capitalize"
              style={{ color: catColor }}
            >
              {question.difficulty} · {question.category}
            </span>
          </div>
        </div>
        <div className="h-1 bg-cosmos-700 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-nebula-gradient transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <p className="text-slate-200 font-medium leading-relaxed text-sm">
          {question.question}
        </p>

        {question.hint && !revealed && (
          <button
            onClick={() => setShowHint(!showHint)}
            className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-pulsar-400 transition-colors"
          >
            <Lightbulb size={12} />
            {showHint ? 'Hide hint' : 'Show hint'}
          </button>
        )}

        {showHint && question.hint && (
          <div className="px-3 py-2 rounded-lg bg-pulsar-500/10 border border-pulsar-500/20 text-xs text-pulsar-300">
            {question.hint}
          </div>
        )}

        <div className="space-y-2">
          {question.options.map((option, idx) => {
            const isCorrect = idx === question.correct_index;
            const isSelected = idx === selected;

            let borderColor = 'border-cosmos-700';
            let bg = 'bg-cosmos-800/40 hover:bg-cosmos-800/80';
            let textColor = 'text-slate-300';
            let icon = null;

            if (revealed) {
              if (isCorrect) {
                borderColor = 'border-green-500/60';
                bg = 'bg-green-500/10';
                textColor = 'text-green-300';
                icon = <CheckCircle2 size={14} className="text-green-400 shrink-0" />;
              } else if (isSelected && !isCorrect) {
                borderColor = 'border-red-500/60';
                bg = 'bg-red-500/10';
                textColor = 'text-red-300';
                icon = <XCircle size={14} className="text-red-400 shrink-0" />;
              } else {
                bg = 'bg-cosmos-800/20';
                textColor = 'text-slate-600';
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(idx)}
                disabled={revealed}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-lg border text-sm text-left transition-all duration-200',
                  borderColor,
                  bg,
                  textColor,
                  !revealed && 'hover:border-cosmos-600 cursor-pointer active:scale-[0.99]',
                  revealed && 'cursor-default'
                )}
              >
                <span className="shrink-0 w-5 h-5 rounded-full border border-current/30 flex items-center justify-center text-[10px] font-mono font-bold opacity-60">
                  {String.fromCharCode(65 + idx)}
                </span>
                <span className="flex-1">{option}</span>
                {icon}
              </button>
            );
          })}
        </div>

        {revealed && (
          <button
            onClick={handleNext}
            className="btn-primary w-full flex items-center justify-center gap-2 mt-2"
          >
            {questionNumber === total ? 'See results' : 'Next question'}
            <ChevronRight size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
