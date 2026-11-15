import { NextRequest, NextResponse } from 'next/server';
import { createBookingWithTransaction } from '@/lib/booking-engine';
import { prisma } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, slug, serviceId, clientName, clientPhone, clientEmail, startAt, notes } = body;

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
        clientName: booking.clientName,
        clientPhone: booking.clientPhone,
        masterName: booking.user.name,
      },
    });
  } catch (error: any) {
    console.error('Error creating booking:', error);

    if (error.message === 'SLOT_ALREADY_BOOKED') {
      return NextResponse.json(
        { error: 'Выбранное время уже занято другим клиентом. Пожалуйста, выберите другой свободный слот.' },
        { status: 409 }
      );
    }

    if (error.message === 'SERVICE_NOT_FOUND') {
      return NextResponse.json({ error: 'Услуга не найдена' }, { status: 404 });
    }

    if (error.message === 'USER_NOT_FOUND') {
      return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || 'Не удалось создать запись' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('slug') || 'demo';
    const status = searchParams.get('status');

    const user = await prisma.user.findFirst({
      where: { OR: [{ id: userId }, { slug: userId }] },
    });

    if (!user) {
      return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });
    }

    const bookings = await prisma.booking.findMany({
      where: {
        userId: user.id,
        ...(status ? { status } : {}),
      },
      include: {
        service: true,
      },
      orderBy: { startAt: 'asc' },
    });

    return NextResponse.json({
      success: true,
      bookings: bookings.map((b) => ({
        id: b.id,
        serviceId: b.serviceId,
        serviceTitle: b.service.title,
        price: b.service.price,
        clientName: b.clientName,
        clientPhone: b.clientPhone,
        clientEmail: b.clientEmail,
        startAt: b.startAt.toISOString(),
        endAt: b.endAt.toISOString(),
        status: b.status,
        notes: b.notes,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (error: any) {
    console.error('Error listing bookings:', error);
    return NextResponse.json({ error: error.message || 'Ошибка загрузки записей' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
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
  } catch (error: any) {
    console.error('Error updating booking status:', error);
    return NextResponse.json({ error: error.message || 'Ошибка обновления записи' }, { status: 500 });
  }
}
