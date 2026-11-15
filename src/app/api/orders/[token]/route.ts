import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioSettings } from '@/lib/studio-service';

function getScheduledEntryDate(order: {
  booking?: { startAt: Date } | null;
  agreedEntryDateTime?: string | null;
  desiredDate?: string | null;
  desiredTime?: string | null;
}): Date | null {
  if (order.booking?.startAt) {
    return new Date(order.booking.startAt);
  }
  if (order.agreedEntryDateTime) {
    const parsed = new Date(order.agreedEntryDateTime);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  if (order.desiredDate) {
    const timeStr = order.desiredTime || '09:00';
    const parsed = new Date(`${order.desiredDate}T${timeStr}:00`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: 'Токен заказа обязателен' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { token },
      include: {
        booking: {
          include: {
            workbay: true,
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    const scheduledDate = getScheduledEntryDate(order);
    const now = new Date();

    let canCancel = false;
    let cancelBlockReason: string | null = null;
    let hoursLeft: number | null = null;

    if (order.status === 'in_progress') {
      canCancel = false;
      cancelBlockReason = 'Автомобиль уже находится в работе у мастеров студии. Самостоятельная отмена через сайт заблокирована.';
    } else if (order.status === 'ready' || order.status === 'completed') {
      canCancel = false;
      cancelBlockReason = 'Заказ уже завершён или готов к выдаче.';
    } else if (order.status === 'cancelled') {
      canCancel = false;
      cancelBlockReason = 'Заказ уже отменён.';
    } else if (order.status === 'new' || order.status === 'agreed') {
      if (scheduledDate) {
        const diffMs = scheduledDate.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);
        hoursLeft = Math.round(diffHours * 10) / 10;

        if (diffHours < 3) {
          canCancel = false;
          cancelBlockReason = `До назначенного заезда осталось менее 3 часов (${hoursLeft > 0 ? `${hoursLeft} ч.` : 'время заезда наступило'}). Пост и мастер уже зарезервированы. Для отмены свяжитесь со студией по телефону.`;
        } else {
          canCancel = true;
        }
      } else {
        // Если дата еще не назначена (статус new без точного времени), клиент может отменить свободно
        canCancel = true;
      }
    }

    const settings = await getStudioSettings();

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        token: order.token,
        status: order.status,
        clientName: order.clientName,
        carBrandModel: order.carBrandModel,
        agreedEntryDateTime: order.agreedEntryDateTime,
        desiredDate: order.desiredDate,
        desiredTime: order.desiredTime,
        cancelledAt: order.cancelledAt,
        cancelledBy: order.cancelledBy,
        cancelReason: order.cancelReason,
        booking: order.booking
          ? {
              id: order.booking.id,
              startAt: order.booking.startAt,
              endAt: order.booking.endAt,
              status: order.booking.status,
              workbayName: order.booking.workbay?.name || null,
            }
          : null,
      },
      canCancel,
      cancelBlockReason,
      hoursLeft,
      studioPhone: settings.phone,
      studioTelegram: settings.telegramUrl,
    });
  } catch (error: any) {
    console.error('Error fetching order status by token:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    if (!token) {
      return NextResponse.json({ error: 'Токен заказа обязателен' }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action;

    if (action !== 'cancel') {
      return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { token },
      include: {
        booking: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    // Защита: машина уже в работе или готова
    if (order.status === 'in_progress') {
      return NextResponse.json(
        {
          error: 'Автомобиль уже находится в работе у мастеров студии. Самостоятельная отмена через сайт заблокирована. Пожалуйста, свяжитесь со старшим мастером студии.',
        },
        { status: 403 }
      );
    }

    if (order.status === 'ready' || order.status === 'completed') {
      return NextResponse.json(
        { error: 'Заказ уже выполнен или готов к выдаче. Отмена невозможна.' },
        { status: 403 }
      );
    }

    if (order.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Заказ уже был отменен ранее.' },
        { status: 400 }
      );
    }

    // Защита временного окна (Cancellation Window: 3 часа)
    const scheduledDate = getScheduledEntryDate(order);
    if (scheduledDate) {
      const now = new Date();
      const diffMs = scheduledDate.getTime() - now.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);

      if (diffHours < 3) {
        return NextResponse.json(
          {
            error: 'До заезда осталось менее 3 часов. Мастер и бокс уже подготовлены. Пожалуйста, позвоните администратору студии для согласования отмены.',
          },
          { status: 403 }
        );
      }
    }

    const cancelReason = (body.reason || 'Планы изменились (отменено клиентом на сайте)').trim();

    // Атомарная транзакция: отмена заказа и мгновенное освобождение бокса/слота
    const updatedOrder = await prisma.$transaction(async (tx) => {
      const ord = await tx.order.update({
        where: { token },
        data: {
          status: 'cancelled',
          cancelledAt: new Date(),
          cancelledBy: 'client',
          cancelReason,
        },
      });

      if (order.bookingId) {
        await tx.booking.update({
          where: { id: order.bookingId },
          data: {
            status: 'cancelled',
            notes: `Бронь отменена клиентом: ${cancelReason}`,
          },
        });
      }

      return ord;
    });

    return NextResponse.json({
      success: true,
      message: 'Запись успешно отменена. Бокс в расписании освобождён.',
      status: updatedOrder.status,
      cancelledAt: updatedOrder.cancelledAt,
    });
  } catch (error: any) {
    console.error('Error cancelling order by token:', error);
    return NextResponse.json({ error: error.message || 'Ошибка сервера' }, { status: 500 });
  }
}
