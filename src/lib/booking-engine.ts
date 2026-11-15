import { prisma } from './db';
import { Workbay } from '@prisma/client';
import { addMinutes, addDays, isBefore, isAfter, areIntervalsOverlapping, differenceInMinutes } from 'date-fns';
import { getStudioWorkbays } from './studio-service';

export interface AvailableSlot {
  time: string;             // "09:00"
  startAt: string;          // ISO UTC string
  endAt: string;            // ISO UTC string (включая сушку и буфер)
  activeWorkEndAt: string;  // ISO UTC string (момент освобождения мастера)
  cureEndAt: string;        // ISO UTC string (момент окончания кристаллизации/сушки)
  isMultiDay: boolean;      // переходит ли на следующий день
  workbayId: string;        // ID назначенного поста
  workbayName: string;      // Название поста
  available: boolean;       // true
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
    activeDurationMinutes: number;
    cureDurationMinutes: number;
    bufferMinutes: number;
    price: number;
    requiredBayType: string;
  };
  availableBays?: {
    id: string;
    name: string;
    type: string;
  }[];
}

/**
 * Интеллектуальное сопоставление ID услуги из каталога (StudioConfig) с услугой в таблице Service
 */
export function resolveBookingService(services: any[], requestedIdOrName?: string) {
  if (!services || services.length === 0) return null;
  if (!requestedIdOrName) return services[0];

  const req = requestedIdOrName.toLowerCase();

  // 1. Прямое совпадение по ID
  const direct = services.find((s) => s.id === requestedIdOrName || s.id.toLowerCase() === req);
  if (direct) return direct;

  // 2. Керамика и защитные составы -> бокс отверждения/сушки (cure)
  if (req.includes('ceramic') || req.includes('керамик') || req.includes('жидк') || req.includes('стекл')) {
    const s = services.find((x) => x.id === 'srv-ceramic' || x.requiredBayType === 'cure' || x.title?.toLowerCase().includes('керамик'));
    if (s) return s;
  }

  // 3. Полировка кузова и устранение царапин -> сухой бокс (dry)
  if (req.includes('polish') || req.includes('полиров') || req.includes('exterior') || req.includes('кузов')) {
    const s = services.find((x) => x.id === 'srv-polish' || x.requiredBayType === 'dry' || x.title?.toLowerCase().includes('полиров'));
    if (s) return s;
  }

  // 4. Антидождь
  if (req.includes('anti_rain') || req.includes('anti-rain') || req.includes('антидожд')) {
    const s = services.find((x) => x.id === 'srv-anti-rain' || x.title?.toLowerCase().includes('антидожд'));
    if (s) return s;
  }

  // 5. Уход за кожей
  if (req.includes('leather') || req.includes('кож')) {
    const s = services.find((x) => x.id === 'srv-leather' || x.title?.toLowerCase().includes('кож'));
    if (s) return s;
  }

  // 6. Химчистка салона и экстракция -> мокрый бокс (wet)
  if (req.includes('chem') || req.includes('химчист') || req.includes('interior') || req.includes('салон') || req.includes('dry_clean')) {
    const s = services.find((x) => x.id === 'srv-dry-clean' || x.requiredBayType === 'wet' || x.title?.toLowerCase().includes('химчист'));
    if (s) return s;
  }

  return services[0];
}

interface ScheduleDay {
  isWorkingDay: boolean;
  startTime: string; // "09:00"
  endTime: string;   // "21:00"
}

/**
 * Получить график работы студии на конкретный календарный день
 */
async function getScheduleForDate(
  userId: string,
  date: Date
): Promise<ScheduleDay> {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dateStr = `${y}-${m}-${d}`;

  // 1. Проверяем индивидуальные исключения (отпуск, сокращенный день)
  const override = await prisma.dateOverride.findUnique({
    where: {
      userId_date: {
        userId,
        date: dateStr,
      },
    },
  });

  if (override) {
    if (override.isDayOff) {
      return { isWorkingDay: false, startTime: '09:00', endTime: '21:00' };
    }
    return {
      isWorkingDay: true,
      startTime: override.customStartTime || '09:00',
      endTime: override.customEndTime || '21:00',
    };
  }

  // 2. Регулярный недельный график (0 = Вс, 1 = Пн ... 6 = Сб)
  const dayOfWeek = date.getDay();
  const regular = await prisma.availability.findUnique({
    where: {
      userId_dayOfWeek: {
        userId,
        dayOfWeek,
      },
    },
  });

  if (!regular || !regular.isWorkingDay) {
    return { isWorkingDay: false, startTime: '09:00', endTime: '21:00' };
  }

  return {
    isWorkingDay: true,
    startTime: regular.startTime,
    endTime: regular.endTime,
  };
}

/**
 * Расчет фаз бронирования с поддержкой многодневных работ (Multi-day rollover)
 */
export async function calculateMultiDayTimeline(params: {
  userId: string;
  startAt: Date;
  activeMinutes: number;
  cureMinutes: number;
  bufferMinutes: number;
}): Promise<{
  activeWorkEndAt: Date;
  cureEndAt: Date;
  bayEndAt: Date;
  isMultiDay: boolean;
}> {
  const { userId, startAt, activeMinutes, cureMinutes, bufferMinutes } = params;

  let currentCursor = new Date(startAt);
  let remainingActiveMin = activeMinutes;
  let isMultiDay = false;

  // 1. Расчет активной работы мастера
  while (remainingActiveMin > 0) {
    const schedule = await getScheduleForDate(userId, currentCursor);

    if (!schedule.isWorkingDay) {
      // Переходим к следующему дню
      currentCursor = addDays(currentCursor, 1);
      const [sh, sm] = (schedule.startTime || '09:00').split(':').map(Number);
      currentCursor.setHours(sh, sm, 0, 0);
      isMultiDay = true;
      continue;
    }

    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const dayEnd = new Date(currentCursor);
    dayEnd.setHours(endH, endM, 0, 0);

    const availableMinToday = Math.max(0, differenceInMinutes(dayEnd, currentCursor));

    if (availableMinToday >= remainingActiveMin) {
      currentCursor = addMinutes(currentCursor, remainingActiveMin);
      remainingActiveMin = 0;
    } else {
      // Отрабатываем доступное до закрытия студии время и переносим остаток
      remainingActiveMin -= availableMinToday;
      isMultiDay = true;
      currentCursor = addDays(currentCursor, 1);
      const nextSchedule = await getScheduleForDate(userId, currentCursor);
      const [sh, sm] = (nextSchedule.startTime || '09:00').split(':').map(Number);
      currentCursor.setHours(sh, sm, 0, 0);
    }
  }

  const activeWorkEndAt = new Date(currentCursor);

  // 2. Фаза полимеризации/сушки в боксе (продолжается непрерывно, включая ночь в боксе)
  const cureEndAt = addMinutes(activeWorkEndAt, cureMinutes);

  // 3. Буфер на приемку/выдачу и проветривание
  const bayEndAt = addMinutes(cureEndAt, bufferMinutes);

  // Проверка, выходит ли за рамки первого дня
  if (bayEndAt.getDate() !== startAt.getDate()) {
    isMultiDay = true;
  }

  return {
    activeWorkEndAt,
    cureEndAt,
    bayEndAt,
    isMultiDay,
  };
}

/**
 * Проверка соответствия типа бокса требованиям услуги
 */
function isBaySuitable(bayType: string, requiredType: string): boolean {
  if (!requiredType || requiredType === 'any' || requiredType === 'universal') return true;
  if (bayType === 'universal') return true;
  return bayType.toLowerCase() === requiredType.toLowerCase();
}

/**
 * Расчет свободных окон времени на дату с учётом боксов, двух фаз и многодневности
 */
export async function getAvailableSlots(params: {
  userIdOrSlug: string;
  serviceId?: string;
  serviceIds?: string[];
  dateStr: string; // "YYYY-MM-DD"
  carClass?: string;
  workbayId?: string;
}): Promise<SlotsResponse> {
  const { userIdOrSlug, serviceId, serviceIds, dateStr, carClass = 'M', workbayId } = params;

  // 1. Поиск мастера или студии
  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: userIdOrSlug }, { slug: userIdOrSlug }],
    },
    include: {
      services: true,
    },
  });

  if (!user) {
    return { success: false, date: dateStr, slots: [], reason: 'Мастер или студия не найдены' };
  }

  // 2. Определение запрашиваемой услуги / набора услуг
  const targetIds = serviceIds && serviceIds.length > 0 
    ? serviceIds 
    : [serviceId].filter(Boolean);

  let matchedServices: any[] = [];
  if (targetIds.length > 0) {
    for (const tid of targetIds) {
      const resolved = resolveBookingService(user.services, String(tid));
      if (resolved && !matchedServices.some((m) => m.id === resolved.id)) {
        matchedServices.push(resolved);
      }
    }
  }

  const primaryService = matchedServices[0] || user.services[0];

  if (!primaryService) {
    return { success: false, date: dateStr, slots: [], reason: 'Услуги не найдены' };
  }

  // Матрица множителей времени по классу авто
  const classMultiplier = carClass === 'L' ? 1.35 : carClass === 'M' ? 1.2 : 1.0;

  // Суммируем длительности
  let activeMinutes = 0;
  let cureMinutes = 0;
  let bufferMinutes = 0;
  let requiredBayType = primaryService.requiredBayType || 'any';

  for (const s of matchedServices) {
    activeMinutes += Math.round((s.activeDurationMinutes || s.durationMinutes || 60) * classMultiplier);
    cureMinutes = Math.max(cureMinutes, s.cureDurationMinutes || 0);
    bufferMinutes = Math.max(bufferMinutes, s.bufferMinutes || 15);
    if (s.requiredBayType && s.requiredBayType !== 'any') {
      requiredBayType = s.requiredBayType;
    }
  }

  // 3. Проверка формата даты
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return { success: false, date: dateStr, slots: [], reason: 'Неверный формат даты (ожидается YYYY-MM-DD)' };
  }

  const [year, month, day] = dateStr.split('-').map(Number);
  const targetDate = new Date(year, month - 1, day);

  // 4. Получаем рабочий график на выбранный день
  const daySchedule = await getScheduleForDate(user.id, targetDate);

  if (!daySchedule.isWorkingDay) {
    return {
      success: true,
      date: dateStr,
      slots: [],
      reason: 'Студия не работает в этот день по графику',
      user: { id: user.id, slug: user.slug, name: user.name, timezone: user.timezone },
      service: {
        id: primaryService.id,
        title: primaryService.title,
        durationMinutes: activeMinutes + cureMinutes + bufferMinutes,
        activeDurationMinutes: activeMinutes,
        cureDurationMinutes: cureMinutes,
        bufferMinutes,
        price: primaryService.price,
        requiredBayType,
      },
    };
  }

  // 5. Загружаем активные посты студии (Workbays)
  let allBays: Workbay[] = await prisma.workbay.findMany({
    where: { isActive: true },
    orderBy: { order: 'asc' },
  });

  if (allBays.length === 0) {
    allBays = (await getStudioWorkbays()) as Workbay[];
  }

  // Фильтруем подходящие по типу боксы
  const suitableBays = allBays.filter((b) => {
    if (workbayId && b.id !== workbayId) return false;
    return isBaySuitable(b.type, requiredBayType);
  });

  if (suitableBays.length === 0) {
    return {
      success: true,
      date: dateStr,
      slots: [],
      reason: `Нет доступных постов студии под тип работы «${requiredBayType}»`,
    };
  }

  // 6. Границы рабочего дня
  const [startH, startM] = daySchedule.startTime.split(':').map(Number);
  const [endH, endM] = daySchedule.endTime.split(':').map(Number);

  const workStart = new Date(year, month - 1, day, startH, startM, 0, 0);
  const workEnd = new Date(year, month - 1, day, endH, endM, 0, 0);

  // 7. Поиск всех актуальных бронирований в окне даты
  const searchWindowStart = new Date(year, month - 1, day - 1, 0, 0, 0);
  const searchWindowEnd = new Date(year, month - 1, day + 5, 23, 59, 59);

  const existingBookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      status: { in: ['pending', 'confirmed', 'in_progress'] },
      startAt: { lte: searchWindowEnd },
      endAt: { gte: searchWindowStart },
    },
    select: {
      id: true,
      workbayId: true,
      startAt: true,
      endAt: true,
      activeWorkEndAt: true,
      cureEndAt: true,
    },
  });

  // 8. Генерация слотов с шагом 30 минут
  const slots: AvailableSlot[] = [];
  let currentSlotStart = workStart;
  const now = new Date();

  while (true) {
    // Не начинаем слоты позже, чем за 1 час до закрытия студии
    if (isAfter(currentSlotStart, addMinutes(workEnd, -60))) break;

    // Исключаем прошедшие слоты на сегодня (+15 минут запас)
    if (isBefore(currentSlotStart, addMinutes(now, 15))) {
      currentSlotStart = addMinutes(currentSlotStart, 30);
      continue;
    }

    // Рассчитываем фазы бронирования для этого слота
    const timeline = await calculateMultiDayTimeline({
      userId: user.id,
      startAt: currentSlotStart,
      activeMinutes,
      cureMinutes,
      bufferMinutes,
    });

    // Ищем хотя бы один свободный подходящий бокс
    let assignedBay: typeof suitableBays[0] | null = null;

    for (const bay of suitableBays) {
      // 1. Проверяем коллизию конкретного бокса
      const hasBayConflict = existingBookings.some((b) => {
        if (b.workbayId !== bay.id) return false;
        return areIntervalsOverlapping(
          { start: currentSlotStart, end: timeline.bayEndAt },
          { start: new Date(b.startAt), end: new Date(b.endAt) }
        );
      });

      if (hasBayConflict) continue;

      // 2. Проверяем коллизию мастера (мастер занят только во время активной работы!)
      const hasMasterConflict = existingBookings.some((b) => {
        const bActiveEnd = b.activeWorkEndAt ? new Date(b.activeWorkEndAt) : new Date(b.endAt);
        return areIntervalsOverlapping(
          { start: currentSlotStart, end: timeline.activeWorkEndAt },
          { start: new Date(b.startAt), end: bActiveEnd }
        );
      });

      if (hasMasterConflict) continue;

      // Найден подходящий свободный бокс!
      assignedBay = bay;
      break;
    }

    if (assignedBay) {
      const hours = String(currentSlotStart.getHours()).padStart(2, '0');
      const minutes = String(currentSlotStart.getMinutes()).padStart(2, '0');

      slots.push({
        time: `${hours}:${minutes}`,
        startAt: currentSlotStart.toISOString(),
        endAt: timeline.bayEndAt.toISOString(),
        activeWorkEndAt: timeline.activeWorkEndAt.toISOString(),
        cureEndAt: timeline.cureEndAt.toISOString(),
        isMultiDay: timeline.isMultiDay,
        workbayId: assignedBay.id,
        workbayName: assignedBay.name,
        available: true,
      });
    }

    currentSlotStart = addMinutes(currentSlotStart, 30);
  }

  return {
    success: true,
    date: dateStr,
    slots,
    user: { id: user.id, slug: user.slug, name: user.name, timezone: user.timezone },
    service: {
      id: primaryService.id,
      title: primaryService.title,
      durationMinutes: activeMinutes + cureMinutes + bufferMinutes,
      activeDurationMinutes: activeMinutes,
      cureDurationMinutes: cureMinutes,
      bufferMinutes,
      price: primaryService.price,
      requiredBayType,
    },
    availableBays: suitableBays.map((b) => ({ id: b.id, name: b.name, type: b.type })),
  };
}

/**
 * Создание записи клиента в транзакции с резервированием бокса и фаз
 */
export async function createBookingWithTransaction(data: {
  userIdOrSlug: string;
  serviceId: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  startAt: string; // ISO UTC
  notes?: string;
  workbayId?: string;
  carClass?: string;
  orderId?: string;
}) {
  const {
    userIdOrSlug,
    serviceId,
    clientName,
    clientPhone,
    clientEmail,
    startAt,
    notes,
    workbayId,
    carClass = 'M',
    orderId,
  } = data;

  const user = await prisma.user.findFirst({
    where: {
      OR: [{ id: userIdOrSlug }, { slug: userIdOrSlug }],
    },
  });

  if (!user) throw new Error('USER_NOT_FOUND');

  let service = await prisma.service.findFirst({
    where: { id: serviceId, userId: user.id, isActive: true },
  });

  if (!service) {
    const allServices = await prisma.service.findMany({
      where: { userId: user.id, isActive: true },
    });
    service = resolveBookingService(allServices, serviceId);
  }

  if (!service) throw new Error('SERVICE_NOT_FOUND');

  const startDate = new Date(startAt);
  if (isNaN(startDate.getTime())) throw new Error('INVALID_DATE');

  const classMultiplier = carClass === 'L' ? 1.35 : carClass === 'M' ? 1.2 : 1.0;
  const activeMinutes = Math.round((service.activeDurationMinutes || service.durationMinutes || 60) * classMultiplier);
  const cureMinutes = service.cureDurationMinutes || 0;
  const bufferMinutes = service.bufferMinutes || 15;

  // Рассчитываем фазы бронирования
  const timeline = await calculateMultiDayTimeline({
    userId: user.id,
    startAt: startDate,
    activeMinutes,
    cureMinutes,
    bufferMinutes,
  });

  return await prisma.$transaction(async (tx) => {
    // 1. Поиск подходящего и свободного бокса
    let targetBayId = workbayId;

    if (!targetBayId) {
      const activeBays = await tx.workbay.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
      });

      for (const bay of activeBays) {
        if (!isBaySuitable(bay.type, service.requiredBayType || 'any')) continue;

        const bayConflict = await tx.booking.findFirst({
          where: {
            workbayId: bay.id,
            status: { in: ['pending', 'confirmed', 'in_progress'] },
            startAt: { lt: timeline.bayEndAt },
            endAt: { gt: startDate },
          },
        });

        if (!bayConflict) {
          targetBayId = bay.id;
          break;
        }
      }
    } else {
      // Проверка указанного бокса на коллизию
      const bayConflict = await tx.booking.findFirst({
        where: {
          workbayId: targetBayId,
          status: { in: ['pending', 'confirmed', 'in_progress'] },
          startAt: { lt: timeline.bayEndAt },
          endAt: { gt: startDate },
        },
      });

      if (bayConflict) {
        throw new Error('BAY_ALREADY_OCCUPIED');
      }
    }

    // 2. Проверка занятости мастера в активной фазе
    const masterConflict = await tx.booking.findFirst({
      where: {
        userId: user.id,
        status: { in: ['pending', 'confirmed', 'in_progress'] },
        startAt: { lt: timeline.activeWorkEndAt },
        endAt: { gt: startDate },
      },
    });

    if (masterConflict) {
      // Проверяем, свободен ли мастер во время активной фазы
      const activeEnd = masterConflict.activeWorkEndAt ? new Date(masterConflict.activeWorkEndAt) : new Date(masterConflict.endAt);
      if (areIntervalsOverlapping({ start: startDate, end: timeline.activeWorkEndAt }, { start: new Date(masterConflict.startAt), end: activeEnd })) {
        throw new Error('SLOT_ALREADY_BOOKED');
      }
    }

    // 3. Создание брони с фазами и привязкой к боксу
    const booking = await tx.booking.create({
      data: {
        userId: user.id,
        serviceId: service.id,
        workbayId: targetBayId || null,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        clientEmail: clientEmail?.trim() || null,
        startAt: startDate,
        endAt: timeline.bayEndAt,
        activeWorkEndAt: timeline.activeWorkEndAt,
        cureEndAt: timeline.cureEndAt,
        isMultiDay: timeline.isMultiDay,
        status: 'confirmed',
        notes: notes?.trim() || null,
      },
      include: {
        service: true,
        workbay: true,
        user: {
          select: { id: true, name: true, phone: true, timezone: true, slug: true },
        },
      },
    });

    // 4. Если передан orderId, привязываем заказ к этой брони
    if (orderId) {
      await tx.order.update({
        where: { id: orderId },
        data: {
          bookingId: booking.id,
          agreedEntryDateTime: startDate.toISOString(),
        },
      });
    }

    return booking;
  });
}
