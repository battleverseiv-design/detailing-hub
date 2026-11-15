import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getStudioSettings } from '@/lib/studio-service';
import { CartItem, OrderPhoto } from '@/types';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { ScratchCleanGame } from '@/components/game/ScratchCleanGame';
import { 
  CheckCircle2, 
  Clock, 
  Calendar, 
  Phone, 
  Send, 
  MessageSquare, 
  MapPin, 
  Copy, 
  ArrowLeft,
  Sparkles,
  ShieldCheck,
  AlertCircle
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
  });

  if (!order) notFound();

  const settings = await getStudioSettings();

  const items: CartItem[] = JSON.parse(order.itemsJson || '[]');
  const photos: OrderPhoto[] = JSON.parse(order.photosJson || '[]');

  // Статусы заявки
  const statusLabels: Record<string, { label: string; color: string; desc: string }> = {
    new: {
      label: 'Заявка принята',
      color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30',
      desc: 'Администратор проверяет детали и свяжется с вами для согласования времени заезда.',
    },
    agreed: {
      label: 'Запись подтверждена',
      color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
      desc: 'Время заезда зафиксировано. Ждём ваш автомобиль в назначенный час!',
    },
    completed: {
      label: 'Работы выполнены',
      color: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
      desc: 'Ваш автомобиль сияет чистотой и готов к выдаче.',
    },
    cancelled: {
      label: 'Заявка отменена',
      color: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border-zinc-500/30',
      desc: 'Запись была отменена. Вы можете создать новую в удобное время.',
    },
  };

  const statusInfo = statusLabels[order.status] || statusLabels.new;

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 transition-colors">
      <Header settings={settings} />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-8">
        
        {/* Кнопка назад на главную */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Вернуться на главную</span>
        </Link>

        {/* Главная карточка статуса заказа */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-100 dark:border-zinc-800/80">
            <div>
              <div className="flex items-center gap-2.5 mb-2">
                <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
                <span className="text-xs text-zinc-400">
                  № {order.id.slice(0, 8).toUpperCase()}
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-zinc-900 dark:text-white">
                {order.carBrandModel}
              </h1>
              <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                {statusInfo.desc}
              </p>
            </div>

            {/* Клиентские кнопки действий (копирование ссылки и т.д.) */}
            <ClientTrackingActions token={order.token} />
          </div>

          {/* Согласованное время и Финансы */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Карточка даты и времени */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Время заезда
              </span>
              {order.agreedEntryDateTime ? (
                <div className="flex items-center gap-2 font-bold text-emerald-600 dark:text-emerald-400 text-sm sm:text-base">
                  <Calendar className="w-4 h-4" />
                  <span>{order.agreedEntryDateTime}</span>
                </div>
              ) : order.desiredDate ? (
                <div className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 text-sm font-semibold">
                  <Clock className="w-4 h-4 text-sky-500" />
                  <span>
                    {order.desiredDate} {order.desiredTime && `в ${order.desiredTime}`}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-zinc-500">На согласовании</span>
              )}
              <span className="text-[10px] text-zinc-400 block mt-1">
                {order.agreedEntryDateTime ? 'Подтверждено студией' : 'Предварительное время'}
              </span>
            </div>

            {/* Карточка локации / формата */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Формат обслуживания
              </span>
              <div className="flex items-center gap-2 font-bold text-zinc-900 dark:text-white text-sm">
                <MapPin className="w-4 h-4 text-sky-500" />
                <span>{order.serviceFormat === 'mobile' ? 'Выезд мастера' : 'В студии'}</span>
              </div>
              <span className="text-[10px] text-zinc-400 block mt-1 truncate">
                {order.serviceFormat === 'mobile'
                  ? order.deliveryAddress || 'Адрес согласовывается'
                  : settings.address}
              </span>
            </div>

            {/* Карточка стоимости */}
            <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-950/60 border border-zinc-200/80 dark:border-zinc-800/80">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                {order.agreedFinalPrice != null ? 'Согласованная стоимость' : 'Предварительный расчёт'}
              </span>
              <div className="text-lg sm:text-xl font-extrabold text-sky-600 dark:text-sky-400">
                {order.agreedFinalPrice != null
                  ? `${order.agreedFinalPrice.toLocaleString('ru-RU')} ₽`
                  : order.hasPhotoAppraisal
                  ? `от ${order.preliminaryTotal.toLocaleString('ru-RU')} ₽ + по фото`
                  : `${order.preliminaryTotal.toLocaleString('ru-RU')} ₽`}
              </div>
              <span className="text-[10px] text-zinc-400 block mt-1">
                Оплата после выполнения
              </span>
            </div>

          </div>

          {/* Состав заказа */}
          <div>
            <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase tracking-wider mb-3">
              Состав выбранных услуг ({items.length})
            </h3>
            <div className="space-y-2">
              {items.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-950/40 border border-zinc-100 dark:border-zinc-800 flex items-center justify-between text-xs sm:text-sm"
                >
                  <div>
                    <span className="font-bold text-zinc-800 dark:text-zinc-200 block">
                      {item.name}
                    </span>
                    {item.isCustomPhoto ? (
                      <span className="text-[11px] text-sky-600 dark:text-sky-400">
                        {item.customDescription || 'Оценка по фото'}
                      </span>
                    ) : item.quantity > 1 ? (
                      <span className="text-[11px] text-zinc-400">
                        {item.quantity} шт × {item.unitPrice.toLocaleString('ru-RU')} ₽
                      </span>
                    ) : null}
                  </div>
                  <span className="font-extrabold text-zinc-900 dark:text-white shrink-0">
                    {item.isCustomPhoto ? 'По фото' : `${item.itemTotal.toLocaleString('ru-RU')} ₽`}
                  </span>
                </div>
              ))}
            </div>

            {/* Дополнительные параметры заказа */}
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {order.isDirty && (
                <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/30 font-medium">
                  ✓ Учтена надбавка за сильные загрязнения (+{settings.dirtyCarMarkupPercent}%)
                </span>
              )}
              {order.mobileFee > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/30 font-medium">
                  ✓ Выезд мастера (+{order.mobileFee} ₽)
                </span>
              )}
            </div>
          </div>

          {/* Прикрепленные фото */}
          {photos.length > 0 && (
            <div>
              <h3 className="font-extrabold text-sm text-zinc-900 dark:text-white uppercase tracking-wider mb-2">
                Прикреплённые фотографии ({photos.length})
              </h3>
              <div className="flex flex-wrap gap-3">
                {photos.map((p) => (
                  <div
                    key={p.id}
                    className="w-24 h-24 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900"
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

          {/* Быстрая связь с администратором */}
          <div className="p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h4 className="font-bold text-sm text-sky-950 dark:text-sky-100">
                Остались вопросы или нужно изменить время?
              </h4>
              <p className="text-xs text-sky-800 dark:text-sky-300 mt-0.5">
                Напишите администратору в мессенджер — ответим в течение 10 минут.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <a
                href={settings.telegramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Telegram</span>
              </a>
              <a
                href={settings.whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>WhatsApp</span>
              </a>
            </div>
          </div>

        </div>

        {/* Интерактивная 2D мини-игра */}
        <ScratchCleanGame
          orderToken={order.token}
          gameSettings={settings.game}
          initialBonusCode={order.miniGameBonusCode}
          initialPlayed={order.miniGamePlayed}
        />

      </main>

      <Footer settings={settings} />
    </div>
  );
}
