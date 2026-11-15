'use client';

import React from 'react';
import { BentoFeature } from '@/types';
import { Sparkles, SunMedium, ShieldCheck, Award, CheckCircle2, Shield } from 'lucide-react';

interface BentoGridSectionProps {
  features?: BentoFeature[];
  title?: string;
  subtitle?: string;
  className?: string;
}

export function BentoGridSection({
  features,
  title = 'Стандарты качества DetailingHub',
  subtitle = 'Почему владельцы премиальных автомобилей доверяют нам',
  className = '',
}: BentoGridSectionProps) {
  const activeFeatures = (features || []).filter((f) => f.active !== false);

  if (activeFeatures.length === 0) return null;

  const getIcon = (iconName?: string) => {
    switch (iconName) {
      case 'light':
      case 'sun':
        return <SunMedium className="w-5 h-5 text-amber-400" />;
      case 'shield':
      case 'box':
        return <ShieldCheck className="w-5 h-5 text-sky-400" />;
      case 'warranty':
      case 'check':
        return <Award className="w-5 h-5 text-emerald-400" />;
      case 'chemistry':
      case 'sparkles':
      default:
        return <Sparkles className="w-5 h-5 text-purple-400" />;
    }
  };

  return (
    <section className={className}>
      {/* Bento Grid Сетка */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {activeFeatures.map((item, idx) => (
          <div
            key={item.id || idx}
            className="group relative p-5 sm:p-6 rounded-3xl bg-[#0f1118]/80 backdrop-blur-sm border border-zinc-800/80 hover:border-zinc-700/80 transition-all duration-300 flex flex-col justify-between overflow-hidden shadow-lg hover:shadow-sky-500/5 hover:-translate-y-0.5"
          >
            {/* Мягкий фоновый градиент на ховере */}
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-32 h-32 rounded-full bg-sky-500/5 blur-2xl group-hover:bg-sky-500/10 transition-colors pointer-events-none" />

            <div className="space-y-3 relative z-10">
              <div className="flex items-center justify-between gap-2">
                <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                  {getIcon(item.icon)}
                </div>
                {item.badge && (
                  <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-zinc-800/80 border border-zinc-700/70 text-zinc-300 tracking-wide">
                    {item.badge}
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-extrabold text-sm sm:text-base text-white tracking-tight">
                  {item.title}
                </h4>
                {item.subtitle && (
                  <p className="text-[11px] font-semibold text-sky-400/90 mt-0.5">
                    {item.subtitle}
                  </p>
                )}
              </div>

              <p className="text-xs text-zinc-400 leading-relaxed">
                {item.description}
              </p>
            </div>

            <div className="pt-4 mt-2 border-t border-zinc-900 flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 group-hover:text-zinc-300 transition-colors relative z-10">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Стандарт детейлинга</span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
