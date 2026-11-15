import React from 'react';
import Link from 'next/link';
import { verifyAdminSession } from '@/lib/auth';
import { getStudioSettings } from '@/lib/studio-service';
import { AdminNav } from './AdminNav';
import { AdminAuthGuard } from './AdminAuthGuard';
import { ArrowLeft } from 'lucide-react';

export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = await verifyAdminSession();
  const settings = await getStudioSettings().catch(() => ({
    shortName: 'DetailingHub',
    studioName: 'DetailingHub',
  }));

  const shortName = settings.shortName || settings.studioName || 'DetailingHub';
  const initials = shortName.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#08090c] text-zinc-100 selection:bg-sky-500 selection:text-white">
      {/* Мобильная панель навигации (md:hidden) — компактный бар со скроллом */}
      <header className="md:hidden sticky top-0 z-30 bg-zinc-950/95 backdrop-blur-md border-b border-zinc-800/80 px-4 py-2.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center font-black text-white text-[10px]">
              {initials}
            </div>
            <span className="font-semibold text-sm text-white">
              {shortName}
            </span>
            <span className="text-[10px] text-zinc-500 font-medium">Админ</span>
          </div>

          <Link
            href="/"
            className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white px-2 py-1 rounded-lg bg-zinc-900 border border-zinc-800"
          >
            <ArrowLeft className="w-3 h-3 text-zinc-500" />
            <span>На сайт</span>
          </Link>
        </div>

        {isAuth && <AdminNav mobile={true} />}
      </header>

      {/* Боковая панель для десктопа (hidden md:flex) */}
      <aside className="hidden md:flex w-64 md:sticky md:top-0 md:h-screen md:overflow-y-auto bg-zinc-950/90 backdrop-blur-md border-r border-zinc-800/80 p-5 flex-col justify-between shrink-0 z-30">
        <div className="space-y-6">
          {/* Бренд студии */}
          <div className="pb-4 border-b border-zinc-800/70">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-600 to-sky-400 flex items-center justify-center font-black text-white text-xs shadow-md shadow-sky-500/20">
                {initials}
              </div>
              <div>
                <h2 className="font-semibold text-base text-white tracking-wide leading-none">
                  {shortName}
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
        <div className="max-w-6xl mx-auto">
          <AdminAuthGuard isAuth={isAuth}>
            {children}
          </AdminAuthGuard>
        </div>
      </main>
    </div>
  );
}
