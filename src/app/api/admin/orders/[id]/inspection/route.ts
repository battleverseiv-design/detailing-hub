import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assertSameOrigin, requireRole } from '@/lib/auth';
import { actorFromUser, logOrderEvent } from '@/lib/audit';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_PER_REQUEST = 12;
const MAX_TOTAL = 40;

/**
 * Добавить фото осмотра «ДО»/«ПОСЛЕ». Мастер — только на своём заказе; админ — на любом.
 * Файлы уже загружены через /api/upload; здесь только привязка по id.
 * Body: { kind: 'before' | 'after', photos: [{ id, zone? }] }
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const auth = await requireRole('admin', 'master');
  if (!auth.ok) return auth.response;
  const { user } = auth;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const kind = body?.kind === 'before' ? 'before' : body?.kind === 'after' ? 'after' : null;
  if (!kind || !Array.isArray(body?.photos)) {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }

  const incoming = (body.photos as unknown[])
    .slice(0, MAX_PER_REQUEST)
    .filter((p): p is { id: string; zone?: unknown } => typeof (p as { id?: unknown })?.id === 'string' && UUID_RE.test((p as { id: string }).id))
    .map((p) => ({
      id: p.id,
      filename: `${p.id}.webp`,
      url: `/api/photos/${p.id}`,
      zone: typeof p.zone === 'string' ? p.zone.slice(0, 40) : undefined,
      uploadedBy: user.name, // из сессии
      createdAt: new Date().toISOString(),
    }));
  if (incoming.length === 0) {
    return NextResponse.json({ error: 'Нет корректных фото' }, { status: 400 });
  }

  const field = kind === 'before' ? 'inspectionPhotosBeforeJson' : 'inspectionPhotosAfterJson';

  // Оптимистичная блокировка: JSON-массив перезаписывается целиком, поэтому два параллельных
  // добавления могли бы затереть друг друга. Пишем только если поле не изменилось с момента чтения.
  for (let attempt = 0; attempt < 3; attempt++) {
    const order = await prisma.order.findUnique({
      where: { id },
      select: { status: true, assignedMasterId: true, [field]: true },
    });
    if (!order || (user.role === 'master' && order.assignedMasterId !== user.id)) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const current: unknown[] = JSON.parse((order as Record<string, string>)[field] || '[]');
    if (current.length + incoming.length > MAX_TOTAL) {
      return NextResponse.json({ error: 'Слишком много фото в заказе' }, { status: 400 });
    }

    const ok = await prisma.$transaction(async (tx) => {
      const res = await tx.order.updateMany({
        where: { id, [field]: (order as Record<string, string>)[field] },
        data: { [field]: JSON.stringify([...current, ...incoming]) },
      });
      if (res.count !== 1) return false;
      await logOrderEvent(tx, {
        orderId: id,
        actor: actorFromUser(user),
        action: 'order.inspection_photos',
        message: `${user.role === 'master' ? 'Мастер' : 'Администратор'} ${user.name} загрузил ${incoming.length} фото осмотра ${kind === 'before' ? 'ДО' : 'ПОСЛЕ'}`,
        meta: { kind, count: incoming.length },
      });
      return true;
    });
    if (ok) return NextResponse.json({ success: true, added: incoming.length });
  }
  return NextResponse.json({ error: 'Конфликт записи, повторите' }, { status: 409 });
}
