import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireRole } from '@/lib/auth';
import { canMasterSeeOrder } from '@/lib/permissions';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireRole('admin', 'master');
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const order = await prisma.order.findUnique({
    where: { id },
    select: { status: true, assignedMasterId: true },
  });
  // 404, а не 403: мастер не должен узнавать о существовании чужих заказов
  if (!order || (user.role === 'master' && !canMasterSeeOrder(order, user.id))) {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  }

  const logs = await prisma.orderAuditLog.findMany({
    where: { orderId: id },
    orderBy: { createdAt: 'asc' },
    take: 500,
    select: {
      id: true,
      createdAt: true,
      actorName: true,
      actorRole: true,
      action: true,
      message: true,
      // meta (старые/новые значения, суммы) — только админу
      ...(user.role === 'admin' ? { metaJson: true } : {}),
    },
  });
  return NextResponse.json({ logs });
}
