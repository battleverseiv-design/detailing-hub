import React from 'react';
import Link from 'next/link';
import { verifyAdminSession } from '@/lib/auth';
import { AdminNav } from './AdminNav';
import { ArrowLeft, Sparkles } from 'lucide-react';

export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = await verifyAdminSession();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#08090c] text-zinc-100 selection:bg-sky-500 selection:text-white">
      {/* Боковая панель (Фиксированный сайдбар Cal.com / Linear style) */}
      <aside className="w-full md:w-64 md:sticky md:top-0 md:h-screen md:overflow-y-auto bg-zinc-950/90 backdrop-blur-md border-r border-zinc-800/80 p-5 flex flex-col justify-between shrink-0 z-30">
        <div className="space-y-6">
          {/* Бренд студии */}
          <div className="pb-4 border-b border-zinc-800/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center font-black text-white text-xs shadow-md shadow-sky-500/20">
                DH
              </div>
              <div>
                <h2 className="font-semibold text-base text-white tracking-wide leading-none">
                  DetailingHub
                </h2>
                <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block mt-1">
                  Кабинет владельца
                </span>
              </div>
            </div>
          </div>

          {/* Меню навигации */}
          {isAuth && <AdminNav />}
        </div>

        {/* Нижняя часть сайдбара */}
        <div className="pt-5 border-t border-zinc-800/80 space-y-3 mt-6 md:mt-0">
          <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[11px] text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Студия онлайн</span>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white hover:bg-zinc-900/60 transition-all px-2.5 py-2 rounded-lg"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-500" />
            <span>Вернуться на сайт</span>
          </Link>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 min-w-0 p-4 sm:p-8 overflow-y-auto bg-gradient-to-b from-zinc-950/40 via-transparent to-transparent">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
