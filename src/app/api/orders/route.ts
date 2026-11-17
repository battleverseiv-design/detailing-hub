import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/db';
import { verifyAdminSession } from '@/lib/auth';
import { getStudioSettings, syncTariffsToServices } from '@/lib/studio-service';
import { calculateItemPrice, calculateOrderSummary } from '@/lib/pricing';
import {
  prepareBooking,
  commitBooking,
  runBookingTransaction,
  resolveBookingService,
  PreparedBooking,
} from '@/lib/booking-engine';
import { notifyNewOrder } from '@/lib/telegram';
import { CarClass, CartItem, OrderPhoto } from '@/types';

// ---------------------------------------------------------------------------
// Константы и вспомогательные функции валидации
// ---------------------------------------------------------------------------

const CAR_CLASSES: readonly CarClass[] = ['S', 'M', 'L', 'OTHER'];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MAX_ITEMS = 30;
const MAX_PHOTOS = 3;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const MAX_PRICE = 10_000_000;
const OUTSIDE_CITY_FEE = 500; // TODO: вынести в настройки студии (дублируется в CheckoutRequestView)

/** Ошибка с HTTP-статусом: её текст безопасно показывать клиенту. */
class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}

/** Ошибки движка бронирования, которые означают «время недоступно» (409). */
const BOOKING_CONFLICT_CODES = new Set([
  'SLOT_ALREADY_BOOKED',
  'BAY_ALREADY_OCCUPIED',
  'NO_FREE_BAY',
  'SCHEDULE_UNAVAILABLE',
]);

function str(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function isRealDate(dateStr: string): boolean {
  if (!DATE_RE.test(dateStr)) return false;
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}

interface RawItem {
  cartItemId?: unknown;
  serviceId?: unknown;
  category?: unknown;
  name?: unknown;
  unitPrice?: unknown;
  quantity?: unknown;
  customDescription?: unknown;
}

/**
 * Фото приходят от клиента — берём только id (UUID) и пересобираем остальные поля сами,
 * чтобы нельзя было сохранить в заказ произвольный JSON или чужие имена файлов.
 */
function normalizePhotos(raw: unknown): OrderPhoto[] {
  if (!Array.isArray(raw)) return [];
  const photos: OrderPhoto[] = [];
  for (const p of raw.slice(0, MAX_PHOTOS)) {
    const id = typeof p?.id === 'string' ? p.id : '';
    if (!UUID_RE.test(id)) continue;
    photos.push({
      id,
      filename: `${id}.webp`,
      originalName: str(p.originalName, 100) || 'photo.webp',
      mimeType: 'image/webp',
      sizeBytes: Math.max(0, Math.min(MAX_PHOTO_BYTES, Number(p.sizeBytes) || 0)),
      createdAt: new Date().toISOString(),
    });
  }
  return photos;
}

/**
 * Готовит бронь (вне транзакции): находит мастера/услуги, суммирует длительности.
 * Возвращает null, если система бронирования ещё не настроена (нет мастера или услуг).
 */
async function prepareOrderBooking(params: {
  verifiedItems: CartItem[];
  settingsTariffs: Parameters<typeof syncTariffsToServices>[0];
  desiredDate: string;
  desiredTime: string;
  orderId: string;
  clientName: string;
  clientPhone: string;
  carClass: CarClass;
  carBrandModel: string;
  format: 'studio' | 'mobile';
  workbayId?: string;
}): Promise<PreparedBooking | null> {
  const findDemoUser = () =>
    prisma.user.findFirst({
      where: { OR: [{ id: 'demo-master-id' }, { slug: 'demo' }] },
      include: { services: true },
    });

  let demoUser = await findDemoUser();
  if (!demoUser || demoUser.services.length === 0) {
    // Мастер и услуги создаются синхронизацией тарифов — делаем её автоматически,
    // вместо того чтобы молча пропускать бронь.
    await syncTariffsToServices(params.settingsTariffs);
    demoUser = await findDemoUser();
  }
  if (!demoUser || demoUser.services.length === 0) {
    console.warn('[orders] Система бронирования не настроена: бронь пропущена');
    return null;
  }

  const serviceIds = params.verifiedItems.map((item) => item.serviceId || item.name);
  const primaryItem = params.verifiedItems[0];
  const matchedService =
    resolveBookingService(demoUser.services, primaryItem?.serviceId || primaryItem?.name) ||
    demoUser.services[0];

  let totalActive = 0;
  let maxCure = 0;
  let maxBuffer = 15;

  for (const item of params.verifiedItems) {
    const s = resolveBookingService(demoUser.services, item.serviceId || item.name);
    if (s) {
      const qty = Math.max(1, item.quantity || 1);
      totalActive += (s.activeDurationMinutes || s.durationMinutes || 60) * qty;
      maxCure = Math.max(maxCure, s.cureDurationMinutes || 0);
      maxBuffer = Math.max(maxBuffer, s.bufferMinutes || 15);
    }
  }

  const [startHour, startMin] = params.desiredTime.split(':').map(Number);
  const [year, month, day] = params.desiredDate.split('-').map(Number);
  // TODO(timezone): время трактуется в часовом поясе сервера. На UTC-хостинге при студии
  // в Europe/Moscow нужно переводить из User.timezone в UTC (date-fns-tz / Temporal).
  const startDate = new Date(year, month - 1, day, startHour, startMin, 0);

  return prepareBooking({
    userIdOrSlug: demoUser.id,
    serviceId: matchedService.id,
    serviceIds,
    customDuration: {
      activeMinutes: totalActive,
      cureMinutes: maxCure,
      bufferMinutes: maxBuffer,
    },
    clientName: params.clientName,
    clientPhone: params.clientPhone,
    startAt: startDate.toISOString(),
    carClass: params.carClass,
    workbayId: params.workbayId,
    notes: `Заказ #${params.orderId.slice(-6)} • ${params.carBrandModel} • ${
      params.format === 'mobile' ? 'Выезд' : 'В студии'
    }`,
  });
}

// ---------------------------------------------------------------------------
// POST /api/orders
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object') {
      throw new HttpError(400, 'Некорректный запрос');
    }

    // ---- Права: админские поля работают ТОЛЬКО при валидной сессии админа ----
    // Раньше isAdminCreated и preliminaryTotal принимались от любого анонима:
    // можно было создать «согласованный» заказ за 1 ₽.
    const isAdminCreated = body.isAdminCreated === true && (await verifyAdminSession());
    const adminPriceRaw = isAdminCreated ? body.preliminaryTotal : undefined;
    const adminPrice =
      adminPriceRaw == null
        ? null
        : Math.min(MAX_PRICE, Math.max(0, Math.round(Number(adminPriceRaw) || 0)));

    // ---- Базовая валидация ----
    const clientName = str(body.clientName, 100);
    const clientPhone = str(body.clientPhone, 30);
    if (!clientName || !clientPhone) {
      throw new HttpError(400, 'Укажите ваше имя и контактный телефон');
    }
    const phoneDigits = clientPhone.replace(/\D/g, '');
    if (phoneDigits.length < 10 || phoneDigits.length > 15) {
      throw new HttpError(400, 'Укажите корректный номер телефона');
    }

    // carClass: пустое -> 'M' (как раньше), но НЕВАЛИДНОЕ значение отклоняем.
    // Раньше цена считалась по сырому carClass: при его отсутствии basePrices[undefined] = 0.
    let carClass: CarClass = 'M';
    if (body.carClass != null && body.carClass !== '') {
      if (!CAR_CLASSES.includes(body.carClass)) {
        throw new HttpError(400, 'Некорректный класс автомобиля');
      }
      carClass = body.carClass as CarClass;
    }

    const isDirty = body.isDirty === true;
    const format: 'studio' | 'mobile' = body.serviceFormat === 'mobile' ? 'mobile' : 'studio';
    const isOutsideCity = body.isOutsideCity === true && format === 'mobile';

    const carBrandModel = str(body.carBrandModel, 100) || `Автомобиль (${carClass})`;
    const carLicensePlate = str(body.carLicensePlate, 20).toUpperCase() || null;
    const deliveryAddress = format === 'mobile' ? str(body.deliveryAddress, 300) : null;
    const clientComment = str(body.clientComment, 1000) || null;
    const idempotencyKey = str(body.idempotencyKey, 100) || null;
    const workbayId = str(body.workbayId, 64) || undefined;
    const source = str(body.source, 60) || (isAdminCreated ? 'phone_admin' : 'direct');

    const desiredDate = str(body.desiredDate, 10);
    const desiredTime = str(body.desiredTime, 5);
    if (desiredDate && !isRealDate(desiredDate)) {
      throw new HttpError(400, 'Некорректная дата записи');
    }
    if (desiredTime && !TIME_RE.test(desiredTime)) {
      throw new HttpError(400, 'Некорректное время записи');
    }

    // ---- Позиции корзины ----
    const rawItems: unknown[] = Array.isArray(body.items) ? body.items : [];
    if (rawItems.length > MAX_ITEMS) {
      throw new HttpError(400, 'Слишком много позиций в корзине');
    }
    let inputItems = rawItems.filter(
      (it): it is RawItem => typeof it === 'object' && it !== null
    );

    // Запись, созданная администратором вручную без услуг из каталога
    if (inputItems.length === 0 && isAdminCreated) {
      inputItems = [
        {
          serviceId: 'manual_service',
          name: clientComment ? `Работы: ${clientComment}` : 'Детейлинг работы (Запись вручную)',
          unitPrice: adminPrice ?? 0,
        },
      ];
    }

    if (inputItems.length === 0) {
      throw new HttpError(400, 'Корзина пуста. Выберите хотя бы одну услугу');
    }

    // ---- Идемпотентность ----
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
      if (existing) {
        return NextResponse.json({
          success: true,
          token: existing.token,
          id: existing.id,
          reused: true,
        });
      }
    }

    // ---- Серверный пересчёт стоимости (клиенту не доверяем) ----
    const settings = await getStudioSettings();
    const tariffMap = new Map(settings.tariffs.map((t) => [t.id, t]));

    const verifiedItems: CartItem[] = [];

    for (const item of inputItems) {
      const cartItemId = str(item.cartItemId, 64) || crypto.randomUUID();
      const serviceId = typeof item.serviceId === 'string' ? item.serviceId : '';

      if (serviceId === 'manual_service') {
        // Ручная позиция с произвольной ценой — только для админа.
        // Раньше её мог отправить любой клиент с собственным unitPrice.
        if (!isAdminCreated) continue;
        const price = Math.min(
          MAX_PRICE,
          Math.max(0, Math.round(Number(item.unitPrice) || adminPrice || 0))
        );
        verifiedItems.push({
          cartItemId,
          serviceId: 'manual_service',
          name: str(item.name, 200) || 'Детейлинг работы (Запись вручную)',
          category: 'packages',
          carClass,
          isDirty,
          quantity: 1,
          unitPrice: price,
          itemTotal: price,
          isCustomPhoto: false,
          zones: ['none'],
        });
      } else if (item.category === 'custom_photo' || serviceId === 'custom_photo_service') {
        verifiedItems.push({
          cartItemId,
          serviceId: 'custom_photo_service',
          name: 'Индивидуальная задача / Оценка по фото',
          category: 'custom_photo',
          carClass,
          isDirty,
          quantity: 1,
          unitPrice: 0,
          itemTotal: 0,
          isCustomPhoto: true,
          customDescription: str(item.customDescription, 500) || 'Оценка по фото',
          zones: ['none'],
        });
      } else {
        const tariff = tariffMap.get(serviceId);
        if (!tariff) continue;

        const qty = Math.max(
          1,
          Math.min(tariff.maxQuantity || 8, Math.floor(Number(item.quantity)) || 1)
        );
        const { unitPrice, itemTotal } = calculateItemPrice(
          tariff,
          carClass,
          isDirty,
          qty,
          settings.dirtyCarMarkupPercent
        );

        verifiedItems.push({
          cartItemId,
          serviceId: tariff.id,
          name: tariff.name,
          category: tariff.category,
          carClass,
          isDirty,
          quantity: qty,
          unitPrice,
          itemTotal,
          isCustomPhoto: false,
          zones: tariff.zones,
        });
      }
    }

    if (verifiedItems.length === 0) {
      throw new HttpError(400, 'Не удалось проверить выбранные услуги');
    }

    // ---- Итоговый расчёт ----
    let pricing = calculateOrderSummary(verifiedItems, carClass, isDirty, format, {
      minOrderAmount: settings.minOrderAmount,
      dirtyCarMarkupPercent: settings.dirtyCarMarkupPercent,
      mobileServicePrice: settings.mobileServicePrice,
      mobileServiceEnabled: settings.mobileServiceEnabled,
    });

    if (isOutsideCity) {
      pricing.mobileFee += OUTSIDE_CITY_FEE;
      pricing.preliminaryTotal += OUTSIDE_CITY_FEE;
      pricing.displayTotalFormatted = `${pricing.preliminaryTotal.toLocaleString('ru-RU')} ₽`;
    }

    if (isAdminCreated && adminPrice != null) {
      pricing = {
        ...pricing,
        itemsSubtotal: adminPrice,
        workTotal: adminPrice,
        preliminaryTotal: adminPrice,
        displayTotalFormatted: `${adminPrice.toLocaleString('ru-RU')} ₽`,
      };
    }

    const photos = normalizePhotos(body.photos);
    const token = crypto.randomBytes(16).toString('hex');
    const orderId = crypto.randomUUID();

    // ---- Подготовка брони (вне транзакции) ----
    let preparedBooking: PreparedBooking | null = null;
    if (desiredDate && desiredTime) {
      try {
        preparedBooking = await prepareOrderBooking({
          verifiedItems,
          settingsTariffs: settings.tariffs,
          desiredDate,
          desiredTime,
          orderId,
          clientName,
          clientPhone,
          carClass,
          carBrandModel,
          format,
          workbayId,
        });
      } catch (err) {
        const code = err instanceof Error ? err.message : '';
        if (code === 'INVALID_DATE') throw new HttpError(400, 'Некорректная дата или время записи');
        if (BOOKING_CONFLICT_CODES.has(code)) {
          throw new HttpError(409, 'Это время недоступно для записи. Пожалуйста, выберите другой слот.');
        }
        throw err;
      }
    }

    // ---- ОДНА транзакция: заказ + бронь ----
    // Раньше заказ создавался первым, а ошибка брони только логировалась (console.warn):
    // клиент получал «успех» без слота. Теперь при любом конфликте откатывается всё,
    // и клиент получает 409 с предложением выбрать другое время.
    let newOrder;
    try {
      newOrder = await runBookingTransaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            id: orderId,
            token,
            idempotencyKey,
            status: isAdminCreated ? 'agreed' : 'new',
            source,
            clientName,
            clientPhone,
            carBrandModel,
            carLicensePlate,
            carClass,
            isDirty,
            serviceFormat: format,
            deliveryAddress,
            desiredDate: desiredDate || null,
            desiredTime: desiredTime || null,
            knownSubtotal: pricing.workTotal,
            mobileFee: pricing.mobileFee,
            preliminaryTotal: pricing.preliminaryTotal,
            hasPhotoAppraisal: pricing.hasPhotoAppraisal,
            clientComment,
            itemsJson: JSON.stringify(verifiedItems),
            photosJson: JSON.stringify(photos),
            tariffsSnapshotJson: JSON.stringify({
              tariffs: settings.tariffs,
              minOrderAmount: settings.minOrderAmount,
              dirtyCarMarkupPercent: settings.dirtyCarMarkupPercent,
              mobileServicePrice: settings.mobileServicePrice,
            }),
          },
        });

        if (preparedBooking) {
          await commitBooking(tx, { ...preparedBooking, orderId: order.id });
        }
        return order;
      });
    } catch (err) {
      // Гонка идемпотентности: параллельный запрос с тем же ключом уже создал заказ
      if (
        idempotencyKey &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await prisma.order.findUnique({ where: { idempotencyKey } });
        if (existing) {
          return NextResponse.json({
            success: true,
            token: existing.token,
            id: existing.id,
            reused: true,
          });
        }
      }

      const code = err instanceof Error ? err.message : '';
      if (BOOKING_CONFLICT_CODES.has(code)) {
        throw new HttpError(409, 'Это время только что заняли. Пожалуйста, выберите другой слот.');
      }
      if (code === 'BAY_NOT_FOUND') {
        throw new HttpError(400, 'Выбранный пост недоступен. Выберите другой слот.');
      }
      throw err;
    }

    // ---- Telegram-уведомление ----
    // Ждём ответа (таймаут 3.5 с внутри sendTelegramMessage): в serverless-окружении
    // «fire and forget» обрывается сразу после отправки ответа клиенту.
    // Задайте NEXT_PUBLIC_SITE_URL, чтобы ссылки не строились из заголовка Host.
    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || `${proto}://${host}`).replace(/\/$/, '');

    await notifyNewOrder(
      {
        id: newOrder.id,
        token: newOrder.token,
        clientName: newOrder.clientName,
        clientPhone: newOrder.clientPhone,
        carBrandModel: newOrder.carBrandModel,
        carClass: newOrder.carClass,
        preliminaryTotal: newOrder.preliminaryTotal,
        desiredDate: newOrder.desiredDate,
        desiredTime: newOrder.desiredTime,
        serviceFormat: newOrder.serviceFormat,
        deliveryAddress: newOrder.deliveryAddress,
        items: verifiedItems,
      },
      baseUrl,
      settings.telegramBotToken && settings.telegramChatId
        ? {
            botToken: settings.telegramBotToken,
            chatId: settings.telegramChatId,
            apiUrl: settings.telegramApiUrl,
          }
        : undefined
    ).catch((e) => console.warn('Telegram notify error:', e));

    return NextResponse.json({
      success: true,
      token: newOrder.token,
      id: newOrder.id,
    });
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    // Детали ошибки — только в лог сервера, клиенту не отдаём (раньше уходил err.message)
    console.error('Error creating order:', err);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера при создании заявки' },
      { status: 500 }
    );
  }
}
