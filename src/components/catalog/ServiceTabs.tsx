'use client';

import React, { useState } from 'react';
import { CarClass, CartItem, ServiceCategory, ServiceItem } from '@/types';
import { calculateItemPrice } from '@/lib/pricing';
import { Sparkles, Check, Plus, Minus, Camera, Shield, Wrench, Sparkle } from 'lucide-react';

interface ServiceTabsProps {
  services: ServiceItem[];
  carClass: CarClass;
  isDirty: boolean;
  cartItems: CartItem[];
  onAddToCart: (service: ServiceItem, quantity?: number, customDesc?: string) => void;
  onRemoveFromCart: (serviceId: string) => void;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
}

export function ServiceTabs({
  services,
  carClass,
  isDirty,
  cartItems,
  onAddToCart,
  onRemoveFromCart,
  onUpdateQuantity,
}: ServiceTabsProps) {
  const [activeTab, setActiveTab] = useState<ServiceCategory>('dry_cleaning');
  const [customDescription, setCustomDescription] = useState('');
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const tabs: { id: ServiceCategory; label: string; icon: React.ReactNode; count: number }[] = [
    {
      id: 'dry_cleaning',
      label: 'Химчистка салона',
      icon: <Sparkles className="w-4 h-4" />,
      count: services.filter((s) => s.category === 'dry_cleaning').length,
    },
    {
      id: 'body_polishing',
      label: 'Кузов и полировка',
      icon: <Sparkle className="w-4 h-4" />,
      count: services.filter((s) => s.category === 'body_polishing').length,
    },
    {
      id: 'protection_packages',
      label: 'Защита и пакеты',
      icon: <Shield className="w-4 h-4" />,
      count: services.filter((s) => s.category === 'protection_packages').length,
    },
    {
      id: 'custom_photo',
      label: 'Оценка по фото',
      icon: <Camera className="w-4 h-4" />,
      count: 1,
    },
  ];

  const currentServices = services.filter((s) => s.category === activeTab);

  const getQty = (serviceId: string) => quantities[serviceId] || 1;
  const setQty = (serviceId: string, delta: number, max: number = 8) => {
    const cur = getQty(serviceId);
    const next = Math.max(1, Math.min(max, cur + delta));
    setQuantities((prev) => ({ ...prev, [serviceId]: next }));
  };

  return (
    <div className="w-full">
      {/* Навигация по табам */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-zinc-200 dark:border-zinc-800 mb-6">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-sky-600 text-white shadow-md shadow-sky-600/20'
                  : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                  isActive ? 'bg-sky-500/40 text-white' : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Список услуг выбранного таба */}
      {activeTab === 'custom_photo' ? (
        // Карточка специальной услуги "Оценка по фото"
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-6 sm:p-8 border-2 border-dashed border-sky-400/60 dark:border-sky-500/40 shadow-sm">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950/80 dark:text-sky-300 text-xs font-bold mb-3">
              <Camera className="w-3.5 h-3.5" />
              <span>Индивидуальный расчёт по фотографии</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-white mb-2">
              Нестандартная задача или сложный случай?
            </h3>
            <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mb-6 leading-relaxed">
              Чистка после затопления, въевшиеся строительные составы, пятна красок, салон микроавтобуса или реставрация кожи. Опишите задачу — мастер свяжется в мессенджере с точной оценкой.
            </p>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 uppercase tracking-wider mb-2">
                  Описание проблемы или задачи
                </label>
                <textarea
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  placeholder="Например: сильно пролили кофе на переднее сиденье 3 дня назад, либо требуется чистка салона микроавтобуса на 8 мест..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-sm text-zinc-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2.5">
                <Camera className="w-4 h-4 shrink-0" />
                <span>
                  Для этой услуги при оформлении заказа потребуется прикрепить минимум 1 фото загрязнения или авто.
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const customService = services.find((s) => s.category === 'custom_photo') || {
                  id: 'custom_photo_service',
                  name: 'Оценка по фото',
                  category: 'custom_photo' as ServiceCategory,
                  shortDesc: customDescription || 'Индивидуальная задача',
                  fullDesc: customDescription || 'Индивидуальная задача',
                  basePrices: { S: 0, M: 0, L: 0 },
                  zones: ['none'],
                  isCustomPhoto: true,
                };
                onAddToCart(customService, 1, customDescription || 'Индивидуальная оценка по фото');
              }}
              className="px-6 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-md shadow-sky-600/20 active:scale-95 transition-all flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Добавить в расчёт (По фото)</span>
            </button>
          </div>
        </div>
      ) : (
        // Сетка стандартных услуг
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {currentServices.map((service) => {
            const inCart = cartItems.some((ci) => ci.serviceId === service.id);
            const cartItem = cartItems.find((ci) => ci.serviceId === service.id);
            const qty = inCart ? cartItem?.quantity || 1 : getQty(service.id);
            const { unitPrice, itemTotal } = calculateItemPrice(service, carClass, isDirty, qty);

            return (
              <div
                key={service.id}
                className={`relative flex flex-col justify-between p-5 rounded-3xl border-2 transition-all ${
                  inCart
                    ? 'border-sky-500 bg-sky-500/5 dark:bg-sky-500/10 shadow-sm'
                    : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 bg-white dark:bg-zinc-900'
                }`}
              >
                {/* Верхняя строка карточки */}
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h4 className="font-extrabold text-base text-zinc-900 dark:text-white leading-snug">
                      {service.name}
                    </h4>
                    {service.badge && (
                      <span className="shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-300 border border-sky-200 dark:border-sky-800">
                        {service.badge}
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">
                    {service.shortDesc}
                  </p>
                </div>

                {/* Нижняя строка карточки: Цена, Селектор количества и Кнопка */}
                <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 mt-2">
                  <div>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-lg font-extrabold text-zinc-900 dark:text-white">
                        {itemTotal.toLocaleString('ru-RU')} ₽
                      </span>
                      {service.allowsQuantity && (
                        <span className="text-xs text-zinc-400">
                          ({unitPrice.toLocaleString('ru-RU')} ₽ / {service.unitLabel || 'шт'})
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                      Класс {carClass === 'OTHER' ? 'L (базовый)' : carClass}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Селектор количества элементов */}
                    {service.allowsQuantity && (
                      <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-xl p-0.5 border border-zinc-200 dark:border-zinc-700">
                        <button
                          type="button"
                          onClick={() => {
                            if (inCart && cartItem) {
                              onUpdateQuantity(cartItem.cartItemId, Math.max(1, cartItem.quantity - 1));
                            } else {
                              setQty(service.id, -1, service.maxQuantity || 8);
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-6 text-center text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (inCart && cartItem) {
                              onUpdateQuantity(
                                cartItem.cartItemId,
                                Math.min(service.maxQuantity || 8, cartItem.quantity + 1)
                              );
                            } else {
                              setQty(service.id, 1, service.maxQuantity || 8);
                            }
                          }}
                          className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-white dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    {/* Кнопка добавления / удаления */}
                    {inCart ? (
                      <button
                        type="button"
                        onClick={() => onRemoveFromCart(service.id)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-500 text-white font-bold text-xs shadow-sm hover:bg-rose-500 transition-colors group"
                      >
                        <Check className="w-3.5 h-3.5 group-hover:hidden" />
                        <span className="group-hover:hidden">В расчёте</span>
                        <span className="hidden group-hover:inline">Удалить</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onAddToCart(service, qty)}
                        className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-sm active:scale-95 transition-all"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Добавить</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
