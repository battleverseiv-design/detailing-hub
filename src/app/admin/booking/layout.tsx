import React from 'react';
import { requirePageRole } from '@/lib/auth';

export default async function AdminOnlyLayout({ children }: { children: React.ReactNode }) {
  await requirePageRole('admin');
  return <>{children}</>;
}
