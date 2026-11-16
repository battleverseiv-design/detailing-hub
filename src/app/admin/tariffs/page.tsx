'use client';

import React, { useState, useEffect } from 'react';
import { StudioSettings, ServiceItem, ServiceCategory } from '@/types';
import { roundPrice, calcPriceByMultiplier } from '@/lib/pricing';
import { 
  Save, 
  AlertCircle, 
  Check, 
  Plus, 
  Trash2, 
  GripVertical, 
  ChevronUp, 
  ChevronDown, 
  Package, 
  Wand2, 
  Layers, 
  Edit3, 
  X,
  Sparkles,
  Settings2,
  DollarSign
} from 'lucide-react';

const DEFAULT_CATEGORIES = [
  { id: 'packages', name: 'Комплексы', order: 1 },
  { id: 'interior', name: 'Химчистка', order: 2 },
  { id: 'exterior', name: 'Кузов и защита', order: 3 },
];

export default function AdminTariffsPage() {
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  // Активный фильтр по категории в админке
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('all');
  
  // Drag and drop состояние
  const [draggedServiceId, setDraggedServiceId] = useState<string | null>(null);
  
  // Раскрытая для детального редактирования услуга
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  // Модальное окно категорий
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/studio');
      if (res.ok) {
        const data = await res.json();
        // Сортируем услуги по сохранённому order
        if (data.tariffs) {
          data.tariffs.sort((a: ServiceItem, b: ServiceItem) => (a.order || 0) - (b.order || 0));
        }
        if (!data.categories || data.categories.length === 0) {
          data.categories = DEFAULT_CATEGORIES;
        } else {
          data.categories.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
        }
        setSettings(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  // Категории
  const categoriesList = settings?.categories && settings.categories.length > 0 
    ? [...settings.categories].sort((a, b) => (a.order || 0) - (b.order || 0))
    : DEFAULT_CATEGORIES;

  // Изменение множителей с авто-пересчетом всех M, L и OTHER
  const handleMultiplierChange = (carClass: 'M' | 'L' | 'OTHER', val: number) => {
    if (!settings) return;
    const newMultipliers = {
      ...settings.classMultipliers,
      [carClass]: val,
    };
    const multM = newMultipliers.M || 1.25;
    const multL = newMultipliers.L || 1.5;
    const multOTHER = newMultipliers.OTHER || 1.7;
    const roundStep = settings.priceRoundStep ?? 100;

    const updatedTariffs = settings.tariffs.map((t) => {
      if (t.isCustomPhoto) return t;
      const baseS = t.basePrices.S;
      return {
        ...t,
        basePrices: {
          S: baseS,
          M: calcPriceByMultiplier(baseS, multM, roundStep),
          L: calcPriceByMultiplier(baseS, multL, roundStep),
          OTHER: calcPriceByMultiplier(baseS, multOTHER, roundStep),
        },
      };
    });

    setSettings({
      ...settings,
      classMultipliers: newMultipliers,
      tariffs: updatedTariffs,
    });
  };

  // Изменение шага округления с авто-пересчетом цен
  const handleRoundStepChange = (val: number) => {
    if (!settings) return;
    const multM = settings.classMultipliers?.M || 1.25;
    const multL = settings.classMultipliers?.L || 1.5;
    const multOTHER = settings.classMultipliers?.OTHER || 1.7;

    const updatedTariffs = settings.tariffs.map((t) => {
      if (t.isCustomPhoto) return t;
      const baseS = t.basePrices.S;
      return {
        ...t,
        basePrices: {
          S: baseS,
          M: calcPriceByMultiplier(baseS, multM, val),
          L: calcPriceByMultiplier(baseS, multL, val),
          OTHER: calcPriceByMultiplier(baseS, multOTHER, val),
        },
      };
    });

    setSettings({
      ...settings,
      priceRoundStep: val,
      tariffs: updatedTariffs,
    });
  };

  // Пересчитать все M, L и OTHER цены принудительно в 1 клик
  const handleRecalculateAllPrices = () => {
    if (!settings) return;
    const multM = settings.classMultipliers?.M || 1.25;
    const multL = settings.classMultipliers?.L || 1.5;
    const multOTHER = settings.classMultipliers?.OTHER || 1.7;
    const roundStep = settings.priceRoundStep ?? 100;

    const updatedTariffs = settings.tariffs.map((t) => {
      if (t.isCustomPhoto) return t;
      const baseS = t.basePrices.S;
      return {
        ...t,
        basePrices: {
          S: baseS,
          M: calcPriceByMultiplier(baseS, multM, roundStep),
          L: calcPriceByMultiplier(baseS, multL, roundStep),
          OTHER: calcPriceByMultiplier(baseS, multOTHER, roundStep),
        },
      };
    });

    setSettings({ ...settings, tariffs: updatedTariffs });
  };

  // Изменение цены отдельной услуги (при изменении S автоматически считаем M, L и OTHER)
  const handlePriceChange = (serviceId: string, carClass: 'S' | 'M' | 'L' | 'OTHER', val: number) => {
    if (!settings) return;
    const multM = settings.classMultipliers?.M || 1.25;
    const multL = settings.classMultipliers?.L || 1.5;
    const multOTHER = settings.classMultipliers?.OTHER || 1.7;
    const roundStep = settings.priceRoundStep ?? 100;

    setSettings({
      ...settings,
      tariffs: settings.tariffs.map((t) => {
        if (t.id !== serviceId) return t;
        const newPrices = { ...t.basePrices, [carClass]: val };
        if (carClass === 'S') {
          newPrices.M = calcPriceByMultiplier(val, multM, roundStep);
          newPrices.L = calcPriceByMultiplier(val, multL, roundStep);
          newPrices.OTHER = calcPriceByMultiplier(val, multOTHER, roundStep);
        }
        return {
          ...t,
          basePrices: newPrices,
        };
      }),
    });
  };

  // Управление категориями
  const handleAddCategory = () => {
    if (!newCategoryName.trim() || !settings) return;
    const rawName = newCategoryName.trim();
    const slug = 'cat_' + Date.now().toString(36);
    const newCat = {
      id: slug,
      name: rawName,
      order: (settings.categories?.length || 0) + 1,
    };
    const updatedCategories = [...(settings.categories || DEFAULT_CATEGORIES), newCat];
    setSettings({
      ...settings,
      categories: updatedCategories,
    });
    setNewCategoryName('');
  };

  const handleRenameCategory = (id: string, newName: string) => {
    if (!settings) return;
    const updated = (settings.categories || DEFAULT_CATEGORIES).map((c) =>
      c.id === id ? { ...c, name: newName } : c
    );
    setSettings({ ...settings, categories: updated });
  };

  const handleMoveCategory = (id: string, direction: 'up' | 'down') => {
    if (!settings) return;
    const cats = [...(settings.categories || DEFAULT_CATEGORIES)].sort((a, b) => (a.order || 0) - (b.order || 0));
    const idx = cats.findIndex((c) => c.id === id);
    if (idx === -1) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= cats.length) return;

    const temp = cats[idx];
    cats[idx] = cats[targetIdx];
    cats[targetIdx] = temp;

    const reordered = cats.map((c, i) => ({ ...c, order: i + 1 }));
    setSettings({ ...settings, categories: reordered });
  };

  const handleDeleteCategory = (id: string) => {
    if (!settings) return;
    const currentCats = settings.categories || DEFAULT_CATEGORIES;
    const catToDelete = currentCats.find((c) => c.id === id);
    const servicesInCat = settings.tariffs.filter((t) => t.category === id);

    if (servicesInCat.length > 0) {
      if (!confirm(`В категории «${catToDelete?.name || id}» находится ${servicesInCat.length} услуг. При удалении категории они будут перемещены в категорию «Химчистка». Удалить?`)) {
        return;
      }
    } else {
      if (!confirm(`Удалить категорию «${catToDelete?.name || id}»?`)) return;
    }

    const updatedCategories = currentCats.filter((c) => c.id !== id);
    const fallbackCat = updatedCategories.find((c) => c.id === 'interior')?.id || updatedCategories[0]?.id || 'interior';
    
    const updatedTariffs = settings.tariffs.map((t) =>
      t.category === id ? { ...t, category: fallbackCat as ServiceCategory } : t
    );

    if (activeCategoryFilter === id) {
      setActiveCategoryFilter('all');
    }

    setSettings({
      ...settings,
      categories: updatedCategories,
      tariffs: updatedTariffs,
    });
  };

  // Перемещение Drag & Drop
  const handleDragStart = (id: string) => {
    setDraggedServiceId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetId: string) => {
    if (!draggedServiceId || draggedServiceId === targetId || !settings) return;
    const tariffs = [...settings.tariffs];
    const fromIndex = tariffs.findIndex((t) => t.id === draggedServiceId);
    const toIndex = tariffs.findIndex((t) => t.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = tariffs.splice(fromIndex, 1);
    tariffs.splice(toIndex, 0, moved);

    const reordered = tariffs.map((t, idx) => ({ ...t, order: idx + 1 }));
    setSettings({ ...settings, tariffs: reordered });
    setDraggedServiceId(null);
  };

  // Перемещение кнопками Вверх/Вниз
  const handleMove = (id: string, direction: 'up' | 'down') => {
    if (!settings) return;
    const tariffs = [...settings.tariffs];
    const index = tariffs.findIndex((t) => t.id === id);
    if (index === -1) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= tariffs.length) return;

    const temp = tariffs[index];
    tariffs[index] = tariffs[targetIndex];
    tariffs[targetIndex] = temp;

    const reordered = tariffs.map((t, idx) => ({ ...t, order: idx + 1 }));
    setSettings({ ...settings, tariffs: reordered });
  };

  // Добавление новой услуги
  const handleAddService = () => {
    if (!settings) return;
    const newId = 'srv_' + Date.now();
    const newOrder = settings.tariffs.length + 1;
    const targetCategory = activeCategoryFilter === 'all' 
      ? (categoriesList[0]?.id || 'interior') 
      : activeCategoryFilter;

    const multM = settings.classMultipliers?.M || 1.25;
    const multL = settings.classMultipliers?.L || 1.5;
    const multOTHER = settings.classMultipliers?.OTHER || 1.7;
    const roundStep = settings.priceRoundStep ?? 100;
    const baseS = 3000;

    const newService: ServiceItem = {
      id: newId,
      name: 'Новая услуга',
      category: targetCategory as ServiceCategory,
      shortDesc: 'Краткое описание для клиента',
      fullDesc: '',
      basePrices: { 
        S: baseS, 
        M: calcPriceByMultiplier(baseS, multM, roundStep), 
        L: calcPriceByMultiplier(baseS, multL, roundStep),
        OTHER: calcPriceByMultiplier(baseS, multOTHER, roundStep),
      },
      zones: ['interior_seats'],
      order: newOrder,
      isPackage: targetCategory === 'packages',
      includedServiceIds: [],
    };

    setSettings({
      ...settings,
      tariffs: [...settings.tariffs, newService],
    });
    setEditingServiceId(newId);
  };

  // Удаление услуги
  const handleDeleteService = (id: string) => {
    if (!settings) return;
    if (!confirm('Вы уверены, что хотите удалить эту услугу из каталога?')) return;
    setSettings({
      ...settings,
      tariffs: settings.tariffs.filter((t) => t.id !== id),
    });
    if (editingServiceId === id) setEditingServiceId(null);
  };

  // Переключение включённых услуг в комплекс
  const handleToggleIncludedService = (packageServiceId: string, targetIncludedId: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      tariffs: settings.tariffs.map((t) => {
        if (t.id !== packageServiceId) return t;
        const current = t.includedServiceIds || [];
        const exists = current.includes(targetIncludedId);
        const updated = exists 
          ? current.filter((id) => id !== targetIncludedId) 
          : [...current, targetIncludedId];
        return {
          ...t,
          includedServiceIds: updated,
        };
      }),
    });
  };

  // Переключение обязательных предварительных услуг (зависимостей)
  const handleToggleRequiredService = (serviceId: string, targetReqId: string) => {
    if (!settings) return;
    setSettings({
      ...settings,
      tariffs: settings.tariffs.map((t) => {
        if (t.id !== serviceId) return t;
        const current = t.requiredServiceIds || [];
        const exists = current.includes(targetReqId);
        const updated = exists 
          ? current.filter((id) => id !== targetReqId) 
          : [...current, targetReqId];
        return {
          ...t,
          requiredServiceIds: updated,
        };
      }),
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    setSaving(true);
    setError('');
    setSuccess(false);

    try {
      const res = await fetch('/api/admin/studio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (!res.ok) {
        throw new Error('Ошибка сохранения тарифов');
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center space-y-2">
          <div className="w-6 h-6 border-2 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-zinc-400">Загрузка тарифов и настроек...</p>
        </div>
      </div>
    );
  }

  // Фильтрация списка услуг
  const filteredTariffs = settings.tariffs.filter((t) => {
    if (activeCategoryFilter === 'all') return true;
    return t.category === activeCategoryFilter;
  });

  // Список локальных услуг, которые можно включить в комплекс
  const standaloneServices = settings.tariffs.filter((t) => !t.isPackage && t.id !== 'custom_photo_service');

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-20">
      {/* Шапка страницы */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Тарифы, категории и цены
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Задавайте базовую цену (Класс S), множители классов M и L рассчитаются автоматически
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="min-h-[44px] px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs sm:text-sm shadow-md shadow-sky-600/20 active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>Все тарифы, категории и цены успешно сохранены и обновлены на сайте!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* БЛОК 1: МНОЖИТЕЛИ ЦЕН И ПАРАМЕТРЫ СТУДИИ */}
      <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/80 border border-zinc-800/80 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
          <div>
            <h2 className="font-extrabold text-sm text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-400" />
              <span>Ценообразование по классам авто (общий множитель)</span>
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Вводите базовую цену (Класс S) — цены для кроссоверов (M) и внедорожников (L) пересчитываются автоматически
            </p>
          </div>

          <button
            type="button"
            onClick={handleRecalculateAllPrices}
            className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 text-xs sm:text-sm font-bold border border-zinc-700/80 transition-all flex items-center justify-center gap-2 w-full sm:w-auto"
            title="Принудительно обновить цены M и L для всех тарифов"
          >
            <Wand2 className="w-4 h-4 text-sky-400" />
            <span>Пересчитать все M и L</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-zinc-400 mb-1">
              Класс S (Седан / Хэтч)
            </label>
            <input
              type="text"
              disabled
              value="1.00 (База)"
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 text-zinc-400 text-base sm:text-sm font-bold cursor-not-allowed"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Класс M (Кроссовер)
            </label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="2.5"
              value={settings.classMultipliers?.M ?? 1.25}
              onChange={(e) => handleMultiplierChange('M', parseFloat(e.target.value) || 1.25)}
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-base sm:text-sm font-bold text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Класс L (Внедорожник)
            </label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="3.0"
              value={settings.classMultipliers?.L ?? 1.5}
              onChange={(e) => handleMultiplierChange('L', parseFloat(e.target.value) || 1.5)}
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-base sm:text-sm font-bold text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-sky-400 mb-1">
              Класс OTHER (Минивэн)
            </label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="3.5"
              value={settings.classMultipliers?.OTHER ?? 1.7}
              onChange={(e) => handleMultiplierChange('OTHER', parseFloat(e.target.value) || 1.7)}
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl border border-sky-500/40 bg-zinc-900 text-base sm:text-sm font-bold text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Шаг округления цен
            </label>
            <select
              value={settings.priceRoundStep ?? 100}
              onChange={(e) => handleRoundStepChange(Number(e.target.value))}
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-base sm:text-sm font-bold text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
            >
              <option value={0}>Без округления</option>
              <option value={50}>До 50 ₽</option>
              <option value={100}>До 100 ₽ (Красивые)</option>
              <option value={500}>До 500 ₽</option>
            </select>
          </div>
        </div>

        {/* Дополнительные студийные параметры */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-zinc-800/80">
          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Мин. сумма заказа (₽)
            </label>
            <input
              type="number"
              step="500"
              value={settings.minOrderAmount ?? 3000}
              onChange={(e) => setSettings({ ...settings, minOrderAmount: Number(e.target.value) })}
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-base sm:text-sm font-bold text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Надбавка за загрязнение (%)
            </label>
            <input
              type="number"
              step="5"
              value={settings.dirtyCarMarkupPercent ?? 30}
              onChange={(e) => setSettings({ ...settings, dirtyCarMarkupPercent: Number(e.target.value) })}
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-base sm:text-sm font-bold text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-300 mb-1">
              Выезд мастера к дому (₽)
            </label>
            <input
              type="number"
              step="100"
              value={settings.mobileServicePrice ?? 1500}
              onChange={(e) => setSettings({ ...settings, mobileServicePrice: Number(e.target.value) })}
              className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl border border-zinc-700 bg-zinc-900 text-base sm:text-sm font-bold text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none"
            />
          </div>
        </div>
      </div>

      {/* БЛОК 2: КАТЕГОРИИ И СПИСОК УСЛУГ */}
      <div className="rounded-3xl bg-zinc-950/80 border border-zinc-800/80 shadow-sm overflow-hidden">
        {/* Вкладки категорий и кнопки управления */}
        <div className="p-4 sm:p-5 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategoryFilter === 'all'
                  ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                  : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
              }`}
            >
              Все услуги ({settings.tariffs.length})
            </button>

            {categoriesList.map((cat) => {
              const count = settings.tariffs.filter((t) => t.category === cat.id).length;
              const isActive = activeCategoryFilter === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold border border-zinc-700/80 transition-all flex items-center gap-1.5"
            >
              <Settings2 className="w-3.5 h-3.5 text-sky-400" />
              <span>Категории</span>
            </button>

            <button
              type="button"
              onClick={handleAddService}
              className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-sky-600/20"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Добавить услугу</span>
            </button>
          </div>
        </div>

        {/* Поясняющая плашка Drag & Drop */}
        <div className="px-5 py-2.5 bg-zinc-900/50 border-b border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5 text-zinc-500" />
            <span>Зажмите и перетаскивайте за ручку слева или используйте стрелки ▲▼ для настройки порядка</span>
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-zinc-500">
            Очередность синхронизирована с сайтом
          </span>
        </div>

        {/* СПИСОК УСЛУГ */}
        <div className="divide-y divide-zinc-800/80">
          {filteredTariffs.map((t, idx) => {
            const isEditing = editingServiceId === t.id;
            const isFirst = idx === 0;
            const isLast = idx === filteredTariffs.length - 1;
            const catName = categoriesList.find((c) => c.id === t.category)?.name || t.category;

            return (
              <div
                key={t.id}
                draggable
                onDragStart={() => handleDragStart(t.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(t.id)}
                className={`p-4 sm:p-5 transition-all ${
                  draggedServiceId === t.id 
                    ? 'opacity-40 bg-sky-950/20' 
                    : 'hover:bg-zinc-900/40'
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  {/* Ручка Drag and Drop и стрелочки */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      className="cursor-grab active:cursor-grabbing p-1.5 text-zinc-600 hover:text-zinc-300"
                      title="Перетащите для изменения порядка"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>
                    <div className="flex flex-col gap-0.5">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => handleMove(t.id, 'up')}
                        className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 disabled:opacity-20"
                        title="Поднять выше"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => handleMove(t.id, 'down')}
                        className="p-0.5 rounded hover:bg-zinc-800 text-zinc-500 hover:text-zinc-200 disabled:opacity-20"
                        title="Опустить ниже"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Описание услуги и бейджи */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-extrabold text-xs sm:text-sm text-white">
                        {t.name}
                      </span>

                      {/* Категория */}
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-sky-500/30 text-sky-400 bg-sky-500/10">
                        {catName}
                      </span>

                      {/* Бейдж комплекса */}
                      {t.isPackage && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          <span>Все включено</span>
                        </span>
                      )}

                      {/* Бейдж апсейла в корзине */}
                      {t.recommendInCart && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center gap-1">
                          <span>★ Апсейл в корзине</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-400 truncate max-w-xl">
                      {t.shortDesc}
                    </p>

                    {/* Отображение списка включённых в комплекс услуг */}
                    {t.isPackage && t.includedServiceIds && t.includedServiceIds.length > 0 && (
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Включает: <span className="font-medium text-zinc-300">
                          {t.includedServiceIds.map((id) => settings.tariffs.find((st) => st.id === id)?.name || id).join(', ')}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* БАЗОВАЯ ЦЕНА (КЛАСС S) И АВТО-РАСЧЁТ M / L */}
                  {!t.isCustomPhoto && (
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-end">
                        <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-wider">
                          База S (Седан)
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <input
                            type="number"
                            step="100"
                            value={t.basePrices.S}
                            onChange={(e) => handlePriceChange(t.id, 'S', Number(e.target.value))}
                            className="w-24 px-2 py-1 rounded-xl border border-zinc-700 bg-zinc-900 text-right font-black text-xs text-white focus:border-sky-500 focus:ring-1 focus:ring-sky-500 outline-none transition-all shadow-inner"
                          />
                          <span className="text-xs text-zinc-400 font-bold">₽</span>
                        </div>
                      </div>

                      {/* Автоматически рассчитанные цены M, L и OTHER по множителю */}
                      <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-xl bg-zinc-900/80 border border-zinc-800 text-xs">
                        <div className="text-center">
                          <span className="block text-[8px] font-bold text-zinc-500 uppercase">M (Кросс)</span>
                          <span className="font-bold text-zinc-300 text-xs">
                            {t.basePrices.M?.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <div className="h-5 w-px bg-zinc-800" />
                        <div className="text-center">
                          <span className="block text-[8px] font-bold text-zinc-500 uppercase">L (Джип)</span>
                          <span className="font-bold text-zinc-300 text-xs">
                            {t.basePrices.L?.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                        <div className="h-5 w-px bg-zinc-800" />
                        <div className="text-center">
                          <span className="block text-[8px] font-bold text-sky-400 uppercase">Минивэн</span>
                          <span className="font-bold text-sky-300 text-xs">
                            {(t.basePrices.OTHER ?? calcPriceByMultiplier(t.basePrices.S, settings.classMultipliers?.OTHER || 1.7, settings.priceRoundStep ?? 100))?.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Кнопки действий: карандаш и корзина */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingServiceId(isEditing ? null : t.id)}
                      className={`p-2 rounded-xl transition-all ${
                        isEditing 
                          ? 'bg-sky-500 text-white shadow-sm shadow-sky-500/20' 
                          : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 border border-zinc-800'
                      }`}
                      title="Настройки услуги"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(t.id)}
                      className="p-2 rounded-xl bg-zinc-900 hover:bg-rose-500/10 text-zinc-500 hover:text-rose-400 border border-zinc-800 transition-all"
                      title="Удалить услугу"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* РАСКРЫТАЯ ФОРМА ДЕТАЛЬНОЙ НАСТРОЙКИ */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-zinc-800/80 bg-zinc-900/60 p-4 rounded-2xl space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                          Название услуги
                        </label>
                        <input
                          type="text"
                          value={t.name}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              tariffs: settings.tariffs.map((item) =>
                                item.id === t.id ? { ...item, name: e.target.value } : item
                              ),
                            });
                          }}
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white focus:border-sky-500 outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                          Категория в каталоге
                        </label>
                        <select
                          value={t.category}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              tariffs: settings.tariffs.map((item) =>
                                item.id === t.id ? { ...item, category: e.target.value as ServiceCategory } : item
                              ),
                            });
                          }}
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white focus:border-sky-500 outline-none"
                        >
                          {categoriesList.map((cat) => (
                            <option key={cat.id} value={cat.id}>
                              {cat.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                        Краткое описание (1-2 предложения для каталога)
                      </label>
                      <input
                        type="text"
                        value={t.shortDesc}
                        onChange={(e) => {
                          setSettings({
                            ...settings,
                            tariffs: settings.tariffs.map((item) =>
                              item.id === t.id ? { ...item, shortDesc: e.target.value } : item
                            ),
                          });
                        }}
                        className="w-full px-3 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs text-zinc-200 focus:border-sky-500 outline-none"
                      />
                    </div>

                    {/* Цены по классам авто с пояснением */}
                    <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-zinc-300 flex items-center gap-1.5">
                          <DollarSign className="w-3.5 h-3.5 text-sky-400" />
                          <span>Цены для классов авто</span>
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          M, L и OTHER рассчитываются автоматически по множителям от класса S
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                            Класс S (База)
                          </label>
                          <input
                            type="number"
                            step="100"
                            value={t.basePrices.S}
                            onChange={(e) => handlePriceChange(t.id, 'S', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white focus:border-sky-500 outline-none text-right"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                            Класс M (Кроссовер)
                          </label>
                          <input
                            type="number"
                            step="100"
                            value={t.basePrices.M}
                            onChange={(e) => handlePriceChange(t.id, 'M', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white focus:border-sky-500 outline-none text-right"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                            Класс L (Внедорожник)
                          </label>
                          <input
                            type="number"
                            step="100"
                            value={t.basePrices.L}
                            onChange={(e) => handlePriceChange(t.id, 'L', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-bold text-white focus:border-sky-500 outline-none text-right"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-sky-400 mb-1">
                            Класс OTHER (Минивэн)
                          </label>
                          <input
                            type="number"
                            step="100"
                            value={t.basePrices.OTHER ?? calcPriceByMultiplier(t.basePrices.S, settings.classMultipliers?.OTHER || 1.7, settings.priceRoundStep ?? 100)}
                            onChange={(e) => handlePriceChange(t.id, 'OTHER', Number(e.target.value))}
                            className="w-full px-2.5 py-1.5 rounded-xl border border-sky-500/40 bg-zinc-900 text-xs font-bold text-white focus:border-sky-500 outline-none text-right"
                          />
                        </div>
                      </div>
                    </div>

                    {/* НАСТРОЙКА КОМПЛЕКСА (СВЯЗКА С УСЛУГАМИ САЛОНА И КУЗОВА) */}
                    <div className="pt-3 border-t border-zinc-800">
                      <div className="flex items-center gap-2 mb-2">
                        <input
                          type="checkbox"
                          id={`isPackage_${t.id}`}
                          checked={!!t.isPackage}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              tariffs: settings.tariffs.map((item) =>
                                item.id === t.id ? { ...item, isPackage: e.target.checked } : item
                              ),
                            });
                          }}
                          className="w-4 h-4 rounded text-sky-500 bg-zinc-900 border-zinc-700 cursor-pointer"
                        />
                        <label htmlFor={`isPackage_${t.id}`} className="text-xs font-bold text-zinc-200 cursor-pointer select-none flex items-center gap-1.5">
                          <span>Это комплексный пакет (поглощает входящие услуги без переплаты)</span>
                        </label>
                      </div>

                      {t.isPackage && (
                        <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                          <span className="block text-[11px] font-bold text-zinc-400">
                            Выберите услуги, которые УЖЕ входят в этот комплекс (будут заблокированы от повторной покупки клиентом):
                          </span>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                            {standaloneServices.map((st) => {
                              const isIncluded = (t.includedServiceIds || []).includes(st.id);
                              return (
                                <label
                                  key={st.id}
                                  className={`p-1.5 rounded-lg border text-xs flex items-center gap-2 cursor-pointer transition-colors ${
                                    isIncluded
                                      ? 'bg-sky-500/10 border-sky-500/40 text-sky-300 font-semibold'
                                      : 'border-zinc-800 text-zinc-400 hover:border-zinc-700'
                                  }`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isIncluded}
                                    onChange={() => handleToggleIncludedService(t.id, st.id)}
                                    className="w-3.5 h-3.5 rounded text-sky-500"
                                  />
                                  <span className="truncate">{st.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ДОП. ОПЦИИ: АПСЕЙЛ И ПРЕДВАРИТЕЛЬНЫЕ ТРЕБОВАНИЯ */}
                    <div className="pt-3 border-t border-zinc-800 flex flex-wrap gap-4">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!!t.recommendInCart}
                          onChange={(e) => {
                            setSettings({
                              ...settings,
                              tariffs: settings.tariffs.map((item) =>
                                item.id === t.id ? { ...item, recommendInCart: e.target.checked } : item
                              ),
                            });
                          }}
                          className="w-4 h-4 rounded text-sky-500 bg-zinc-900 border-zinc-700"
                        />
                        <span className="text-xs font-semibold text-zinc-300">
                          Рекомендовать в корзине (умный апсейл)
                        </span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО УПРАВЛЕНИЯ КАТЕГОРИЯМИ */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Категории услуг</h3>
                  <p className="text-xs text-zinc-400">Настройка вкладок каталога на сайте</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Список категорий */}
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {categoriesList.map((cat, idx) => {
                const count = settings.tariffs.filter((t) => t.category === cat.id).length;
                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between gap-3 p-3 rounded-2xl bg-zinc-950 border border-zinc-800/80 hover:border-zinc-700 transition-all"
                  >
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="flex flex-col gap-0.5 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => handleMoveCategory(cat.id, 'up')}
                          className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-20"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          disabled={idx === categoriesList.length - 1}
                          onClick={() => handleMoveCategory(cat.id, 'down')}
                          className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 disabled:opacity-20"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <div className="flex-1 min-w-0">
                        <input
                          type="text"
                          value={cat.name}
                          onChange={(e) => handleRenameCategory(cat.id, e.target.value)}
                          className="w-full px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold text-white focus:border-sky-500 outline-none"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[10px] text-zinc-500 font-mono">id: {cat.id}</span>
                          <span className="text-[10px] text-zinc-400 font-medium">({count} услуг)</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteCategory(cat.id)}
                      className="p-2 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
                      title="Удалить категорию"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Добавление новой категории */}
            <div className="pt-3 border-t border-zinc-800 space-y-2">
              <label className="block text-xs font-bold text-zinc-300">
                Новая категория
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Например: Защитные плёнки"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCategory();
                    }
                  }}
                  className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:border-sky-500 outline-none"
                />
                <button
                  type="button"
                  onClick={handleAddCategory}
                  disabled={!newCategoryName.trim()}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-bold transition-all flex items-center gap-1.5 shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  <span>Добавить</span>
                </button>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsCategoryModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors"
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}
