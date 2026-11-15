import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getStudioSettings } from '@/lib/studio-service';
import { calculateItemPrice, calculateOrderSummary } from '@/lib/pricing';
import { createBookingWithTransaction, resolveBookingService } from '@/lib/booking-engine';
import { notifyNewOrder } from '@/lib/telegram';
import { CarClass, CartItem, OrderPhoto } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      idempotencyKey,
      clientName,
      clientPhone,
      carBrandModel,
      carLicensePlate,
      carClass,
      isDirty,
      serviceFormat,
      deliveryAddress,
      desiredDate,
      desiredTime,
      clientComment,
      source,
      workbayId,
      isAdminCreated,
      preliminaryTotal: adminPrice,
      items,
      photos,
    } = body;

    // Валидация обязательных полей
    if (!clientName || !clientPhone) {
      return NextResponse.json(
        { error: 'Укажите ваше имя и контактный телефон' },
        { status: 400 }
      );
    }

    const effectiveCarClass = carClass || 'M';
    const effectiveCarBrandModel = (carBrandModel && String(carBrandModel).trim()) 
      ? String(carBrandModel).trim() 
      : `Автомобиль (${effectiveCarClass})`;

    let inputItems = Array.isArray(items) && items.length > 0 ? items : [];

    // Если запись создана администратором вручную без выбора услуг из каталога
    if (inputItems.length === 0 && isAdminCreated) {
      const customPrice = Math.max(0, Number(adminPrice) || 0);
      inputItems = [{
        cartItemId: crypto.randomUUID(),
        serviceId: 'manual_service',
        name: clientComment ? `Работы: ${clientComment}` : 'Детейлинг работы (Запись вручную)',
        category: 'packages',
        carClass: effectiveCarClass as CarClass,
        isDirty: Boolean(isDirty),
        quantity: 1,
        unitPrice: customPrice,
        itemTotal: customPrice,
        isCustomPhoto: false,
        zones: ['none'],
      }];
    }

    if (inputItems.length === 0) {
      return NextResponse.json(
        { error: 'Корзина пуста. Выберите хотя бы одну услугу' },
        { status: 400 }
      );
    }

    // Проверка идемпотентности
    if (idempotencyKey) {
      const existing = await prisma.order.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        return NextResponse.json({
          success: true,
          token: existing.token,
          id: existing.id,
          reused: true,
        });
      }
    }

    // Загрузка актуальных тарифов и настроек из БД
    const settings = await getStudioSettings();
    const tariffMap = new Map(settings.tariffs.map((t) => [t.id, t]));

    // Серверный пересчёт стоимости каждой позиции (не доверяем клиенту)
    const verifiedItems: CartItem[] = [];
    let hasPhotoAppraisal = false;

    for (const item of inputItems) {
      if (item.serviceId === 'manual_service') {
        const price = Math.max(0, Number(item.unitPrice) || Number(adminPrice) || 0);
        verifiedItems.push({
          cartItemId: item.cartItemId || crypto.randomUUID(),
          serviceId: 'manual_service',
          name: item.name || 'Детейлинг работы (Запись вручную)',
          category: 'packages',
          carClass: effectiveCarClass as CarClass,
          isDirty: Boolean(isDirty),
          quantity: 1,
          unitPrice: price,
          itemTotal: price,
          isCustomPhoto: false,
          zones: ['none'],
        });
      } else if (item.category === 'custom_photo' || item.serviceId === 'custom_photo_service') {
        hasPhotoAppraisal = true;
        verifiedItems.push({
          cartItemId: item.cartItemId || crypto.randomUUID(),
          serviceId: 'custom_photo_service',
          name: 'Индивидуальная задача / Оценка по фото',
          category: 'custom_photo',
          carClass: carClass as CarClass,
          isDirty: Boolean(isDirty),
          quantity: 1,
          unitPrice: 0,
          itemTotal: 0,
          isCustomPhoto: true,
          customDescription: item.customDescription || 'Оценка по фото',
          zones: ['none'],
        });
      } else {
        const tariff = tariffMap.get(item.serviceId);
        if (!tariff) {
          continue;
        }

        const qty = Math.max(1, Math.min(tariff.maxQuantity || 8, Number(item.quantity) || 1));
        const { unitPrice, itemTotal } = calculateItemPrice(
          tariff,
          carClass as CarClass,
          Boolean(isDirty),
          qty,
          settings.dirtyCarMarkupPercent
        );

        verifiedItems.push({
          cartItemId: item.cartItemId || crypto.randomUUID(),
          serviceId: tariff.id,
          name: tariff.name,
          category: tariff.category,
          carClass: carClass as CarClass,
          isDirty: Boolean(isDirty),
          quantity: qty,
          unitPrice,
          itemTotal,
          isCustomPhoto: false,
          zones: tariff.zones,
        });
      }
    }

    if (verifiedItems.length === 0) {
      return NextResponse.json(
        { error: 'Не удалось проверить выбранные услуги' },
        { status: 400 }
      );
    }

    // Итоговый серверный расчёт заявки
    const format = serviceFormat === 'mobile' ? 'mobile' : 'studio';
    let pricing = calculateOrderSummary(
      verifiedItems,
      carClass as CarClass,
      Boolean(isDirty),
      format,
      {
        minOrderAmount: settings.minOrderAmount,
        dirtyCarMarkupPercent: settings.dirtyCarMarkupPercent,
        mobileServicePrice: settings.mobileServicePrice,
        mobileServiceEnabled: settings.mobileServiceEnabled,
      }
    );

    // Для ручных заказов администратора с фиксированной ценой
    if (isAdminCreated && adminPrice != null) {
      const fixedPrice = Math.max(0, Number(adminPrice) || 0);
      pricing = {
        ...pricing,
        itemsSubtotal: fixedPrice,
        workTotal: fixedPrice,
        preliminaryTotal: fixedPrice,
        displayTotalFormatted: `${fixedPrice.toLocaleString('ru-RU')} ₽`,
      };
    }

    // Фотографии (добровольное прикрепление до 3 шт)
    const safePhotos: OrderPhoto[] = Array.isArray(photos) ? photos : [];

    // Генерация криптографически случайного токена для приватной ссылки
    const token = crypto.randomBytes(16).toString('hex');

    // Сохранение в БД
    const newOrder = await prisma.order.create({
      data: {
        token,
        idempotencyKey: idempotencyKey || null,
        status: isAdminCreated ? 'agreed' : 'new',
        source: source ? String(source) : (isAdminCreated ? 'phone_admin' : 'direct'),
        clientName: String(clientName).trim(),
        clientPhone: String(clientPhone).trim(),
        carBrandModel: effectiveCarBrandModel,
        carLicensePlate: carLicensePlate ? String(carLicensePlate).trim().toUpperCase() : null,
        carClass: String(effectiveCarClass),
        isDirty: Boolean(isDirty),
        serviceFormat: format,
        deliveryAddress: format === 'mobile' ? String(deliveryAddress || '').trim() : null,
        desiredDate: desiredDate ? String(desiredDate) : null,
        desiredTime: desiredTime ? String(desiredTime) : null,
        knownSubtotal: pricing.workTotal,
        mobileFee: pricing.mobileFee,
        preliminaryTotal: pricing.preliminaryTotal,
        hasPhotoAppraisal: pricing.hasPhotoAppraisal,
        clientComment: clientComment ? String(clientComment).trim() : null,
        itemsJson: JSON.stringify(verifiedItems),
        photosJson: JSON.stringify(safePhotos),
        tariffsSnapshotJson: JSON.stringify({
          tariffs: settings.tariffs,
          minOrderAmount: settings.minOrderAmount,
          dirtyCarMarkupPercent: settings.dirtyCarMarkupPercent,
          mobileServicePrice: settings.mobileServicePrice,
        }),
      },
    });

    // Синхронизация с системой бронирования слотов и боксов
    if (desiredDate && desiredTime) {
      try {
        const demoUser = await prisma.user.findFirst({
          where: { OR: [{ id: 'demo-master-id' }, { slug: 'demo' }] },
          include: { services: true },
        });

        if (demoUser && demoUser.services.length > 0) {
          // Интеллектуальное сопоставление и суммирование времени ВСЕХ услуг в корзине
          const serviceIds = verifiedItems.map((item) => item.serviceId || item.name);
          const primaryCartItem = verifiedItems[0];
          const matchedService = resolveBookingService(demoUser.services, primaryCartItem?.serviceId || primaryCartItem?.name) || demoUser.services[0];

          let totalActive = 0;
          let maxCure = 0;
          let maxBuffer = 15;

          for (const item of verifiedItems) {
            const s = resolveBookingService(demoUser.services, item.serviceId || item.name);
            if (s) {
              const qty = Math.max(1, item.quantity || 1);
              totalActive += (s.activeDurationMinutes || s.durationMinutes || 60) * qty;
              maxCure = Math.max(maxCure, s.cureDurationMinutes || 0);
              maxBuffer = Math.max(maxBuffer, s.bufferMinutes || 15);
            }
          }

          const [startHour, startMin] = desiredTime.split(':').map(Number);
          const [year, month, day] = desiredDate.split('-').map(Number);
          const startDate = new Date(year, month - 1, day, startHour, startMin, 0);

          await createBookingWithTransaction({
            userIdOrSlug: demoUser.id,
            serviceId: matchedService.id,
            serviceIds,
            customDuration: {
              activeMinutes: totalActive,
              cureMinutes: maxCure,
              bufferMinutes: maxBuffer,
            },
            clientName: String(clientName).trim(),
            clientPhone: String(clientPhone).trim(),
            startAt: startDate.toISOString(),
            carClass: String(effectiveCarClass),
            workbayId: workbayId ? String(workbayId) : undefined,
            notes: `Заказ #${newOrder.id.slice(-6)} • ${effectiveCarBrandModel} • ${format === 'mobile' ? 'Выезд' : 'В студии'}`,
            orderId: newOrder.id,
          });
        }
      } catch (bookingErr) {
        console.warn('Non-blocking booking sync note:', bookingErr);
      }
    }

    // Отправка Telegram уведомления (асинхронно, не блокируя ответ клиенту)
    const host = req.headers.get('host') || 'localhost:3000';
    const proto = req.headers.get('x-forwarded-proto') || 'http';
    notifyNewOrder({
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
    }, `${proto}://${host}`).catch((e) => console.warn('Telegram notify error:', e));

    return NextResponse.json({
      success: true,
      token: newOrder.token,
      id: newOrder.id,
    });
  } catch (err: any) {
    console.error('Error creating order:', err);
    return NextResponse.json(
      { error: err.message || 'Внутренняя ошибка сервера при создании заявки' },
      { status: 500 }
    );
  }
}
