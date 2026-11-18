'use client';

import React, { useEffect, useState } from 'react';
import {
  Users,
  Plus,
  KeyRound,
  Copy,
  Check,
  AlertCircle,
  Power,
  Shield,
  Wrench,
  X,
} from 'lucide-react';

interface StaffRow {
  id: string;
  login: string;
  name: string;
  phone: string | null;
  role: 'admin' | 'master';
  isActive: boolean;
  createdAt: string;
}

export default function AdminStaffPage() {
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Форма добавления мастера
  const [name, setName] = useState('');
  const [login, setLogin] = useState('');
  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [creating, setCreating] = useState(false);

  // Одноразовое окно показа PIN
  const [revealedPin, setRevealedPin] = useState<{ name: string; login: string; pin: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadStaff = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/staff', { cache: 'no-store' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не удалось загрузить сотрудников');
      setStaff(data.staff || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка загрузки');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setCreating(true);
    try {
      const res = await fetch('/api/admin/staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          login: login.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          pin: pin.trim() || undefined,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не удалось создать мастера');

      if (data.pin) {
        setRevealedPin({
          name: data.staff?.name || name.trim(),
          login: data.staff?.login || login.trim().toLowerCase(),
          pin: data.pin,
        });
        setCopied(false);
      }

      setName('');
      setLogin('');
      setPhone('');
      setPin('');
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка создания');
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (member: StaffRow) => {
    setBusyId(member.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !member.isActive }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не удалось обновить статус');
      await loadStaff();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка обновления');
    } finally {
      setBusyId(null);
    }
  };

  const handleResetPin = async (member: StaffRow) => {
    if (!confirm(`Сбросить PIN для мастера ${member.name}? Все его текущие сессии будут завершены.`)) {
      return;
    }
    setBusyId(member.id);
    setError('');
    try {
      const res = await fetch(`/api/admin/staff/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetPin: true }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Не удалось сбросить PIN');
      if (data.pin) {
        setRevealedPin({ name: member.name, login: member.login, pin: data.pin });
        setCopied(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка сброса PIN');
    } finally {
      setBusyId(null);
    }
  };

  const handleCopyPin = async () => {
    if (!revealedPin) return;
    const text = `Логин: ${revealedPin.login}\nPIN: ${revealedPin.pin}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="space-y-6 pb-16">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
          <Users className="w-6 h-6 text-sky-400" />
          <span>Сотрудники студии</span>
        </h1>
        <p className="text-xs sm:text-sm text-zinc-400 mt-1">
          Управление мастерами, PIN-кодами и доступом к заказам. Финансы и настройки доступны только владельцу.
        </p>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Форма добавления мастера */}
      <form
        onSubmit={handleCreate}
        className="p-5 sm:p-6 rounded-3xl bg-zinc-950/80 border border-zinc-800 space-y-4"
      >
        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
          <Plus className="w-4 h-4 text-sky-400" />
          <span>Добавить мастера</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Имя *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Алексей"
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-base sm:text-sm text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Логин (a-z, 0-9) *</label>
            <input
              type="text"
              required
              autoCapitalize="none"
              value={login}
              onChange={(e) => setLogin(e.target.value.toLowerCase())}
              placeholder="alexey"
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-base sm:text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">Телефон</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+7 999 000-00-00"
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-base sm:text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">PIN (опционально)</label>
            <input
              type="text"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 8))}
              placeholder="Авто (6 цифр)"
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-base sm:text-sm font-mono text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-zinc-400">
            Если поле PIN пустое, сервер сгенерирует случайный 6-значный PIN и покажет его один раз.
          </span>
          <button
            type="submit"
            disabled={creating}
            className="min-h-[44px] px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/20 active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2 shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{creating ? 'Создание...' : 'Создать мастера'}</span>
          </button>
        </div>
      </form>

      {/* Список сотрудников */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-xs text-zinc-500">Загрузка сотрудников...</div>
        ) : staff.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-500 bg-zinc-950/60 rounded-3xl border border-zinc-800">
            Сотрудников пока нет.
          </div>
        ) : (
          staff.map((member) => (
            <div
              key={member.id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                member.isActive
                  ? 'bg-zinc-950/70 border-zinc-800'
                  : 'bg-zinc-950/30 border-zinc-900 opacity-65'
              }`}
            >
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-base font-extrabold text-white">{member.name}</span>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border flex items-center gap-1 ${
                      member.role === 'admin'
                        ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    }`}
                  >
                    {member.role === 'admin' ? (
                      <>
                        <Shield className="w-3 h-3" />
                        <span>Администратор</span>
                      </>
                    ) : (
                      <>
                        <Wrench className="w-3 h-3" />
                        <span>Мастер</span>
                      </>
                    )}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-lg text-[10px] font-bold border ${
                      member.isActive
                        ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    {member.isActive ? 'Активен' : 'Отключён'}
                  </span>
                </div>

                <div className="flex items-center gap-3 text-xs text-zinc-400 font-mono flex-wrap">
                  <span>Логин: {member.login}</span>
                  {member.phone && <span>• {member.phone}</span>}
                </div>
              </div>

              {member.role === 'master' && (
                <div className="flex items-center gap-2.5 shrink-0">
                  <button
                    type="button"
                    disabled={busyId === member.id}
                    onClick={() => handleResetPin(member)}
                    className="min-h-[44px] flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-zinc-200 text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                  >
                    <KeyRound className="w-3.5 h-3.5 text-sky-400" />
                    <span>Сбросить PIN</span>
                  </button>

                  <button
                    type="button"
                    disabled={busyId === member.id}
                    onClick={() => handleToggleActive(member)}
                    className={`min-h-[44px] flex-1 sm:flex-none px-3.5 py-2 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all ${
                      member.isActive
                        ? 'bg-rose-500/10 hover:bg-rose-500/20 border-rose-500/30 text-rose-300'
                        : 'bg-emerald-500/10 hover:bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                    }`}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{member.isActive ? 'Отключить' : 'Включить'}</span>
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Одноразовое модальное окно с PIN */}
      {revealedPin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl p-6 space-y-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-white">Данные для входа мастера</h3>
                <p className="text-xs text-amber-400 mt-1">
                  PIN показывается только один раз! После закрытия посмотреть его снова будет невозможно.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setRevealedPin(null)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5 font-mono">
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Мастер:</span>
                <span className="text-white font-bold font-sans">{revealedPin.name}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-zinc-400">Логин:</span>
                <span className="text-sky-300 font-bold">{revealedPin.login}</span>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
                <span className="text-xs text-zinc-400">PIN-код:</span>
                <span className="text-2xl font-black text-emerald-400 tracking-widest">
                  {revealedPin.pin}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyPin}
                className="min-h-[44px] flex-1 px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Скопировано' : 'Скопировать'}</span>
              </button>
              <button
                type="button"
                onClick={() => setRevealedPin(null)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-semibold text-xs sm:text-sm"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
