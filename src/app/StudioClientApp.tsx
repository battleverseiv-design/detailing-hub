'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CarClass, CartItem, ServiceCategory, ServiceItem, StudioSettings } from '@/types';
import { calculateItemPrice, calculateOrderSummary } from '@/lib/pricing';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { CheckoutRequestView } from '@/components/order/CheckoutRequestView';
import { BeforeAfterSlider } from '@/components/BeforeAfterSlider';
import { DEFAULT_BRAND_CONFIG } from '@/config/brand.config';
import { 
  initTelegramApp, 
  triggerHaptic, 
  showTelegramBackButton, 
  hideTelegramBackButton 
} from '@/lib/telegram';
import { 
  ShieldCheck, 
  Clock, 
  MapPin, 
  Award, 
  ChevronRight, 
  ShoppingBag, 
  Check, 
  Plus, 
  Minus,
  Camera, 
  Truck, 
  Home, 
  Dog, 
  Flame, 
  ThumbsUp,
  X,
  Info
} from 'lucide-react';

interface StudioClientAppProps {
  settings: StudioSettings;
}

const LOCAL_STORAGE_KEY = 'detailing_cart_state_v3';

export function StudioClientApp({ settings }: StudioClientAppProps) {
  const [carClass, setCarClass] = useState<CarClass>('M');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [serviceFormat, setServiceFormat] = useState<'studio' | 'mobile'>('studio');
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [lastDeletedItem, setLastDeletedItem] = useState<CartItem | null>(null);

  const [activeCategory, setActiveCategory] = useState<string>('packages');
  const router = useRouter();

  // До и После слайдер
  const beforeAfterList = (settings.beforeAfterItems && settings.beforeAfterItems.length > 0)
    ? settings.beforeAfterItems
    : (DEFAULT_BRAND_CONFIG.beforeAfterItems || []);
  const [activeBeforeAfterId, setActiveBeforeAfterId] = useState<string>(beforeAfterList[0]?.id || 'body_polishing');
  const currentBeforeAfter = beforeAfterList.find((i) => i.id === activeBeforeAfterId) || beforeAfterList[0];
  const [currentView, setCurrentView] = useState<'catalog' | 'request'>('catalog');
  const [seatQuantity, setSeatQuantity] = useState(2);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Инициализация Telegram Mini App
  useEffect(() => {
    initTelegramApp();
  }, []);

  // Синхронизация с URL (?step=request)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('step') === 'request') {
        setCurrentView('request');
      }
    }
  }, []);

  // Управление нативной кнопкой "Назад" в Telegram
  useEffect(() => {
    if (currentView === 'request') {
      showTelegramBackButton(handleBackToCatalog);
    } else {
      hideTelegramBackButton();
    }
    return () => {
      hideTelegramBackButton();
    };
  }, [currentView]);

  // Восстановление корзины из localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.carClass) setCarClass(parsed.carClass);
        if (typeof parsed.isDirty === 'boolean') setIsDirty(parsed.isDirty);
        if (parsed.serviceFormat) setServiceFormat(parsed.serviceFormat);
        if (Array.isArray(parsed.cartItems)) setCartItems(parsed.cartItems);
      }
    } catch {}
    setIsLoaded(true);
  }, []);

  // Сохранение в localStorage
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem(
        LOCAL_STORAGE_KEY,
        JSON.stringify({ carClass, isDirty, serviceFormat, cartItems })
      );
    } catch {}
  }, [carClass, isDirty, serviceFormat, cartItems, isLoaded]);

  // Пересчёт позиций при смене класса авто или состояния
  const updatedCartItems = useMemo(() => {
    const tariffMap = new Map(settings.tariffs.map((t) => [t.id, t]));

    return cartItems.map((item) => {
      if (item.isCustomPhoto) return item;
      const tariff = tariffMap.get(item.serviceId);
      if (!tariff) return item;

      const { unitPrice, itemTotal } = calculateItemPrice(
        tariff,
        carClass,
        isDirty,
        item.quantity,
        settings.dirtyCarMarkupPercent
      );

      return {
        ...item,
        carClass,
        isDirty,
        unitPrice,
        itemTotal,
      };
    });
  }, [cartItems, carClass, isDirty, settings.tariffs, settings.dirtyCarMarkupPercent]);

  // Итоговый расчёт
  const pricing = useMemo(() => {
    return calculateOrderSummary(updatedCartItems, carClass, isDirty, serviceFormat, {
      minOrderAmount: settings.minOrderAmount,
      dirtyCarMarkupPercent: settings.dirtyCarMarkupPercent,
      mobileServicePrice: settings.mobileServicePrice,
      mobileServiceEnabled: settings.mobileServiceEnabled,
    });
  }, [updatedCartItems, carClass, isDirty, serviceFormat, settings]);

  // Добавление услуги с тактильной отдачей
  const handleToggleService = (service: ServiceItem, qty: number = 1, desc?: string) => {
    triggerHaptic('medium');
    const inCart = updatedCartItems.some((i) => i.serviceId === service.id);

    if (inCart) {
      const toDelete = updatedCartItems.find((i) => i.serviceId === service.id);
      if (toDelete) setLastDeletedItem(toDelete);
      setCartItems((prev) => prev.filter((i) => i.serviceId !== service.id));
    } else {
      const { unitPrice, itemTotal } = calculateItemPrice(
        service,
        carClass,
        isDirty,
        qty,
        settings.dirtyCarMarkupPercent
      );

      const newItem: CartItem = {
        cartItemId: `${service.id}_${Date.now()}`,
        serviceId: service.id,
        name: service.name,
        category: service.category,
        carClass,
        isDirty,
        quantity: qty,
        unitPrice,
        itemTotal,
        isCustomPhoto: Boolean(service.isCustomPhoto),
        customDescription: desc,
        zones: service.zones,
      };

      // Если добавляется комплексный пакет — автоматически исключаем из корзины поглощённые им локальные услуги, чтобы чек не задваивался
      if (service.isPackage && service.includedServiceIds && service.includedServiceIds.length > 0) {
        const toExclude = new Set(service.includedServiceIds);
        setCartItems((prev) => [...prev.filter((i) => !toExclude.has(i.serviceId)), newItem]);
      } else {
        setCartItems((prev) => [...prev, newItem]);
      }
    }
  };

  const handleUpdateItemQty = (serviceId: string, newQty: number) => {
    const tariff = settings.tariffs.find((t) => t.id === serviceId);
    if (!tariff) return;

    setCartItems((prev) =>
      prev.map((i) => {
        if (i.serviceId !== serviceId) return i;
        const recalc = calculateItemPrice(tariff, carClass, isDirty, newQty, settings.dirtyCarMarkupPercent);
        return {
          ...i,
          quantity: newQty,
          unitPrice: recalc.unitPrice,
          itemTotal: recalc.itemTotal,
        };
      })
    );
  };

  const handleRemoveCartItem = (cartItemId: string) => {
    const itemToDelete = cartItems.find((i) => i.cartItemId === cartItemId);
    if (itemToDelete) setLastDeletedItem(itemToDelete);
    setCartItems((prev) => prev.filter((i) => i.cartItemId !== cartItemId));
  };

  const handleUndoRemove = () => {
    if (lastDeletedItem) {
      setCartItems((prev) => [...prev, lastDeletedItem]);
      setLastDeletedItem(null);
    }
  };

  const handleOrderSuccess = (token: string) => {
    setCartItems([]);
    setIsCartOpen(false);
    try {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
    } catch {}
    router.push(`/order/${token}`);
  };

  const handleOpenRequest = () => {
    triggerHaptic('medium');
    setIsCartOpen(false);
    setCurrentView('request');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', '?step=request');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handleBackToCatalog = () => {
    triggerHaptic('light');
    setCurrentView('catalog');
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', window.location.pathname);
    }
  };

  // Категории каталога по порядку
  const categoriesList = useMemo(() => {
    if (settings.categories && settings.categories.length > 0) {
      return [...settings.categories].sort((a, b) => (a.order || 0) - (b.order || 0));
    }
    return [
      { id: 'packages', name: 'Комплексы', order: 1 },
      { id: 'interior', name: 'Салон', order: 2 },
      { id: 'exterior', name: 'Кузов', order: 3 },
    ];
  }, [settings.categories]);

  // Если текущая выбранная категория была удалена, переключаемся на первую доступную
  useEffect(() => {
    if (categoriesList.length > 0 && !categoriesList.some((c) => c.id === activeCategory)) {
      setActiveCategory(categoriesList[0].id);
    }
  }, [categoriesList, activeCategory]);

  // Услуги для текущей выбранной вкладки, отсортированные по сохранённому order
  const activeCategoryServices = useMemo(() => {
    return settings.tariffs
      .filter((s) => {
        if (activeCategory === 'packages') {
          return s.category === 'packages' || s.isPackage;
        }
        return s.category === activeCategory;
      })
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [settings.tariffs, activeCategory]);

  // Список всех ID услуг, которые УЖЕ входят в выбранные в корзину комплексы
  const coveredServiceIds = useMemo(() => {
    const set = new Set<string>();
    updatedCartItems.forEach((ci) => {
      const tariff = settings.tariffs.find((t) => t.id === ci.serviceId);
      if (tariff?.isPackage && tariff.includedServiceIds) {
        tariff.includedServiceIds.forEach((id) => set.add(id));
      }
    });
    return set;
  }, [updatedCartItems, settings.tariffs]);

  return (
    <div className="min-h-screen flex flex-col bg-[#090a0d] text-zinc-100 selection:bg-sky-500 selection:text-white overflow-x-hidden w-full relative">
      <Header
        settings={settings}
        cartCount={cartItems.length}
        cartTotalFormatted={pricing.displayTotalFormatted}
        onOpenCart={() => setIsCartOpen(true)}
      />

      {currentView === 'request' ? (
        <main className="flex-1">
          <CheckoutRequestView
            items={updatedCartItems}
            pricing={pricing}
            settings={settings}
            carClass={carClass}
            isDirty={isDirty}
            serviceFormat={serviceFormat}
            onSetServiceFormat={setServiceFormat}
            onBack={handleBackToCatalog}
            onSuccess={handleOrderSuccess}
          />
        </main>
      ) : (
        <>
          <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 sm:py-12 space-y-10">
        
        {/* HERO БЛОК В СТИЛЕ APPLE & LINEAR */}
        <section className="relative text-center space-y-4 pt-4 sm:pt-8 overflow-hidden">
          {/* Диффузная мягкая подсветка детейлинг-бокса */}
          <div className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-[650px] max-w-[100vw] h-[280px] bg-gradient-to-b from-sky-500/15 via-sky-600/5 to-transparent blur-[120px] rounded-full" />

          <div className="relative inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-zinc-900/90 border border-zinc-800 text-zinc-400 text-xs font-medium tracking-wide">
            <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
            <span>Детейлинг и химчистка в {settings.city}</span>
          </div>

          <h1 className="relative text-3xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.03em] text-white leading-[1.12] text-balance">
            Бережный уход за авто за 1 день
          </h1>

          <p className="relative text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed text-pretty">
            Глубокая экстракторная химчистка, сушка турбо-пушкой и зеркальная полировка. В студии на {settings.address.split(',')[0]} или с выездом к вашему дому.
          </p>
        </section>

        {/* ПЕРСОНАЛЬНЫЙ ФИЛЬТР: ТИП КУЗОВА, ВЫЕЗД И СОСТОЯНИЕ */}
        <section className="apple-card rounded-3xl p-4 sm:p-7 space-y-5">
          
          {/* 1. Селектор типа кузова с чистыми силуэтами */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                1. Выберите тип кузова
              </span>
              <span className="text-xs text-zinc-500 hidden sm:inline">
                Цены адаптируются под размер кузова
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              {[
                { 
                  id: 'S', 
                  title: 'Седан / Хэтч', 
                  image: '/cars/sedan.png',
                },
                { 
                  id: 'M', 
                  title: 'Кроссовер', 
                  image: '/cars/crossover.png',
                },
                { 
                  id: 'L', 
                  title: 'Внедорожник', 
                  image: '/cars/suv.png',
                },
                { 
                  id: 'OTHER', 
                  title: 'Минивэн', 
                  image: '/cars/van.png',
                },
              ].map((c) => {
                const isSelected = carClass === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setCarClass(c.id as CarClass);
                      triggerHaptic('selection');
                    }}
                    className={`p-3.5 sm:p-4 rounded-2xl text-left apple-btn flex flex-col justify-between transition-all duration-300 group relative overflow-hidden ${
                      isSelected
                        ? 'bg-[#181b24] text-white border border-white/30 shadow-xl shadow-black/40 ring-1 ring-white/15'
                        : 'bg-[#0f1118]/80 hover:bg-[#141722] text-zinc-300 border border-white/[0.08] hover:border-white/[0.15]'
                    }`}
                  >
                    {/* Заголовок и бейдж класса */}
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="font-semibold text-xs sm:text-sm tracking-tight text-white">{c.title}</span>
                      <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border transition-colors ${
                        isSelected
                          ? 'border-white/20 text-white bg-white/10'
                          : 'border-white/[0.08] text-zinc-400 bg-white/[0.03]'
                      }`}>
                        {c.id === 'OTHER' ? 'Индив.' : `Класс ${c.id}`}
                      </span>
                    </div>

                    {/* СИЛУЭТ АВТОМОБИЛЯ СО СГЛАЖИВАНИЕМ И АППАРАТНЫМ УСКОРЕНИЕМ */}
                    <div className="my-2 sm:my-3 py-1 flex items-center justify-center h-16 sm:h-20 w-full overflow-hidden">
                      <img
                        src={c.image}
                        alt={c.title}
                        style={{
                          transform: 'translateZ(0)',
                          backfaceVisibility: 'hidden',
                          WebkitBackfaceVisibility: 'hidden',
                          imageRendering: 'auto',
                        }}
                        className={`h-full w-auto max-w-full object-contain transform-gpu transition-all duration-300 ease-out will-change-transform ${
                          isSelected
                            ? 'opacity-100 scale-105 drop-shadow-[0_0_12px_rgba(255,255,255,0.3)]'
                            : 'opacity-40 group-hover:opacity-75 group-hover:scale-[1.02]'
                        }`}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Формат и Загрязнения (в 1 ряд) */}
          <div className="pt-4 border-t border-zinc-800/80 grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            
            {/* Выезд мастера */}
            <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
              serviceFormat === 'mobile' ? 'bg-[#181d2a] border-sky-500/60' : 'bg-[#10131c] border-zinc-700/60'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${serviceFormat === 'mobile' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                  {serviceFormat === 'mobile' ? <Truck className="w-4 h-4" /> : <Home className="w-4 h-4" />}
                </div>
                <div>
                  <span className="block text-xs font-semibold text-zinc-200">
                    {serviceFormat === 'mobile' ? 'Выезд мастера к вам' : 'В боксе студии'}
                  </span>
                  <span className="block text-[11px] text-zinc-400">
                    {serviceFormat === 'mobile' ? `+${settings.mobileServicePrice} ₽ к сумме` : settings.address}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setServiceFormat(serviceFormat === 'studio' ? 'mobile' : 'studio')}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold apple-btn transition-all ${
                  serviceFormat === 'mobile'
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                }`}
              >
                {serviceFormat === 'mobile' ? 'Выбран' : 'Выбрать'}
              </button>
            </div>

            {/* Сильные загрязнения */}
            <div className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
              isDirty ? 'bg-[#181d2a] border-sky-500/60' : 'bg-[#10131c] border-zinc-700/60'
            }`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${isDirty ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' : 'bg-zinc-800 text-zinc-400'}`}>
                  <Dog className="w-4 h-4" />
                </div>
                <div>
                  <span className="block text-xs font-semibold text-zinc-200">
                    Шерсть / въевшиеся пятна
                  </span>
                  <span className="block text-[11px] text-zinc-400">
                    {isDirty ? `+${settings.dirtyCarMarkupPercent}% к экстракции` : 'Стандартное состояние'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsDirty(!isDirty);
                  triggerHaptic('medium');
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold apple-btn transition-all ${
                  isDirty
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                }`}
              >
                {isDirty ? 'Включено' : 'Включить'}
              </button>
            </div>

          </div>

        </section>

        {/* НАВИГАЦИЯ ПО КАТЕГОРИЯМ (ДИНАМИЧЕСКИЕ ВКЛАДКИ ИЗ НАСТРОЕК) */}
        <section className="space-y-3">
          <div className="flex flex-wrap gap-1.5 p-1 rounded-2xl bg-[#10131c] border border-zinc-700/70 shadow-inner">
            {categoriesList.map((tab) => {
              const isActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveCategory(tab.id);
                    triggerHaptic('selection');
                  }}
                  className={`flex-1 min-w-[100px] py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-medium transition-all text-center apple-btn ${
                    isActive
                      ? 'bg-[#1e2436] text-white shadow-md font-semibold border border-zinc-600/80'
                      : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {tab.name}
                </button>
              );
            })}
          </div>

          {/* Подсказка для клиента о сути категорий */}
          <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-[#10131c] border border-zinc-800 text-[11px] text-zinc-400">
            <Info className="w-3.5 h-3.5 text-sky-400 shrink-0" />
            <span>
              {activeCategory === 'packages'
                ? 'Комплексы — пакеты «все включено» со скидкой до 25%. Поглощают входящие локальные зоны без переплаты.'
                : activeCategory === 'interior'
                ? 'Химчистка — экстракторная чистка сидений, потолка, багажника и уход за кожей.'
                : activeCategory === 'exterior'
                ? 'Кузов и защита — зеркальная полировка, керамика 9H, антидождь и воск.'
                : `Категория «${categoriesList.find((c) => c.id === activeCategory)?.name || 'Услуги'}» — выберите подходящие работы`}
            </span>
          </div>

          {/* КАРТОЧКИ УСЛУГ (ФИКСИРОВАННАЯ МИНИМАЛЬНАЯ ВЫСОТА БЕЗ ПРЫЖКОВ СТРАНИЦЫ) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 min-h-[440px] items-start content-start">
            {activeCategoryServices.map((service) => {
                const inCart = updatedCartItems.some((i) => i.serviceId === service.id);
                const cartItem = updatedCartItems.find((i) => i.serviceId === service.id);
                const currentQty = inCart ? cartItem?.quantity || 1 : service.allowsQuantity ? seatQuantity : 1;
                const { unitPrice, itemTotal } = calculateItemPrice(service, carClass, isDirty, currentQty, settings.dirtyCarMarkupPercent);
                const isCovered = coveredServiceIds.has(service.id);

                return (
                  <div
                    key={service.id}
                    className={`p-5 rounded-3xl transition-all flex flex-col justify-between ${
                      inCart
                        ? 'apple-card-active'
                        : isCovered
                        ? 'apple-card opacity-80 border-emerald-500/30 bg-[#0f171b]'
                        : 'apple-card'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <h4 className="font-semibold text-sm sm:text-base text-white tracking-tight leading-snug">
                          {service.name}
                        </h4>
                        {service.badge && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-md border border-zinc-700/60 text-zinc-300 bg-zinc-800/40 shrink-0">
                            {service.badge}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-zinc-400 leading-relaxed mb-3 text-pretty">
                        {service.shortDesc}
                      </p>

                      {/* Список преимуществ / что входит в комплекс */}
                      {service.isPackage && service.includedServiceIds && service.includedServiceIds.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {service.includedServiceIds.map((id) => {
                            const item = settings.tariffs.find((t) => t.id === id);
                            if (!item) return null;
                            const cleanName = item.name
                              .replace('Химчистка ', '')
                              .replace('Локальная ', '')
                              .replace(' чистка', '');
                            return (
                              <span
                                key={id}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#161b27] border border-zinc-700/60 text-[10px] font-medium text-zinc-300"
                              >
                                <Check className="w-3 h-3 text-sky-400 shrink-0" />
                                <span>{cleanName}</span>
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                      {isCovered ? (
                        <>
                          <div>
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Входит в ваш комплекс</span>
                            </span>
                            <span className="text-[10px] text-zinc-500 block">
                              Повторная оплата отключена
                            </span>
                          </div>

                          <div className="px-3 py-1.5 rounded-xl font-semibold text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 select-none flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Включено</span>
                          </div>
                        </>
                      ) : (
                        <>
                          <div>
                            <div className="flex items-baseline gap-1.5">
                              <span className="text-xl font-semibold text-white tabular-nums tracking-tight">
                                {itemTotal.toLocaleString('ru-RU')} ₽
                              </span>
                              {service.allowsQuantity && (
                                <span className="text-[11px] text-zinc-500 tabular-nums">
                                  ({unitPrice.toLocaleString('ru-RU')} ₽ / {service.unitLabel || 'место'})
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {service.allowsQuantity && (
                              <div className="flex items-center bg-zinc-950/80 rounded-xl p-0.5 border border-zinc-800">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = Math.max(1, currentQty - 1);
                                    if (inCart) handleUpdateItemQty(service.id, next);
                                    else setSeatQuantity(next);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white apple-btn"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-6 text-center text-xs font-semibold text-white tabular-nums">
                                  {currentQty}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = Math.min(service.maxQuantity || 8, currentQty + 1);
                                    if (inCart) handleUpdateItemQty(service.id, next);
                                    else setSeatQuantity(next);
                                  }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-400 hover:text-white apple-btn"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => handleToggleService(service, currentQty)}
                              className={`px-3.5 sm:px-4 py-2 rounded-xl font-semibold text-xs apple-btn transition-all flex items-center gap-1.5 ${
                                inCart
                                  ? 'bg-white text-zinc-950 shadow-sm hover:bg-zinc-200'
                                  : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-700/80 hover:border-zinc-500'
                              }`}
                            >
                              {inCart ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Выбрано</span>
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Выбрать</span>
                                </>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
        </section>

        {/* ИНТЕРАКТИВНЫЙ СЛАЙДЕР «ДО И ПОСЛЕ» */}
        {currentBeforeAfter && (
          <section className="space-y-4 pt-6 border-t border-zinc-800/80">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                Результаты работы
              </span>

              {/* Переключатель примеров (Apple Segmented Control) */}
              {beforeAfterList.length > 1 && (
                <div className="flex p-1 rounded-xl bg-zinc-900/90 border border-white/[0.08] backdrop-blur-md gap-1">
                  {beforeAfterList.map((item) => {
                    const isActive = currentBeforeAfter.id === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveBeforeAfterId(item.id);
                          triggerHaptic('selection');
                        }}
                        className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
                          isActive
                            ? 'bg-zinc-800 text-white shadow-sm border border-white/10'
                            : 'text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {item.title.split(' ')[0]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <BeforeAfterSlider
              beforeImage={currentBeforeAfter.beforeImage}
              afterImage={currentBeforeAfter.afterImage}
              beforeLabel={currentBeforeAfter.beforeLabel || 'До работы'}
              afterLabel={currentBeforeAfter.afterLabel || 'После детейлинга'}
              title={currentBeforeAfter.title}
              description={currentBeforeAfter.description}
            />
          </section>
        )}

      </main>

      {/* ПЛАВАЮЩИЙ STICKY ACTION BAR С ПОДДЕРЖКОЙ SAFE-AREA ДЛЯ СМАРТФОНОВ */}
      {cartItems.length > 0 && (
        <div className="sticky bottom-0 z-30 p-3 sm:p-4 bg-[#141722]/95 backdrop-blur-xl border-t border-zinc-700/80 shadow-2xl pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
            <div>
              <span className="text-[10px] text-zinc-400 uppercase font-semibold tracking-wider block">
                Итого ({cartItems.length} поз.)
              </span>
              <span className="text-xl sm:text-2xl font-semibold text-white tabular-nums tracking-tight">
                {pricing.displayTotalFormatted}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsCartOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-[#10131c] hover:bg-[#181d2a] text-zinc-300 font-medium text-xs apple-btn border border-zinc-700/80"
              >
                Состав
              </button>

              <button
                type="button"
                onClick={handleOpenRequest}
                className="px-5 sm:px-7 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-xs sm:text-sm shadow-md apple-btn flex items-center gap-1.5 min-h-[42px]"
              >
                <span>Записаться</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )}

      {/* КОРЗИНА */}
      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        items={updatedCartItems}
        pricing={pricing}
        settings={settings}
        carClass={carClass}
        isDirty={isDirty}
        serviceFormat={serviceFormat}
        onSetServiceFormat={setServiceFormat}
        onUpdateQuantity={handleUpdateItemQty}
        onRemoveItem={handleRemoveCartItem}
        onUndoRemove={handleUndoRemove}
        lastDeletedItem={lastDeletedItem}
        onOpenOrderModal={handleOpenRequest}
        onAddService={handleToggleService}
      />

      <Footer settings={settings} />
    </div>
  );
}
