import { prisma } from './db';
import { parse, addMinutes, isBefore, isAfter, areIntervalsOverlapping } from 'date-fns';

export interface AvailableSlot {
  time: string;       // "09:00" для отображения пользователю
  startAt: string;    // ISO UTC string
  endAt: string;      // ISO UTC string
  available: boolean; // true
}

export interface SlotsResponse {
  success: boolean;
  date: string;
  slots: AvailableSlot[];
  reason?: string;
  user?: {
    id: string;
    slug: string;
    name: string;
    timezone: string;
  };
  service?: {
    id: string;
    title: string;
    durationMinutes: number;
    bufferMinutes: number;
    price: number;
  };
}

/**
 * Расчет свободных окон времени на дату
 */
export async function getAvailableSlots(params: {
  userIdOrSlug: string;
  serviceId: string;
  dateStr: string; // "YYYY-MM-DD"
}): Promise<SlotsResponse> {
  const { userIdOrSlug, serviceId, dateStr } = params;

  // 1. Поиск мастера по id или slug
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: userIdOrSlug }, { slug: userIdOrSlug }],
    },
  });

  if (!user) {
    return { success: false, date: dateStr, slots: [], reason: 'Мастер или студия не найдены' };
  }

  // 2. Поиск услуги
  const service = await prisma.service.findFirst({
    where: {
      id: serviceId,
      userId: user.id,
      isActive: true,
    },
  });

  if (!service) {
    return { success: false, date: dateStr, slots: [], reason: 'Услуга не найдена или отключена' };
  }

  // 3. Проверка даты
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { success: false, date: dateStr, slots: [], reason: 'Неверный формат даты (ожидается YYYY-MM-DD)' };
  }

  // 4. Проверка исключений на дату (DateOverride)
  const override = await prisma.dateOverride.findUnique({
    where: {
      userId_date: {
        userId: user.id,
        date: dateStr,
      },
    },
  });

  if (override?.isDayOff) {
    return {
      success: true,
      date: dateStr,
      slots: [],
      reason: 'Выходной день по индивидуальному графику мастера',
      user: { id: user.id, slug: user.slug, name: user.name, timezone: user.timezone },
      service: {
        id: service.id,
        title: service.title,
        durationMinutes: service.durationMinutes,
        bufferMinutes: service.bufferMinutes,
        price: service.price,
      },
    };
  }

  // 5. График работы на день недели (0 = Вс, 1 = Пн ... 6 = Сб)
  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);
  const dayOfWeek = targetDate.getDay();

  let startWorkStr = '09:00';
  let endWorkStr = '21:00';

  if (override?.customStartTime && override?.customEndTime) {
    startWorkStr = override.customStartTime;
    endWorkStr = override.customEndTime;
  } else {
    const regularSchedule = await prisma.availability.findUnique({
      where: {
        userId_dayOfWeek: {
          userId: user.id,
          dayOfWeek,
        },
      },
    });

    if (!regularSchedule || !regularSchedule.isWorkingDay) {
      return {
        success: true,
        date: dateStr,
        slots: [],
        reason: 'Выходной день по регулярному графику',
        user: { id: user.id, slug: user.slug, name: user.name, timezone: user.timezone },
        service: {
          id: service.id,
          title: service.title,
          durationMinutes: service.durationMinutes,
          bufferMinutes: service.bufferMinutes,
          price: service.price,
        },
      };
    }

    startWorkStr = regularSchedule.startTime;
    endWorkStr = regularSchedule.endTime;
  }

  // 6. Границы рабочего дня
  const [startH, startM] = startWorkStr.split(':').map(Number);
  const [endH, endM] = endWorkStr.split(':').map(Number);

  const workStart = new Date(year, month - 1, day, startH, startM, 0, 0);
  const workEnd = new Date(year, month - 1, day, endH, endM, 0, 0);

  const totalSlotDuration = service.durationMinutes + service.bufferMinutes;

  // 7. Поиск существующих броней
  const dayStartUtc = new Date(Date.UTC(year, month - 1, day, 0, 0, 0));
  const dayEndUtc = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));

  const existingBookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      status: { in: ['pending', 'confirmed'] },
      startAt: { gte: dayStartUtc, lte: dayEndUtc },
    },
    select: { startAt: true, endAt: true },
  });

  // 8. Генерация слотов
  const slots: AvailableSlot[] = [];
  let currentSlotStart = workStart;
  const now = new Date();

  while (true) {
    const currentSlotEnd = addMinutes(currentSlotStart, totalSlotDuration);

    // Слот не должен выходить за пределы рабочего дня
    if (isAfter(currentSlotEnd, workEnd)) break;

    // Исключаем прошедшие слоты на сегодня (+15 минут запас)
    if (isBefore(currentSlotStart, addMinutes(now, 15))) {
      currentSlotStart = addMinutes(currentSlotStart, 30);
      continue;
    }

    // Проверяем пересечение с существующими записями
    const hasOverlap = existingBookings.some((b) =>
      areIntervalsOverlapping(
        { start: currentSlotStart, end: currentSlotEnd },
        { start: new Date(b.startAt), end: new Date(b.endAt) }
      )
    );

    if (!hasOverlap) {
      const hours = String(currentSlotStart.getHours()).padStart(2, '0');
      const minutes = String(currentSlotStart.getMinutes()).padStart(2, '0');

      slots.push({
        time: `${hours}:${minutes}`,
        startAt: currentSlotStart.toISOString(),
        endAt: currentSlotEnd.toISOString(),
        available: true,
      });
    }

    // Шаг перехода к следующему потенциальному слоту: 30 минут
    currentSlotStart = addMinutes(currentSlotStart, 30);
  }

  return {
    success: true,
    date: dateStr,
    slots,
    user: { id: user.id, slug: user.slug, name: user.name, timezone: user.timezone },
    service: {
      id: service.id,
      title: service.title,
      durationMinutes: service.durationMinutes,
      bufferMinutes: service.bufferMinutes,
      price: service.price,
    },
  };
}

/**
 * Создание записи клиента в транзакции с проверкой коллизий
 */
export async function createBookingWithTransaction(data: {
  userIdOrSlug: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  startAt: string; // ISO UTC
  notes?: string;
}) {
  const { userIdOrSlug, serviceId, clientName, clientPhone, clientEmail, startAt, notes } = data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: userIdOrSlug }, { slug: userIdOrSlug }],
    },
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  const service = await prisma.service.findFirst({
    where: { id: serviceId, userId: user.id, isActive: true },
  });

  if (!service) throw new Error('SERVICE_NOT_FOUND');

  const startDate = new Date(startAt);
  if (isNaN(startDate.getTime())) throw new Error('INVALID_DATE');

  const totalMinutes = service.durationMinutes + service.bufferMinutes;
  const endDate = addMinutes(startDate, totalMinutes);

  // Атомарная транзакция
  return await prisma.$transaction(async (tx) => {
    // Проверка коллизий по времени
    const conflict = await tx.booking.findFirst({
      where: {
        userId: user.id,
        status: { in: ['pending', 'confirmed'] },
        AND: [
          { startAt: { lt: endDate } },
          { endAt: { gt: startDate } },
        ],
      },
    });

    if (conflict) {
      throw new Error('SLOT_ALREADY_BOOKED');
    }

    // Создание брони
    return await tx.booking.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail?.trim() || null,
        startAt: startDate,
        endAt: endDate,
        status: 'confirmed',
        notes: notes?.trim() || null,
      },
      include: {
        service: true,
        user: {
          select: { id: true, name: true, phone: true, timezone: true, slug: true },
        },
      },
    });
  });
}
