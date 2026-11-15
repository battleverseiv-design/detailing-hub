import React from 'react';
import Link from 'next/link';
import { verifyAdminSession } from '@/lib/auth';
import { AdminNav } from './AdminNav';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

export const revalidate = 0;

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isAuth = await verifyAdminSession();

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#090a0d] text-zinc-100 selection:bg-sky-500 selection:text-white">
      {/* Боковая панель (Sidebar Cal.com / Linear style) */}
      <aside className="w-full md:w-64 bg-zinc-950/80 border-r border-zinc-800/80 p-5 flex flex-col justify-between shrink-0">
        <div className="space-y-6">
          {/* Бренд студии */}
          <div className="py-1">
            <h2 className="font-bold text-lg text-white tracking-tight leading-tight">
              Detailing<span className="text-sky-400 font-extrabold">Hub</span>
            </h2>
            <span className="text-[10px] text-zinc-500 uppercase font-semibold tracking-wider block mt-0.5">
              Кабинет владельца
            </span>
          </div>

          {/* Меню навигации */}
          {isAuth && <AdminNav />}
        </div>

        {/* Нижняя часть сайдбара */}
        <div className="pt-5 border-t border-zinc-800/80 space-y-3">
          <div className="flex items-center gap-2 px-1 text-[11px] text-zinc-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Студия онлайн</span>
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-white transition-colors px-1"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Вернуться на сайт</span>
          </Link>
        </div>
      </aside>

      {/* Основной контент */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto bg-gradient-to-b from-zinc-950/40 to-transparent">
        <div className="max-w-6xl mx-auto">{children}</div>
      </main>
    </div>
  );
}
