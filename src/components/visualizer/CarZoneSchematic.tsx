'use client';

import React, { useState } from 'react';
import { ServiceZone } from '@/types';
import { Sparkles, Info } from 'lucide-react';

interface CarZoneSchematicProps {
  activeZones: Set<ServiceZone>;
  onZoneClick?: (zone: ServiceZone) => void;
  showMasterTooltips?: boolean;
}

interface ZoneMeta {
  title: string;
  desc: string;
  masterTip: string;
}

const ZONE_DESCRIPTIONS: Record<ServiceZone, ZoneMeta> = {
  interior_seats: {
    title: 'Салон и кресла',
    desc: 'Экстракторная чистка обивки, удаление пятен кофе, въевшейся пыли и уход за кожей.',
    masterTip: 'Своевременная чистка предотвращает засаливание ткани и растрескивание натуральной кожи.',
  },
  interior_roof: {
    title: 'Потолок и стойки',
    desc: 'Сухая пенная чистка без избыточной влаги. Защищает ткань от провисания.',
    masterTip: 'Потолок чистится только деликатными составами с минимальным содержанием влаги.',
  },
  interior_trunk: {
    title: 'Багажное отделение',
    desc: 'Глубокая очистка ковролина, боковых панелей и ниши запасного колеса.',
    masterTip: 'Чистый багажник избавляет салон от затхлого запаха сырости и пыли.',
  },
  body_paint: {
    title: 'Кузов и лакокрасочное покрытие',
    desc: 'Абразивная или безабразивная полировка, керамика 9H, воск и зеркальный глянец.',
    masterTip: 'Керамика консервирует идеальный глянец и отталкивает дорожную грязь с реагентами.',
  },
  lights_glass: {
    title: 'Оптика и остекление',
    desc: 'Полировка фар от помутнения + нанесение состава «Антидождь» для идеальной видимости.',
    masterTip: 'Антидождь обеспечивает чистый обзор в ливень на трассе без включения дворников.',
  },
  engine_bay: {
    title: 'Моторный отсек',
    desc: 'Диэлектрическая очистка паром и консервация проводки и пластика термостойким составом.',
    masterTip: 'Чистый двигатель лучше охлаждается и защищён от коррозии контактов.',
  },
  none: {
    title: 'Индивидуальная задача',
    desc: 'Оценка по фото и персональный расчёт мастера.',
    masterTip: 'Прикрепите фото повреждений для точного расчёта.',
  },
};

export function CarZoneSchematic({ activeZones, onZoneClick, showMasterTooltips = true }: CarZoneSchematicProps) {
  const [hoveredZone, setHoveredZone] = useState<ServiceZone | null>(null);

  const activeCount = activeZones.size;
  const currentZoneMeta = hoveredZone ? ZONE_DESCRIPTIONS[hoveredZone] : null;

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-3xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
        <div>
          <h3 className="font-extrabold text-base text-zinc-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-sky-500" />
            <span>Интерактивная карта зон авто</span>
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Зоны подсвечиваются при выборе услуг. Наведите или нажмите на зону для деталей.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
            {activeCount === 0 ? 'Выберите услуги' : `Активно зон: ${activeCount}`}
          </span>
        </div>
      </div>

      {/* SVG Canvas схемы (вид сверху в прозрачном разрезе) */}
      <div className="relative w-full aspect-[2/1] max-h-[300px] flex items-center justify-center overflow-hidden rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 p-2 sm:p-4 border border-zinc-100 dark:border-zinc-800/80">
        <svg
          viewBox="0 0 700 320"
          className="w-full h-full max-h-[280px] select-none"
        >
          <defs>
            {/* Градиент свечения для активной зоны */}
            <linearGradient id="activeGlow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.85" />
            </linearGradient>

            {/* Фильтр неонового свечения */}
            <filter id="neonBlur" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* КОНТУР ВСЕГО АВТОМОБИЛЯ (БАЗОВЫЙ КАРКАС) */}
          <path
            d="M 120 160 
               C 120 120, 150 90, 210 80 
               L 490 80 
               C 560 90, 580 120, 580 160 
               C 580 200, 560 230, 490 240 
               L 210 240 
               C 150 230, 120 200, 120 160 Z"
            className="fill-zinc-200/60 dark:fill-zinc-800/60 stroke-zinc-400 dark:stroke-zinc-700 stroke-[2.5]"
          />

          {/* 1. ЗОНА: МОТОРНЫЙ ОТСЕК (Слева / Спереди) */}
          <g
            onClick={() => onZoneClick?.('engine_bay')}
            onMouseEnter={() => setHoveredZone('engine_bay')}
            onMouseLeave={() => setHoveredZone(null)}
            className="cursor-pointer transition-all duration-300"
          >
            <path
              d="M 130 160 
                 C 130 125, 155 100, 205 95 
                 L 225 95 
                 L 225 225 
                 L 205 225 
                 C 155 220, 130 195, 130 160 Z"
              filter={activeZones.has('engine_bay') ? 'url(#neonBlur)' : undefined}
              className={`transition-all duration-300 ${
                activeZones.has('engine_bay')
                  ? 'fill-sky-500/80 stroke-sky-300 stroke-[3]'
                  : hoveredZone === 'engine_bay'
                  ? 'fill-sky-500/20 stroke-sky-400 stroke-2'
                  : 'fill-zinc-300/40 dark:fill-zinc-800/40 stroke-zinc-400/80 dark:stroke-zinc-600/80 stroke-1'
              }`}
            />
            {/* Иконка шестеренки / двигателя внутри отсека */}
            <circle cx="178" cy="160" r="14" className="fill-none stroke-current opacity-40 stroke-2" />
            <path d="M 178 140 L 178 180 M 158 160 L 198 160" className="stroke-current opacity-40 stroke-2" />
            <text x="178" y="164" textAnchor="middle" className="text-[11px] font-bold fill-zinc-800 dark:fill-zinc-200 pointer-events-none">
              МОТОР
            </text>
          </g>

          {/* 2. ЗОНА: ОПТИКА И СТЕКЛА (Фары спереди, лобовое, заднее) */}
          <g
            onClick={() => onZoneClick?.('lights_glass')}
            onMouseEnter={() => setHoveredZone('lights_glass')}
            onMouseLeave={() => setHoveredZone(null)}
            className="cursor-pointer transition-all duration-300"
          >
            {/* Фары спереди */}
            <path
              d="M 132 108 C 145 106, 160 114, 165 125 L 140 125 Z"
              className={`transition-all duration-300 ${
                activeZones.has('lights_glass')
                  ? 'fill-amber-400 stroke-amber-200 stroke-2'
                  : 'fill-zinc-300 dark:fill-zinc-700 stroke-zinc-400'
              }`}
            />
            <path
              d="M 132 212 C 145 214, 160 206, 165 195 L 140 195 Z"
              className={`transition-all duration-300 ${
                activeZones.has('lights_glass')
                  ? 'fill-amber-400 stroke-amber-200 stroke-2'
                  : 'fill-zinc-300 dark:fill-zinc-700 stroke-zinc-400'
              }`}
            />

            {/* Лобовое стекло (трапеция) */}
            <path
              d="M 235 105 L 285 115 L 285 205 L 235 215 Z"
              filter={activeZones.has('lights_glass') ? 'url(#neonBlur)' : undefined}
              className={`transition-all duration-300 ${
                activeZones.has('lights_glass')
                  ? 'fill-sky-400/90 stroke-sky-200 stroke-2'
                  : hoveredZone === 'lights_glass'
                  ? 'fill-sky-500/25 stroke-sky-400 stroke-1'
                  : 'fill-cyan-200/40 dark:fill-cyan-950/40 stroke-zinc-400 dark:stroke-zinc-600 stroke-1'
              }`}
            />
            <text x="260" y="164" textAnchor="middle" className="text-[10px] font-bold fill-zinc-700 dark:fill-zinc-300 pointer-events-none">
              СТЕКЛО
            </text>

            {/* Заднее стекло */}
            <path
              d="M 445 115 L 485 105 L 485 215 L 445 205 Z"
              className={`transition-all duration-300 ${
                activeZones.has('lights_glass')
                  ? 'fill-sky-400/90 stroke-sky-200 stroke-2'
                  : 'fill-cyan-200/40 dark:fill-cyan-950/40 stroke-zinc-400 dark:stroke-zinc-600 stroke-1'
              }`}
            />
          </g>

          {/* 3. ЗОНА: КУЗОВ И ЛКП (Крылья, двери, боковые панели) */}
          <g
            onClick={() => onZoneClick?.('body_paint')}
            onMouseEnter={() => setHoveredZone('body_paint')}
            onMouseLeave={() => setHoveredZone(null)}
            className="cursor-pointer transition-all duration-300"
          >
            {/* Верхний борт кузова */}
            <path
              d="M 220 82 L 490 82 L 485 105 L 230 105 Z"
              filter={activeZones.has('body_paint') ? 'url(#neonBlur)' : undefined}
              className={`transition-all duration-300 ${
                activeZones.has('body_paint')
                  ? 'fill-sky-500/80 stroke-sky-300 stroke-2'
                  : hoveredZone === 'body_paint'
                  ? 'fill-sky-500/25 stroke-sky-400'
                  : 'fill-zinc-300/30 dark:fill-zinc-800/30 stroke-zinc-400 dark:stroke-zinc-600 stroke-1'
              }`}
            />
            {/* Нижний борт кузова */}
            <path
              d="M 220 238 L 490 238 L 485 215 L 230 215 Z"
              filter={activeZones.has('body_paint') ? 'url(#neonBlur)' : undefined}
              className={`transition-all duration-300 ${
                activeZones.has('body_paint')
                  ? 'fill-sky-500/80 stroke-sky-300 stroke-2'
                  : hoveredZone === 'body_paint'
                  ? 'fill-sky-500/25 stroke-sky-400'
                  : 'fill-zinc-300/30 dark:fill-zinc-800/30 stroke-zinc-400 dark:stroke-zinc-600 stroke-1'
              }`}
            />
          </g>

          {/* 4. ЗОНА: САЛОН И СИДЕНЬЯ (Передние и задние кресла) */}
          <g
            onClick={() => onZoneClick?.('interior_seats')}
            onMouseEnter={() => setHoveredZone('interior_seats')}
            onMouseLeave={() => setHoveredZone(null)}
            className="cursor-pointer transition-all duration-300"
          >
            {/* Переднее левое сиденье */}
            <rect
              x="295"
              y="118"
              width="50"
              height="35"
              rx="6"
              filter={activeZones.has('interior_seats') ? 'url(#neonBlur)' : undefined}
              className={`transition-all duration-300 ${
                activeZones.has('interior_seats')
                  ? 'fill-sky-500/90 stroke-sky-200 stroke-2'
                  : hoveredZone === 'interior_seats'
                  ? 'fill-sky-500/30 stroke-sky-400'
                  : 'fill-zinc-300 dark:fill-zinc-700 stroke-zinc-400 dark:stroke-zinc-500 stroke-1'
              }`}
            />
            {/* Переднее правое сиденье */}
            <rect
              x="295"
              y="167"
              width="50"
              height="35"
              rx="6"
              filter={activeZones.has('interior_seats') ? 'url(#neonBlur)' : undefined}
              className={`transition-all duration-300 ${
                activeZones.has('interior_seats')
                  ? 'fill-sky-500/90 stroke-sky-200 stroke-2'
                  : hoveredZone === 'interior_seats'
                  ? 'fill-sky-500/30 stroke-sky-400'
                  : 'fill-zinc-300 dark:fill-zinc-700 stroke-zinc-400 dark:stroke-zinc-500 stroke-1'
              }`}
            />

            {/* Задний диван */}
            <rect
              x="385"
              y="118"
              width="52"
              height="84"
              rx="8"
              filter={activeZones.has('interior_seats') ? 'url(#neonBlur)' : undefined}
              className={`transition-all duration-300 ${
                activeZones.has('interior_seats')
                  ? 'fill-sky-500/90 stroke-sky-200 stroke-2'
                  : hoveredZone === 'interior_seats'
                  ? 'fill-sky-500/30 stroke-sky-400'
                  : 'fill-zinc-300 dark:fill-zinc-700 stroke-zinc-400 dark:stroke-zinc-500 stroke-1'
              }`}
            />
            <text x="320" y="164" textAnchor="middle" className="text-[10px] font-bold fill-zinc-600 dark:fill-zinc-400 pointer-events-none">
              КРЕСЛА
            </text>
            <text x="411" y="164" textAnchor="middle" className="text-[10px] font-bold fill-zinc-600 dark:fill-zinc-400 pointer-events-none">
              ДИВАН
            </text>
          </g>

          {/* 5. ЗОНА: ПОТОЛОК И СТОЙКИ */}
          <g
            onClick={() => onZoneClick?.('interior_roof')}
            onMouseEnter={() => setHoveredZone('interior_roof')}
            onMouseLeave={() => setHoveredZone(null)}
            className="cursor-pointer transition-all duration-300"
          >
            <circle
              cx="360"
              cy="160"
              r="18"
              filter={activeZones.has('interior_roof') ? 'url(#neonBlur)' : undefined}
              className={`transition-all duration-300 ${
                activeZones.has('interior_roof')
                  ? 'fill-sky-400 stroke-sky-100 stroke-2'
                  : hoveredZone === 'interior_roof'
                  ? 'fill-sky-500/30 stroke-sky-400'
                  : 'fill-zinc-400/50 dark:fill-zinc-600/50 stroke-zinc-400 dark:stroke-zinc-500 stroke-1'
              }`}
            />
            <text x="360" y="163" textAnchor="middle" className="text-[8px] font-bold fill-white pointer-events-none">
              ПОТОЛОК
            </text>
          </g>

          {/* 6. ЗОНА: БАГАЖНИК (Справа / Сзади) */}
          <g
            onClick={() => onZoneClick?.('interior_trunk')}
            onMouseEnter={() => setHoveredZone('interior_trunk')}
            onMouseLeave={() => setHoveredZone(null)}
            className="cursor-pointer transition-all duration-300"
          >
            <path
              d="M 495 105 
                 L 505 105 
                 C 555 115, 570 135, 570 160 
                 C 570 185, 555 205, 505 215 
                 L 495 215 Z"
              filter={activeZones.has('interior_trunk') ? 'url(#neonBlur)' : undefined}
              className={`transition-all duration-300 ${
                activeZones.has('interior_trunk')
                  ? 'fill-sky-500/80 stroke-sky-200 stroke-2'
                  : hoveredZone === 'interior_trunk'
                  ? 'fill-sky-500/25 stroke-sky-400'
                  : 'fill-zinc-300/40 dark:fill-zinc-800/40 stroke-zinc-400 dark:stroke-zinc-600 stroke-1'
              }`}
            />
            <text x="525" y="164" textAnchor="middle" className="text-[10px] font-bold fill-zinc-800 dark:fill-zinc-200 pointer-events-none">
              БАГАЖНИК
            </text>
          </g>
        </svg>

        {/* Легенда статуса активных зон */}
        <div className="absolute bottom-2 right-2 flex items-center gap-1.5 text-[10px] text-zinc-500 bg-white/90 dark:bg-zinc-900/90 px-2.5 py-1 rounded-lg backdrop-blur-sm border border-zinc-200 dark:border-zinc-800">
          <span className="w-2 h-2 rounded-full bg-sky-500 animate-ping" />
          <span>Свечение = в расчёте</span>
        </div>
      </div>

      {/* Всплывающая подсказка / описание зоны */}
      {currentZoneMeta && showMasterTooltips && (
        <div className="mt-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800/80 text-xs animate-fadeIn">
          <div className="flex items-center gap-1.5 font-bold text-sky-900 dark:text-sky-200 mb-1">
            <Info className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
            <span>{currentZoneMeta.title}</span>
          </div>
          <p className="text-zinc-600 dark:text-zinc-300 mb-1">
            {currentZoneMeta.desc}
          </p>
          <p className="text-[11px] text-sky-700 dark:text-sky-400 italic">
            💡 Совет мастера: {currentZoneMeta.masterTip}
          </p>
        </div>
      )}
    </div>
  );
}
