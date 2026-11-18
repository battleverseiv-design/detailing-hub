import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assertSameOrigin, requireRole } from '@/lib/auth';
import { actorFromUser, logOrderEvent } from '@/lib/audit';
import { serializeOrderForMaster } from '@/lib/permissions';

/** «Взять заказ в работу»: мастер закрепляет заказ за собой. Только роль master. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const auth = await requireRole('master');
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const order = await prisma.$transaction(async (tx) => {
    // ОДИН атомарный UPDATE с условием в WHERE: два мастера, нажавшие одновременно,
    // не могут оба получить count = 1. Проверка «свободен ли заказ» отдельным SELECT-ом
    // перед записью была бы гонкой.
    const claimed = await tx.order.updateMany({
      where: {
        id,
        status: 'agreed',
        OR: [{ assignedMasterId: null }, { assignedMasterId: user.id }], // свободный или назначенный мне админом
      },
      data: {
        assignedMasterId: user.id,
        assignedMasterName: user.name,
        status: 'in_progress',
        workStartedAt: new Date(),
      },
    });
    if (claimed.count !== 1) return null;

    const fresh = await tx.order.findUnique({
      where: { id },
      include: { booking: { include: { workbay: true } } },
    });
    const bay = fresh?.booking?.workbay?.name;
    await logOrderEvent(tx, {
      orderId: id,
      actor: actorFromUser(user),
      action: 'order.claimed',
      message: `Мастер ${user.name} взял заказ в работу${bay ? ` (${bay})` : ''}`,
    });
    return fresh;
  });

  if (!order) {
    return NextResponse.json({ error: 'Заказ уже взят другим мастером или недоступен' }, { status: 409 });
  }
  return NextResponse.json({ success: true, order: serializeOrderForMaster(order, user.id) });
}
