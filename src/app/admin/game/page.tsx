'use client';

import React, { useState, useEffect } from 'react';
import { StudioSettings } from '@/types';
import { Save, AlertCircle, Check, Gamepad2, Gift, Sparkles } from 'lucide-react';

export default function AdminGamePage() {
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch('/api/admin/studio')
      .then((r) => r.json())
      .then((data) => {
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/admin/studio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) throw new Error('Ошибка сохранения');

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return <div className="py-12 text-center text-xs text-zinc-400">Загрузка настроек игры...</div>;
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
            2D Мини-игра на экране успеха
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Настройте интерактивный блок «Отмой лобовое стекло пальцем» и правила выдачи промокодов
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md shadow-sky-600/20 active:scale-95 disabled:opacity-60 transition-all flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Сохранение...' : 'Сохранить настройки'}</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>Настройки мини-игры успешно сохранены!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Выбор режима работы */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
          <Gamepad2 className="w-4 h-4 text-sky-500" />
          <span>Режим работы мини-игры</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              id: 'off',
              label: 'Выключена',
              desc: 'Интерактивный блок скрыт на странице заказа',
            },
            {
              id: 'fun',
              label: 'Игра без награды',
              desc: 'Просто развлечение клиента во время ожидания без промокода',
            },
            {
              id: 'bonus',
              label: 'Бонус на следующий визит',
              desc: 'Генерация персонального промокода на подарок или скидку',
            },
          ].map((mode) => {
            const isSelected = settings.game.mode === mode.id;
            return (
              <button
                key={mode.id}
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    game: { ...settings.game, mode: mode.id as any },
                  })
                }
                className={`p-4 rounded-2xl border-2 text-left transition-all ${
                  isSelected
                    ? 'border-sky-500 bg-sky-500/10 dark:bg-sky-500/20'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/50'
                }`}
              >
                <span className="font-extrabold text-sm text-zinc-900 dark:text-white block mb-1">
                  {mode.label}
                </span>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                  {mode.desc}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Параметры бонуса и промокода */}
      {settings.game.mode === 'bonus' && (
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Gift className="w-4 h-4 text-emerald-500" />
            <span>Условия выдачи промокода</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Текст подарка (видит клиент при победе)
            </label>
            <input
              type="text"
              value={settings.game.bonusText}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  game: { ...settings.game, bonusText: e.target.value },
                })
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Префикс промокода
              </label>
              <input
                type="text"
                value={settings.game.bonusPromoPrefix}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    game: { ...settings.game, bonusPromoPrefix: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Срок действия (дней)
              </label>
              <input
                type="number"
                value={settings.game.bonusValidityDays}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    game: { ...settings.game, bonusValidityDays: Number(e.target.value) },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                Минимальный заказ (₽)
              </label>
              <input
                type="number"
                value={settings.game.bonusMinOrderRub}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    game: { ...settings.game, bonusMinOrderRub: Number(e.target.value) },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
