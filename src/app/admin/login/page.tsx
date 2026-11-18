'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ArrowRight, AlertCircle, User } from 'lucide-react';

export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState('admin');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: login.trim(), secret }),
      });

      if (res.status === 429) {
        throw new Error('Слишком много попыток, попробуйте позже');
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Неверный логин или пароль');
      }

      router.replace('/admin/orders');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка авторизации');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-2">
      <div className="w-full max-w-sm bg-zinc-950/90 rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-2xl space-y-6">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-sky-600 text-white flex items-center justify-center mx-auto shadow-md shadow-sky-600/25">
            <Lock className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-extrabold text-white">
            Вход в кабинет
          </h1>
          <p className="text-xs text-zinc-400">
            Введите логин и пароль администратора или PIN-код мастера
          </p>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Логин
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                autoComplete="username"
                autoCapitalize="none"
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="admin или логин мастера"
                className="min-h-[44px] w-full pl-10 pr-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-1">
              Пароль или PIN
            </label>
            <input
              type="password"
              required
              autoFocus
              autoComplete="current-password"
              value={secret}
              onChange={(e) => setSecret(e.target.value)}
              placeholder="••••••••"
              className="min-h-[44px] w-full px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-base sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="min-h-[44px] w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-sm shadow-md shadow-sky-600/25 active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
          >
            <span>{loading ? 'Проверка...' : 'Войти в панель'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
