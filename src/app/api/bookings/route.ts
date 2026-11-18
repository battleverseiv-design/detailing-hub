import { NextRequest, NextResponse } from 'next/server';
import { createBookingWithTransaction } from '@/lib/booking-engine';
import { prisma } from '@/lib/db';
import { assertSameOrigin, requireRole } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, slug, serviceId, clientName, clientPhone, clientEmail, startAt, notes, workbayId, carClass, orderId } = body;

    const targetUserId = userId || slug || 'demo';

    if (!serviceId) {
      return NextResponse.json({ error: 'Выберите услугу для записи' }, { status: 400 });
    }

    if (!clientName || !clientName.trim()) {
      return NextResponse.json({ error: 'Укажите ваше имя' }, { status: 400 });
    }

    if (!clientPhone || !clientPhone.trim() || clientPhone.trim().length < 10) {
      return NextResponse.json({ error: 'Укажите корректный номер телефона' }, { status: 400 });
    }

    if (!startAt) {
      return NextResponse.json({ error: 'Выберите дату и время записи' }, { status: 400 });
    }

    const booking = await createBookingWithTransaction({
      userIdOrSlug: targetUserId,
      serviceId,
      clientName,
      clientPhone,
      clientEmail,
      startAt,
      notes,
      workbayId,
      carClass,
      orderId,
    });

    return NextResponse.json({
      success: true,
      booking: {
        id: booking.id,
        status: booking.status,
        serviceTitle: booking.service.title,
        price: booking.service.price,
        durationMinutes: booking.service.durationMinutes,
        startAt: booking.startAt.toISOString(),
        endAt: booking.endAt.toISOString(),
        activeWorkEndAt: booking.activeWorkEndAt?.toISOString(),
        cureEndAt: booking.cureEndAt?.toISOString(),
        isMultiDay: booking.isMultiDay,
        workbayId: booking.workbayId,
        workbayName: booking.workbay?.name,
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        masterName: booking.user.name,
      },
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);

    if (
      ['SLOT_ALREADY_BOOKED', 'BAY_ALREADY_OCCUPIED', 'NO_FREE_BAY', 'SCHEDULE_UNAVAILABLE'].includes(
        error.message
      )
    ) {
      return NextResponse.json(
        { error: 'Выбранное время уже занято другим клиентом. Пожалуйста, выберите другой свободный слот.' },
        { status: 409 }
      );
    }

    if (error.message === 'BAY_NOT_FOUND' || error.message === 'INVALID_DATE') {
      return NextResponse.json({ error: 'Некорректные параметры записи' }, { status: 400 });
    }

    if (error.message === 'SERVICE_NOT_FOUND') {
      return NextResponse.json({ error: 'Услуга не найдена' }, { status: 404 });
    }

    if (error.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
    }

    // Внутренние детали ошибки клиенту не отдаём
    return NextResponse.json({ error: 'Не удалось создать запись' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireRole('admin', 'master');
  if (!auth.ok) return auth.response;
  const { user } = auth;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('slug') || 'demo';
    const status = searchParams.get('status');

    const studioUser = await prisma.user.findFirst({
      where: { OR: [{ id: userId }, { slug: userId }] },
    });

    if (!studioUser) {
      return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
    }

    const [bookings, workbays] = await Promise.all([
      prisma.booking.findMany({
        where: {
          userId: studioUser.id,
          ...(status ? { status } : {}),
        },
        include: {
          service: true,
          workbay: true,
        },
        orderBy: { startAt: 'asc' },
      }),
      prisma.workbay.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        select: { id: true, name: true, type: true, isActive: true, order: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      workbays,
      bookings: bookings.map((b) => ({
        id: b.id,
        serviceId: b.serviceId,
        serviceTitle: b.service.title,
        ...(user.role === 'admin' ? { price: b.service.price } : {}),
        workbayId: b.workbayId,
        workbayName: b.workbay?.name ?? null,
        clientName: b.clientName,
        clientPhone: b.clientPhone,
        ...(user.role === 'admin' ? { clientEmail: b.clientEmail } : {}),
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        status: b.status,
        notes: b.notes,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error('Error listing bookings:', error);
    return NextResponse.json({ error: 'Ошибка загрузки записей' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { id, status } = body;

    if (!id || !['pending', 'confirmed', 'cancelled'].includes(status)) {
      return NextResponse.json({ error: 'Некорректный ID или статус' }, { status: 400 });
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status },
      include: { service: true },
    });

    return NextResponse.json({ success: true, booking: updated });
  } catch (error) {
    console.error('Error updating booking status:', error);
    return NextResponse.json({ error: 'Ошибка обновления записи' }, { status: 500 });
  }
}
