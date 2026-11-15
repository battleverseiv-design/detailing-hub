'use client';

import React from 'react';
import Link from 'next/link';
import { useTheme } from './ThemeContext';
import { ShoppingBag, Sun, Moon, Phone, Send, MessageSquare } from 'lucide-react';
import { StudioSettings } from '@/types';

interface HeaderProps {
  settings: StudioSettings;
  cartCount?: number;
  cartTotalFormatted?: string;
  onOpenCart?: () => void;
}

export function Header({ settings, cartCount = 0, cartTotalFormatted = '0 ₽', onOpenCart }: HeaderProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-white/80 dark:bg-zinc-950/80 border-b border-zinc-200 dark:border-zinc-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Логотип и название студии */}
        <Link href="/" className="flex flex-col group py-0.5">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg sm:text-xl tracking-wide text-zinc-900 dark:text-white leading-none">
              {settings.shortName || settings.studioName || 'DetailingHub'}
            </span>
          </div>
          <p className="text-[11px] text-zinc-500 hidden sm:block mt-1">
            {settings.city} • {settings.workHours}
          </p>
        </Link>

        {/* Контакты в шапке */}
        <div className="hidden md:flex items-center gap-3 text-sm">
          <a
            href={`tel:${settings.phoneRaw}`}
            className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-sky-600 dark:hover:text-sky-400 font-medium transition-colors"
          >
            <Phone className="w-4 h-4 text-sky-500" />
            <span>{settings.phone}</span>
          </a>

          <div className="h-4 w-px bg-zinc-200 dark:border-zinc-800" />

          <a
            href={settings.telegramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-sky-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
            title="Telegram"
          >
            <Send className="w-4 h-4" />
          </a>

          <a
            href={settings.whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-emerald-500 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-all"
            title="WhatsApp"
          >
            <MessageSquare className="w-4 h-4" />
          </a>
        </div>

        {/* Правая панель: Тема, Админка, Корзина */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Переключатель темы */}
          <button
            type="button"
            onClick={toggleTheme}
            className="p-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 transition-all"
            title={theme === 'dark' ? 'Включить светлую тему' : 'Включить тёмную тему'}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-sky-600" />}
          </button>

          {/* Ссылка в админку */}
          <Link
            href="/admin"
            className="hidden sm:inline-flex items-center text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium px-2.5 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-all"
          >
            Кабинет владельца
          </Link>

          {/* Кнопка Корзины */}
          {onOpenCart && (
            <button
              type="button"
              onClick={onOpenCart}
              className="relative flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md shadow-sky-600/20 active:scale-95 transition-all"
            >
              <ShoppingBag className="w-4 h-4" />
              <span className="hidden sm:inline">{cartTotalFormatted}</span>
              {cartCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-white text-sky-600 text-[10px] font-black">
                  {cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
