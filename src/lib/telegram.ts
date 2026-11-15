import { TelegramUser, TelegramWebApp } from '@/types/telegram';

/**
 * Получить экземпляр Telegram WebApp (если приложение запущено внутри Telegram)
 */
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

/**
 * Проверить, открыто ли приложение внутри Telegram
 */
export function isRunningInTelegram(): boolean {
  const tg = getTelegramWebApp();
  return Boolean(tg && tg.initData && tg.initData.length > 0);
}

/**
 * Инициализация Telegram WebApp
 */
export function initTelegramApp() {
  const tg = getTelegramWebApp();
  if (!tg) return;

  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor('#090a0d');
    tg.setBackgroundColor('#090a0d');
    tg.enableClosingConfirmation();
  } catch (e) {
    console.warn('Telegram WebApp init warning:', e);
  }
}

/**
 * Получить данные текущего пользователя Telegram
 */
export function getTelegramUser(): TelegramUser | null {
  const tg = getTelegramWebApp();
  return tg?.initDataUnsafe?.user || null;
}

/**
 * Нативная тактильная отдача (вибрация Taptic Engine / Android Haptics)
 */
export function triggerHaptic(
  type: 'light' | 'medium' | 'heavy' | 'selection' | 'success' | 'warning' | 'error' = 'light'
) {
  const tg = getTelegramWebApp();
  if (!tg?.HapticFeedback) return;

  try {
    if (type === 'selection') {
      tg.HapticFeedback.selectionChanged();
    } else if (type === 'success' || type === 'warning' || type === 'error') {
      tg.HapticFeedback.notificationOccurred(type);
    } else {
      tg.HapticFeedback.impactOccurred(type);
    }
  } catch (e) {
    // Безопасно игнорируем, если не поддерживается
  }
}

/**
 * Показать нативную кнопку "Назад" в шапке Telegram
 */
export function showTelegramBackButton(onClick: () => void) {
  const tg = getTelegramWebApp();
  if (!tg?.BackButton) return;

  try {
    tg.BackButton.show();
    tg.BackButton.onClick(onClick);
  } catch (e) {
    console.warn('Error showing back button:', e);
  }
}

/**
 * Скрыть нативную кнопку "Назад" в Telegram
 */
export function hideTelegramBackButton(onClickHandler?: () => void) {
  const tg = getTelegramWebApp();
  if (!tg?.BackButton) return;

  try {
    if (onClickHandler) {
      tg.BackButton.offClick(onClickHandler);
    }
    tg.BackButton.hide();
  } catch (e) {
    console.warn('Error hiding back button:', e);
  }
}

/**
 * Безопасный переход по ссылке (Telegram / WhatsApp / Внешний сайт)
 * Внутри Telegram Mini App использует нативные методы WebApp.openTelegramLink / WebApp.openLink,
 * а в обычном браузере — стандартный переход через window.open.
 */
export function openTelegramOrExternalLink(url: string) {
  if (typeof window === 'undefined' || !url) return;
  const tg = getTelegramWebApp();

  if (tg) {
    try {
      if ((url.startsWith('https://t.me/') || url.startsWith('tg://')) && typeof tg.openTelegramLink === 'function') {
        tg.openTelegramLink(url);
        return;
      }
      if (typeof tg.openLink === 'function') {
        tg.openLink(url);
        return;
      }
    } catch (e) {
      console.warn('WebApp openLink fallback:', e);
    }
  }

  window.open(url, '_blank', 'noopener,noreferrer');
}

/**
 * -------------------------------------------------------------
 * СЕРВЕРНЫЕ УВЕДОМЛЕНИЯ ЧЕРЕЗ TELEGRAM BOT API
 * -------------------------------------------------------------
 */

export interface TelegramMessageOptions {
  botToken?: string;
  chatId?: string;
  apiUrl?: string;
  parseMode?: 'Markdown' | 'HTML';
  replyMarkup?: any;
}

/**
 * Отправка сообщения в Telegram через Bot API с таймаутом 3500мс
 */
export async function sendTelegramMessage(
  text: string,
  options?: TelegramMessageOptions
): Promise<boolean> {
  const token = options?.botToken || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = options?.chatId || process.env.TELEGRAM_CHAT_ID;
  const rawApiUrl = options?.apiUrl || process.env.TELEGRAM_API_URL || 'https://api.telegram.org';
  const baseApiUrl = rawApiUrl.replace(/\/$/, '');

  if (!token || !chatId) {
    // В dev-режиме или при пустых ключах логируем в консоль (mock-режим)
    console.log('[Telegram Mock Notification]:\n', text);
    return true;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);

  try {
    const url = `${baseApiUrl}/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options?.parseMode || 'HTML',
        reply_markup: options?.replyMarkup,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    return res.ok;
  } catch (err) {
    clearTimeout(timeoutId);
    console.warn('Failed to send Telegram message (timeout or network):', err);
    return false;
  }
}

/**
 * Тестовая отправка сообщения для проверки подключения в админке
 */
export async function testTelegramConnection(
  token: string,
  chatId: string,
  apiUrl?: string
): Promise<{ success: boolean; message: string }> {
  if (!token || !chatId) {
    return { success: false, message: 'Укажите токен бота и Chat ID' };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 3500);
  const baseApiUrl = (apiUrl || 'https://api.telegram.org').replace(/\/$/, '');

  try {
    const url = `${baseApiUrl}/bot${token}/sendMessage`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: '🔔 <b>DetailingHub:</b> Тестовое уведомление успешно доставлено!\nИнтеграция с ботом настроена корректно.',
        parse_mode: 'HTML',
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      return { success: true, message: 'Тестовое сообщение успешно отправлено в Telegram!' };
    }
    const errData = await res.json().catch(() => ({}));
    return { success: false, message: `Ошибка Telegram API: ${errData.description || res.statusText}` };
  } catch (err: any) {
    clearTimeout(timeoutId);
    return { success: false, message: `Таймаут или ошибка сети: ${err.message || 'нет ответа'}` };
  }
}

/**
 * Уведомление о создании новой заявки / записи
 */
export async function notifyNewOrder(order: {
  id: string;
  token: string;
  clientName: string;
  clientPhone: string;
  carBrandModel: string;
  carClass: string;
  preliminaryTotal: number;
  agreedEntryDateTime?: string | null;
  desiredDate?: string | null;
  desiredTime?: string | null;
  serviceFormat: string;
  deliveryAddress?: string | null;
  items?: any[];
}, baseUrl: string = 'http://localhost:3000') {
  const itemsList = order.items?.map((it) => `• ${it.name}`).join('\n') || 'Комплекс услуг';
  const orderUrl = `${baseUrl}/order/${order.token}`;
  const adminUrl = `${baseUrl}/admin/orders`;

  const msg = `
🚗 <b>НОВАЯ ЗАЯВКА НА ДЕТЕЙЛИНГ #${order.id.slice(-6).toUpperCase()}</b>

👤 <b>Клиент:</b> ${order.clientName}
📞 <b>Телефон:</b> ${order.clientPhone}
🏎 <b>Авто:</b> ${order.carBrandModel} (Класс ${order.carClass})
💰 <b>Сумма:</b> ${order.preliminaryTotal.toLocaleString('ru-RU')} ₽
📍 <b>Формат:</b> ${order.serviceFormat === 'mobile' ? `Выезд: ${order.deliveryAddress || 'адрес согласуется'}` : 'В студии'}
⏰ <b>Время:</b> ${order.agreedEntryDateTime || `${order.desiredDate || 'Дата не выбрана'} ${order.desiredTime || ''}`}

<b>Услуги:</b>
${itemsList}

🔗 <a href="${orderUrl}">Ссылка клиента</a> | <a href="${adminUrl}">Панель администратора</a>
`.trim();

  return sendTelegramMessage(msg);
}

/**
 * Уведомление клиента об изменении статуса или подтверждении времени заезда
 */
export async function notifyOrderStatusChanged(order: {
  token: string;
  clientName: string;
  carBrandModel: string;
  status: string;
  agreedEntryDateTime?: string | null;
  agreedFinalPrice?: number | null;
}, baseUrl: string = 'http://localhost:3000') {
  const orderUrl = `${baseUrl}/order/${order.token}`;

  let statusText = 'Обновлен статус заказа';
  if (order.status === 'agreed') {
    statusText = `✅ <b>Запись подтверждена!</b>\nЖдём вас: <b>${order.agreedEntryDateTime || 'по согласованию'}</b>`;
  } else if (order.status === 'completed') {
    statusText = `✨ <b>Автомобиль готов к выдаче!</b>\nВсе работы по детейлингу успешно завершены.`;
  } else if (order.status === 'cancelled') {
    statusText = `❌ <b>Запись отменена.</b>`;
  }

  const msg = `
Уважаемый(ая) ${order.clientName}!
По вашей записи на автомобиль <b>${order.carBrandModel}</b>:

${statusText}

Посмотреть детали заказа и электронный чек-лист:
🔗 <a href="${orderUrl}">${orderUrl}</a>
`.trim();

  return sendTelegramMessage(msg);
}

/**
 * LTV и ретеншн: напоминание о повторном визите и уходе за покрытием (через 3-6 месяцев)
 */
export function generateRetentionReminder(order: {
  clientName: string;
  carBrandModel: string;
  token: string;
}, monthsPassed: number = 6, baseUrl: string = 'http://localhost:3000'): string {
  const orderUrl = `${baseUrl}/order/${order.token}`;
  return `
Здравствуйте, ${order.clientName}!
Прошло ${monthsPassed} месяцев с момента покрытия защитным составом вашего ${order.carBrandModel}.

Для сохранения максимального гидрофобного эффекта и блеска рекомендуется провести контрольную мойку и обновление защитного слоя (Top-Coat).

Записаться в 1 клик с сохранением истории автомобиля:
${orderUrl}
`.trim();
}

