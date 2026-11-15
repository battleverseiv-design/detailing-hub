'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  Phone, 
  Send, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  Eye, 
  X, 
  AlertCircle,
  MapPin,
  Save,
  Check,
  User,
  Car,
  ChevronRight,
  TrendingUp,
  Inbox,
  Clock4,
  CheckCheck,
  Ban,
  Camera
} from 'lucide-react';

interface AdminOrder {
  id: string;
  token: string;
  status: 'new' | 'agreed' | 'completed' | 'cancelled';
  createdAt: string;
  clientName: string;
  clientPhone: string;
  carBrandModel: string;
  carClass: string;
  isDirty: boolean;
  serviceFormat: 'studio' | 'mobile';
  deliveryAddress?: string | null;
  desiredDate?: string | null;
  desiredTime?: string | null;
  agreedEntryDateTime?: string | null;
  knownSubtotal: number;
  mobileFee: number;
  preliminaryTotal: number;
  agreedFinalPrice?: number | null;
  hasPhotoAppraisal: boolean;
  clientComment?: string | null;
  privateStudioNote?: string | null;
  items: any[];
  photos: any[];
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null);

  // Редактирование в модальном окне
  const [editPrice, setEditPrice] = useState<string>('');
  const [editSlot, setEditSlot] = useState<string>('');
  const [editNote, setEditNote] = useState<string>('');
  const [savingOrder, setSavingOrder] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [modalError, setModalError] = useState('');

  // Загрузка заказов
  const fetchOrders = async () => {
    setLoading(true);
    try {
      const q = new URLSearchParams();
      if (search) q.set('search', search);
      if (selectedStatus && selectedStatus !== 'all') q.set('status', selectedStatus);

      const res = await fetch(`/api/admin/orders?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [selectedStatus]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  // Метрики в шапке
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const pendingCount = orders.filter((o) => o.status === 'new').length;
    const agreedCount = orders.filter((o) => o.status === 'agreed').length;
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const revenue = completedOrders.reduce((sum, o) => sum + (o.agreedFinalPrice || o.preliminaryTotal), 0);

    return { totalCount, pendingCount, agreedCount, revenue };
  }, [orders]);

  // Быстрое изменение статуса прямо из карточки
  const handleQuickStatusChange = async (orderId: string, newStatus: 'new' | 'agreed' | 'completed' | 'cancelled') => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          agreedFinalPrice: order.agreedFinalPrice != null ? order.agreedFinalPrice : order.preliminaryTotal,
          agreedEntryDateTime: order.agreedEntryDateTime || (order.desiredDate ? `${order.desiredDate} ${order.desiredTime || ''}` : ''),
          privateStudioNote: order.privateStudioNote || '',
        }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      }
    } catch (err) {
      console.error('Quick status update error:', err);
    }
  };

  // Открытие деталей заказа
  const handleOpenOrder = (order: AdminOrder) => {
    setActiveOrder(order);
    setEditPrice(order.agreedFinalPrice != null ? String(order.agreedFinalPrice) : String(order.preliminaryTotal));
    setEditSlot(order.agreedEntryDateTime || (order.desiredDate ? `${order.desiredDate} ${order.desiredTime || '10:00'}` : ''));
    setEditNote(order.privateStudioNote || '');
    setModalError('');
    setSaveSuccess(false);
  };

  // Сохранение изменений в модалке
  const handleSaveModal = async (targetStatus?: string) => {
    if (!activeOrder) return;
    setSavingOrder(true);
    setModalError('');
    setSaveSuccess(false);

    const newStatus = targetStatus || activeOrder.status;

    try {
      const res = await fetch(`/api/admin/orders/${activeOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          agreedFinalPrice: editPrice ? Number(editPrice) : activeOrder.preliminaryTotal,
          agreedEntryDateTime: editSlot.trim(),
          privateStudioNote: editNote.trim(),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка сохранения');
      }

      setSaveSuccess(true);
      fetchOrders();
      setTimeout(() => {
        setSaveSuccess(false);
        setActiveOrder(null);
      }, 1000);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. ШАПКА РАЗДЕЛА И МЕТРИКИ (CAL.COM / SHADCN STYLE) */}
      <div className="space-y-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Inbox className="w-6 h-6 text-sky-400" />
            Записи и заявки клиентов
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Оперативное управление входящими заявками, согласование времени слотов и закрытие заказов
          </p>
        </div>

        {/* Метрики */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">Всего заявок</span>
            <span className="text-2xl font-extrabold text-white tracking-tight font-mono">
              {stats.totalCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-amber-400 block mb-1">Ожидают подтверждения</span>
              {stats.pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <span className="text-2xl font-extrabold text-amber-300 tracking-tight font-mono">
              {stats.pendingCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-medium text-sky-400 block mb-1">Согласованы / В работе</span>
            <span className="text-2xl font-extrabold text-sky-300 tracking-tight font-mono">
              {stats.agreedCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-medium text-emerald-400 block mb-1">Выполненные заказы</span>
            <span className="text-2xl font-extrabold text-emerald-300 tracking-tight font-mono">
              {stats.revenue.toLocaleString('ru-RU')} ₽
            </span>
          </div>
        </div>
      </div>

      {/* 2. ПОИСК И ФИЛЬТРЫ */}
      <div className="p-4 rounded-2xl bg-zinc-950/60 border border-zinc-800 space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Поиск */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск по имени, телефону или марке авто..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </form>

          {/* Быстрые статусы */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'all', label: 'Все' },
              { id: 'new', label: 'Ожидают', badge: stats.pendingCount },
              { id: 'agreed', label: 'Согласованы' },
              { id: 'completed', label: 'Выполнены' },
              { id: 'cancelled', label: 'Отменены' },
            ].map((tab) => {
              const isActive = selectedStatus === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setSelectedStatus(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-white text-zinc-950 font-bold shadow-sm'
                      : 'text-zinc-400 hover:text-white bg-zinc-900/60 border border-zinc-800/80'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.badge != null && tab.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                        isActive ? 'bg-amber-500 text-white' : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. СПИСОК ЗАКАЗОВ (КАРТОЧКИ В СТИЛЕ SHADCN) */}
      {loading ? (
        <div className="py-16 text-center text-xs text-zinc-500">Загрузка заявок...</div>
      ) : orders.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900/30 rounded-3xl border border-zinc-800 text-zinc-500 text-xs sm:text-sm">
          Заявок по выбранному фильтру не найдено.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const formattedDate = new Date(order.createdAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            const statusColors = {
              new: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
              agreed: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
              completed: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
              cancelled: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
            };

            const statusLabels = {
              new: 'Ожидает подтверждения',
              agreed: 'Согласована / В работе',
              completed: 'Выполнена',
              cancelled: 'Отменена',
            };

            return (
              <div
                key={order.id}
                className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all space-y-4"
              >
                {/* Верхняя строка карточки */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs text-zinc-400 font-semibold">
                      #{order.id.slice(-6).toUpperCase()}
                    </span>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        statusColors[order.status]
                      }`}
                    >
                      {statusLabels[order.status]}
                    </span>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {formattedDate}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-base font-bold text-white font-mono">
                      {(order.agreedFinalPrice || order.preliminaryTotal).toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                </div>

                {/* Основные данные клиента и услуг */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-zinc-800/60 text-xs">
                  {/* Клиент */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-white font-medium">
                      <User className="w-3.5 h-3.5 text-zinc-400" />
                      <span>{order.clientName}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      <a
                        href={`tel:${order.clientPhone}`}
                        className="hover:text-sky-400 font-mono transition-colors"
                      >
                        {order.clientPhone}
                      </a>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400">
                      <Car className="w-3.5 h-3.5 text-zinc-500" />
                      <span>{order.carBrandModel}</span>
                    </div>
                  </div>

                  {/* Локация и желаемое время */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      <span>
                        {order.agreedEntryDateTime
                          ? `Заезд: ${order.agreedEntryDateTime}`
                          : order.desiredDate
                          ? `Запрос: ${order.desiredDate} ${order.desiredTime || ''}`
                          : 'Дата не указана'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-zinc-400 truncate">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span className="truncate">
                        {order.serviceFormat === 'mobile'
                          ? (order.deliveryAddress || 'Выезд к авто')
                          : 'В боксе студии (ул. Автозаводская, 21с7)'}
                      </span>
                    </div>
                  </div>

                  {/* Услуги */}
                  <div className="space-y-1">
                    <div className="text-zinc-400 line-clamp-2">
                      {order.items?.map((i) => i.name).join(', ') || 'Комплекс услуг'}
                    </div>
                    {order.photos && order.photos.length > 0 && (
                      <div className="flex items-center gap-1.5 text-[11px] text-sky-400 font-medium">
                        <Camera className="w-3.5 h-3.5" />
                        <span>Прикреплено фото: {order.photos.length} шт.</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Нижняя панель действий */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-zinc-800/60">
                  <div className="flex items-center gap-2">
                    <a
                      href={`/order/${order.token}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors"
                    >
                      <span>Ссылка клиента</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="flex items-center gap-2">
                    {order.status === 'new' && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleQuickStatusChange(order.id, 'agreed')}
                          className="px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>Подтвердить</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleQuickStatusChange(order.id, 'cancelled')}
                          className="px-2.5 py-1.5 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          Отклонить
                        </button>
                      </>
                    )}

                    {order.status === 'agreed' && (
                      <button
                        type="button"
                        onClick={() => handleQuickStatusChange(order.id, 'completed')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        <span>Выполнен</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => handleOpenOrder(order)}
                      className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-1 transition-colors"
                    >
                      <span>Детали и фото</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. МОДАЛЬНОЕ ОКНО ДЕТАЛЕЙ ЗАКАЗА */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-3xl p-6 sm:p-7 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Заказ #{activeOrder.id.slice(-6).toUpperCase()}</span>
                </h3>
                <span className="text-xs text-zinc-400 mt-0.5 block">
                  Клиент: {activeOrder.clientName} ({activeOrder.clientPhone})
                </span>
              </div>
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Состав услуг */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">
                Выбранные услуги
              </span>
              <div className="space-y-1.5">
                {activeOrder.items?.map((it, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
                  >
                    <span className="text-zinc-200">{it.name} {it.quantity > 1 ? `x${it.quantity}` : ''}</span>
                    <span className="font-mono font-semibold text-white">
                      {it.itemTotal?.toLocaleString('ru-RU')} ₽
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Прикрепленные фото */}
            {activeOrder.photos && activeOrder.photos.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-zinc-400 block uppercase tracking-wider">
                  Фотографии от клиента ({activeOrder.photos.length})
                </span>
                <div className="grid grid-cols-3 gap-2.5">
                  {activeOrder.photos.map((p) => (
                    <a
                      key={p.id}
                      href={`/api/photos/${p.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-900 block group relative"
                    >
                      <img
                        src={`/api/photos/${p.id}`}
                        alt="Фото"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                        <Eye className="w-4 h-4" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Поля редактирования цены и слота заезда */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-zinc-800">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Согласованная цена (₽)
                </label>
                <input
                  type="number"
                  value={editPrice}
                  onChange={(e) => setEditPrice(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Согласованное время заезда
                </label>
                <input
                  type="text"
                  value={editSlot}
                  onChange={(e) => setEditSlot(e.target.value)}
                  placeholder="Например: 18.11.2026 10:00"
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Внутренняя заметка студии (не видна клиенту)
                </label>
                <textarea
                  value={editNote}
                  onChange={(e) => setEditNote(e.target.value)}
                  placeholder="Комментарий для мастеров..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white text-xs resize-none"
                />
              </div>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">
                {modalError}
              </div>
            )}

            {saveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs">
                Изменения успешно сохранены
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="px-4 py-2 rounded-xl text-xs text-zinc-400 hover:text-white"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => handleSaveModal()}
                disabled={savingOrder}
                className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs shadow-md transition-all flex items-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{savingOrder ? 'Сохранение...' : 'Сохранить изменения'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
