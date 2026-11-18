import type { Prisma } from '@prisma/client';
import { prisma } from './db';
import type { SessionUser } from './auth';
import { STATUS_LABELS, OrderStatus } from './permissions';

export type Actor = {
  id: string | null;
  name: string;
  role: 'admin' | 'master' | 'client' | 'system';
};

/** Автор события ВСЕГДА берётся из серверной сессии, никогда из тела запроса. */
export const actorFromUser = (u: SessionUser): Actor => ({ id: u.id, name: u.name, role: u.role });
export const CLIENT_ACTOR: Actor = { id: null, name: 'Клиент', role: 'client' };
export const SYSTEM_ACTOR: Actor = { id: null, name: 'Система', role: 'system' };

type Db = Prisma.TransactionClient | typeof prisma;

/**
 * Единственный способ записать событие. Журнал append-only:
 * в проекте НЕ должно быть ни update, ни delete для OrderAuditLog (ни в API, ни в UI).
 * Передавайте tx из $transaction — событие и действие фиксируются атомарно.
 */
export async function logOrderEvent(
  db: Db,
  p: { orderId: string; actor: Actor; action: string; message: string; meta?: Record<string, unknown> }
) {
  return db.orderAuditLog.create({
    data: {
      orderId: p.orderId,
      actorId: p.actor.id,
      actorName: p.actor.name.slice(0, 80),
      actorRole: p.actor.role,
      action: p.action,
      message: p.message.slice(0, 500),
      metaJson: JSON.stringify(p.meta ?? {}),
    },
  });
}

export const ROLE_LABELS: Record<Actor['role'], string> = {
  admin: 'Администратор',
  master: 'Мастер',
  client: 'Клиент',
  system: 'Система',
};

const PAYMENT_LABELS: Record<string, string> = { cash: 'наличные', card: 'карта', sbp: 'СБП' };
const label = (s: string) => STATUS_LABELS[s as OrderStatus] ?? s;
const fmtRub = (n: number) => `${Math.round(n).toLocaleString('ru-RU')} ₽`;

export interface OrderSnap {
  status: string;
  agreedEntryDateTime: string | null;
  agreedFinalPrice: number | null;
  preliminaryTotal: number;
  isPaid: boolean;
  paymentMethod: string;
}

/** Сравнивает заказ до и после правки админом и возвращает человекочитаемые события. */
export function diffOrderEvents(before: OrderSnap, after: OrderSnap, actor: Actor) {
  const who = `${ROLE_LABELS[actor.role]} ${actor.name}`;
  const events: { action: string; message: string; meta?: Record<string, unknown> }[] = [];

  if (before.status !== after.status) {
    events.push({
      action: 'order.status_changed',
      message:
        before.status === 'new' && after.status === 'agreed' && after.agreedEntryDateTime
          ? `${who} подтвердил запись на ${after.agreedEntryDateTime}`
          : `${who} перевёл статус: «${label(before.status)}» → «${label(after.status)}»`,
      meta: { from: before.status, to: after.status },
    });
  }
  if (after.agreedEntryDateTime && before.agreedEntryDateTime !== after.agreedEntryDateTime && before.status === after.status) {
    events.push({
      action: 'order.rescheduled',
      message: `${who} назначил время заезда: ${after.agreedEntryDateTime}`,
      meta: { from: before.agreedEntryDateTime, to: after.agreedEntryDateTime },
    });
  }
  if (before.agreedFinalPrice !== after.agreedFinalPrice && after.agreedFinalPrice != null) {
    events.push({
      action: 'order.price_changed',
      message: `${who} согласовал итоговую цену: ${fmtRub(after.agreedFinalPrice)}`,
      meta: { from: before.agreedFinalPrice, to: after.agreedFinalPrice },
    });
  }
  if (!before.isPaid && after.isPaid) {
    events.push({
      action: 'order.paid',
      message: `${who} принял оплату: ${fmtRub(after.agreedFinalPrice ?? after.preliminaryTotal)} (${PAYMENT_LABELS[after.paymentMethod] ?? after.paymentMethod})`,
      meta: { method: after.paymentMethod },
    });
  }
  return events;
}
