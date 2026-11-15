'use client';

import React from 'react';
import { AlertCircle, Sparkles, Dog } from 'lucide-react';

interface ConditionSwitchProps {
  isDirty: boolean;
  onToggle: (dirty: boolean) => void;
  markupPercent?: number;
}

export function ConditionSwitch({ isDirty, onToggle, markupPercent = 30 }: ConditionSwitchProps) {
  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
              isDirty
                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500'
            }`}
          >
            {isDirty ? <Dog className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-sm text-zinc-900 dark:text-white">
                Состояние салона и кузова
              </span>
              {isDirty && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  +{markupPercent}% к сумме
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              {isDirty
                ? 'Шерсть животных, въевшиеся застарелые пятна, строительная пыль или песок'
                : 'Стандартная городская эксплуатация без экстремальных загрязнений'}
            </p>
          </div>
        </div>

        {/* Двухпозиционный переключатель */}
        <div className="flex items-center bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl self-start sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => onToggle(false)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              !isDirty
                ? 'bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            Обычное
          </button>
          <button
            type="button"
            onClick={() => onToggle(true)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
              isDirty
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <span>Сильные загрязнения</span>
            <span className="text-[10px] opacity-80">(+{markupPercent}%)</span>
          </button>
        </div>
      </div>

      {isDirty && (
        <div className="mt-3 pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center gap-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            При сильных загрязнениях мастеру потребуется фото салона для оценки времени работы и выбора спецсоставов.
          </span>
        </div>
      )}
    </div>
  );
}
