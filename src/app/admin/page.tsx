import { redirect } from 'next/navigation';
import { verifyAdminSession } from '@/lib/auth';

export default async function AdminRootPage() {
  const isAuth = await verifyAdminSession();
  if (!isAuth) {
    redirect('/admin/login');
  }
  redirect('/admin/orders');
}
