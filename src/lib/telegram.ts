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
