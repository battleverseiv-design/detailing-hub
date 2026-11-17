import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getPublicSettings } from '@/lib/studio-service';
import { CartItem, OrderPhoto } from '@/types';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Phone, 
  Send, 
  MapPin, 
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  XCircle,
  FileText,
  Warehouse
} from 'lucide-react';
import { ClientTrackingActions } from './ClientTrackingActions';

interface OrderPageProps {
  params: Promise<{ token: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { token } = await params;
  if (!token) notFound();

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

  if (!order) notFound();

  const settings = await getPublicSettings();

  const items: CartItem[] = JSON.parse(order.itemsJson || '[]');
  const photos: OrderPhoto[] = JSON.parse(order.photosJson || '[]');

  // Цифровой акт
  const damages: Array<{ id: string; zone: string; type: string; description?: string }> = JSON.parse(order.damagesJson || '[]');
  const photosBefore: Array<{ id: string; url?: string; description?: string }> = JSON.parse(order.inspectionPhotosBeforeJson || '[]');
  const photosAfter: Array<{ id: string; url?: string; description?: string }> = JSON.parse(order.inspectionPhotosAfterJson || '[]');
  const hasDigitalAct = Boolean(order.actCompletedAt || order.carLicensePlate || damages.length > 0 || photosBefore.length > 0 || photosAfter.length > 0);

  // Вычисление ISO строки запланированного заезда
  const scheduledDateIso = order.booking?.startAt
    ? order.booking.startAt.toISOString()
    : order.agreedEntryDateTime
    ? new Date(order.agreedEntryDateTime).toISOString()
    : order.desiredDate
    ? new Date(`${order.desiredDate}T${order.desiredTime || '09:00'}:00`).toISOString()
    : null;

  // Статусы заявки
  const statusLabels: Record<string, { label: string; color: string; desc: string; step: number }> = {
    new: {
      label: 'Заявка принята',
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      desc: 'Администратор студии проверяет детали и свяжется с вами для подтверждения времени заезда.',
      step: 1,
    },
    agreed: {
      label: 'Запись подтверждена',
      color: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
      desc: 'Время заезда и пост зафиксированы в графике. Ждём ваш автомобиль в назначенный час!',
      step: 2,
    },
    in_progress: {
      label: 'Автомобиль в работе в боксе',
      color: 'bg-purple-500/10 text-purple-300 border-purple-500/30',
      desc: 'Автомобиль находится в тёплом боксе. Мастера бережно выполняют технологический комплекс детейлинга.',
      step: 3,
    },
    ready: {
      label: 'Автомобиль готов к выдаче!',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      desc: 'Все работы выполнены, финишный контроль пройден! Ваш автомобиль сияет чистотой и ожидает выдачи.',
      step: 4,
    },
    completed: {
      label: 'Заказ завершён',
      color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
      desc: `Автомобиль выдан владельцу. Спасибо за доверие к ${settings.shortName || settings.studioName || 'нашей студии'}!`,
      step: 4,
    },
    cancelled: {
      label: 'Запись отменена',
      color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
      desc: 'Бронирование отменено. Пост в расписании освобождён. Будем рады видеть вас снова!',
      step: 0,
    },
  };

  const statusInfo = statusLabels[order.status] || statusLabels.new;
  const currentStep = statusInfo.step;

  const timelineSteps = [
    { num: 1, title: 'Заявка принята', desc: 'Проверка администратором' },
    { num: 2, title: 'Запись подтверждена', desc: 'Бокс забронирован' },
    { num: 3, title: 'В работе в боксе', desc: 'Детейлинг и контроль' },
    { num: 4, title: 'Готов к выдаче!', desc: 'Ожидает владельца' },
  ];

  const totalAmount = order.agreedFinalPrice != null ? order.agreedFinalPrice : order.preliminaryTotal;
  const createdDateStr = new Date(order.createdAt).toLocaleDateString('ru-RU');

  return (
    <div className="min-h-screen flex flex-col bg-zinc-950 text-zinc-100 transition-colors">
      
      {/* ------------------------------------------------------------- */}
      {/* ЭКРАННАЯ ВЕРСИЯ (СКРЫВАЕТСЯ ПРИ ПЕЧАТИ/PDF ЧЕРЕЗ print:hidden) */}
      {/* ------------------------------------------------------------- */}
      <div className="print:hidden">
        <Header settings={settings} />

        <main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
          
          {/* Кнопка назад на главную */}
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Вернуться на главную</span>
          </Link>

          {/* Главная карточка статуса заказа */}
          <div className="bg-zinc-900/90 rounded-3xl p-6 sm:p-8 border border-zinc-800 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.color}`}>
                    {statusInfo.label}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    № DH-{order.id.slice(0, 8).toUpperCase()}
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {order.carBrandModel}
                </h1>
                <p className="text-xs sm:text-sm text-zinc-400 mt-1 max-w-xl">
                  {statusInfo.desc}
                </p>
              </div>

              {/* Клиентские кнопки действий (Печать PDF, отмена, звонок, Telegram) */}
              <ClientTrackingActions 
                token={order.token} 
                status={order.status}
                scheduledDateIso={scheduledDateIso}
                workbayName={order.booking?.workbay?.name}
                telegramUrl={settings.telegramUrl}
                phone={settings.phone}
              />
            </div>

            {/* БАННЕР ПРИ ОТМЕНЕ ЗАКАЗА */}
            {order.status === 'cancelled' && (
              <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-rose-300 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <XCircle className="w-5 h-5 shrink-0" />
                  <span>Бронирование официально отменено</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {order.cancelledAt && (
                    <span className="block font-mono text-[11px] text-zinc-400 mb-1">
                      Дата отмены: {new Date(order.cancelledAt).toLocaleString('ru-RU')}
                      {order.cancelledBy === 'client' ? ' (по инициативе клиента)' : ' (через администратора)'}
                    </span>
                  )}
                  {order.cancelReason && (
                    <span className="block text-zinc-300">
                      <strong>Причина:</strong> {order.cancelReason}
                    </span>
                  )}
                </p>
                <div className="pt-2">
                  <Link
                    href="/"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
                  >
                    Записаться на другое удобное время
                  </Link>
                </div>
              </div>
            )}

            {/* ИНТЕРАКТИВНЫЙ ТАЙМЛАЙН СТАТУСА (LIVE ORDER STATUS) */}
            {order.status !== 'cancelled' && (
              <div className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-400 pb-1">
                  <span className="flex items-center gap-1.5 text-white">
                    <Clock className="w-3.5 h-3.5 text-sky-400" />
                    <span>Статус выполнения</span>
                  </span>
                  <span className="text-[11px] font-mono text-zinc-500">
                    Этап {currentStep} из 4
                  </span>
                </div>

                {/* Прогресс-бар */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {timelineSteps.map((step) => {
                    const isDone = currentStep >= step.num;
                    const isCurrent = currentStep === step.num;

                    return (
                      <div
                        key={step.num}
                        className={`p-3 rounded-xl border transition-all ${
                          isCurrent
                            ? 'bg-sky-500/15 border-sky-500/40 text-white shadow-lg shadow-sky-500/10'
                            : isDone
                            ? 'bg-zinc-900 border-emerald-500/30 text-zinc-300'
                            : 'bg-zinc-900/40 border-zinc-800/50 text-zinc-600'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-1 mb-1.5">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${
                            isCurrent ? 'text-sky-300' : isDone ? 'text-emerald-400' : 'text-zinc-500'
                          }`}>
                            Этап {step.num}
                          </span>
                          {isDone && !isCurrent ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          ) : isCurrent ? (
                            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                          ) : null}
                        </div>
                        <div className="font-extrabold text-xs text-white leading-tight">
                          {step.title}
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-0.5 truncate">
                          {step.desc}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Согласованное время, Бокс и Финансы */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              
              {/* Карточка даты и времени */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Время заезда
                </span>
                {order.agreedEntryDateTime ? (
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm sm:text-base">
                    <Calendar className="w-4 h-4 shrink-0" />
                    <span>{order.agreedEntryDateTime}</span>
                  </div>
                ) : order.desiredDate ? (
                  <div className="flex items-center gap-2 text-zinc-300 text-sm font-semibold">
                    <Clock className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>
                      {order.desiredDate} {order.desiredTime && `в ${order.desiredTime}`}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-zinc-500">На согласовании</span>
                )}
                {order.booking?.workbay?.name && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-zinc-800/60 text-xs text-sky-300 font-semibold">
                    <Warehouse className="w-3.5 h-3.5 shrink-0" />
                    <span>{order.booking.workbay.name}</span>
                  </div>
                )}
              </div>

              {/* Карточка локации / формата */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Формат обслуживания
                </span>
                <div className="flex items-center gap-2 font-bold text-white text-sm">
                  <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                  <span>{order.serviceFormat === 'mobile' ? 'Выезд мастера' : 'В студии'}</span>
                </div>
                <span className="text-[10px] text-zinc-400 block mt-1 truncate">
                  {order.serviceFormat === 'mobile'
                    ? order.deliveryAddress || 'Адрес согласовывается'
                    : settings.address}
                </span>
              </div>

              {/* Карточка стоимости */}
              <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80">
                <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  {order.agreedFinalPrice != null ? 'Согласованная стоимость' : 'Предварительный расчёт'}
                </span>
                <div className="text-lg sm:text-xl font-extrabold text-sky-400">
                  {totalAmount.toLocaleString('ru-RU')} ₽
                </div>
                <span className="text-[10px] text-zinc-400 block mt-1">
                  {order.isPaid ? '✓ Оплачено' : 'Оплата после приёмки авто'}
                </span>
              </div>
            </div>

            {/* Состав услуг */}
            <div>
              <h3 className="font-extrabold text-sm text-white uppercase tracking-wider mb-3">
                Выбранные услуги ({items.length})
              </h3>
              <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-950/40">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3.5 sm:p-4 flex items-center justify-between gap-4 text-xs">
                    <div className="flex-1 min-w-0">
                      <span className="font-bold text-white block">
                        {item.name}
                      </span>
                      {item.isCustomPhoto ? (
                        <span className="text-[11px] text-sky-400 font-semibold">
                          Оценка стоимости по прикреплённым фото
                        </span>
                      ) : item.quantity > 1 ? (
                        <span className="text-[11px] text-zinc-400">
                          {item.quantity} шт × {item.unitPrice.toLocaleString('ru-RU')} ₽
                        </span>
                      ) : null}
                    </div>
                    <span className="font-extrabold text-white shrink-0">
                      {item.isCustomPhoto ? 'По фото' : `${item.itemTotal.toLocaleString('ru-RU')} ₽`}
                    </span>
                  </div>
                ))}
              </div>

              {/* Дополнительные параметры заказа */}
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {order.isDirty && (
                  <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30 font-medium">
                    ✓ Учтена надбавка за сильные загрязнения (+{settings.dirtyCarMarkupPercent}%)
                  </span>
                )}
                {order.mobileFee > 0 && (
                  <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/30 font-medium">
                    ✓ Выезд мастера (+{order.mobileFee} ₽)
                  </span>
                )}
              </div>
            </div>

            {/* Прикрепленные фото клиентом */}
            {photos.length > 0 && (
              <div>
                <h3 className="font-extrabold text-sm text-white uppercase tracking-wider mb-2">
                  Прикреплённые фотографии ({photos.length})
                </h3>
                <div className="flex flex-wrap gap-3">
                  {photos.map((p) => (
                    <div
                      key={p.id}
                      className="w-24 h-24 rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/photos/${p.id}?token=${order.token}`}
                        alt="Фото авто"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Цифровой акт осмотра и приёмки автомобиля */}
            {hasDigitalAct && (
              <div className="pt-6 border-t border-zinc-800 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                      <span>Электронный акт приёмки автомобиля</span>
                    </h3>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Фиксация состояния кузова, пробега и фотоотчёт до начала работ
                    </p>
                  </div>

                  {order.actCompletedAt ? (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/30 flex items-center gap-1.5 self-start sm:self-auto">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Осмотр зафиксирован {new Date(order.actCompletedAt).toLocaleDateString('ru-RU')}</span>
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-zinc-800 text-zinc-400 text-xs font-medium self-start sm:self-auto">
                      Осмотр в процессе
                    </span>
                  )}
                </div>

                {/* Параметры авто (отображаем только реально заполненные поля) */}
                {(order.carLicensePlate || order.carVin || order.mileage != null || order.fuelLevel != null) && (
                  <div className="flex flex-wrap gap-4 sm:gap-6 p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800/80 text-xs">
                    {order.carLicensePlate && (
                      <div className="min-w-[120px]">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-0.5">Госномер</span>
                        <span className="font-mono font-bold text-white tracking-wider">
                          {order.carLicensePlate}
                        </span>
                      </div>
                    )}
                    {order.carVin && (
                      <div className="min-w-[120px]">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-0.5">VIN код</span>
                        <span className="font-mono font-bold text-white truncate block">
                          {order.carVin.length > 10 ? `${order.carVin.slice(0, 10)}...` : order.carVin}
                        </span>
                      </div>
                    )}
                    {order.mileage != null && (
                      <div className="min-w-[120px]">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-0.5">Пробег</span>
                        <span className="font-mono font-bold text-white">
                          {order.mileage.toLocaleString()} км
                        </span>
                      </div>
                    )}
                    {order.fuelLevel != null && (
                      <div className="min-w-[120px]">
                        <span className="text-[10px] text-zinc-400 uppercase font-bold block mb-0.5">Топливо</span>
                        <span className="font-mono font-bold text-white">
                          {order.fuelLevel}%
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Фотоотчёт ДО работ */}
                {photosBefore.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-zinc-400 block mb-2">
                      Фотофиксация ДО работ ({photosBefore.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {photosBefore.map((p) => {
                        const photoUrl = p.id ? `/api/photos/${p.id}?token=${order.token}` : (p.url ? (p.url.includes('?') ? `${p.url}&token=${order.token}` : `${p.url}?token=${order.token}`) : '');
                        return (
                          <a
                            key={p.id}
                            href={photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 block hover:border-zinc-700 transition-colors"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photoUrl} alt="Фото до" className="w-full h-full object-cover" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Фотоотчёт ПОСЛЕ работ */}
                {photosAfter.length > 0 && (
                  <div>
                    <span className="text-xs font-bold text-emerald-400 block mb-2">
                      Фотофиксация ПОСЛЕ работ ({photosAfter.length})
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {photosAfter.map((p) => {
                        const photoUrl = p.id ? `/api/photos/${p.id}?token=${order.token}` : (p.url ? (p.url.includes('?') ? `${p.url}&token=${order.token}` : `${p.url}?token=${order.token}`) : '');
                        return (
                          <a
                            key={p.id}
                            href={photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-video rounded-xl overflow-hidden border border-emerald-500/30 bg-zinc-900 block hover:border-emerald-500/50 transition-colors"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={photoUrl} alt="Фото после" className="w-full h-full object-cover" />
                          </a>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>

        <Footer settings={settings} />
      </div>

      {/* ------------------------------------------------------------- */}
      {/* ПЕЧАТНАЯ ВЕРСИЯ: ОФИЦИАЛЬНЫЙ ЗАКАЗ-НАРЯД А4 (ДЛЯ PDF И ПЕЧАТИ) */}
      {/* ------------------------------------------------------------- */}
      <div className="hidden print:block print:w-full print:bg-white print:text-black print:p-8 text-black bg-white">
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            body { background: #FFFFFF !important; color: #000000 !important; }
            @page { size: A4; margin: 15mm 15mm 15mm 15mm; }
          }
        `}} />

        {/* Шапка студии */}
        <div className="border-b-2 border-black pb-4 mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-black uppercase">
              {settings.shortName || settings.studioName || 'Студия Детейлинга'}
            </h1>
            <p className="text-xs text-neutral-600 mt-0.5">
              Студия профессионального детейлинга и ухода за автомобилями
            </p>
            <p className="text-xs text-neutral-600 mt-1">
              Адрес: {settings.city ? `${settings.city}, ` : ''}{settings.address}
            </p>
          </div>
          <div className="text-right text-xs space-y-0.5">
            <p className="font-bold text-sm text-black">Тел: {settings.phone}</p>
            <p className="text-neutral-700">Часы работы: {settings.workHours}</p>
            <p className="text-neutral-500 font-mono mt-1">Дата формирования: {new Date().toLocaleDateString('ru-RU')}</p>
          </div>
        </div>

        {/* Заголовок Заказ-наряда */}
        <div className="mb-6 bg-neutral-100 p-4 border border-neutral-300 rounded">
          <div className="flex justify-between items-center">
            <div>
              <span className="text-xs uppercase font-bold text-neutral-500 tracking-wider block">Официальный документ</span>
              <h2 className="text-xl font-bold text-black">
                ЗАКАЗ-НАРЯД № DH-{order.id.slice(0, 8).toUpperCase()}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold block text-neutral-700">
                Статус: {statusInfo.label}
              </span>
              <span className="text-xs text-neutral-500 font-mono">
                Оформлен: {createdDateStr}
              </span>
            </div>
          </div>
        </div>

        {/* 1. Блок: Данные Заказчика и Автомобиля */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-1 mb-2">
            1. Данные Заказчика и Транспортного Средства
          </h3>
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
            <div><span className="font-semibold text-neutral-600">Заказчик (ФИО):</span> <span className="font-bold text-black">{order.clientName}</span></div>
            <div><span className="font-semibold text-neutral-600">Контактный телефон:</span> <span className="font-bold text-black">{order.clientPhone}</span></div>
            <div><span className="font-semibold text-neutral-600">Автомобиль:</span> <span className="font-bold text-black">{order.carBrandModel}</span> (Класс: {order.carClass})</div>
            <div><span className="font-semibold text-neutral-600">Государственный номер:</span> <span className="font-bold font-mono text-black">{order.carLicensePlate || 'Не указан'}</span></div>
            <div><span className="font-semibold text-neutral-600">VIN-номер:</span> <span className="font-mono text-black">{order.carVin || 'Не указан'}</span></div>
            <div><span className="font-semibold text-neutral-600">Пробег при сдаче:</span> <span className="font-mono text-black">{order.mileage != null ? `${order.mileage.toLocaleString()} км` : 'Не зафиксирован'}</span></div>
            <div><span className="font-semibold text-neutral-600">Запланированный заезд:</span> <span className="font-bold text-black">{order.agreedEntryDateTime || order.desiredDate || 'По согласованию'}</span></div>
            <div><span className="font-semibold text-neutral-600">Назначенный пост:</span> <span className="font-black text-black">{order.booking?.workbay?.name || 'Бокс студии'}</span></div>
          </div>
        </div>

        {/* 2. Блок: Перечень выполненных / заказанных работ */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-1 mb-2">
            2. Перечень заказанных услуг и материалов
          </h3>
          <table className="w-full text-xs border border-collapse border-neutral-300">
            <thead>
              <tr className="bg-neutral-100 border-b border-neutral-300 text-neutral-700">
                <th className="py-1.5 px-2 text-left font-bold w-8">№</th>
                <th className="py-1.5 px-2 text-left font-bold">Наименование комплекса / услуги</th>
                <th className="py-1.5 px-2 text-center font-bold w-16">Кол-во</th>
                <th className="py-1.5 px-2 text-right font-bold w-28">Цена, ₽</th>
                <th className="py-1.5 px-2 text-right font-bold w-28">Сумма, ₽</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {items.map((it, idx) => (
                <tr key={idx}>
                  <td className="py-1.5 px-2 text-neutral-500 font-mono">{idx + 1}</td>
                  <td className="py-1.5 px-2 font-medium text-black">{it.name}</td>
                  <td className="py-1.5 px-2 text-center font-mono">{it.quantity}</td>
                  <td className="py-1.5 px-2 text-right font-mono">{it.unitPrice.toLocaleString('ru-RU')} ₽</td>
                  <td className="py-1.5 px-2 text-right font-bold font-mono">{it.itemTotal.toLocaleString('ru-RU')} ₽</td>
                </tr>
              ))}
              {order.isDirty && (
                <tr>
                  <td className="py-1.5 px-2 text-neutral-500 font-mono">{items.length + 1}</td>
                  <td className="py-1.5 px-2 font-medium text-black">Надбавка за сильное загрязнение (+{settings.dirtyCarMarkupPercent}%)</td>
                  <td className="py-1.5 px-2 text-center font-mono">1</td>
                  <td className="py-1.5 px-2 text-right font-mono">—</td>
                  <td className="py-1.5 px-2 text-right font-bold font-mono">Включено</td>
                </tr>
              )}
              {order.mobileFee > 0 && (
                <tr>
                  <td className="py-1.5 px-2 text-neutral-500 font-mono">{items.length + (order.isDirty ? 2 : 1)}</td>
                  <td className="py-1.5 px-2 font-medium text-black">Выезд мобильной бригады</td>
                  <td className="py-1.5 px-2 text-center font-mono">1</td>
                  <td className="py-1.5 px-2 text-right font-mono">{order.mobileFee} ₽</td>
                  <td className="py-1.5 px-2 text-right font-bold font-mono">{order.mobileFee.toLocaleString('ru-RU')} ₽</td>
                </tr>
              )}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-100 font-bold border-t-2 border-black text-black">
                <td colSpan={4} className="py-2 px-2 text-right uppercase">Итого к оплате:</td>
                <td className="py-2 px-2 text-right text-sm font-black font-mono">
                  {totalAmount.toLocaleString('ru-RU')} ₽
                </td>
              </tr>
            </tfoot>
          </table>
          <p className="text-[11px] text-neutral-600 mt-1">
            Статус расчётов: <strong>{order.isPaid ? 'ОПЛАЧЕНО ПОЛНОСТЬЮ' : 'ОПЛАТА ПОСЛЕ ПРИЁМКИ АВТОМОБИЛЯ'}</strong> 
            {order.paymentMethod ? ` (Способ: ${order.paymentMethod === 'card' ? 'Банковская карта' : order.paymentMethod === 'sbp' ? 'СБП' : 'Наличные'})` : ''}.
          </p>
        </div>

        {/* 3. Блок: Акт дефектовки и осмотра */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-black border-b border-black pb-1 mb-2">
            3. Дефектовочная ведомость первичного осмотра кузова
          </h3>
          {damages.length > 0 ? (
            <div className="border border-neutral-300 rounded p-2 text-xs space-y-1">
              <p className="font-semibold text-neutral-700">Зафиксированные эксплуатационные повреждения ЛКП на момент приёмки:</p>
              <ul className="list-disc list-inside text-neutral-800 space-y-0.5">
                {damages.map((d, i) => (
                  <li key={i}>
                    Зона: <strong>{d.zone}</strong> — дефект: <em>{d.type}</em> {d.description ? `(${d.description})` : ''}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-neutral-600 italic">
              Визуальных повреждений ЛКП, глубоких вмятин и очагов коррозии при первичном осмотре не зафиксировано.
            </p>
          )}
        </div>

        {/* 4. Блок: Правила и гарантийные обязательства */}
        <div className="mb-8 border border-neutral-300 rounded p-3 text-[10px] text-neutral-600 space-y-1 leading-relaxed">
          <p className="font-bold text-neutral-800 uppercase">Особые условия и памятка автовладельцу:</p>
          <p>1. Заказчик подтверждает отсутствие в салоне автомобиля денежных средств, ювелирных изделий и оружия.</p>
          <p>2. При нанесении защитных керамических составов запрещается бесконтактная мойка щелочной химией с pH &gt; 11 в течение 14 дней (период полимеризации).</p>
          <p>3. Претензии по внешнему виду и качеству оказанных услуг принимаются непосредственно при приёмке автомобиля.</p>
        </div>

        {/* 5. Блок: Подписи сторон */}
        <div className="grid grid-cols-2 gap-12 pt-4 border-t-2 border-black text-xs">
          <div>
            <p className="font-bold mb-8">Автомобиль для проведения работ сдал, с объёмом и стоимостью согласен:</p>
            <div className="border-b border-black pb-1 flex justify-between items-end">
              <span className="text-[10px] text-neutral-500">Подпись Заказчика</span>
              <span className="font-bold text-black">{order.clientName}</span>
            </div>
          </div>
          <div>
            <p className="font-bold mb-8">Автомобиль в работу принял, дефектовку кузова произвел:</p>
            <div className="border-b border-black pb-1 flex justify-between items-end">
              <span className="text-[10px] text-neutral-500">Подпись Мастера-приёмщика</span>
              <span className="font-bold text-black">{settings.shortName || settings.studioName || 'Студия Детейлинга'}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
