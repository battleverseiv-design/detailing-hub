'use client';

import React, { useState, useMemo } from 'react';
import { CarClass, CartItem, PricingSummary, ServiceItem, StudioSettings } from '@/types';
import { ShoppingBag, X, Trash2, RotateCcw, ArrowRight, ShieldCheck, Truck, Home, AlertTriangle, Sparkles, Plus } from 'lucide-react';
import { validateServiceDependencies, getRecommendedUpsells } from '@/lib/pricing';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  pricing: PricingSummary;
  settings: StudioSettings;
  carClass: CarClass;
  isDirty: boolean;
  serviceFormat: 'studio' | 'mobile';
  onSetServiceFormat: (fmt: 'studio' | 'mobile') => void;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onUndoRemove?: () => void;
  lastDeletedItem: CartItem | null;
  onOpenOrderModal: () => void;
  onAddService?: (service: ServiceItem) => void;
}

export function CartDrawer({
  isOpen,
  onClose,
  items,
  pricing,
  settings,
  carClass,
  isDirty,
  serviceFormat,
  onSetServiceFormat,
  onUpdateQuantity,
  onRemoveItem,
  onUndoRemove,
  lastDeletedItem,
  onOpenOrderModal,
  onAddService,
}: CartDrawerProps) {
  const dependencyCheck = useMemo(() => {
    return validateServiceDependencies(items, settings.tariffs);
  }, [items, settings.tariffs]);

  const upsellRecommendations = useMemo(() => {
    return getRecommendedUpsells(items, settings.tariffs, carClass);
  }, [items, settings.tariffs, carClass]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Затемнение фона */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white dark:bg-zinc-950 shadow-2xl flex flex-col justify-between border-l border-zinc-200 dark:border-zinc-800">
          
          {/* Шапка корзины */}
          <div className="px-6 py-5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-zinc-900 dark:text-white">
                  Ваш расчёт
                </h3>
                <p className="text-xs text-zinc-400">
                  Класс авто: {carClass === 'OTHER' ? 'Нестандарт' : carClass}
                  {isDirty && ' • Сильные загрязнения'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Плашка Undo при удалении */}
          {lastDeletedItem && (
            <div className="mx-6 mt-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-xs text-amber-700 dark:text-amber-300">
              <span className="truncate pr-2">Удалено: {lastDeletedItem.name}</span>
              <button
                onClick={onUndoRemove}
                className="font-bold underline flex items-center gap-1 shrink-0 text-amber-600 dark:text-amber-400 hover:opacity-80"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Отменить</span>
              </button>
            </div>
          )}

          {/* Список выбранных услуг */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {items.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center py-12">
                <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400 mb-4">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <h4 className="font-bold text-base text-zinc-800 dark:text-zinc-200 mb-1">
                  Корзина пуста
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-xs leading-relaxed">
                  Выберите интересующие услуги химчистки, полировки или защиты в каталоге, чтобы рассчитать стоимость.
                </p>
              </div>
            ) : (
              items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800/80 flex items-start justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-xs sm:text-sm text-zinc-900 dark:text-white leading-tight mb-1 truncate">
                      {item.name}
                    </h5>
                    {item.isCustomPhoto ? (
                      <p className="text-[11px] text-sky-600 dark:text-sky-400 font-medium">
                        {item.customDescription || 'Оценка по фото'}
                      </p>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                        <span>
                          {item.itemTotal.toLocaleString('ru-RU')} ₽
                        </span>
                        {item.quantity > 1 && (
                          <span className="text-[10px] text-zinc-400">
                            ({item.quantity} шт × {item.unitPrice.toLocaleString('ru-RU')} ₽)
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* Количество, если больше 1 или позволяет количество */}
                    {item.quantity > 1 && !item.isCustomPhoto && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300">
                        {item.quantity} шт
                      </span>
                    )}

                    <button
                      onClick={() => onRemoveItem(item.cartItemId)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                      title="Удалить позицию"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}

            {/* Предупреждение о технологических зависимостях */}
            {dependencyCheck.warnings.length > 0 && (
              <div className="space-y-2 mt-2">
                {dependencyCheck.warnings.map((w, idx) => {
                  const reqTariff = settings.tariffs.find((t) => t.id === w.requiredServiceId);
                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-800 dark:text-amber-200 space-y-1.5"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                        <span className="leading-snug">{w.message}</span>
                      </div>
                      {reqTariff && onAddService && (
                        <button
                          type="button"
                          onClick={() => onAddService(reqTariff)}
                          className="w-full mt-1 py-1.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-zinc-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Добавить «{reqTariff.name}»</span>
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Смарт-апсейлы / Рекомендации к заказу */}
            {items.length > 0 && upsellRecommendations.length > 0 && onAddService && (
              <div className="pt-3 border-t border-zinc-200/60 dark:border-zinc-800/60 space-y-2">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                  <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                  <span>Рекомендуем добавить к заказу:</span>
                </div>
                <div className="space-y-2">
                  {upsellRecommendations.map((rec) => {
                    const tariff = settings.tariffs.find((t) => t.id === rec.serviceId);
                    if (!tariff) return null;
                    return (
                      <div
                        key={rec.serviceId}
                        className="p-3 rounded-2xl bg-sky-50/60 dark:bg-sky-950/20 border border-sky-200/80 dark:border-sky-800/40 flex items-center justify-between gap-3 text-xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-zinc-900 dark:text-white truncate">
                              {rec.serviceName}
                            </span>
                            {rec.badge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/10 text-sky-600 dark:text-sky-400 font-semibold shrink-0">
                                {rec.badge}
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate mt-0.5">
                            {rec.reason}
                          </p>
                          <span className="font-extrabold text-sky-600 dark:text-sky-400 block mt-0.5">
                            +{rec.price.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => onAddService(tariff)}
                          className="shrink-0 px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1 shadow-sm transition-all active:scale-95"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Добавить</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Нижний блок с расчётом и оформлением */}
          {items.length > 0 && (
            <div className="border-t border-zinc-200 dark:border-zinc-800 px-6 py-5 bg-zinc-50/50 dark:bg-zinc-950 space-y-4">
              
              {/* Выбор формата обслуживания: В студии / Выезд */}
              {settings.mobileServiceEnabled && (
                <div>
                  <label className="block text-[11px] font-bold text-zinc-500 uppercase tracking-wider mb-1.5">
                    Формат обслуживания
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => onSetServiceFormat('studio')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        serviceFormat === 'studio'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <Home className="w-3.5 h-3.5" />
                      <span>В студии</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onSetServiceFormat('mobile')}
                      className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        serviceFormat === 'mobile'
                          ? 'border-sky-500 bg-sky-500/10 text-sky-600 dark:text-sky-400'
                          : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5" />
                      <span>Выезд (+{settings.mobileServicePrice} ₽)</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Детализация расчета */}
              <div className="space-y-1.5 text-xs text-zinc-500 dark:text-zinc-400 pt-2 border-t border-zinc-200/60 dark:border-zinc-800/60">
                <div className="flex justify-between">
                  <span>Услуги ({items.length}):</span>
                  <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                    {pricing.itemsSubtotal.toLocaleString('ru-RU')} ₽
                  </span>
                </div>

                {isDirty && pricing.dirtyMarkupAmount > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400">
                    <span>Сильные загрязнения (+{settings.dirtyCarMarkupPercent}%):</span>
                    <span className="font-semibold">
                      +{pricing.dirtyMarkupAmount.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                )}

                {pricing.minOrderDeficit > 0 && (
                  <div className="flex justify-between text-sky-600 dark:text-sky-400">
                    <span>Коррекция до мин. чека ({pricing.minOrderAmount} ₽):</span>
                    <span className="font-semibold">
                      +{pricing.minOrderDeficit.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                )}

                {serviceFormat === 'mobile' && pricing.mobileFee > 0 && (
                  <div className="flex justify-between">
                    <span>Выезд мастера по адресу:</span>
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                      +{pricing.mobileFee.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                )}

                <div className="flex items-baseline justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-sm font-semibold text-zinc-900 dark:text-white">
                  <span>Итого:</span>
                  <span className="text-xl tabular-nums tracking-tight font-semibold text-white">
                    {pricing.displayTotalFormatted}
                  </span>
                </div>
              </div>

              {/* Кнопка Оформить */}
              <button
                onClick={() => {
                  onClose();
                  onOpenOrderModal();
                }}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <span>Перейти к оформлению</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Без предоплаты • Фиксация цены в заявке</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
