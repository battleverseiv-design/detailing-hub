import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin, requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

async function getDemoUser(userIdOrSlug?: string) {
  const identifier = userIdOrSlug || 'demo';
  let user = await prisma.user.findFirst({
    where: { OR: [{ id: identifier }, { slug: identifier }] },
    include: {
      services: true,
      availabilities: { orderBy: { dayOfWeek: 'asc' } },
      dateOverrides: { orderBy: { date: 'asc' } },
    },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        id: 'demo-master-id',
        slug: 'demo',
        name: 'DetailingHub (Мастер Иван)',
        email: 'master@detailinghub.ru',
        timezone: 'Europe/Moscow',
      },
      include: {
        services: true,
        availabilities: { orderBy: { dayOfWeek: 'asc' } },
        dateOverrides: { orderBy: { date: 'asc' } },
      },
    });
  }

  return user;
}

export async function GET(req: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || 'demo';

    const user = await getDemoUser(userId);
    const workbays = await prisma.workbay.findMany({ orderBy: { order: 'asc' } });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        slug: user.slug,
        name: user.name,
        timezone: user.timezone,
      },
      services: user.services,
      availability: user.availabilities,
      overrides: user.dateOverrides,
      workbays,
    });
  } catch (error: any) {
    console.error('Error fetching booking settings:', error);
    return NextResponse.json({ error: error.message || 'Ошибка загрузки настроек' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { action, userId, data } = body;
    const user = await getDemoUser(userId);

    if (action === 'save_service') {
      const {
        id,
        title,
        description,
        durationMinutes,
        activeDurationMinutes,
        cureDurationMinutes,
        bufferMinutes,
        price,
        requiredBayType,
        requiredServiceIdsJson,
        classMultipliersJson,
        isActive,
      } = data;

      if (!title || !durationMinutes || price === undefined) {
        return NextResponse.json({ error: 'Заполните название, длительность и цену' }, { status: 400 });
      }

      const activeMin = Number(activeDurationMinutes ?? durationMinutes);
      const cureMin = Number(cureDurationMinutes ?? 0);
      const bufMin = Number(bufferMinutes ?? 15);
      const totalMin = activeMin + cureMin + bufMin;

      if (id) {
        const updated = await prisma.service.update({
          where: { id },
          data: {
            title,
            description: description || null,
            durationMinutes: totalMin,
            activeDurationMinutes: activeMin,
            cureDurationMinutes: cureMin,
            bufferMinutes: bufMin,
            price: Number(price),
            requiredBayType: requiredBayType || 'any',
            requiredServiceIdsJson: typeof requiredServiceIdsJson === 'string' ? requiredServiceIdsJson : JSON.stringify(requiredServiceIdsJson || []),
            classMultipliersJson: typeof classMultipliersJson === 'string' ? classMultipliersJson : JSON.stringify(classMultipliersJson || { S: 1.0, M: 1.25, L: 1.5 }),
            isActive: Boolean(isActive ?? true),
          },
        });
        return NextResponse.json({ success: true, service: updated });
      } else {
        const created = await prisma.service.create({
          data: {
            userId: user.id,
            title,
            description: description || null,
            durationMinutes: totalMin,
            activeDurationMinutes: activeMin,
            cureDurationMinutes: cureMin,
            bufferMinutes: bufMin,
            price: Number(price),
            requiredBayType: requiredBayType || 'any',
            requiredServiceIdsJson: typeof requiredServiceIdsJson === 'string' ? requiredServiceIdsJson : JSON.stringify(requiredServiceIdsJson || []),
            classMultipliersJson: typeof classMultipliersJson === 'string' ? classMultipliersJson : JSON.stringify(classMultipliersJson || { S: 1.0, M: 1.25, L: 1.5 }),
            isActive: Boolean(isActive ?? true),
          },
        });
        return NextResponse.json({ success: true, service: created });
      }
    }

    if (action === 'save_workbay') {
      const { id, name, type, description, isActive, order } = data;
      if (!name) return NextResponse.json({ error: 'Укажите название бокса/поста' }, { status: 400 });

      if (id) {
        const updated = await prisma.workbay.update({
          where: { id },
          data: {
            name,
            type: type || 'universal',
            description: description || null,
            isActive: Boolean(isActive ?? true),
            order: Number(order || 0),
          },
        });
        return NextResponse.json({ success: true, workbay: updated });
      } else {
        const created = await prisma.workbay.create({
          data: {
            name,
            type: type || 'universal',
            description: description || null,
            isActive: Boolean(isActive ?? true),
            order: Number(order || 0),
          },
        });
        return NextResponse.json({ success: true, workbay: created });
      }
    }

    if (action === 'delete_workbay') {
      const { id } = data;
      if (!id) return NextResponse.json({ error: 'Не указан ID бокса' }, { status: 400 });
      await prisma.workbay.delete({ where: { id } });
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === 'delete_service') {
      const { id } = data;
      if (!id) return NextResponse.json({ error: 'Не указан ID услуги' }, { status: 400 });
      await prisma.service.delete({ where: { id } });
      return NextResponse.json({ success: true, deletedId: id });
    }

    if (action === 'update_availability') {
      const { schedule } = data; // Array of { dayOfWeek, startTime, endTime, isWorkingDay }
      if (!Array.isArray(schedule)) {
        return NextResponse.json({ error: 'Некорректный формат графика' }, { status: 400 });
      }

      for (const item of schedule) {
        await prisma.availability.upsert({
          where: {
            userId_dayOfWeek: {
              userId: user.id,
              dayOfWeek: item.dayOfWeek,
            },
          },
          update: {
            startTime: item.startTime,
            endTime: item.endTime,
            isWorkingDay: item.isWorkingDay,
          },
          create: {
            userId: user.id,
            dayOfWeek: item.dayOfWeek,
            startTime: item.startTime,
            endTime: item.endTime,
            isWorkingDay: item.isWorkingDay,
          },
        });
      }

      const updated = await prisma.availability.findMany({
        where: { userId: user.id },
        orderBy: { dayOfWeek: 'asc' },
      });

      return NextResponse.json({ success: true, availability: updated });
    }

    if (action === 'add_override') {
      const { date, isDayOff, customStartTime, customEndTime } = data;
      if (!date) {
        return NextResponse.json({ error: 'Укажите дату исключения' }, { status: 400 });
      }

      const override = await prisma.dateOverride.upsert({
        where: {
          userId_date: {
            userId: user.id,
            date,
          },
        },
        update: {
          isDayOff: Boolean(isDayOff),
          customStartTime: isDayOff ? null : (customStartTime || '09:00'),
          customEndTime: isDayOff ? null : (customEndTime || '18:00'),
        },
        create: {
          userId: user.id,
          date,
          isDayOff: Boolean(isDayOff),
          customStartTime: isDayOff ? null : (customStartTime || '09:00'),
          customEndTime: isDayOff ? null : (customEndTime || '18:00'),
        },
      });

      // Проверка конфликтов на эту дату
      const conflictingOrders = await prisma.order.findMany({
        where: {
          desiredDate: date,
          status: { in: ['new', 'agreed'] },
        },
        select: {
          id: true,
          clientName: true,
          clientPhone: true,
          carBrandModel: true,
          desiredDate: true,
          desiredTime: true,
          agreedEntryDateTime: true,
        },
      });

      return NextResponse.json({ success: true, override, conflicts: conflictingOrders });
    }

    if (action === 'add_override_range') {
      const { startDate, endDate, isDayOff } = data;
      if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Укажите даты начала и окончания диапазона' }, { status: 400 });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (start > end) {
        return NextResponse.json({ error: 'Дата начала не может быть позже даты окончания' }, { status: 400 });
      }

      const current = new Date(start);
      while (current <= end) {
        const dateStr = current.toISOString().slice(0, 10);
        await prisma.dateOverride.upsert({
          where: {
            userId_date: {
              userId: user.id,
              date: dateStr,
            },
          },
          update: {
            isDayOff: Boolean(isDayOff ?? true),
            customStartTime: null,
            customEndTime: null,
          },
          create: {
            userId: user.id,
            date: dateStr,
            isDayOff: Boolean(isDayOff ?? true),
            customStartTime: null,
            customEndTime: null,
          },
        });
        current.setDate(current.getDate() + 1);
      }

      const allOverrides = await prisma.dateOverride.findMany({
        where: { userId: user.id },
        orderBy: { date: 'asc' },
      });

      // Поиск всех заказов, попадающих в этот период
      const conflictingOrders = await prisma.order.findMany({
        where: {
          desiredDate: {
            gte: startDate,
            lte: endDate,
          },
          status: { in: ['new', 'agreed'] },
        },
        select: {
          id: true,
          clientName: true,
          clientPhone: true,
          carBrandModel: true,
          desiredDate: true,
          desiredTime: true,
          agreedEntryDateTime: true,
        },
      });

      return NextResponse.json({ 
        success: true, 
        overrides: allOverrides, 
        conflicts: conflictingOrders 
      });
    }

    if (action === 'delete_override_range') {
      const { startDate, endDate } = data;
      if (!startDate || !endDate) {
        return NextResponse.json({ error: 'Укажите диапазон' }, { status: 400 });
      }

      await prisma.dateOverride.deleteMany({
        where: {
          userId: user.id,
          date: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      const allOverrides = await prisma.dateOverride.findMany({
        where: { userId: user.id },
        orderBy: { date: 'asc' },
      });

      return NextResponse.json({ success: true, overrides: allOverrides });
    }

    if (action === 'delete_override') {
      const { id } = data;
      if (!id) return NextResponse.json({ error: 'Не указан ID исключения' }, { status: 400 });
      await prisma.dateOverride.delete({ where: { id } });
      return NextResponse.json({ success: true, deletedId: id });
    }

    return NextResponse.json({ error: 'Неизвестное действие' }, { status: 400 });
  } catch (error: any) {
    console.error('Error handling booking settings action:', error);
    return NextResponse.json({ error: error.message || 'Ошибка обработки запроса' }, { status: 500 });
  }
}
