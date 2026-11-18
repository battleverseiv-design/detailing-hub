'use client';

import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';

type LogItem = {
  id: string;
  createdAt: string;
  actorName: string;
  actorRole: string;
  action: string;
  message: string;
};

/**
 * Вкладка «История» в модалке заказа.
 * Все строки рендерятся React как обычный текст (без dangerouslySetInnerHTML).
 */
export function OrderHistory({
  orderId,
  refreshKey = 0,
}: {
  orderId: string;
  refreshKey?: number;
}) {
  const [logs, setLogs] = useState<LogItem[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let alive = true;
    setError('');
    fetch(`/api/admin/orders/${orderId}/history`, { cache: 'no-store' })
      .then(async (r) => {
        const data = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(data.error || 'Не удалось загрузить историю');
        return data;
      })
      .then((d) => {
        if (alive) setLogs(Array.isArray(d.logs) ? d.logs : []);
      })
      .catch((e) => {
        if (alive) setError(e instanceof Error ? e.message : 'Ошибка загрузки истории');
      });
    return () => {
      alive = false;
    };
  }, [orderId, refreshKey]);

  if (error) {
    return (
      <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-400">
        {error}
      </div>
    );
  }

  if (!logs) {
    return <div className="py-8 text-center text-xs text-zinc-500">Загрузка истории…</div>;
  }

  if (logs.length === 0) {
    return (
      <div className="py-8 text-center text-xs text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800/60">
        Событий по этому заказу пока нет
      </div>
    );
  }

  return (
    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
      <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
        <History className="w-3.5 h-3.5 text-sky-400" />
        <span>Хронология действий ({logs.length})</span>
      </div>

      <ol className="space-y-2.5 border-l border-zinc-800 pl-3.5 ml-1.5">
        {logs.map((l) => {
          const dt = new Date(l.createdAt);
          const dateStr = dt.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
          const timeStr = dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
          const dotColor =
            l.actorRole === 'master'
              ? 'bg-purple-400'
              : l.actorRole === 'admin'
              ? 'bg-sky-400'
              : l.actorRole === 'client'
              ? 'bg-emerald-400'
              : 'bg-zinc-500';

          return (
            <li key={l.id} className="relative text-xs sm:text-sm text-zinc-200 leading-snug">
              <span
                className={`w-2 h-2 rounded-full ${dotColor} absolute -left-[18.5px] top-1.5 ring-4 ring-zinc-950`}
              />
              <time className="font-mono text-[11px] text-zinc-500 mr-1.5">
                {dateStr} {timeStr}
              </time>
              <span className="text-zinc-200">— {l.message}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
