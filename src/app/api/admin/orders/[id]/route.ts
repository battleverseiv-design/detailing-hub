import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deletePhotoFile } from '@/lib/storage';
import { notifyOrderStatusChanged } from '@/lib/telegram';
import { getStudioSettings } from '@/lib/studio-service';
import { actorFromUser, diffOrderEvents, logOrderEvent } from '@/lib/audit';
import {
  ORDER_STATUSES,
  OrderStatus,
  canMasterSeeOrder,
  serializeOrderForAdmin,
  serializeOrderForMaster,
} from '@/lib/permissions';
import { OrderPhoto } from '@/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole('admin', 'master');
  if (!auth.ok) return auth.response;
  const { user } = auth;

  const { id } = await params;
  const order = await prisma.order.findUnique({
    where: { id },
    include: { booking: { include: { workbay: true } } },
  });

  if (!order || (user.role === 'master' && !canMasterSeeOrder(order, user.id))) {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  }

  return NextResponse.json(
    user.role === 'admin'
      ? serializeOrderForAdmin(order)
      : serializeOrderForMaster(order, user.id)
  );
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  const actor = actorFromUser(auth.user);

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });
  }

  const {
    status,
    agreedFinalPrice,
    agreedEntryDateTime,
    privateStudioNote,

    // Цифровой акт
    carVin,
    carLicensePlate,
    mileage,
    fuelLevel,
    damages,
    damagesJson,
    inspectionPhotosBefore,
    inspectionPhotosBeforeJson,
    inspectionPhotosAfter,
    inspectionPhotosAfterJson,
    clientSignatureUrl,
    masterSignatureUrl,
    actCompletedAt,

    // P&L и оплата
    suppliesCostRub,
    masterCommissionPct,
    isPaid,
    paymentMethod,
  } = body;

  if (status !== undefined && !ORDER_STATUSES.includes(status as OrderStatus)) {
    return NextResponse.json({ error: 'Некорректный статус заказа' }, { status: 400 });
  }

  const existingOrder = await prisma.order.findUnique({ where: { id } });
  if (!existingOrder) {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  }

  // Если статус переводится в "agreed", проверяем обязательность согласованной цены и даты
  if (status === 'agreed') {
    if (agreedFinalPrice == null || isNaN(Number(agreedFinalPrice))) {
      return NextResponse.json(
        { error: 'Для перевода в статус «Согласована» необходимо указать согласованную итоговую цену' },
        { status: 400 }
      );
    }
    if (!agreedEntryDateTime || !String(agreedEntryDateTime).trim()) {
      return NextResponse.json(
        { error: 'Для перевода в статус «Согласована» необходимо указать дату и время заезда авто' },
        { status: 400 }
      );
    }
  }

  // Расчёт P&L финансовых показателей: используем ?? вместо ||, чтобы 0 не заменялся дефолтом
  const finalPrice =
    agreedFinalPrice !== undefined
      ? Number(agreedFinalPrice)
      : (existingOrder.agreedFinalPrice ?? existingOrder.preliminaryTotal);
  const supplies =
    suppliesCostRub !== undefined
      ? Number(suppliesCostRub)
      : (existingOrder.suppliesCostRub ?? Math.round(finalPrice * 0.15));
  const commissionPct =
    masterCommissionPct !== undefined
      ? Number(masterCommissionPct)
      : (existingOrder.masterCommissionPct ?? 30);
  const masterPayout = Math.max(0, Math.round(((finalPrice - supplies) * commissionPct) / 100));
  const netProfit = Math.round(finalPrice - supplies - masterPayout);

  const isCancelling = status === 'cancelled' && existingOrder.status !== 'cancelled';
  const cancelReason = body.cancelReason
    ? String(body.cancelReason).trim()
    : isCancelling
    ? 'Отменено администратором студии'
    : undefined;
  const cancelledBy = body.cancelledBy
    ? String(body.cancelledBy)
    : isCancelling
    ? 'admin'
    : undefined;

  const updateData = {
    ...(status ? { status } : {}),
    ...(agreedFinalPrice !== undefined ? { agreedFinalPrice: Number(agreedFinalPrice) } : {}),
    ...(agreedEntryDateTime !== undefined
      ? { agreedEntryDateTime: String(agreedEntryDateTime).trim() }
      : {}),
    ...(privateStudioNote !== undefined ? { privateStudioNote: String(privateStudioNote) } : {}),
    ...(carVin !== undefined ? { carVin: String(carVin).trim() || null } : {}),
    ...(carLicensePlate !== undefined
      ? { carLicensePlate: String(carLicensePlate).trim() || null }
      : {}),
    ...(mileage !== undefined ? { mileage: mileage ? Number(mileage) : null } : {}),
    ...(fuelLevel !== undefined
      ? { fuelLevel: fuelLevel != null ? Number(fuelLevel) : null }
      : {}),
    ...(damages !== undefined
      ? { damagesJson: JSON.stringify(damages) }
      : damagesJson !== undefined
      ? { damagesJson }
      : {}),
    ...(inspectionPhotosBefore !== undefined
      ? { inspectionPhotosBeforeJson: JSON.stringify(inspectionPhotosBefore) }
      : inspectionPhotosBeforeJson !== undefined
      ? { inspectionPhotosBeforeJson }
      : {}),
    ...(inspectionPhotosAfter !== undefined
      ? { inspectionPhotosAfterJson: JSON.stringify(inspectionPhotosAfter) }
      : inspectionPhotosAfterJson !== undefined
      ? { inspectionPhotosAfterJson }
      : {}),
    ...(clientSignatureUrl !== undefined ? { clientSignatureUrl } : {}),
    ...(masterSignatureUrl !== undefined ? { masterSignatureUrl } : {}),
    ...(actCompletedAt !== undefined
      ? { actCompletedAt: actCompletedAt ? new Date(actCompletedAt) : null }
      : {}),
    suppliesCostRub: supplies,
    masterCommissionPct: commissionPct,
    masterPayoutRub: masterPayout,
    netProfitRub: netProfit,
    ...(isPaid !== undefined ? { isPaid: Boolean(isPaid) } : {}),
    ...(paymentMethod !== undefined ? { paymentMethod: String(paymentMethod) } : {}),
    ...(isCancelling ? { cancelledAt: new Date(), cancelledBy, cancelReason } : {}),
    ...(cancelReason && !isCancelling ? { cancelReason } : {}),
  };

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const u = await tx.order.update({ where: { id }, data: updateData });
      for (const ev of diffOrderEvents(existingOrder, u, actor)) {
        await logOrderEvent(tx, { orderId: id, actor, ...ev });
      }
      return u;
    });

    // Синхронизация статуса и слота со связанной бронью бокса (Booking)
    if (existingOrder.bookingId) {
      if (status === 'cancelled' || isCancelling) {
        await prisma.booking
          .update({
            where: { id: existingOrder.bookingId },
            data: {
              status: 'cancelled',
              notes: `Отменено администратором: ${cancelReason || 'Отмена заказа'}`,
            },
          })
          .catch((e) => console.warn('Could not update booking status on cancel:', e));
      } else if (agreedEntryDateTime && String(agreedEntryDateTime).trim()) {
        try {
          const rawStr = String(agreedEntryDateTime).trim();
          let isoDateCandidate = rawStr;
          if (/^\d{2}\.\d{2}\.\d{4}/.test(rawStr)) {
            const [datePart, timePart] = rawStr.split(' ');
            const [d, m, y] = datePart.split('.');
            isoDateCandidate = `${y}-${m}-${d}T${timePart || '10:00'}:00`;
          } else if (rawStr.includes(' ') && !rawStr.includes('T')) {
            isoDateCandidate =
              rawStr.replace(' ', 'T') + (rawStr.split(' ')[1]?.length === 5 ? ':00' : '');
          }
          const startDt = new Date(isoDateCandidate);
          if (!isNaN(startDt.getTime())) {
            const currentBooking = await prisma.booking.findUnique({
              where: { id: existingOrder.bookingId },
              include: { service: true },
            });
            if (currentBooking) {
              const durationMs =
                currentBooking.endAt && currentBooking.startAt
                  ? Math.max(
                      30 * 60 * 1000,
                      currentBooking.endAt.getTime() - currentBooking.startAt.getTime()
                    )
                  : (currentBooking.service?.durationMinutes || 120) * 60 * 1000;
              const endDt = new Date(startDt.getTime() + durationMs);
              const newBookingStatus = ['agreed', 'in_progress', 'ready', 'completed'].includes(
                status || existingOrder.status
              )
                ? 'confirmed'
                : currentBooking.status;

              await prisma.booking.update({
                where: { id: existingOrder.bookingId },
                data: {
                  startAt: startDt,
                  endAt: endDt,
                  status: newBookingStatus,
                },
              });
            }
          }
        } catch (e) {
          console.warn('Could not sync booking start/end time:', e);
        }
      }
    }

    // Уведомление о смене статуса в Telegram (non-blocking)
    if (status && status !== existingOrder.status) {
      const host = req.headers.get('host') || 'localhost:3000';
      const proto = req.headers.get('x-forwarded-proto') || 'http';
      const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`).replace(/\/$/, '');
      const settings = await getStudioSettings().catch(() => null);
      notifyOrderStatusChanged(
        {
          token: updated.token,
          clientName: updated.clientName,
          carBrandModel: updated.carBrandModel,
          status: updated.status,
          agreedEntryDateTime: updated.agreedEntryDateTime,
          agreedFinalPrice: updated.agreedFinalPrice,
        },
        baseUrl,
        settings?.telegramBotToken && settings?.telegramChatId
          ? {
              botToken: settings.telegramBotToken,
              chatId: settings.telegramChatId,
              apiUrl: settings.telegramApiUrl,
            }
          : undefined
      ).catch((e) => console.warn('Telegram status notification note:', e));
    }

    return NextResponse.json({
      success: true,
      order: serializeOrderForAdmin(updated),
    });
  } catch (err) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: 'Ошибка обновления заказа' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  const actor = actorFromUser(auth.user);

  const { id } = await params;

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    // Удаляем связанные фото с диска (заявка, Фото До и Фото После)
    const photos: OrderPhoto[] = JSON.parse(order.photosJson || '[]');
    for (const photo of photos) {
      if (photo?.id) {
        await deletePhotoFile(photo.id);
      }
    }

    const beforePhotos: Array<{ id?: string; url?: string }> = JSON.parse(
      order.inspectionPhotosBeforeJson || '[]'
    );
    for (const photo of beforePhotos) {
      const rawUrl = photo?.url || '';
      const pid =
        photo?.id ||
        (rawUrl ? rawUrl.replace('/api/photos/', '').split('?')[0].replace('.webp', '') : null);
      if (pid) {
        await deletePhotoFile(pid);
      }
    }

    const afterPhotos: Array<{ id?: string; url?: string }> = JSON.parse(
      order.inspectionPhotosAfterJson || '[]'
    );
    for (const photo of afterPhotos) {
      const rawUrl = photo?.url || '';
      const pid =
        photo?.id ||
        (rawUrl ? rawUrl.replace('/api/photos/', '').split('?')[0].replace('.webp', '') : null);
      if (pid) {
        await deletePhotoFile(pid);
      }
    }

    const associatedBookingId = order.bookingId;
    await prisma.$transaction(async (tx) => {
      await logOrderEvent(tx, {
        orderId: id,
        actor,
        action: 'order.deleted',
        message: `Администратор ${auth.user.name} удалил заказ #${id.slice(-6).toUpperCase()} (${order.carBrandModel})`,
        meta: { clientName: order.clientName, carBrandModel: order.carBrandModel },
      });
      await tx.order.delete({ where: { id } });
      if (associatedBookingId) {
        await tx.booking.delete({ where: { id: associatedBookingId } }).catch(() => {});
      }
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error deleting order:', err);
    return NextResponse.json({ error: 'Ошибка удаления заказа' }, { status: 500 });
  }
}
