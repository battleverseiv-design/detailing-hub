import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assertSameOrigin, requireRole } from '@/lib/auth';
import { actorFromUser, logOrderEvent } from '@/lib/audit';

/** Назначить/снять мастера. Только админ. Body: { masterId: string | null } */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const masterId = body?.masterId ?? null;
  if (masterId !== null && typeof masterId !== 'string') {
    return NextResponse.json({ error: 'Некорректный masterId' }, { status: 400 });
  }

  // Назначить можно только существующего АКТИВНОГО мастера
  const master = masterId
    ? await prisma.staffUser.findFirst({ where: { id: masterId, role: 'master', isActive: true } })
    : null;
  if (masterId && !master) {
    return NextResponse.json({ error: 'Мастер не найден или отключён' }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const before = await tx.order.findUnique({ where: { id }, select: { status: true } });
      if (!before) throw new Error('NOT_FOUND');
      if (before.status === 'completed' || before.status === 'cancelled') throw new Error('LOCKED');

      await tx.order.update({
        where: { id },
        data: { assignedMasterId: master?.id ?? null, assignedMasterName: master?.name ?? null },
      });
      await logOrderEvent(tx, {
        orderId: id,
        actor: actorFromUser(user),
        action: master ? 'order.assigned' : 'order.unassigned',
        message: master
          ? `Администратор ${user.name} назначил мастера ${master.name}`
          : `Администратор ${user.name} снял мастера с заказа`,
        meta: { masterId: master?.id ?? null },
      });
    });
  } catch (err) {
    const code = err instanceof Error ? err.message : '';
    if (code === 'NOT_FOUND') return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    if (code === 'LOCKED') return NextResponse.json({ error: 'Заказ закрыт для изменений' }, { status: 409 });
    console.error('assign error:', err);
    return NextResponse.json({ error: 'Не удалось назначить мастера' }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
