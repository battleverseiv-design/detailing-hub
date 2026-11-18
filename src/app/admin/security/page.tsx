'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, ShieldAlert, Check, AlertCircle } from 'lucide-react';

export default function AdminSecurityPage() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!currentPassword) {
      setError('Введите текущий пароль');
      return;
    }

    if (newPassword.length < 10) {
      setError('Пароль администратора — минимум 10 символов');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Введённые пароли не совпадают');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/admin/security', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка смены пароля');
      }

      const data = await res.json();
      setSuccess(data.message || 'Пароль успешно изменён! Все сессии закрыты.');
      setTimeout(() => {
        router.push('/admin/login');
        router.refresh();
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сервера при смене пароля');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">
          Безопасность и пароль
        </h1>
        <p className="text-xs text-zinc-400">
          Смена мастер-пароля администратора студии с аннулированием всех активных сессий
        </p>
      </div>

      <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-3">
        <ShieldAlert className="w-5 h-5 shrink-0 text-amber-500" />
        <div>
          <span className="font-bold block mb-0.5">Внимание:</span>
          <span>
            После смены пароля все открытые сессии администратора на телефонах и компьютерах будут мгновенно закрыты. Потребуется повторный вход.
          </span>
        </div>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-zinc-950/80 rounded-3xl p-6 border border-zinc-800 shadow-sm space-y-4">
        <div>
          <label className="block text-xs font-bold text-zinc-300 mb-1">
            Текущий пароль
          </label>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Введите текущий пароль"
            className="min-h-[44px] w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-base sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-300 mb-1">
            Новый пароль
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Минимум 10 символов"
            className="min-h-[44px] w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-base sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <div>
          <label className="block text-xs font-bold text-zinc-300 mb-1">
            Повторите новый пароль
          </label>
          <input
            type="password"
            required
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Повторите ввод"
            className="min-h-[44px] w-full px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-base sm:text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-sky-600/20 active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <KeyRound className="w-4 h-4" />
          <span>{loading ? 'Обновление...' : 'Сменить пароль и выйти'}</span>
        </button>
      </form>
    </div>
  );
}
