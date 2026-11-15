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
  Sparkles
} from 'lucide-react';

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
  
  // Раскрытая для редактирования услуга
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

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

  // Изменение множителей
  const handleMultiplierChange = (carClass: 'M' | 'L', val: number) => {
    if (!settings) return;
    setSettings({
      ...settings,
      classMultipliers: {
        ...settings.classMultipliers,
        [carClass]: val,
      },
    });
  };

  // Пересчитать все M и L цены в 1 клик по множителям
  const handleRecalculateAllPrices = () => {
    if (!settings) return;
    const multM = settings.classMultipliers?.M || 1.25;
    const multL = settings.classMultipliers?.L || 1.5;
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
        },
      };
    });

    setSettings({ ...settings, tariffs: updatedTariffs });
  };

  // Изменение цены отдельной услуги
  const handlePriceChange = (serviceId: string, carClass: 'S' | 'M' | 'L', val: number) => {
    if (!settings) return;
    const multM = settings.classMultipliers?.M || 1.25;
    const multL = settings.classMultipliers?.L || 1.5;
    const roundStep = settings.priceRoundStep ?? 100;

    setSettings({
      ...settings,
      tariffs: settings.tariffs.map((t) => {
        if (t.id !== serviceId) return t;
        const newPrices = { ...t.basePrices, [carClass]: val };
        // Если меняем базовую цену S — автоматически подтягиваем M и L
        if (carClass === 'S') {
          newPrices.M = calcPriceByMultiplier(val, multM, roundStep);
          newPrices.L = calcPriceByMultiplier(val, multL, roundStep);
        }
        return {
          ...t,
          basePrices: newPrices,
        };
      }),
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
    const targetCategory = activeCategoryFilter === 'all' ? 'interior' : activeCategoryFilter;

    const newService: ServiceItem = {
      id: newId,
      name: 'Новая услуга',
      category: targetCategory as ServiceCategory,
      shortDesc: 'Краткое описание для клиента',
      fullDesc: '',
      basePrices: { S: 3000, M: 3800, L: 4500 },
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
    return <div className="py-12 text-center text-xs text-zinc-400">Загрузка тарифов...</div>;
  }

  // Фильтрация списка услуг
  const filteredTariffs = settings.tariffs.filter((t) => {
    if (activeCategoryFilter === 'all') return true;
    return t.category === activeCategoryFilter;
  });

  // Список локальных услуг, которые можно включить в комплекс
  const standaloneServices = settings.tariffs.filter((t) => !t.isPackage && t.id !== 'custom_photo_service');

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* Шапка страницы */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-zinc-900 dark:text-white">
            Тарифы, категории и порядок услуг
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            Настраивайте множители классов, перетаскивайте услуги в любом порядке и связывайте комплексы
          </p>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md shadow-sky-600/20 active:scale-95 disabled:opacity-60 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>{saving ? 'Сохранение...' : 'Сохранить все настройки'}</span>
        </button>
      </div>

      {success && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
          <Check className="w-4 h-4 shrink-0" />
          <span>Тарифы и порядок успешно сохранены и применены на сайте!</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* БЛОК 1: МНОЖИТЕЛИ ЦЕН ПО КЛАССАМ И ОКРУГЛЕНИЕ */}
      <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-100 dark:border-zinc-800 pb-4">
          <div>
            <h2 className="font-extrabold text-sm text-zinc-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-sky-500" />
              <span>Ценообразование по классам машин (множители)</span>
            </h2>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">
              Базовый класс S = 1.0 (100%). Цены для кроссоверов и внедорожников масштабируются пропорционально.
            </p>
          </div>

          <button
            type="button"
            onClick={handleRecalculateAllPrices}
            className="px-3.5 py-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all flex items-center gap-1.5 self-start"
            title="Автоматически обновит цены M и L для всех тарифов от базовой цены S"
          >
            <Wand2 className="w-3.5 h-3.5 text-sky-500" />
            <span>Пересчитать M и L по множителям</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 mb-1">
              Класс S (Седан / Хэтч)
            </label>
            <input
              type="text"
              disabled
              value="1.00 (База)"
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-950/60 text-zinc-500 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Класс M (Кроссовер)
            </label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="2.5"
              value={settings.classMultipliers?.M ?? 1.25}
              onChange={(e) => handleMultiplierChange('M', parseFloat(e.target.value) || 1.25)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Класс L (Внедорожник)
            </label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="3.0"
              value={settings.classMultipliers?.L ?? 1.5}
              onChange={(e) => handleMultiplierChange('L', parseFloat(e.target.value) || 1.5)}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Шаг округления цен
            </label>
            <select
              value={settings.priceRoundStep ?? 100}
              onChange={(e) => setSettings({ ...settings, priceRoundStep: Number(e.target.value) })}
              className="w-full px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold focus:ring-2 focus:ring-sky-500 outline-none"
            >
              <option value={0}>Без округления</option>
              <option value={50}>До 50 ₽</option>
              <option value={100}>До 100 ₽ (Красивые)</option>
              <option value={500}>До 500 ₽</option>
            </select>
          </div>
        </div>

        {/* Финансовые пороги */}
        <div className="pt-3 border-t border-zinc-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              Мин. сумма заказа (₽)
            </label>
            <input
              type="number"
              value={settings.minOrderAmount}
              onChange={(e) => setSettings({ ...settings, minOrderAmount: Number(e.target.value) })}
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              Надбавка за загрязнения (%)
            </label>
            <input
              type="number"
              value={settings.dirtyCarMarkupPercent}
              onChange={(e) => setSettings({ ...settings, dirtyCarMarkupPercent: Number(e.target.value) })}
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mb-1">
              Выезд мастера к дому (₽)
            </label>
            <input
              type="number"
              value={settings.mobileServicePrice}
              onChange={(e) => setSettings({ ...settings, mobileServicePrice: Number(e.target.value) })}
              className="w-full px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-xs font-bold"
            />
          </div>
        </div>
      </div>

      {/* БЛОК 2: КАТАЛОГ УСЛУГ И УПРАВЛЕНИЕ ПОРЯДКОМ (DRAG & DROP) */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">
        {/* Панель фильтров категорий и кнопка добавления */}
        <div className="p-4 sm:p-5 border-b border-zinc-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategoryFilter === 'all'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Все услуги ({settings.tariffs.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('packages')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategoryFilter === 'packages'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Комплексы ({settings.tariffs.filter((t) => t.category === 'packages').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('interior')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategoryFilter === 'interior'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Салон ({settings.tariffs.filter((t) => t.category === 'interior').length})
            </button>
            <button
              type="button"
              onClick={() => setActiveCategoryFilter('exterior')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                activeCategoryFilter === 'exterior'
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 shadow-sm'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              Кузов ({settings.tariffs.filter((t) => t.category === 'exterior').length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleAddService}
            className="px-3.5 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-sky-600/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить услугу</span>
          </button>
        </div>

        {/* Поясняющая плашка Drag & Drop */}
        <div className="px-5 py-2.5 bg-zinc-50 dark:bg-zinc-950/50 border-b border-zinc-200 dark:border-zinc-800 text-[11px] text-zinc-500 dark:text-zinc-400 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <GripVertical className="w-3.5 h-3.5 text-zinc-400" />
            <span>Зажмите и перетаскивайте за ручку слева или используйте стрелки ▲▼ для настройки порядка на сайте</span>
          </span>
          <span className="hidden sm:inline font-mono text-[10px] text-zinc-400">
            Порядок на сайте 1-в-1
          </span>
        </div>

        {/* СПИСОК УСЛУГ С DRAG & DROP */}
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/80">
          {filteredTariffs.map((t, idx) => {
            const isEditing = editingServiceId === t.id;
            const isFirst = idx === 0;
            const isLast = idx === filteredTariffs.length - 1;

            return (
              <div
                key={t.id}
                draggable
                onDragStart={() => handleDragStart(t.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(t.id)}
                className={`p-4 sm:p-5 transition-all ${
                  draggedServiceId === t.id 
                    ? 'opacity-40 bg-sky-50 dark:bg-sky-950/20' 
                    : 'hover:bg-zinc-50/70 dark:hover:bg-zinc-800/40'
                }`}
              >
                <div className="flex items-start sm:items-center justify-between gap-3">
                  
                  {/* Ручка перетаскивания и стрелки */}
                  <div className="flex items-center gap-1.5 shrink-0 pt-1 sm:pt-0">
                    <button
                      type="button"
                      className="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400"
                      title="Перетащить услугу"
                    >
                      <GripVertical className="w-4 h-4" />
                    </button>

                    <div className="flex flex-col">
                      <button
                        type="button"
                        disabled={isFirst}
                        onClick={() => handleMove(t.id, 'up')}
                        className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 disabled:opacity-20"
                        title="Поднять выше"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        disabled={isLast}
                        onClick={() => handleMove(t.id, 'down')}
                        className="p-0.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 disabled:opacity-20"
                        title="Опустить ниже"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Описание услуги и бейджи */}
                  <div className="flex-1 min-w-0 pr-2">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-white">
                        {t.name}
                      </span>

                      {/* Категория */}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        t.category === 'packages'
                          ? 'border-purple-500/30 text-purple-600 dark:text-purple-400 bg-purple-500/10'
                          : t.category === 'interior'
                          ? 'border-sky-500/30 text-sky-600 dark:text-sky-400 bg-sky-500/10'
                          : 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                      }`}>
                        {t.category === 'packages' ? 'Комплекс' : t.category === 'interior' ? 'Салон' : 'Кузов'}
                      </span>

                      {/* Бейдж комплекса */}
                      {t.isPackage && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 flex items-center gap-1">
                          <Package className="w-3 h-3" />
                          <span>Все включено</span>
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 truncate max-w-xl">
                      {t.shortDesc}
                    </p>

                    {/* Отображение списка включённых в комплекс услуг */}
                    {t.isPackage && t.includedServiceIds && t.includedServiceIds.length > 0 && (
                      <p className="text-[10px] text-zinc-400 mt-1">
                        Включает в себя: <span className="font-medium text-zinc-300">
                          {t.includedServiceIds.map((id) => settings.tariffs.find((st) => st.id === id)?.name || id).join(', ')}
                        </span>
                      </p>
                    )}
                  </div>

                  {/* Быстрый ввод цен S / M / L */}
                  {!t.isCustomPhoto && (
                    <div className="hidden md:flex items-center gap-2 shrink-0">
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 text-center uppercase">S (Седан)</span>
                        <input
                          type="number"
                          value={t.basePrices.S}
                          onChange={(e) => handlePriceChange(t.id, 'S', Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-right font-bold text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 text-center uppercase">M (Кросс)</span>
                        <input
                          type="number"
                          value={t.basePrices.M}
                          onChange={(e) => handlePriceChange(t.id, 'M', Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-right font-bold text-xs"
                        />
                      </div>
                      <div>
                        <span className="block text-[9px] font-bold text-zinc-400 text-center uppercase">L (Джип)</span>
                        <input
                          type="number"
                          value={t.basePrices.L}
                          onChange={(e) => handlePriceChange(t.id, 'L', Number(e.target.value))}
                          className="w-20 px-2 py-1 rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-950 text-right font-bold text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Кнопка раскрытия полного редактора */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setEditingServiceId(isEditing ? null : t.id)}
                      className={`p-2 rounded-xl transition-all ${
                        isEditing 
                          ? 'bg-sky-500 text-white' 
                          : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
                      }`}
                      title="Настройки услуги"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteService(t.id)}
                      className="p-2 rounded-xl bg-zinc-100 dark:bg-zinc-800 hover:bg-rose-500/10 text-zinc-400 hover:text-rose-500 transition-all"
                      title="Удалить услугу"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                </div>

                {/* РАСКРЫТАЯ ФОРМА ДЕТАЛЬНОЙ НАСТРОЙКИ */}
                {isEditing && (
                  <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-zinc-50/60 dark:bg-zinc-950/60 p-4 rounded-2xl space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
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
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
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
                          className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold"
                        >
                          <option value="packages">Комплексы (Все включено)</option>
                          <option value="interior">Салон (Чистка и уход)</option>
                          <option value="exterior">Кузов (Полировка и защита)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-zinc-700 dark:text-zinc-300 mb-1">
                        Краткое описание (1-2 предложения)
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
                        className="w-full px-3 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs"
                      />
                    </div>

                    {/* Цены для смартфонов (если скрыто в таблице) */}
                    <div className="md:hidden grid grid-cols-3 gap-2">
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-400 mb-1">Класс S (₽)</span>
                        <input
                          type="number"
                          value={t.basePrices.S}
                          onChange={(e) => handlePriceChange(t.id, 'S', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-400 mb-1">Класс M (₽)</span>
                        <input
                          type="number"
                          value={t.basePrices.M}
                          onChange={(e) => handlePriceChange(t.id, 'M', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold"
                        />
                      </div>
                      <div>
                        <span className="block text-[10px] font-bold text-zinc-400 mb-1">Класс L (₽)</span>
                        <input
                          type="number"
                          value={t.basePrices.L}
                          onChange={(e) => handlePriceChange(t.id, 'L', Number(e.target.value))}
                          className="w-full px-2 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold"
                        />
                      </div>
                    </div>

                    {/* НАСТРОЙКА КОМПЛЕКСА (СВЯЗКА С УСЛУГАМИ САЛОНА И КУЗОВА) */}
                    <div className="pt-3 border-t border-zinc-200 dark:border-zinc-800">
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
                        <label htmlFor={`isPackage_${t.id}`} className="text-xs font-bold text-zinc-800 dark:text-zinc-200 cursor-pointer select-none flex items-center gap-1.5">
                          <span>Это комплексный пакет (поглощает входящие услуги)</span>
                        </label>
                      </div>

                      {t.isPackage && (
                        <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 space-y-2">
                          <span className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400">
                            Выберите услуги, которые УЖЕ входят в этот комплекс (будут заблокированы от повторной покупки клиентом):
                          </span>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                            {standaloneServices.map((st) => {
                              const isIncluded = (t.includedServiceIds || []).includes(st.id);
                              return (
                                <label
                                  key={st.id}
                                  className={`flex items-center gap-2 p-2 rounded-lg border text-xs cursor-pointer transition-all ${
                                    isIncluded
                                      ? 'bg-sky-50 dark:bg-sky-950/30 border-sky-400 text-sky-900 dark:text-sky-200 font-semibold'
                                      : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:border-zinc-400'
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

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        onClick={() => setEditingServiceId(null)}
                        className="px-3 py-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold"
                      >
                        Свернуть
                      </button>
                    </div>
                  </div>
                )}

              </div>
            );
          })}
        </div>
      </div>
    </form>
  );
}