'use client';

import React, { useRef, useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Sparkles, RotateCcw, Gift, CheckCircle2, Trophy } from 'lucide-react';

interface ScratchCleanGameProps {
  orderToken: string;
  gameSettings: {
    mode: 'off' | 'fun' | 'bonus';
    bonusText: string;
    bonusDiscountRub: number;
    bonusPromoPrefix: string;
    bonusValidityDays: number;
    bonusMinOrderRub: number;
  };
  initialBonusCode?: string | null;
  initialPlayed?: boolean;
}

export function ScratchCleanGame({
  orderToken,
  gameSettings,
  initialBonusCode,
  initialPlayed = false,
}: ScratchCleanGameProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cleanedPercent, setCleanedPercent] = useState<number>(0);
  const [isWon, setIsWon] = useState<boolean>(initialPlayed);
  const [bonusCode, setBonusCode] = useState<string | null>(initialBonusCode || null);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const isDrawing = useRef(false);

  if (gameSettings.mode === 'off') {
    return null;
  }

  // Инициализация Canvas и слоя грязи
  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Сброс контекста
    ctx.globalCompositeOperation = 'source-over';

    // Рисуем слой реалистичной грязи и дорожного налёта
    const grad = ctx.createLinearGradient(0, 0, width, height);
    grad.addColorStop(0, '#57422f'); // серо-коричневая пыль
    grad.addColorStop(0.5, '#433425'); // тёмная грязь
    grad.addColorStop(1, '#664e39');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, width, height);

    // Добавляем текстуру брызг и пятен
    ctx.fillStyle = '#2f241a';
    for (let i = 0; i < 40; i++) {
      const rx = Math.random() * width;
      const ry = Math.random() * height;
      const r = 5 + Math.random() * 25;
      ctx.beginPath();
      ctx.arc(rx, ry, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Добавляем дорожные подтёки
    ctx.fillStyle = 'rgba(30, 20, 10, 0.4)';
    for (let j = 0; j < 15; j++) {
      const x = Math.random() * width;
      const y = Math.random() * (height / 2);
      const w = 4 + Math.random() * 8;
      const h = 40 + Math.random() * 80;
      ctx.fillRect(x, y, w, h);
    }

    // Текст-призыв поверх грязи
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = 'bold 16px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Протрите пальцем или курсором, чтобы отмыть', width / 2, height / 2);

    setCleanedPercent(0);
    if (!initialBonusCode) {
      setIsWon(false);
    }
  };

  useEffect(() => {
    initCanvas();
  }, []);

  // Расчёт процента стёртой площади
  const calculateCleanPercent = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let transparentPixels = 0;
      const totalPixels = data.length / 4;

      // Проверяем альфа-канал каждого 16-го пикселя для оптимизации
      const step = 16;
      for (let i = 3; i < data.length; i += 4 * step) {
        if (data[i] < 128) {
          transparentPixels += step;
        }
      }

      const percent = Math.min(100, Math.round((transparentPixels / totalPixels) * 100));
      setCleanedPercent(percent);

      if (percent >= 75 && !isWon) {
        handleWin();
      }
    } catch {}
  };

  // Победа в мини-игре
  const handleWin = async () => {
    setIsWon(true);

    // Запуск праздничного конфетти
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
    });

    if (gameSettings.mode === 'bonus' && !bonusCode) {
      try {
        const res = await fetch(`/api/orders/${orderToken}/game`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'claim_bonus' }),
        });
        if (res.ok) {
          const data = await res.json();
          setBonusCode(data.bonusCode);
        }
      } catch (err) {
        console.error('Failed to claim bonus code:', err);
      }
    }
  };

  // Рисование (стирание слоя грязи)
  const eraseAt = (clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * canvas.width;
    const y = ((clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isDrawing.current = true;
    eraseAt(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDrawing.current) return;
    eraseAt(e.clientX, e.clientY);
  };

  const handleMouseUp = () => {
    if (isDrawing.current) {
      isDrawing.current = false;
      calculateCleanPercent();
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    isDrawing.current = true;
    if (e.touches[0]) {
      eraseAt(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDrawing.current) return;
    if (e.touches[0]) {
      eraseAt(e.touches[0].clientX, e.touches[0].clientY);
    }
  };

  const handleTouchEnd = () => {
    isDrawing.current = false;
    calculateCleanPercent();
  };

  const handleCopyCode = () => {
    if (bonusCode) {
      navigator.clipboard.writeText(bonusCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm transition-colors">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-sky-500" />
            <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
              Мини-игра: «Отмой автомобиль до блеска»
            </h3>
          </div>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            {gameSettings.mode === 'bonus'
              ? 'Сотрите грязь со стекла пальцем и получите секретный промокод на следующий визит!'
              : 'Проведите пальцем или курсором, чтобы отмыть слой дорожной грязи'}
          </p>
        </div>

        {/* Шкала чистоты */}
        <div className="flex items-center gap-3">
          <div className="w-32 bg-zinc-100 dark:bg-zinc-800 h-3 rounded-full overflow-hidden p-0.5 border border-zinc-200 dark:border-zinc-700">
            <div
              className="h-full bg-gradient-to-r from-sky-500 to-emerald-400 rounded-full transition-all duration-300"
              style={{ width: `${cleanedPercent}%` }}
            />
          </div>
          <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300 min-w-[38px]">
            {cleanedPercent}%
          </span>
        </div>
      </div>

      {/* Интерактивная зона с Canvas поверх чистого авто */}
      <div className="relative w-full aspect-[2/1] max-h-[300px] rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 shadow-inner select-none touch-none">
        
        {/* Нижний слой: Идеально чистое зеркальное авто с блеском */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-sky-950 to-zinc-900 flex items-center justify-center">
          <div className="text-center p-4">
            <div className="w-16 h-16 rounded-2xl bg-sky-500/20 text-sky-400 border border-sky-400/30 flex items-center justify-center mx-auto mb-2 animate-bounce">
              <Sparkles className="w-8 h-8" />
            </div>
            <h4 className="font-extrabold text-base sm:text-lg text-white">
              Идеальный зеркальный глянец!
            </h4>
            <p className="text-xs text-sky-200/80">
              Глубокая очистка Koch Chemie и гидрофобный щит
            </p>
          </div>
        </div>

        {/* Верхний слой: Холст с грязью для стирания */}
        <canvas
          ref={canvasRef}
          width={600}
          height={300}
          className="absolute inset-0 w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </div>

      {/* Блок победы и промокода */}
      {isWon && (
        <div className="mt-4 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h5 className="font-extrabold text-sm text-zinc-900 dark:text-white flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  <span>Поздравляем! Автомобиль сияет чистотой</span>
                </h5>
                <p className="text-xs text-zinc-600 dark:text-zinc-300 mt-0.5">
                  {gameSettings.mode === 'bonus' ? gameSettings.bonusText : 'Отличный результат детейлинга!'}
                </p>
              </div>
            </div>

            {/* Промокод */}
            {gameSettings.mode === 'bonus' && bonusCode && (
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <div className="px-3 py-1.5 rounded-xl bg-white dark:bg-zinc-950 border border-emerald-500/40 text-emerald-600 dark:text-emerald-400 font-mono font-extrabold text-sm tracking-wider">
                  {bonusCode}
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
                >
                  {isCopied ? 'Скопировано!' : 'Копировать'}
                </button>
              </div>
            )}
          </div>

          {gameSettings.mode === 'bonus' && (
            <p className="text-[11px] text-zinc-400 mt-2">
              * Промокод действует {gameSettings.bonusValidityDays} дней при сумме заказа от {gameSettings.bonusMinOrderRub} ₽. Назовите его мастеру или укажите в комментарии.
            </p>
          )}
        </div>
      )}

      {/* Кнопка сброса */}
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={initCanvas}
          className="text-xs text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 flex items-center gap-1.5 py-1 px-2.5 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Загрязнить снова</span>
        </button>
      </div>
    </div>
  );
}
