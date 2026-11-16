'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Inbox, 
  CalendarClock, 
  Tag, 
  Sliders, 
  LogOut 
} from 'lucide-react';

interface AdminNavProps {
  mobile?: boolean;
}

export function AdminNav({ mobile = false }: AdminNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { 
      href: '/admin/orders', 
      label: 'Записи', 
      icon: <Inbox className="w-4 h-4" /> 
    },
    { 
      href: '/admin/booking', 
      label: 'График', 
      icon: <CalendarClock className="w-4 h-4" /> 
    },
    { 
      href: '/admin/tariffs', 
      label: 'Услуги', 
      icon: <Tag className="w-4 h-4" /> 
    },
    { 
      href: '/admin/studio', 
      label: 'Настройки', 
      icon: <Sliders className="w-4 h-4" /> 
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch {}
  };

  const isLinkActive = (href: string) => {
    if (href === '/admin/orders') {
      return pathname === '/admin/orders' || pathname.startsWith('/admin/orders/');
    }
    if (href === '/admin/studio') {
      return pathname.startsWith('/admin/studio') || pathname.startsWith('/admin/security');
    }
    return pathname.startsWith(href);
  };

  if (mobile) {
    return (
      <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
        {links.map((link) => {
          const isActive = isLinkActive(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap shrink-0 transition-all ${
                isActive
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 bg-zinc-900/60 border border-zinc-800/80'
              }`}
            >
              <span className={isActive ? 'text-sky-400' : 'text-zinc-500'}>
                {link.icon}
              </span>
              <span>{link.label}</span>
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          type="button"
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-medium text-rose-400 hover:text-rose-300 bg-rose-500/10 border border-rose-500/20 whitespace-nowrap shrink-0 transition-all"
          title="Выйти"
        >
          <LogOut className="w-3.5 h-3.5 text-rose-400" />
          <span>Выйти</span>
        </button>
      </div>
    );
  }

  return (
    <nav className="space-y-1.5">
      {links.map((link) => {
        const isActive = isLinkActive(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
              isActive
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30 shadow-sm shadow-sky-500/10'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent'
            }`}
          >
            <span className={`${isActive ? 'text-sky-400' : 'text-zinc-500 group-hover:text-zinc-300'}`}>
              {link.icon}
            </span>
            <span>{link.label}</span>
          </Link>
        );
      })}

      <div className="pt-2">
        <button
          onClick={handleLogout}
          type="button"
          className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/20 transition-all text-left"
        >
          <LogOut className="w-4 h-4 text-rose-400" />
          <span>Выйти</span>
        </button>
      </div>
    </nav>
  );
}
