'use client';

import React from 'react';
import { CarClass } from '@/types';
import { HelpCircle } from 'lucide-react';

interface CarClassSelectorProps {
  selectedClass: CarClass;
  onSelectClass: (c: CarClass) => void;
}

export function CarClassSelector({ selectedClass, onSelectClass }: CarClassSelectorProps) {
  const classes: {
    id: CarClass;
    name: string;
    label: string;
    examples: string;
    svgPath: React.ReactNode;
  }[] = [
    {
      id: 'S',
      name: 'Класс S',
      label: 'Седан / Хэтчбек',
      examples: 'Solaris, Camry, Octavia, Polo, Civic',
      svgPath: (
        // Векторный чистый силуэт седана
        <svg viewBox="0 0 160 60" className="w-full h-12 stroke-current fill-none stroke-[2] stroke-linecap-round stroke-linejoin-round">
          {/* Контур кузова седана */}
          <path d="M10 44 L25 44 C26 38 31 34 37 34 C43 34 48 38 49 44 L111 44 C112 38 117 34 123 34 C129 34 134 38 135 44 L150 44 C153 44 155 42 154 39 L146 32 C143 30 138 29 133 29 L115 29 L98 17 C95 15 91 14 86 14 L48 14 C44 14 41 16 39 19 L26 29 L14 31 C11 32 9 34 9 37 L9 42 C9 43 10 44 10 44 Z" />
          {/* Стёкла */}
          <path d="M42 27 L88 27 L88 17 L50 17 Z" className="opacity-40 fill-current" />
          <path d="M93 27 L114 27 L100 17 L93 17 Z" className="opacity-40 fill-current" />
          {/* Колёса */}
          <circle cx="37" cy="44" r="7" className="fill-current opacity-80" />
          <circle cx="123" cy="44" r="7" className="fill-current opacity-80" />
        </svg>
      ),
    },
    {
      id: 'M',
      name: 'Класс M',
      label: 'Кроссовер / Бизнес',
      examples: 'Tiguan, RAV4, BMW 5/X3, Sportage',
      svgPath: (
        // Векторный чистый силуэт кроссовера
        <svg viewBox="0 0 160 60" className="w-full h-12 stroke-current fill-none stroke-[2] stroke-linecap-round stroke-linejoin-round">
          {/* Контур кузова кроссовера */}
          <path d="M10 44 L24 44 C25 37 31 33 38 33 C45 33 51 37 52 44 L108 44 C109 37 115 33 122 33 C129 33 135 37 136 44 L150 44 C153 44 155 41 154 37 L147 26 C144 23 140 22 135 22 L118 22 L105 13 C102 11 98 10 93 10 L48 10 C44 10 40 12 37 16 L24 26 L13 28 C10 29 8 32 8 35 L8 42 C8 43 9 44 10 44 Z" />
          {/* Стёкла */}
          <path d="M41 24 L85 24 L85 13 L50 13 Z" className="opacity-40 fill-current" />
          <path d="M90 24 L118 24 L106 13 L90 13 Z" className="opacity-40 fill-current" />
          {/* Колёса */}
          <circle cx="38" cy="44" r="8" className="fill-current opacity-80" />
          <circle cx="122" cy="44" r="8" className="fill-current opacity-80" />
        </svg>
      ),
    },
    {
      id: 'L',
      name: 'Класс L',
      label: 'Внедорожник / Минивэн',
      examples: 'Land Cruiser, BMW X5/X7, Carnival, Q7',
      svgPath: (
        // Векторный чистый силуэт большого внедорожника
        <svg viewBox="0 0 160 60" className="w-full h-12 stroke-current fill-none stroke-[2] stroke-linecap-round stroke-linejoin-round">
          {/* Контур кузова большого внедорожника */}
          <path d="M10 44 L23 44 C24 36 31 31 39 31 C47 31 54 36 55 44 L105 44 C106 36 113 31 121 31 C129 31 136 36 137 44 L150 44 C153 44 155 41 155 36 L152 22 C151 18 147 16 142 16 L120 16 L104 8 C100 6 95 6 89 6 L42 6 C38 6 34 8 32 12 L20 23 L11 25 C8 26 6 29 6 33 L6 42 C6 43 8 44 10 44 Z" />
          {/* Стёкла */}
          <path d="M37 20 L80 20 L80 9 L44 9 Z" className="opacity-40 fill-current" />
          <path d="M85 20 L122 20 L122 9 L85 9 Z" className="opacity-40 fill-current" />
          <path d="M126 20 L146 20 L144 17 L126 17 Z" className="opacity-40 fill-current" />
          {/* Колёса */}
          <circle cx="39" cy="44" r="9" className="fill-current opacity-80" />
          <circle cx="121" cy="44" r="9" className="fill-current opacity-80" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <label className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <span>1. Выберите класс автомобиля</span>
        </label>
        <span className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:inline">
          Определяет базовый объём работ и расход составов
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {classes.map((item) => {
          const isSelected = selectedClass === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectClass(item.id)}
              className={`relative text-left p-4 rounded-2xl border-2 transition-all flex flex-col justify-between ${
                isSelected
                  ? 'border-sky-500 bg-sky-500/10 dark:bg-sky-500/15 shadow-md shadow-sky-500/10 ring-2 ring-sky-500/20'
                  : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900/70'
              }`}
            >
              {/* Верхняя строка с названием и статусом */}
              <div className="flex items-center justify-between w-full mb-2">
                <span className="font-extrabold text-base text-zinc-900 dark:text-white">
                  {item.name}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                    isSelected
                      ? 'bg-sky-500 text-white'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                >
                  {item.label}
                </span>
              </div>

              {/* Векторный силуэт автомобиля */}
              <div
                className={`my-3 py-1 transition-colors ${
                  isSelected ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-400 dark:text-zinc-600'
                }`}
              >
                {item.svgPath}
              </div>
            </button>
          );
        })}
      </div>

      {/* Кнопка "Другое / Микроавтобус / Нестандарт" */}
      <div className="mt-2.5 flex items-center justify-between px-3 py-2 rounded-xl bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200/80 dark:border-zinc-800/80 text-xs">
        <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
          <HelpCircle className="w-3.5 h-3.5 text-zinc-400" />
          Микроавтобус, коммерческий фургон или ретро-авто?
        </span>
        <button
          onClick={() => onSelectClass('OTHER')}
          className={`font-semibold px-2.5 py-1 rounded-lg transition-all ${
            selectedClass === 'OTHER'
              ? 'bg-sky-500 text-white shadow-sm'
              : 'text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/40'
          }`}
        >
          {selectedClass === 'OTHER' ? '✓ Выбран нестандарт (по фото)' : 'Выбрать оценку по фото'}
        </button>
      </div>
    </div>
  );
}
