'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { MoveHorizontal } from 'lucide-react';

interface BeforeAfterSliderProps {
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
  title?: string;
  description?: string;
  className?: string;
}

export function BeforeAfterSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'До работы',
  afterLabel = 'После детейлинга',
  title,
  description,
  className = '',
}: BeforeAfterSliderProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!isDragging) return;
    if (e.touches[0]) {
      handleMove(e.touches[0].clientX);
    }
  }, [isDragging, handleMove]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    handleMove(e.clientX);
  }, [isDragging, handleMove]);

  const handleDragEnd = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
    }
  }, [isDragging]);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleDragEnd);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleDragEnd);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleDragEnd);
    };
  }, [isDragging, handleMouseMove, handleTouchMove, handleDragEnd]);

  return (
    <div className={`space-y-3 ${className}`}>
      {(title || description) && (
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 px-1">
          {title && (
            <h4 className="font-semibold text-sm sm:text-base text-white tracking-tight">
              {title}
            </h4>
          )}
          {description && (
            <p className="text-xs text-zinc-400 max-w-md">
              {description}
            </p>
          )}
        </div>
      )}

      {/* Контейнер интерактивного сравнения */}
      <div
        ref={containerRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          if (e.touches[0]) handleMove(e.touches[0].clientX);
        }}
        className="relative w-full aspect-[16/10] sm:aspect-[16/9] rounded-3xl overflow-hidden cursor-ew-resize select-none border border-zinc-700/80 shadow-2xl bg-zinc-950 group"
      >
        {/* Изображение ПОСЛЕ (фоновое) */}
        <div className="absolute inset-0 w-full h-full">
          <img
            src={afterImage}
            alt={afterLabel}
            className="w-full h-full object-cover object-center pointer-events-none"
            loading="lazy"
          />
          {/* Текст ПОСЛЕ по центру правой половинки */}
          <div className="absolute top-1/2 left-[75%] -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
            <div className="px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 shadow-2xl">
              <span className="text-sm sm:text-base font-black text-white tracking-widest uppercase">
                ПОСЛЕ
              </span>
            </div>
          </div>
        </div>

        {/* Изображение ДО (обрезанное через clip-path) */}
        <div
          className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none"
          style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
        >
          <img
            src={beforeImage}
            alt={beforeLabel}
            className="w-full h-full object-cover object-center pointer-events-none"
            loading="lazy"
          />
          {/* Текст ДО по центру левой половинки */}
          <div className="absolute top-1/2 left-[25%] -translate-x-1/2 -translate-y-1/2 pointer-events-none select-none">
            <div className="px-4 py-2 rounded-2xl bg-black/75 backdrop-blur-md border border-white/10 shadow-2xl">
              <span className="text-sm sm:text-base font-black text-white tracking-widest uppercase">
                ДО
              </span>
            </div>
          </div>
        </div>

        {/* Разделительная линия и ползунок */}
        <div
          className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.7)] pointer-events-none transition-transform"
          style={{ left: `${sliderPosition}%`, transform: 'translateX(-50%)' }}
        >
          {/* Круглая ручка по центру */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white text-zinc-900 flex items-center justify-center shadow-xl border-2 border-zinc-900 group-hover:scale-110 active:scale-95 transition-transform pointer-events-none">
            <MoveHorizontal className="w-5 h-5 text-zinc-800" />
          </div>
        </div>

        {/* Текстовая подсказка внизу */}
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/50 backdrop-blur-md text-[10px] text-zinc-400 font-medium pointer-events-none">
          Тяните ползунок для сравнения
        </div>
      </div>
    </div>
  );
}
