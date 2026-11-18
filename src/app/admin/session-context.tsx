'use client';

import React, { createContext, useContext } from 'react';

export type AdminSession = { id: string; login: string; name: string; role: 'admin' | 'master' } | null;

const Ctx = createContext<AdminSession>(null);

export function AdminSessionProvider({
  value,
  children,
}: {
  value: AdminSession;
  children: React.ReactNode;
}) {
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAdminSession = () => useContext(Ctx);
