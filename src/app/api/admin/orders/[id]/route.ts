import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deletePhotoFile } from '@/lib/storage';
import { notifyOrderStatusChanged } from '@/lib/telegram';
import { OrderPhoto } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await verifyAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  }

  return NextResponse.json({
    ...order,
    items: JSON.parse(order.itemsJson || '[]'),
    photos: JSON.parse(order.photosJson || '[]'),
    damages: JSON.parse(order.damagesJson || '[]'),
    inspectionPhotosBefore: JSON.parse(order.inspectionPhotosBeforeJson || '[]'),
    inspectionPhotosAfter: JSON.parse(order.inspectionPhotosAfterJson || '[]'),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await verifyAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

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

  // Расчёт P&L финансовых показателей (себестоимость химии, доля мастера, чистая прибыль)
  const finalPrice = agreedFinalPrice !== undefined ? Number(agreedFinalPrice) : (existingOrder.agreedFinalPrice ?? existingOrder.preliminaryTotal);
  const supplies = suppliesCostRub !== undefined ? Number(suppliesCostRub) : (existingOrder.suppliesCostRub || Math.round(finalPrice * 0.15));
  const commissionPct = masterCommissionPct !== undefined ? Number(masterCommissionPct) : (existingOrder.masterCommissionPct || 30);
  const masterPayout = Math.max(0, Math.round(((finalPrice - supplies) * commissionPct) / 100));
  const netProfit = Math.round(finalPrice - supplies - masterPayout);

  const isCancelling = status === 'cancelled' && existingOrder.status !== 'cancelled';
  const cancelReason = body.cancelReason ? String(body.cancelReason).trim() : (isCancelling ? 'Отменено администратором студии' : undefined);
  const cancelledBy = body.cancelledBy ? String(body.cancelledBy) : (isCancelling ? 'admin' : undefined);

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(agreedFinalPrice !== undefined ? { agreedFinalPrice: Number(agreedFinalPrice) } : {}),
        ...(agreedEntryDateTime !== undefined ? { agreedEntryDateTime: String(agreedEntryDateTime).trim() } : {}),
        ...(privateStudioNote !== undefined ? { privateStudioNote: String(privateStudioNote) } : {}),
        ...(carVin !== undefined ? { carVin: String(carVin).trim() || null } : {}),
        ...(carLicensePlate !== undefined ? { carLicensePlate: String(carLicensePlate).trim() || null } : {}),
        ...(mileage !== undefined ? { mileage: mileage ? Number(mileage) : null } : {}),
        ...(fuelLevel !== undefined ? { fuelLevel: fuelLevel != null ? Number(fuelLevel) : null } : {}),
        ...(damages !== undefined ? { damagesJson: JSON.stringify(damages) } : damagesJson !== undefined ? { damagesJson } : {}),
        ...(inspectionPhotosBefore !== undefined ? { inspectionPhotosBeforeJson: JSON.stringify(inspectionPhotosBefore) } : inspectionPhotosBeforeJson !== undefined ? { inspectionPhotosBeforeJson } : {}),
        ...(inspectionPhotosAfter !== undefined ? { inspectionPhotosAfterJson: JSON.stringify(inspectionPhotosAfter) } : inspectionPhotosAfterJson !== undefined ? { inspectionPhotosAfterJson } : {}),
        ...(clientSignatureUrl !== undefined ? { clientSignatureUrl } : {}),
        ...(masterSignatureUrl !== undefined ? { masterSignatureUrl } : {}),
        ...(actCompletedAt !== undefined ? { actCompletedAt: actCompletedAt ? new Date(actCompletedAt) : null } : {}),
        suppliesCostRub: supplies,
        masterCommissionPct: commissionPct,
        masterPayoutRub: masterPayout,
        netProfitRub: netProfit,
        ...(isPaid !== undefined ? { isPaid: Boolean(isPaid) } : {}),
        ...(paymentMethod !== undefined ? { paymentMethod: String(paymentMethod) } : {}),
        ...(isCancelling ? { cancelledAt: new Date(), cancelledBy, cancelReason } : {}),
        ...(cancelReason && !isCancelling ? { cancelReason } : {}),
      },
    });

    // Синхронизация статуса и слота со связанной бронью бокса (Booking)
    if (existingOrder.bookingId) {
      if (status === 'cancelled' || isCancelling) {
        await prisma.booking.update({
          where: { id: existingOrder.bookingId },
          data: {
            status: 'cancelled',
            notes: `Отменено администратором: ${cancelReason || 'Отмена заказа'}`,
          },
        }).catch((e) => console.warn('Could not update booking status on cancel:', e));
      } else if (agreedEntryDateTime && String(agreedEntryDateTime).trim()) {
        try {
          const rawStr = String(agreedEntryDateTime).trim();
          let isoDateCandidate = rawStr;
          if (/^\d{2}\.\d{2}\.\d{4}/.test(rawStr)) {
            const [datePart, timePart] = rawStr.split(' ');
            const [d, m, y] = datePart.split('.');
            isoDateCandidate = `${y}-${m}-${d}T${timePart || '10:00'}:00`;
          } else if (rawStr.includes(' ') && !rawStr.includes('T')) {
            isoDateCandidate = rawStr.replace(' ', 'T') + (rawStr.split(' ')[1]?.length === 5 ? ':00' : '');
          }
          const startDt = new Date(isoDateCandidate);
          if (!isNaN(startDt.getTime())) {
            const currentBooking = await prisma.booking.findUnique({
              where: { id: existingOrder.bookingId },
              include: { service: true },
            });
            if (currentBooking) {
              const durationMs = currentBooking.endAt && currentBooking.startAt
                ? Math.max(30 * 60 * 1000, currentBooking.endAt.getTime() - currentBooking.startAt.getTime())
                : ((currentBooking.service?.durationMinutes || 120) * 60 * 1000);
              const endDt = new Date(startDt.getTime() + durationMs);
              const newBookingStatus = ['agreed', 'in_progress', 'ready', 'completed'].includes(status || existingOrder.status)
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
      notifyOrderStatusChanged({
        token: updated.token,
        clientName: updated.clientName,
        carBrandModel: updated.carBrandModel,
        status: updated.status,
        agreedEntryDateTime: updated.agreedEntryDateTime,
        agreedFinalPrice: updated.agreedFinalPrice,
      }, `${proto}://${host}`).catch((e) => console.warn('Telegram status notification note:', e));
    }

    return NextResponse.json({
      success: true,
      order: {
        ...updated,
        items: JSON.parse(updated.itemsJson || '[]'),
        photos: JSON.parse(updated.photosJson || '[]'),
        damages: JSON.parse(updated.damagesJson || '[]'),
        inspectionPhotosBefore: JSON.parse(updated.inspectionPhotosBeforeJson || '[]'),
        inspectionPhotosAfter: JSON.parse(updated.inspectionPhotosAfterJson || '[]'),
      },
    });
  } catch (err: any) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: 'Ошибка обновления заказа' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await verifyAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

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

    const beforePhotos: any[] = JSON.parse(order.inspectionPhotosBeforeJson || '[]');
    for (const photo of beforePhotos) {
      const rawUrl = photo?.url || '';
      const pid = photo?.id || (rawUrl ? rawUrl.replace('/api/photos/', '').split('?')[0].replace('.webp', '') : null);
      if (pid) {
        await deletePhotoFile(pid);
      }
    }

    const afterPhotos: any[] = JSON.parse(order.inspectionPhotosAfterJson || '[]');
    for (const photo of afterPhotos) {
      const rawUrl = photo?.url || '';
      const pid = photo?.id || (rawUrl ? rawUrl.replace('/api/photos/', '').split('?')[0].replace('.webp', '') : null);
      if (pid) {
        await deletePhotoFile(pid);
      }
    }

    const associatedBookingId = order.bookingId;
    await prisma.order.delete({ where: { id } });
    if (associatedBookingId) {
      await prisma.booking.delete({ where: { id: associatedBookingId } }).catch((e) =>
        console.warn('Could not delete associated booking:', e)
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting order:', err);
    return NextResponse.json({ error: 'Ошибка удаления заказа' }, { status: 500 });
  }
}
