import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assertSameOrigin, requireRole } from '@/lib/auth';
import { actorFromUser, logOrderEvent } from '@/lib/audit';
import { MASTER_TRANSITIONS, STATUS_LABELS, OrderStatus } from '@/lib/permissions';

/**
 * Смена статуса МАСТЕРОМ: только «В боксе» <-> «Готов к выдаче» и только на своём заказе.
 * Все остальные переходы (подтверждение, оплата, выполнено, отмена) — у админа через PUT /api/admin/orders/[id].
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const auth = await requireRole('master');
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const to = typeof body?.status === 'string' ? body.status : '';
  const transition = MASTER_TRANSITIONS.find((t) => t.to === to);
  if (!transition) {
    return NextResponse.json({ error: 'Этот статус мастер менять не может' }, { status: 403 });
  }

  const done = await prisma.$transaction(async (tx) => {
    // Условие в WHERE: заказ должен быть именно в нужном исходном статусе И принадлежать этому мастеру
    const res = await tx.order.updateMany({
      where: { id, status: transition.from, assignedMasterId: user.id },
      data: { status: transition.to },
    });
    if (res.count !== 1) return false;
    await logOrderEvent(tx, {
      orderId: id,
      actor: actorFromUser(user),
      action: 'order.status_changed',
      message: `Мастер ${user.name} перевёл статус в «${STATUS_LABELS[transition.to as OrderStatus]}»`,
      meta: { from: transition.from, to: transition.to },
    });
    return true;
  });

  if (!done) {
    return NextResponse.json({ error: 'Заказ не найден, не ваш или уже в другом статусе' }, { status: 409 });
  }
  return NextResponse.json({ success: true, status: transition.to });
}
