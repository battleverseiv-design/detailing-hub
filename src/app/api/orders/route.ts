import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { getStudioSettings } from '@/lib/studio-service';
import { calculateItemPrice, calculateOrderSummary } from '@/lib/pricing';
import { CarClass, CartItem, OrderPhoto } from '@/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      idempotencyKey,
      clientName,
      clientPhone,
      carBrandModel,
      carClass,
      isDirty,
      serviceFormat,
      deliveryAddress,
      desiredDate,
      desiredTime,
      clientComment,
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

    if (!Array.isArray(items) || items.length === 0) {
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

    for (const item of items) {
      if (item.category === 'custom_photo' || item.serviceId === 'custom_photo_service') {
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
    const pricing = calculateOrderSummary(
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

    // Фотографии (добровольное прикрепление до 3 шт)
    const safePhotos: OrderPhoto[] = Array.isArray(photos) ? photos : [];

    // Генерация криптографически случайного токена для приватной ссылки
    const token = crypto.randomBytes(16).toString('hex');

    // Сохранение в БД
    const newOrder = await prisma.order.create({
      data: {
        token,
        idempotencyKey: idempotencyKey || null,
        status: 'new',
        clientName: String(clientName).trim(),
        clientPhone: String(clientPhone).trim(),
        carBrandModel: effectiveCarBrandModel,
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

    // Синхронизация с системой бронирования слотов
    if (desiredDate && desiredTime) {
      try {
        const demoUser = await prisma.user.findFirst({
          where: { OR: [{ id: 'demo-master-id' }, { slug: 'demo' }] },
          include: { services: true },
        });

        if (demoUser && demoUser.services.length > 0) {
          const serviceToLink = demoUser.services[0];
          // Расчет времени начала и конца
          const [startHour, startMin] = desiredTime.split(':').map(Number);
          const [year, month, day] = desiredDate.split('-').map(Number);
          const startAt = new Date(Date.UTC(year, month - 1, day, startHour - 3, startMin, 0)); // Moscow UTC+3
          const endAt = new Date(startAt.getTime() + (serviceToLink.durationMinutes + serviceToLink.bufferMinutes) * 60000);

          await prisma.booking.create({
            data: {
              userId: demoUser.id,
              serviceId: serviceToLink.id,
              clientName: String(clientName).trim(),
              clientPhone: String(clientPhone).trim(),
              startAt,
              endAt,
              status: 'confirmed',
              notes: `Заявка с сайта #${newOrder.id.slice(-6)}. Формат: ${format === 'mobile' ? 'Выезд' : 'Студия'}. Авто: ${effectiveCarBrandModel}`,
            },
          });
        }
      } catch (bookingErr) {
        console.warn('Non-blocking booking sync note:', bookingErr);
      }
    }

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
