'use client';

import React, { useState, useEffect } from 'react';
import { 
  CarClass, 
  CartItem, 
  OrderPhoto, 
  PricingSummary, 
  StudioSettings 
} from '@/types';
import { 
  ArrowLeft, 
  Camera, 
  Trash2, 
  Clock, 
  Calendar as CalendarIcon, 
  MapPin, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  Check, 
  Sparkles,
  Info
} from 'lucide-react';
import { getTelegramUser, triggerHaptic } from '@/lib/telegram';
import { Calendar } from '@/components/ui/calendar';

interface CheckoutRequestViewProps {
  items: CartItem[];
  pricing: PricingSummary;
  settings: StudioSettings;
  carClass: CarClass;
  isDirty: boolean;
  serviceFormat: 'studio' | 'mobile';
  onSetServiceFormat: (format: 'studio' | 'mobile') => void;
  onBack: () => void;
  onSuccess: (token: string) => void;
}

interface SlotItem {
  time: string;
  startAt: string;
  endAt: string;
  activeWorkEndAt?: string;
  cureEndAt?: string;
  isMultiDay?: boolean;
  workbayId?: string;
  workbayName?: string;
  available: boolean;
}

export function CheckoutRequestView({
  items,
  pricing,
  settings,
  carClass,
  isDirty,
  serviceFormat,
  onSetServiceFormat,
  onBack,
  onSuccess,
}: CheckoutRequestViewProps) {
  // Контакты
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+7 ');
  const [carBrandModel, setCarBrandModel] = useState('');
  const [carLicensePlate, setCarLicensePlate] = useState('');

  // Адрес
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [isOutsideCity, setIsOutsideCity] = useState(false);

  // Дата и время (локальная дата устройства пользователя без UTC-сдвига)
  const getLocalDateString = (d: Date = new Date()) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  const todayStr = getLocalDateString();
  const [desiredDate, setDesiredDate] = useState(todayStr);
  const [desiredTime, setDesiredTime] = useState('');
  const [slots, setSlots] = useState<SlotItem[]>([]);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const calendarRef = React.useRef<HTMLDivElement>(null);

  const selectedDate = React.useMemo(() => {
    if (!desiredDate) return undefined;
    const parts = desiredDate.split('-').map(Number);
    if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return undefined;
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }, [desiredDate]);

  const formattedDisplayDate = React.useMemo(() => {
    if (!selectedDate) return 'Выберите дату';
    return selectedDate.toLocaleDateString('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      weekday: 'short',
    });
  }, [selectedDate]);

  const handleSelectCalendarDate = (date: Date | undefined) => {
    if (!date) return;
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    setDesiredDate(`${y}-${m}-${d}`);
    setIsCalendarOpen(false);
    triggerHaptic('selection');
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false);
      }
    }
    if (isCalendarOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isCalendarOpen]);

  // Фото и комментарий
  const [uploadedPhotos, setUploadedPhotos] = useState<OrderPhoto[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [clientComment, setClientComment] = useState('');

  // Согласие с ПДн и отправка
  const [agreedPd, setAgreedPd] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Инициализация idempotencyKey и захват источника заявки (UTM / Referrer)
  useEffect(() => {
    if (!idempotencyKey) {
      setIdempotencyKey(crypto.randomUUID());
    }

    if (typeof window !== 'undefined') {
      try {
        if (!sessionStorage.getItem('detailing_utm_source')) {
          const params = new URLSearchParams(window.location.search);
          const utm = params.get('utm_source');
          if (utm) {
            sessionStorage.setItem('detailing_utm_source', utm);
          } else if (document.referrer) {
            const ref = document.referrer.toLowerCase();
            if (ref.includes('yandex')) sessionStorage.setItem('detailing_utm_source', 'Яндекс');
            else if (ref.includes('vk.com')) sessionStorage.setItem('detailing_utm_source', 'ВКонтакте');
            else if (ref.includes('2gis')) sessionStorage.setItem('detailing_utm_source', '2ГИС');
            else if (ref.includes('google')) sessionStorage.setItem('detailing_utm_source', 'Google');
            else if (ref.includes('t.me')) sessionStorage.setItem('detailing_utm_source', 'Telegram');
            else {
              try {
                sessionStorage.setItem('detailing_utm_source', new URL(document.referrer).hostname);
              } catch {
                sessionStorage.setItem('detailing_utm_source', 'Прямой переход');
              }
            }
          } else {
            sessionStorage.setItem('detailing_utm_source', 'Прямой переход');
          }
        }
      } catch (e) {
        // Safe fallback
      }
    }
  }, [idempotencyKey]);

  // Автоматическое предзаполнение данных из Telegram Mini App
  useEffect(() => {
    const tgUser = getTelegramUser();
    if (tgUser) {
      const fullName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
      if (fullName) {
        setClientName(fullName);
      }
      if (tgUser.username) {
        setClientComment((prev) => (prev ? prev : `Telegram: @${tgUser.username}`));
      }
    }
  }, []);

  // Загрузка реальных доступных слотов времени с бэкенда
  useEffect(() => {
    if (!desiredDate) return;

    let isMounted = true;
    setIsLoadingSlots(true);

    // Собираем все выбранные ID услуг и класс автомобиля для точного расчета двухфазного времени
    const primaryServiceId = items[0]?.serviceId || 'srv-dry-clean';
    const serviceIdsParam = items.map((i) => i.serviceId).filter(Boolean).join(',');

    fetch(
      `/api/slots?slug=demo&serviceId=${encodeURIComponent(primaryServiceId)}&serviceIds=${encodeURIComponent(serviceIdsParam)}&carClass=${encodeURIComponent(carClass)}&date=${desiredDate}`
    )
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && Array.isArray(data.slots)) {
          setSlots(data.slots);
          // Если текущее выбранное время отсутствует в новых слотах — сбрасываем
          if (desiredTime && !data.slots.some((s: SlotItem) => s.time === desiredTime && s.available)) {
            setDesiredTime('');
          }
        } else {
          setSlots([]);
        }
      })
      .catch(() => {
        if (isMounted) setSlots([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSlots(false);
      });

    return () => {
      isMounted = false;
    };
  }, [desiredDate, items]);

  // Форматирование телефона (+7 РФ/КЗ, +375 Беларусь, либо международный ввод СНГ)
  const handlePhoneChange = (val: string) => {
    let clean = val.replace(/[^\d+]/g, '');
    if (!clean.startsWith('+')) {
      if (clean.startsWith('8')) clean = '+7' + clean.slice(1);
      else if (clean.startsWith('7')) clean = '+' + clean;
      else if (clean.startsWith('375')) clean = '+' + clean;
      else clean = '+' + clean;
    }

    const digits = clean.replace(/\D/g, '');

    // Беларусь: +375 (XX) XXX-XX-XX
    if (digits.startsWith('375')) {
      let formatted = '+375';
      const rest = digits.slice(3);
      if (rest.length > 0) formatted += ' (' + rest.slice(0, 2);
      if (rest.length >= 2) formatted += ') ' + rest.slice(2, 5);
      if (rest.length >= 5) formatted += '-' + rest.slice(5, 7);
      if (rest.length >= 7) formatted += '-' + rest.slice(7, 9);
      setClientPhone(formatted);
      return;
    }

    // РФ / Казахстан: +7 (XXX) XXX-XX-XX
    if (digits.startsWith('7')) {
      let formatted = '+7';
      const rest = digits.slice(1);
      if (rest.length > 0) formatted += ' (' + rest.slice(0, 3);
      if (rest.length >= 3) formatted += ') ' + rest.slice(3, 6);
      if (rest.length >= 6) formatted += '-' + rest.slice(6, 8);
      if (rest.length >= 8) formatted += '-' + rest.slice(8, 10);
      setClientPhone(formatted);
      return;
    }

    // Другие страны СНГ / международный: свободный ввод + и цифры
    let formatted = '+';
    for (let i = 0; i < Math.min(digits.length, 15); i++) {
      if (i > 0 && (i === 3 || i === 6 || i === 9 || i === 12)) formatted += ' ';
      formatted += digits[i];
    }
    setClientPhone(formatted);
  };

  // Загрузка фото
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (uploadedPhotos.length + files.length > 3) {
      setPhotoError('Максимум 3 фотографии');
      return;
    }

    setPhotoError('');
    setIsUploadingPhoto(true);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Ошибка загрузки фото');
        }

        const photoData: OrderPhoto = await res.json();
        setUploadedPhotos((prev) => [...prev, photoData]);
      }
    } catch (err: any) {
      setPhotoError(err.message || 'Не удалось загрузить фотографию');
    } finally {
      setIsUploadingPhoto(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  // Итоговый пересчет с учетом выезда за пределы города
  const cityMarkup = isOutsideCity && serviceFormat === 'mobile' ? 500 : 0;
  const finalTotal = pricing.preliminaryTotal + cityMarkup;
  const formattedFinalTotal = finalTotal.toLocaleString('ru-RU') + ' ₽';

  // Отправка заявки
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!clientName.trim()) {
      triggerHaptic('error');
      setSubmitError('Укажите ваше имя');
      return;
    }

    const cleanPhone = clientPhone.replace(/[^\d]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15) {
      triggerHaptic('error');
      setSubmitError('Укажите корректный номер телефона (от 10 до 15 цифр)');
      return;
    }

    if (serviceFormat === 'mobile' && !deliveryAddress.trim()) {
      triggerHaptic('error');
      setSubmitError('Укажите адрес для выезда мастера');
      return;
    }

    if (!agreedPd) {
      triggerHaptic('error');
      setSubmitError('Необходимо подтвердить согласие на обработку персональных данных');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        idempotencyKey,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        carBrandModel: carBrandModel.trim() || undefined,
        carLicensePlate: carLicensePlate.trim() || undefined,
        carClass,
        isDirty,
        serviceFormat,
        isOutsideCity: Boolean(isOutsideCity),
        deliveryAddress: serviceFormat === 'mobile' 
          ? (deliveryAddress.trim() + (isOutsideCity ? ' (Выезд за пределы города)' : ''))
          : `${settings.shortName} (${settings.city}, ${settings.address})`,
        desiredDate: desiredDate || null,
        desiredTime: desiredTime || null,
        clientComment: clientComment.trim() || null,
        source: typeof window !== 'undefined' ? (sessionStorage.getItem('detailing_utm_source') || 'Прямой переход') : 'Прямой переход',
        items,
        photos: uploadedPhotos,
      };

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        triggerHaptic('error');
        throw new Error(errJson.error || 'Ошибка при отправке заявки');
      }

      const data = await res.json();
      triggerHaptic('success');
      onSuccess(data.token);
    } catch (err: any) {
      triggerHaptic('error');
      setSubmitError(err.message || 'Произошла непредвиденная ошибка');
    } finally {
      setIsSubmitting(false);
    }
  };

  const carClassTitleMap: Record<CarClass, string> = {
    S: 'Седан / Хэтчбек',
    M: 'Кроссовер',
    L: 'Внедорожник',
    OTHER: 'Минивэн',
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
      {/* Кнопка "Назад" */}
      <div className="mb-6">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Ваш заказ</span>
        </button>
      </div>

      {/* Заголовок страницы */}
      <div className="mb-8">
        <span className="text-xs uppercase tracking-wider text-zinc-500 font-semibold block mb-1">
          Оформление
        </span>
        <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
          Куда и когда приехать?
        </h1>
      </div>

      {/* Ошибка отправки */}
      {submitError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs sm:text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {/* Основная сетка: 2 колонки */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* ЛЕВАЯ КОЛОНКА (4 МОДУЛЬНЫЕ КАРТОЧКИ) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* КАРТОЧКА 1: КАК С ВАМИ СВЯЗАТЬСЯ */}
          <div className="p-6 rounded-3xl bg-[#141722] border border-zinc-700/60 shadow-xl space-y-4">
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Как с вами связаться
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Ваше имя
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Как к вам обращаться"
                  className="w-full px-4 py-3 rounded-xl bg-[#0c0e14] border border-zinc-700/80 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Телефон
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                  className="w-full px-4 py-3 rounded-xl bg-[#0c0e14] border border-zinc-700/80 text-xs sm:text-sm text-white placeholder-zinc-500 font-mono focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Марка и модель авто
                </label>
                <input
                  type="text"
                  value={carBrandModel}
                  onChange={(e) => setCarBrandModel(e.target.value)}
                  placeholder="Например: BMW X5 или LADA Vesta"
                  className="w-full px-4 py-3 rounded-xl bg-[#0c0e14] border border-zinc-700/80 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Госномер (необязательно)
                </label>
                <input
                  type="text"
                  value={carLicensePlate}
                  onChange={(e) => setCarLicensePlate(e.target.value.toUpperCase())}
                  placeholder="А 777 АА 777"
                  className="w-full px-4 py-3 rounded-xl bg-[#0c0e14] border border-zinc-700/80 text-xs sm:text-sm text-white placeholder-zinc-500 font-mono font-bold focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                />
              </div>
            </div>
          </div>

          {/* КАРТОЧКА 2: АДРЕС ВЫЕЗДА / ФОРМАТ */}
          <div className="p-6 rounded-3xl bg-[#141722] border border-zinc-700/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Формат и адрес
              </h2>

              {/* Переключатель формата */}
              <div className="flex bg-[#0c0e14] p-1 rounded-xl border border-zinc-700/80 text-[11px]">
                <button
                  type="button"
                  onClick={() => {
                    onSetServiceFormat('studio');
                    triggerHaptic('selection');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    serviceFormat === 'studio'
                      ? 'bg-zinc-800 text-white font-medium shadow-sm border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  В боксе студии
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onSetServiceFormat('mobile');
                    triggerHaptic('selection');
                  }}
                  className={`px-3 py-1.5 rounded-lg transition-all ${
                    serviceFormat === 'mobile'
                      ? 'bg-zinc-800 text-white font-medium shadow-sm border border-zinc-700/60'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  Выезд к авто
                </button>
              </div>
            </div>

            {serviceFormat === 'studio' ? (
              <div className="p-3.5 rounded-2xl bg-[#0c0e14] border border-zinc-700/60 flex items-center gap-3 text-xs text-zinc-300">
                <MapPin className="w-4 h-4 text-sky-400 shrink-0" />
                <div>
                  <span className="font-semibold text-white block">Студия {settings.shortName}</span>
                  <span className="text-zinc-400 text-[11px]">{settings.city}, {settings.address}</span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                    Улица, дом, паркинг
                  </label>
                  <input
                    type="text"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Москва, улица, дом, ориентир паркинга"
                    className="w-full px-4 py-3 rounded-xl bg-[#0c0e14] border border-zinc-700/80 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-[#0c0e14] border border-zinc-700/60">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="outsideCity"
                      checked={isOutsideCity}
                      onChange={(e) => setIsOutsideCity(e.target.checked)}
                      className="w-4 h-4 rounded text-sky-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                    />
                    <label htmlFor="outsideCity" className="text-xs text-zinc-300 cursor-pointer select-none">
                      Выезд за пределы города
                    </label>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">+500 ₽</span>
                </div>
              </div>
            )}
          </div>

          {/* КАРТОЧКА 3: КОГДА ВАМ УДОБНО */}
          <div className="p-6 rounded-3xl bg-[#141722] border border-zinc-700/60 shadow-xl space-y-4">
            <h2 className="text-sm font-semibold text-white tracking-wide">
              Когда вам удобно
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Желаемая дата
                </label>
                <button
                  type="button"
                  onClick={() => setIsCalendarOpen((prev) => !prev)}
                  className={`w-full px-4 py-3 rounded-xl bg-[#0c0e14] border text-xs sm:text-sm text-white flex items-center justify-between transition-all text-left focus:outline-none ${
                    isCalendarOpen ? 'border-sky-500 ring-1 ring-sky-500' : 'border-zinc-700/80 hover:border-zinc-600'
                  }`}
                >
                  <span className="capitalize">{formattedDisplayDate}</span>
                  <CalendarIcon className="w-4 h-4 text-sky-400 shrink-0" />
                </button>

                {isCalendarOpen && (
                  <div
                    ref={calendarRef}
                    className="absolute left-0 top-full mt-2 z-50 shadow-2xl rounded-2xl bg-[#141722] border border-zinc-700 p-2"
                  >
                    <Calendar
                      mode="single"
                      locale="ru"
                      selected={selectedDate}
                      onSelect={handleSelectCalendarDate}
                      disabled={(date) => {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        return date < today;
                      }}
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                  Желаемое время {isLoadingSlots && <span className="text-zinc-500">(поиск слотов...)</span>}
                </label>
                <div className="relative">
                  <select
                    value={desiredTime}
                    onChange={(e) => setDesiredTime(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-[#0c0e14] border border-zinc-700/80 text-xs sm:text-sm text-white focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all font-mono"
                  >
                    <option value="">{isLoadingSlots ? 'Загрузка...' : '--:-- (выберите время)'}</option>
                    {slots
                      .filter((s) => s.available)
                      .map((s) => (
                        <option key={s.time} value={s.time}>
                          {s.time}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Стабильный контейнер свободных слотов без прыжков макета */}
            <div className="pt-2 min-h-[120px] flex flex-col justify-start">
              <span className="text-[11px] text-zinc-400 block mb-2">
                Свободные окна на {desiredDate ? new Date(desiredDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' }) : 'выбранную дату'}:
              </span>

              {isLoadingSlots ? (
                <div className="flex flex-wrap gap-1.5 animate-pulse">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div
                      key={i}
                      className="w-16 h-8 rounded-lg bg-zinc-900/80 border border-zinc-800/60"
                    />
                  ))}
                </div>
              ) : slots.length === 0 ? (
                <div className="p-3 rounded-xl bg-[#0c0e14] border border-zinc-700/60 text-xs text-zinc-400">
                  На эту дату все слоты заняты или студия закрыта. Пожалуйста, выберите другую дату.
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
                  {slots.map((s) => (
                    <button
                      key={s.time}
                      type="button"
                      disabled={!s.available}
                      onClick={() => {
                        setDesiredTime(s.time);
                        triggerHaptic('selection');
                      }}
                      className={`px-3 py-1.5 min-h-[34px] rounded-lg text-xs font-mono transition-all flex items-center justify-center ${
                        desiredTime === s.time
                          ? 'bg-sky-500 text-white font-bold shadow-md shadow-sky-500/20'
                          : s.available
                          ? 'bg-[#0c0e14] hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 active:scale-95'
                          : 'bg-zinc-950 text-zinc-600 border border-zinc-900/80 line-through cursor-not-allowed opacity-40'
                      }`}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}

              {/* Информация о назначенном боксе и фазах */}
              {desiredTime && (() => {
                const selectedSlot = slots.find((s) => s.time === desiredTime);
                if (!selectedSlot) return null;
                return (
                  <div className="p-3 rounded-2xl bg-sky-500/10 border border-sky-500/25 text-xs text-sky-200 flex flex-wrap items-center justify-between gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-sky-400" />
                      <span>
                        Заезд в <strong className="text-white">{selectedSlot.time}</strong>
                      </span>
                      {selectedSlot.workbayName && (
                        <span className="text-[11px] text-zinc-300">
                          • {selectedSlot.workbayName}
                        </span>
                      )}
                    </div>
                    {selectedSlot.isMultiDay && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[11px] font-semibold">
                        ⏳ Многодневный цикл (сушка/ночёвка в боксе)
                      </span>
                    )}
                  </div>
                );
              })()}
            </div>

            <p className="text-[11px] text-zinc-500 leading-relaxed pt-1">
              Дату и время подтвердим по телефону, если не выбрано — подберём вместе.
            </p>
          </div>

          {/* КАРТОЧКА 4: ФОТО И ПОЖЕЛАНИЯ */}
          <div className="p-6 rounded-3xl bg-[#141722] border border-zinc-700/60 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Фото и пожелания
              </h2>
              <span className="text-xs text-zinc-400 font-mono">
                {uploadedPhotos.length}/3
              </span>
            </div>

            {/* Кнопка добавления фото */}
            <div className="space-y-3">
              {uploadedPhotos.length < 3 && (
                <label className="flex items-center justify-center gap-2 p-3.5 rounded-2xl border border-dashed border-zinc-700 hover:border-zinc-500 bg-[#0c0e14] hover:bg-zinc-900/60 cursor-pointer transition-all text-xs font-medium text-zinc-300">
                  <Camera className="w-4 h-4 text-zinc-400" />
                  <span>
                    {isUploadingPhoto ? 'Загрузка...' : '+ Добавить фото'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploadingPhoto}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}

              {photoError && (
                <span className="text-[11px] text-rose-400 block">{photoError}</span>
              )}

              {/* Миниатюры фото */}
              {uploadedPhotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2.5">
                  {uploadedPhotos.map((photo) => (
                    <div
                      key={photo.id}
                      className="relative rounded-xl overflow-hidden border border-zinc-700 bg-zinc-900 group aspect-video"
                    >
                      <img
                        src={`/api/photos/${photo.id}`}
                        alt="Фото к заказу"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(photo.id)}
                        className="absolute top-1 right-1 p-1 rounded-md bg-black/70 hover:bg-rose-600 text-white transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Комментарий */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-400 mb-1.5">
                Комментарий / особенности
              </label>
              <textarea
                value={clientComment}
                onChange={(e) => setClientComment(e.target.value)}
                placeholder="Пятна, особенности обивки, как найти паркинг..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-[#0c0e14] border border-zinc-700/80 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none transition-all"
              />
            </div>
          </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА (STICKY КАРТОЧКА «ВАШ ЗАКАЗ») */}
        <div className="lg:col-span-5 lg:sticky lg:top-8">
          <div className="p-6 sm:p-7 rounded-3xl bg-[#141722] border border-zinc-700/80 shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800/80">
              <h2 className="text-base font-bold text-white tracking-tight">
                Ваш заказ
              </h2>
              <span className="px-2.5 py-1 rounded-lg bg-[#0c0e14] text-zinc-300 text-xs border border-zinc-700 font-medium">
                {carClassTitleMap[carClass]}
              </span>
            </div>

            {/* Список услуг */}
            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
              {items.map((item) => (
                <div key={item.cartItemId} className="flex items-start justify-between gap-3 text-xs">
                  <div className="space-y-0.5">
                    <span className="text-zinc-200 font-medium block">
                      {item.name}
                    </span>
                    {item.quantity > 1 && (
                      <span className="text-zinc-500 text-[11px]">x{item.quantity} шт.</span>
                    )}
                  </div>
                  <span className="font-mono text-zinc-300 font-semibold shrink-0">
                    {item.itemTotal.toLocaleString('ru-RU')} ₽
                  </span>
                </div>
              ))}
            </div>

            {/* Детализация цен */}
            <div className="pt-4 border-t border-zinc-800/60 space-y-2 text-xs text-zinc-400">
              <div className="flex items-center justify-between">
                <span>Услуги по тарифам</span>
                <span className="font-mono text-zinc-200">
                  {pricing.workTotal.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span>
                  {serviceFormat === 'mobile' ? 'Выездной детейлинг' : 'Бокс студии'}
                </span>
                <span className="font-mono text-zinc-200">
                  {serviceFormat === 'mobile' 
                    ? `${settings.mobileServicePrice.toLocaleString('ru-RU')} ₽`
                    : 'Бесплатно'}
                </span>
              </div>

              {isOutsideCity && serviceFormat === 'mobile' && (
                <div className="flex items-center justify-between">
                  <span>Выезд за пределы города</span>
                  <span className="font-mono text-zinc-200">500 ₽</span>
                </div>
              )}

              {isDirty && (
                <div className="flex items-center justify-between text-amber-400/90">
                  <span>Сложные загрязнения (+{settings.dirtyCarMarkupPercent}%)</span>
                  <span className="font-mono">Включено</span>
                </div>
              )}
            </div>

            {/* Итого */}
            <div className="pt-4 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <span className="text-xs text-zinc-500 uppercase tracking-wider block font-semibold">
                  Предварительно
                </span>
                <span className="text-2xl font-extrabold text-white tracking-tight font-mono">
                  {formattedFinalTotal}
                </span>
              </div>
            </div>

            {/* Чекбокс ПДн */}
            <div className="pt-2">
              <div className="flex items-start gap-2.5">
                <input
                  type="checkbox"
                  id="agreedPd"
                  checked={agreedPd}
                  onChange={(e) => setAgreedPd(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-zinc-800 bg-zinc-900 border-zinc-700 cursor-pointer"
                />
                <label htmlFor="agreedPd" className="text-[11px] text-zinc-400 cursor-pointer leading-tight select-none">
                  Согласен на обработку персональных данных для ответа на заявку.
                </label>
              </div>
            </div>

            {/* Кнопка отправки */}
            <div>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3.5 px-6 rounded-2xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-sm shadow-xl transition-all flex items-center justify-center gap-2 apple-btn disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-950" />
                ) : (
                  <>
                    <span>Отправить заявку</span>
                    <span>→</span>
                  </>
                )}
              </button>

              <span className="block text-center text-[11px] text-zinc-500 mt-2.5">
                Без оплаты в приложении.
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
