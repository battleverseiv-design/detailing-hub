'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

export function AdminAuthGuard({
  isAuth,
  children,
}: {
  isAuth: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLoginPage = pathname === '/admin/login';

  useEffect(() => {
    if (!isAuth && !isLoginPage) {
      router.replace('/admin/login');
    }
  }, [isAuth, isLoginPage, router]);

  if (!isAuth && !isLoginPage) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center space-y-3 text-zinc-500 text-xs font-mono">
        <span className="w-5 h-5 border-2 border-sky-500 border-t-transparent rounded-full animate-spin" />
        <span>Перенаправление на страницу входа...</span>
      </div>
    );
  }

  return <>{children}</>;
}
