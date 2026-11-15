'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Inbox, 
  CalendarClock, 
  Tag, 
  Sliders, 
  Shield, 
  LogOut 
} from 'lucide-react';

export function AdminNav() {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { 
      href: '/admin/orders', 
      label: 'Записи и заявки', 
      icon: <Inbox className="w-4 h-4" /> 
    },
    { 
      href: '/admin/booking', 
      label: 'График и слоты', 
      icon: <CalendarClock className="w-4 h-4" /> 
    },
    { 
      href: '/admin/tariffs', 
      label: 'Услуги и цены', 
      icon: <Tag className="w-4 h-4" /> 
    },
    { 
      href: '/admin/studio', 
      label: 'Настройки студии', 
      icon: <Sliders className="w-4 h-4" /> 
    },
    { 
      href: '/admin/security', 
      label: 'Безопасность', 
      icon: <Shield className="w-4 h-4" /> 
    },
  ];

  const handleLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
      router.push('/admin/login');
      router.refresh();
    } catch {}
  };

  return (
    <nav className="space-y-1.5">
      {links.map((link) => {
        const isActive = pathname === link.href || (link.href !== '/admin/orders' && pathname.startsWith(link.href));
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
