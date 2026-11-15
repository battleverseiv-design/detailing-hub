'use client';

import React, { useState } from 'react';
import { openTelegramOrExternalLink } from '@/lib/telegram';
import { 
  Copy, 
  Check, 
  Send, 
  Phone, 
  Printer, 
  XCircle, 
  AlertTriangle, 
  Loader2, 
  FileText,
  Clock,
  ShieldAlert
} from 'lucide-react';

interface ClientTrackingActionsProps {
  token: string;
  status: string;
  scheduledDateIso?: string | null;
  workbayName?: string | null;
  telegramUrl?: string;
  phone?: string;
}

const CANCEL_REASONS = [
  'Изменились личные планы / график',
  'Продал или сменил автомобиль',
  'Не успеваю приехать, перезапишусь позже',
  'Выбрал другой комплекс услуг',
  'Другая причина',
];

export function ClientTrackingActions({
  token,
  status,
  scheduledDateIso,
  workbayName,
  telegramUrl,
  phone,
}: ClientTrackingActionsProps) {
  const [copied, setCopied] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(CANCEL_REASONS[0]);
  const [customReason, setCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Вычисление оставшегося времени до заезда
  const scheduledDate = scheduledDateIso ? new Date(scheduledDateIso) : null;
  const now = new Date();
  const diffHours = scheduledDate ? (scheduledDate.getTime() - now.getTime()) / (1000 * 60 * 60) : null;
  const isWithinThreeHours = diffHours !== null && diffHours < 3;
  const isInWork = status === 'in_progress' || status === 'ready' || status === 'completed';
  const isCancelled = status === 'cancelled';

  const handleCopyLink = async () => {
    const url = window.location.href;
    let ok = false;

    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      try {
        await navigator.clipboard.writeText(url);
        ok = true;
      } catch (err) {
        ok = false;
      }
    }

    if (!ok && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = url;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        ok = document.execCommand('copy');
        document.body.removeChild(textArea);
      } catch (err) {
        console.warn('Fallback copy failed:', err);
      }
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const handleConfirmCancel = async () => {
    try {
      setCancelling(true);
      setErrorMsg(null);

      const finalReason = selectedReason === 'Другая причина' && customReason.trim()
        ? customReason.trim()
        : selectedReason;

      const res = await fetch(`/api/orders/${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel',
          reason: finalReason,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Ошибка при отмене записи');
      }

      // Успешно отменено - перезагружаем страницу для обновления статуса
      window.location.reload();
    } catch (e: any) {
      setErrorMsg(e.message || 'Не удалось отменить запись');
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        {/* Кнопка "Печать / Заказ-наряд PDF" */}
        <button
          type="button"
          onClick={handlePrint}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white border border-white/[0.12] text-xs font-semibold transition-all active:scale-95 shadow-sm"
          title="Распечатать или сохранить официальный заказ-наряд в PDF"
        >
          <Printer className="w-3.5 h-3.5 text-zinc-300" />
          <span>Заказ-наряд (PDF)</span>
        </button>

        {/* Telegram */}
        {telegramUrl && (
          <button
            type="button"
            onClick={() => openTelegramOrExternalLink(telegramUrl)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/25 text-xs font-bold transition-all active:scale-95 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Telegram</span>
          </button>
        )}

        {/* Звонок в студию */}
        {phone && (
          <a
            href={`tel:${phone}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/25 text-xs font-bold transition-all active:scale-95"
          >
            <Phone className="w-3.5 h-3.5" />
            <span>Позвонить</span>
          </a>
        )}

        {/* Скопировать ссылку */}
        <button
          type="button"
          onClick={handleCopyLink}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 border border-zinc-800 text-xs font-semibold transition-all active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span>Скопировано!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-400" />
              <span>Ссылка</span>
            </>
          )}
        </button>

        {/* Кнопка отмены записи (если ещё не отменено) */}
        {!isCancelled && (
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 border ${
              isInWork
                ? 'bg-zinc-900/50 text-zinc-500 border-zinc-800 cursor-not-allowed'
                : isWithinThreeHours
                ? 'bg-amber-500/10 text-amber-300 border-amber-500/20 hover:bg-amber-500/15'
                : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/25'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            <span>Отменить запись</span>
          </button>
        )}
      </div>

      {/* МОДАЛЬНОЕ ОКНО ОТМЕНЫ ЗАКАЗА */}
      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 text-zinc-100">
            
            {/* СЦЕНАРИЙ 1: АВТОМОБИЛЬ УЖЕ В РАБОТЕ В БОКСЕ */}
            {isInWork ? (
              <>
                <div className="flex items-center gap-3 text-amber-400">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <ShieldAlert className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Автомобиль уже в работе</h3>
                    <p className="text-xs text-zinc-400">Самостоятельная отмена через сайт недоступна</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed space-y-2">
                  <p>
                    Мастера студии уже приступили к выполнению комплекса услуг в боксе. Списана химия и зафиксирован технологический цикл.
                  </p>
                  <p className="text-zinc-400">
                    Если у вас возник срочный вопрос или необходимость приостановить работы — пожалуйста, свяжитесь со старшим мастером напрямую:
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Позвонить мастеру</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-colors"
                  >
                    Понятно, закрыть
                  </button>
                </div>
              </>
            ) : isWithinThreeHours ? (
              /* СЦЕНАРИЙ 2: ДО ЗАЕЗДА ОСТАЛОСЬ МЕНЕЕ 3 ЧАСОВ */
              <>
                <div className="flex items-center gap-3 text-amber-400">
                  <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                    <Clock className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">До визита менее 3 часов</h3>
                    <p className="text-xs text-zinc-400">Мастер и бокс уже подготовлены</p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-900/80 border border-zinc-800/80 text-xs text-zinc-300 leading-relaxed space-y-2">
                  <p>
                    По правилам бронирования студии, отмена менее чем за 3 часа осуществляется только через администратора, так как бокс {workbayName ? `(«${workbayName}»)` : ''} уже закреплен за вашим авто.
                  </p>
                  <p className="text-zinc-400">
                    Пожалуйста, позвоните нам, чтобы мы могли оперативно предложить слот другому клиенту или перенести ваш визит на удобное время:
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
                  {phone && (
                    <a
                      href={`tel:${phone}`}
                      className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/40"
                    >
                      <Phone className="w-4 h-4" />
                      <span>Позвонить в студию</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowCancelModal(false)}
                    className="py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs transition-colors"
                  >
                    Закрыть
                  </button>
                </div>
              </>
            ) : (
              /* СЦЕНАРИЙ 3: ШТАТНАЯ ОТМЕНА ЗАРАНЕЕ */
              <>
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                    <AlertTriangle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Отмена бронирования</h3>
                    <p className="text-xs text-zinc-400">Бокс студии будет освобождён в расписании</p>
                  </div>
                </div>

                {errorMsg && (
                  <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800 text-xs text-rose-300">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-zinc-300 block">
                    Укажите причину отмены:
                  </label>
                  <div className="space-y-1.5">
                    {CANCEL_REASONS.map((r) => (
                      <label
                        key={r}
                        className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs cursor-pointer transition-all ${
                          selectedReason === r
                            ? 'bg-white/[0.08] border-white/30 text-white font-semibold'
                            : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-400 hover:bg-zinc-900'
                        }`}
                      >
                        <input
                          type="radio"
                          name="cancelReason"
                          value={r}
                          checked={selectedReason === r}
                          onChange={(e) => setSelectedReason(e.target.value)}
                          className="accent-white"
                        />
                        <span>{r}</span>
                      </label>
                    ))}
                  </div>

                  {selectedReason === 'Другая причина' && (
                    <textarea
                      value={customReason}
                      onChange={(e) => setCustomReason(e.target.value)}
                      placeholder="Опишите причину кратко..."
                      rows={2}
                      className="w-full mt-2 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white focus:outline-none focus:border-zinc-500"
                    />
                  )}
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-zinc-800">
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={() => setShowCancelModal(false)}
                    className="py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold transition-colors"
                  >
                    Назад
                  </button>
                  <button
                    type="button"
                    disabled={cancelling}
                    onClick={handleConfirmCancel}
                    className="py-2.5 px-5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-rose-950/40 disabled:opacity-50"
                  >
                    {cancelling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Отменяем...</span>
                      </>
                    ) : (
                      <span>Да, отменить запись</span>
                    )}
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </>
  );
}
