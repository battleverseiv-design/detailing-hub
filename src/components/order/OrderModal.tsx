'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { CarClass, CartItem, OrderPhoto, PricingSummary, StudioSettings } from '@/types';
import { X, Upload, Trash2, Camera, ShieldCheck, Calendar, Clock, MapPin, AlertCircle, Loader2 } from 'lucide-react';

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  pricing: PricingSummary;
  settings: StudioSettings;
  carClass: CarClass;
  isDirty: boolean;
  serviceFormat: 'studio' | 'mobile';
  onOrderSuccess: () => void;
}

export function OrderModal({
  isOpen,
  onClose,
  items,
  pricing,
  settings,
  carClass,
  isDirty,
  serviceFormat,
  onOrderSuccess,
}: OrderModalProps) {
  const router = useRouter();

  // Поля формы
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('+7 ');
  const [carBrandModel, setCarBrandModel] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [desiredDate, setDesiredDate] = useState('');
  const [desiredTime, setDesiredTime] = useState('');
  const [clientComment, setClientComment] = useState('');
  const [agreedPd, setAgreedPd] = useState(true);

  // Фотографии
  const [uploadedPhotos, setUploadedPhotos] = useState<OrderPhoto[]>([]);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoError, setPhotoError] = useState('');

  // Отправка формы
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Инициализация idempotencyKey
  useEffect(() => {
    if (isOpen && !idempotencyKey) {
      setIdempotencyKey(crypto.randomUUID());
    }
  }, [isOpen, idempotencyKey]);

  if (!isOpen) return null;

  // Обязательность фото: для позиций "Оценка по фото" или если включен флаг "Сильные загрязнения"
  const isPhotoRequired = pricing.hasPhotoAppraisal || isDirty;

  // Обработка загрузки файла
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

  // Удаление фото
  const handleRemovePhoto = (photoId: string) => {
    setUploadedPhotos((prev) => prev.filter((p) => p.id !== photoId));
  };

  // Форматирование телефона (СНГ маска)
  const handlePhoneChange = (val: string) => {
    let raw = val.replace(/[^\d+]/g, '');
    if (!raw.startsWith('+7')) {
      raw = '+7 ' + raw.replace(/^\+?7?/, '');
    }
    setClientPhone(val);
  };

  // Отправка заявки
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError('');

    if (!clientName.trim()) {
      setSubmitError('Укажите ваше имя');
      return;
    }

    if (!clientPhone.trim() || clientPhone.length < 10) {
      setSubmitError('Укажите корректный номер телефона');
      return;
    }

    if (!carBrandModel.trim()) {
      setSubmitError('Укажите марку и модель автомобиля');
      return;
    }

    if (serviceFormat === 'mobile' && !deliveryAddress.trim()) {
      setSubmitError('Для выездного детейлинга укажите адрес паркинга или дома');
      return;
    }

    if (isPhotoRequired && uploadedPhotos.length === 0) {
      setSubmitError('Пожалуйста, прикрепите хотя бы 1 фото для оценки мастером');
      return;
    }

    if (!agreedPd) {
      setSubmitError('Необходимо подтвердить согласие на обработку персональных данных');
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        idempotencyKey,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        carBrandModel: carBrandModel.trim(),
        carClass,
        isDirty,
        serviceFormat,
        deliveryAddress: serviceFormat === 'mobile' ? deliveryAddress.trim() : null,
        desiredDate: desiredDate || null,
        desiredTime: desiredTime || null,
        clientComment: clientComment.trim() || null,
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
        throw new Error(errJson.error || 'Ошибка при оформлении заявки');
      }

      const data = await res.json();
      onOrderSuccess();
      router.push(`/order/${data.token}`);
    } catch (err: any) {
      setSubmitError(err.message || 'Ошибка соединения с сервером');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-xl bg-white dark:bg-zinc-950 rounded-3xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden my-8">
        
        {/* Шапка модала */}
        <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="font-extrabold text-lg text-zinc-900 dark:text-white">
              Оформление записи
            </h3>
            <p className="text-xs text-zinc-500">
              {pricing.displayTotalFormatted} • {serviceFormat === 'mobile' ? 'Выезд мастера' : 'В боксе студии'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Имя и Телефон */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Ваше имя *
              </label>
              <input
                type="text"
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Иван"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
                Телефон *
              </label>
              <input
                type="tel"
                required
                value={clientPhone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                placeholder="+7 (999) 000-00-00"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>
          </div>

          {/* Автомобиль */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Марка и модель автомобиля *
            </label>
            <input
              type="text"
              required
              value={carBrandModel}
              onChange={(e) => setCarBrandModel(e.target.value)}
              placeholder="Например: Toyota RAV4 2020 или BMW 5"
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
            />
          </div>

          {/* Адрес для выездного обслуживания */}
          {serviceFormat === 'mobile' && (
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-zinc-400" />
                <span>Адрес выезда мастера (паркинг / дом) *</span>
              </label>
              <input
                type="text"
                required
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                placeholder="г. Москва, ул. Ленина, д. 10 (подземный паркинг -1 этаж)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>
          )}

          {/* Дата и желаемое время */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                <span>Желаемая дата</span>
              </label>
              <input
                type="date"
                min={new Date().toISOString().split('T')[0]}
                value={desiredDate}
                onChange={(e) => {
                  setDesiredDate(e.target.value);
                  if (!e.target.value) setDesiredTime('');
                }}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-zinc-400" />
                <span>Время (предварительно)</span>
              </label>
              <input
                type="time"
                disabled={!desiredDate}
                value={desiredTime}
                onChange={(e) => setDesiredTime(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-base sm:text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-zinc-400 disabled:opacity-40"
              />
            </div>
          </div>
          <p className="text-[11px] text-zinc-400">
            * Время предварительное. Администратор согласует точный слот при подтверждении.
          </p>

          {/* Загрузка фотографий */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-sky-500" />
                <span>Фотографии авто / загрязнений (до 3 шт)</span>
                {isPhotoRequired && <span className="text-rose-500 font-bold">*</span>}
              </label>
              <span className="text-[11px] text-zinc-400">{uploadedPhotos.length} из 3</span>
            </div>

            {isPhotoRequired && uploadedPhotos.length === 0 && (
              <p className="text-[11px] text-amber-600 dark:text-amber-400 mb-2 font-medium">
                Для выбранных услуг или сильных загрязнений необходимо минимум 1 фото.
              </p>
            )}

            {photoError && (
              <p className="text-xs text-rose-500 mb-2">{photoError}</p>
            )}

            <div className="flex flex-wrap gap-2.5">
              {uploadedPhotos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative w-20 h-20 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900 group"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/photos/${photo.id}`}
                    alt="Превью"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center text-rose-400 transition-opacity"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}

              {uploadedPhotos.length < 3 && (
                <label className="w-20 h-20 rounded-xl border-2 border-dashed border-zinc-300 dark:border-zinc-700 hover:border-sky-500 dark:hover:border-sky-500 flex flex-col items-center justify-center cursor-pointer text-zinc-400 hover:text-sky-500 transition-colors">
                  {isUploadingPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <Upload className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-semibold">Добавить</span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={isUploadingPhoto}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Комментарий клиента */}
          <div>
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-1">
              Комментарий или пожелания
            </label>
            <textarea
              value={clientComment}
              onChange={(e) => setClientComment(e.target.value)}
              placeholder="Особые пожелания, удобные мессенджеры для связи..."
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
            />
          </div>

          {/* Чекбокс ПДн */}
          <div className="flex items-start gap-2.5 pt-2">
            <input
              type="checkbox"
              id="pdn-consent"
              checked={agreedPd}
              onChange={(e) => setAgreedPd(e.target.checked)}
              className="mt-1 rounded text-sky-600 focus:ring-sky-500 dark:bg-zinc-900 dark:border-zinc-800"
            />
            <label htmlFor="pdn-consent" className="text-xs text-zinc-500 dark:text-zinc-400 leading-tight">
              Даю согласие на обработку персональных данных для связи и согласования времени визита согласно ФЗ-152. Без спама и рассылок.
            </label>
          </div>

          {/* Кнопка отправки */}
          <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-sm shadow-md active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Отправка заявки...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-zinc-700" />
                  <span>Отправить заявку ({pricing.displayTotalFormatted})</span>
                </>
              )}
            </button>
            <p className="text-center text-[11px] text-zinc-500 mt-2">
              Оплата производится после приёмки автомобиля
            </p>
          </div>
        </form>

      </div>
    </div>
  );
}
