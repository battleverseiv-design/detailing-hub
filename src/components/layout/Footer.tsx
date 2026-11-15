'use client';

import React from 'react';
import Link from 'next/link';
import { StudioSettings } from '@/types';
import { ShieldCheck, MapPin, Phone, Clock, Send, MessageSquare } from 'lucide-react';

interface FooterProps {
  settings: StudioSettings;
}

export function Footer({ settings }: FooterProps) {
  return (
    <footer className="mt-20 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950/60 text-zinc-600 dark:text-zinc-400">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          
          {/* Колонка 1: О студии */}
          <div>
            <h3 className="font-extrabold text-zinc-900 dark:text-white text-base mb-2">
              {settings.studioName}
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-4 leading-relaxed">
              {settings.tagline}
            </p>
            <div className="flex items-center gap-2 text-xs text-sky-600 dark:text-sky-400 font-medium">
              <ShieldCheck className="w-4 h-4" />
              <span>Немецкая сертифицированная химия Koch Chemie & Detail</span>
            </div>
          </div>

          {/* Колонка 2: Контакты и локация */}
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-white text-sm mb-3">
              Локация и контакты
            </h4>
            <ul className="space-y-2 text-xs sm:text-sm">
              <li className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-sky-500 shrink-0" />
                <span>{settings.city}, {settings.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-sky-500 shrink-0" />
                <span>{settings.workHours}</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-sky-500 shrink-0" />
                <a href={`tel:${settings.phoneRaw}`} className="hover:text-sky-500 transition-colors">
                  {settings.phone}
                </a>
              </li>
            </ul>
          </div>

          {/* Колонка 3: Мессенджеры и White-Label */}
          <div>
            <h4 className="font-semibold text-zinc-900 dark:text-white text-sm mb-3">
              Быстрая связь
            </h4>
            <div className="flex items-center gap-3 mb-4">
              <a
                href={settings.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-600 dark:text-sky-400 text-xs font-medium transition-all"
              >
                <Send className="w-4 h-4" />
                <span>Telegram</span>
              </a>
              <a
                href={settings.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium transition-all"
              >
                <MessageSquare className="w-4 h-4" />
                <span>WhatsApp</span>
              </a>
            </div>
            <p className="text-xs text-zinc-400 dark:text-zinc-500">
              Все контакты отмечены как демонстрационные для шаблона. Владелец студии может заменить их в один клик в кабинете владельца.
            </p>
          </div>

        </div>

        <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500">
          <p>© {new Date().getFullYear()} {settings.shortName}. Все права защищены.</p>
          <div className="flex items-center gap-4">
            <Link href="/admin/login" className="hover:text-zinc-800 dark:hover:text-zinc-300 transition-colors">
              Вход для администратора
            </Link>
            <span>•</span>
            <span className="text-zinc-400">Политика обработки персональных данных</span>
          </div>
        </div>

      </div>
    </footer>
  );
}
