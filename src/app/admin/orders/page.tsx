'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  ChevronLeft,
  TrendingUp,
  Inbox,
  Clock4,
  CheckCheck,
  Ban,
  Camera,
  FileText,
  DollarSign,
  Percent,
  Plus,
  Trash2,
  Upload,
  Gauge,
  Fuel,
  ShieldCheck,
  CreditCard,
  LayoutGrid,
  List,
  Star,
  Sparkles,
  Edit3
} from 'lucide-react';

interface DamageItem {
  id: string;
  zone: string;
  type: string;
  description?: string;
}

interface InspectionPhotoItem {
  id: string;
  url?: string;
  description?: string;
}

export interface WorkbayItem {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  order: number;
}

interface AdminOrder {
  id: string;
  token: string;
  status: 'new' | 'agreed' | 'in_progress' | 'completed' | 'cancelled';
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
  source?: string | null;
  items: any[];
  photos: any[];

  // Workbay & Booking
  bookingId?: string | null;
  booking?: {
    id: string;
    workbayId?: string | null;
    startAt: string;
    endAt: string;
    activeWorkEndAt?: string | null;
    cureEndAt?: string | null;
    workbay?: {
      id: string;
      name: string;
      type: string;
    } | null;
  } | null;

  // Digital Check-in Act
  carVin?: string | null;
  carLicensePlate?: string | null;
  mileage?: number | null;
  fuelLevel?: number | null;
  damages?: DamageItem[];
  inspectionPhotosBefore?: InspectionPhotoItem[];
  inspectionPhotosAfter?: InspectionPhotoItem[];
  clientSignatureUrl?: string | null;
  masterSignatureUrl?: string | null;
  actCompletedAt?: string | null;

  // P&L and Financials
  suppliesCostRub?: number | null;
  masterCommissionPct?: number | null;
  masterPayoutRub?: number | null;
  netProfitRub?: number | null;
  isPaid?: boolean;
  paymentMethod?: 'cash' | 'card' | 'sbp' | null;

  // Cancellation and Audit
  cancelledAt?: string | null;
  cancelledBy?: string | null;
  cancelReason?: string | null;
}

const GRID_HOURS = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];

function getLocalDateString(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatEntryDateTime(raw?: string | null): string {
  if (!raw) return 'Время не согласовано';
  try {
    const cleaned = raw.replace('T', ' ');
    const [datePart, timePart] = cleaned.split(' ');
    if (datePart && /^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
      const [y, m, d] = datePart.split('-').map(Number);
      const months = ['янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
      const monthStr = months[m - 1] || '';
      let timeStr = '10:00';
      if (timePart) {
        const timeMatch = timePart.match(/^(\d{2}:\d{2})/);
        if (timeMatch) timeStr = timeMatch[1];
      }
      return `${d} ${monthStr} в ${timeStr}`;
    }
    const dObj = new Date(raw);
    if (!isNaN(dObj.getTime())) {
      const d = dObj.getDate();
      const months = ['янв.', 'февр.', 'марта', 'апр.', 'мая', 'июня', 'июля', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.'];
      const monthStr = months[dObj.getMonth()];
      const hours = String(dObj.getHours()).padStart(2, '0');
      const mins = String(dObj.getMinutes()).padStart(2, '0');
      return `${d} ${monthStr} в ${hours}:${mins}`;
    }
    return raw;
  } catch {
    return raw;
  }
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedSource, setSelectedSource] = useState<string>('all');
  const [activeOrder, setActiveOrder] = useState<AdminOrder | null>(null);

  // Режим просмотра: список или сетка боксов
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [gridDate, setGridDate] = useState<string>(() => getLocalDateString());
  const [workbays, setWorkbays] = useState<WorkbayItem[]>([]);

  // Быстрое создание записи (+ Новая запись)
  const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('+7 ');
  const [newCarBrandModel, setNewCarBrandModel] = useState('');
  const [newCarLicensePlate, setNewCarLicensePlate] = useState('');
  const [newCarClass, setNewCarClass] = useState('M');
  const [newWorkbayId, setNewWorkbayId] = useState('');
  const [newDate, setNewDate] = useState(() => getLocalDateString());
  const [newTime, setNewTime] = useState('10:00');
  const [newComment, setNewComment] = useState('');
  const [newPrice, setNewPrice] = useState('5000');
  const [newSourceType, setNewSourceType] = useState<'phone_admin' | 'owner_personal'>('phone_admin');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [newOrderError, setNewOrderError] = useState('');

  // Редактирование в модальном окне
  const [modalTab, setModalTab] = useState<'main' | 'photos'>('main');
  const [editStatus, setEditStatus] = useState<string>('new');
  const [editCancelReason, setEditCancelReason] = useState<string>('');
  const [editPrice, setEditPrice] = useState<string>('');
  const [editSlotDate, setEditSlotDate] = useState<string>('');
  const [editSlotTime, setEditSlotTime] = useState<string>('10:00');
  const [editPlate, setEditPlate] = useState<string>('');
  const [isPaid, setIsPaid] = useState<boolean>(false);
  const [editPaymentMethod, setEditPaymentMethod] = useState<string>('cash');
  const [editNote, setEditNote] = useState<string>('');
  const [photosBefore, setPhotosBefore] = useState<InspectionPhotoItem[]>([]);
  const [photosAfter, setPhotosAfter] = useState<InspectionPhotoItem[]>([]);
  const [uploadingPhoto, setUploadingPhoto] = useState<boolean>(false);

  const [savingOrder, setSavingOrder] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [modalError, setModalError] = useState('');

  const fileInputBeforeRef = useRef<HTMLInputElement>(null);
  const fileInputAfterRef = useRef<HTMLInputElement>(null);

  const [settings, setSettings] = useState<any>({
    shortName: 'Студия Детейлинга',
    studioName: 'Студия Детейлинга',
    city: 'Москва',
    address: 'ул. Студийная, 1',
  });

  useEffect(() => {
    fetch('/api/admin/studio')
      .then((r) => r.json())
      .then((data) => {
        if (data && !data.error) setSettings(data);
      })
      .catch(() => {});
  }, []);

  // Загрузка боксов студии
  useEffect(() => {
    fetch('/api/admin/booking/settings?userId=demo')
      .then((r) => r.json())
      .then((data) => {
        if (data.workbays) {
          setWorkbays(data.workbays.filter((b: any) => b.isActive));
        }
      })
      .catch((e) => console.warn('Could not load workbays:', e));
  }, []);

  // Проверка URL параметров (например, при переходе из Графика: ?newOrder=1&date=...&workbayId=...)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('newOrder') === '1') {
        const pDate = sp.get('date');
        const pBayId = sp.get('workbayId');
        if (pDate) setGridDate(pDate);
        handleOpenNewOrderModal(pBayId || undefined, undefined, pDate || undefined);
      }
    }
  }, [workbays]);

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

  const changeGridDate = (deltaDays: number) => {
    const current = new Date(gridDate);
    if (isNaN(current.getTime())) return;
    current.setDate(current.getDate() + deltaDays);
    setGridDate(getLocalDateString(current));
  };

  const handleOpenNewOrderModal = (prefillBayId?: string, prefillTime?: string, prefillDate?: string) => {
    setNewClientName('');
    setNewClientPhone('+7 ');
    setNewCarBrandModel('');
    setNewCarLicensePlate('');
    setNewCarClass('M');
    setNewWorkbayId(prefillBayId || (workbays[0]?.id || ''));
    setNewDate(prefillDate || gridDate || getLocalDateString());
    setNewTime(prefillTime || '10:00');
    setNewComment('');
    setNewPrice('5000');
    setNewSourceType('phone_admin');
    setNewOrderError('');
    setIsNewOrderModalOpen(true);
  };

  const handleCreateNewOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      setNewOrderError('Укажите имя клиента');
      return;
    }
    const clean = newClientPhone.replace(/\D/g, '');
    if (clean.length < 11) {
      setNewOrderError('Укажите полный телефон клиента');
      return;
    }

    setIsCreatingOrder(true);
    setNewOrderError('');

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientName: newClientName.trim(),
          clientPhone: newClientPhone.trim(),
          carBrandModel: newCarBrandModel.trim() || undefined,
          carLicensePlate: newCarLicensePlate.trim() || undefined,
          carClass: newCarClass,
          desiredDate: newDate,
          desiredTime: newTime,
          workbayId: newWorkbayId || undefined,
          clientComment: newComment.trim() || undefined,
          preliminaryTotal: Number(newPrice) || 0,
          source: newSourceType === 'owner_personal' ? 'owner_personal' : 'phone_admin',
          isAdminCreated: true,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка создания записи');
      }

      setIsNewOrderModalOpen(false);
      await fetchOrders();
    } catch (err: any) {
      setNewOrderError(err.message || 'Ошибка создания');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  // Карта истории визитов клиентов по нормализованному телефону
  const clientVisitsCountMap = useMemo(() => {
    const map = new Map<string, { count: number; lastCar: string }>();
    for (const o of orders) {
      if (o.status === 'completed' || o.isPaid) {
        const clean = (o.clientPhone || '').replace(/\D/g, '');
        if (clean.length >= 7) {
          const prev = map.get(clean) || { count: 0, lastCar: o.carBrandModel };
          map.set(clean, {
            count: prev.count + 1,
            lastCar: o.carBrandModel || prev.lastCar,
          });
        }
      }
    }
    return map;
  }, [orders]);

  // Фильтрация заказов по источнику
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (selectedSource === 'all') return true;
      if (selectedSource === 'owner_personal') return o.source === 'owner_personal';
      if (selectedSource === 'phone_admin') return o.source === 'phone_admin' || o.source === 'admin';
      if (selectedSource === 'site') {
        return o.source !== 'owner_personal' && o.source !== 'phone_admin' && o.source !== 'admin';
      }
      return true;
    });
  }, [orders, selectedSource]);

  const renderSourceBadge = (source?: string | null) => {
    if (source === 'owner_personal') {
      return (
        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-purple-500/15 border border-purple-500/30 text-purple-400 flex items-center gap-1">
          <span>★ Личное (Владелец)</span>
        </span>
      );
    }
    if (source === 'phone_admin' || source === 'admin') {
      return (
        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center gap-1">
          <span>Вручную (Сотрудник / Звонок)</span>
        </span>
      );
    }
    const cleanSource = source && source !== 'direct' && source !== 'Прямой переход' ? source : 'Прямой заход';
    return (
      <span className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-sky-500/10 border border-sky-500/25 text-sky-400 flex items-center gap-1">
        <span>С сайта ({cleanSource})</span>
      </span>
    );
  };

  // Метрики в шапке
  const stats = useMemo(() => {
    const totalCount = orders.length;
    const pendingCount = orders.filter((o) => o.status === 'new').length;
    const agreedCount = orders.filter((o) => o.status === 'agreed' || o.status === 'in_progress').length;
    const completedOrders = orders.filter((o) => o.status === 'completed');
    const revenue = completedOrders.reduce((sum, o) => sum + (o.agreedFinalPrice || o.preliminaryTotal), 0);

    return { totalCount, pendingCount, agreedCount, revenue };
  }, [orders]);

  // Быстрое изменение статуса прямо из карточки
  const handleQuickStatusChange = async (orderId: string, newStatus: 'new' | 'agreed' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      const order = orders.find((o) => o.id === orderId);
      if (!order) return;

      // Если статус переводится в подтверждённый, но дата/время еще не согласованы — открываем модалку для ввода слота
      if (newStatus === 'agreed') {
        const hasSlot = Boolean(order.agreedEntryDateTime?.trim());
        if (!hasSlot) {
          handleOpenOrder(order);
          setTimeout(() => {
            const input = document.getElementById('agreed-entry-slot-input');
            if (input) {
              input.focus();
              try { (input as any).showPicker?.(); } catch {}
            }
          }, 150);
          return;
        }
      }

      const entryDate = order.agreedEntryDateTime || (order.desiredDate ? `${order.desiredDate} ${order.desiredTime || ''}`.trim() : '');

      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          agreedFinalPrice: order.agreedFinalPrice != null ? order.agreedFinalPrice : order.preliminaryTotal,
          agreedEntryDateTime: entryDate,
          privateStudioNote: order.privateStudioNote || '',
        }),
      });

      if (res.ok) {
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus, agreedEntryDateTime: entryDate } : o))
        );
      }
    } catch (err) {
      console.error('Quick status update error:', err);
    }
  };

  // Открытие деталей заказа
  const handleOpenOrder = (order: AdminOrder) => {
    setActiveOrder(order);

    const defaultPrice = order.agreedFinalPrice != null ? order.agreedFinalPrice : order.preliminaryTotal;
    setEditPrice(String(defaultPrice));

    // Парсим дату и время из agreedEntryDateTime или desiredDate
    const rawSlot = order.agreedEntryDateTime || (order.desiredDate ? `${order.desiredDate} ${order.desiredTime || '10:00'}` : '');
    let initialDate = '';
    let initialTime = '10:00';
    if (rawSlot) {
      const parts = rawSlot.includes('T') ? rawSlot.split('T') : rawSlot.split(' ');
      if (parts[0]) {
        if (/^\d{4}-\d{2}-\d{2}$/.test(parts[0])) {
          initialDate = parts[0];
        } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(parts[0])) {
          const [d, m, y] = parts[0].split('.');
          initialDate = `${y}-${m}-${d}`;
        }
      }
      if (parts[1]) {
        const timeMatch = parts[1].match(/^(\d{2}:\d{2})/);
        if (timeMatch) initialTime = timeMatch[1];
      }
    }
    if (!initialDate) {
      initialDate = order.desiredDate && /^\d{4}-\d{2}-\d{2}$/.test(order.desiredDate) ? order.desiredDate : getLocalDateString();
    }
    setEditSlotDate(initialDate);
    setEditSlotTime(initialTime || '10:00');
    setEditPlate(order.carLicensePlate || '');
    setIsPaid(Boolean(order.isPaid));
    setEditPaymentMethod(order.paymentMethod || 'cash');
    setEditNote(order.privateStudioNote || '');

    setPhotosBefore(Array.isArray(order.inspectionPhotosBefore) ? order.inspectionPhotosBefore : []);
    setPhotosAfter(Array.isArray(order.inspectionPhotosAfter) ? order.inspectionPhotosAfter : []);

    setEditStatus(order.status || 'new');
    setModalTab('main');
    setEditCancelReason(order.cancelReason || '');

    setModalError('');
    setSaveSuccess(false);
  };

  const handleStatusSelect = (st: string) => {
    if (st === 'cancelled') {
      const reason = prompt('Укажите причину отмены или No-Show (неявка клиента):', editCancelReason || 'Клиент отменил визит по телефону');
      if (reason === null) return;
      setEditCancelReason(reason);
    }
    setEditStatus(st);
  };

  // Загрузка фото для акта
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'before' | 'after') => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    setModalError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Ошибка загрузки фото');
      }

      const uploaded = await res.json();
      const photoItem: InspectionPhotoItem = {
        id: uploaded.id,
        url: `/api/photos/${uploaded.id}`,
        description: target === 'before' ? 'Фото до работ' : 'Фото после работ',
      };

      if (target === 'before') {
        setPhotosBefore((prev) => [...prev, photoItem]);
      } else {
        setPhotosAfter((prev) => [...prev, photoItem]);
      }
    } catch (err: any) {
      setModalError(err.message || 'Ошибка загрузки фото');
    } finally {
      setUploadingPhoto(false);
      if (e.target) e.target.value = '';
    }
  };

  // Сохранение изменений в модалке
  const handleSaveModal = async (targetStatus?: string, customCancelReason?: string) => {
    if (!activeOrder) return;
    setSavingOrder(true);
    setModalError('');
    setSaveSuccess(false);

    const newStatus = targetStatus || editStatus || activeOrder.status;
    const combinedSlot = editSlotDate ? `${editSlotDate} ${editSlotTime || '10:00'}`.trim() : '';

    if (newStatus === 'agreed' && !combinedSlot) {
      setModalError('Для перевода в статус «Подтверждён» необходимо указать дату и время заезда');
      setSavingOrder(false);
      return;
    }

    try {
      const payload: any = {
        status: newStatus,
        agreedFinalPrice: editPrice ? Number(editPrice) : activeOrder.preliminaryTotal,
        agreedEntryDateTime: combinedSlot,
        carLicensePlate: editPlate.trim(),
        isPaid: isPaid,
        paymentMethod: editPaymentMethod,
        privateStudioNote: editNote.trim(),
        inspectionPhotosBeforeJson: JSON.stringify(photosBefore),
        inspectionPhotosAfterJson: JSON.stringify(photosAfter),
        ...(newStatus === 'cancelled'
          ? {
              cancelReason: customCancelReason || editCancelReason || 'Отменено администратором студии',
              cancelledBy: 'admin',
            }
          : {}),
      };

      const res = await fetch(`/api/admin/orders/${activeOrder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
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
      }, 800);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSavingOrder(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. ШАПКА РАЗДЕЛА И МЕТРИКИ */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Inbox className="w-6 h-6 text-sky-400" />
              Записи
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Управление записями и заказами клиентов
            </p>
          </div>

          <button
            type="button"
            onClick={() => handleOpenNewOrderModal()}
            className="px-4 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md shadow-sky-600/20 active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Новая запись</span>
          </button>
        </div>

        {/* Метрики: Всего, Ожидают, В работе, Прибыль */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-medium text-zinc-400 block mb-1">Всего</span>
            <span className="text-2xl font-extrabold text-white tracking-tight font-mono">
              {stats.totalCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-amber-400 block mb-1">Ожидают</span>
              {stats.pendingCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
              )}
            </div>
            <span className="text-2xl font-extrabold text-amber-300 tracking-tight font-mono">
              {stats.pendingCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-medium text-sky-400 block mb-1">В работе</span>
            <span className="text-2xl font-extrabold text-sky-300 tracking-tight font-mono">
              {stats.agreedCount}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800">
            <span className="text-[11px] font-medium text-emerald-400 block mb-1">Прибыль</span>
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
              placeholder="Поиск по имени, телефону, марке авто, госномеру..."
              className="w-full pl-9 pr-4 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-xs sm:text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700"
            />
          </form>

          {/* Переключатель: Список / Сетка боксов на день */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-900 border border-zinc-800 text-xs shrink-0 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'list' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Список</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'grid' ? 'bg-sky-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Сетка боксов на день</span>
            </button>
          </div>
        </div>

        {/* Фильтры: Статусы и Источники */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pt-2 border-t border-zinc-900">
          {/* Быстрые статусы */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'all', label: 'Все' },
              { id: 'new', label: 'Ожидают', badge: stats.pendingCount },
              { id: 'agreed', label: 'Согласованы' },
              { id: 'in_progress', label: 'В боксе' },
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

          {/* Фильтр по источнику (С сайта / Сотрудник / Владелец) */}
          <div className="flex flex-wrap items-center gap-1 text-xs">
            <span className="text-[10px] uppercase font-bold text-zinc-500 mr-1">Источник:</span>
            {[
              { id: 'all', label: 'Все' },
              { id: 'site', label: 'С сайта' },
              { id: 'phone_admin', label: 'Сотрудник / Звонок' },
              { id: 'owner_personal', label: 'Владелец' },
            ].map((srcTab) => {
              const isAct = selectedSource === srcTab.id;
              return (
                <button
                  key={srcTab.id}
                  type="button"
                  onClick={() => setSelectedSource(srcTab.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                    isAct
                      ? 'bg-zinc-800 text-sky-400 font-bold border border-sky-500/30'
                      : 'text-zinc-500 hover:text-zinc-300 bg-zinc-900/40'
                  }`}
                >
                  {srcTab.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. СПИСОК ЗАКАЗОВ ИЛИ СЕТКА БОКСОВ */}
      {viewMode === 'grid' ? (
        <div className="space-y-4">
          {/* Панель навигации по дате для сетки */}
          <div className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => changeGridDate(-1)}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-all flex items-center gap-1 text-xs font-bold"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Вчера</span>
              </button>
              <button
                type="button"
                onClick={() => setGridDate(getLocalDateString())}
                className="px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 text-xs font-bold transition-all"
              >
                Сегодня
              </button>
              <button
                type="button"
                onClick={() => changeGridDate(1)}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 transition-all flex items-center gap-1 text-xs font-bold"
              >
                <span>Завтра</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400 font-semibold">Дата расписания:</span>
              <input
                type="date"
                value={gridDate}
                onChange={(e) => setGridDate(e.target.value)}
                className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white font-mono font-bold focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Сетка боксов и часов */}
          <div className="rounded-2xl bg-zinc-950/70 border border-zinc-800 overflow-x-auto shadow-sm">
            <table className="w-full min-w-[900px] border-collapse text-left">
              <thead>
                <tr className="border-b border-zinc-800/80 bg-zinc-900/50">
                  <th className="p-3 text-[11px] font-bold text-zinc-400 uppercase w-48 sticky left-0 bg-zinc-900/90 backdrop-blur z-10">
                    Бокс / Пост
                  </th>
                  {GRID_HOURS.map((hour) => (
                    <th key={hour} className="p-3 text-[11px] font-mono font-bold text-zinc-400 text-center w-24 border-l border-zinc-900">
                      {hour}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900">
                {workbays.length === 0 ? (
                  <tr>
                    <td colSpan={GRID_HOURS.length + 1} className="p-8 text-center text-xs text-zinc-500">
                      Активные боксы не настроены. Добавьте посты в разделе «Бронирование и боксы».
                    </td>
                  </tr>
                ) : (
                  workbays.map((bay) => {
                    const bayOrders = orders.filter((o) => {
                      const isThisBay = o.booking?.workbayId === bay.id || o.booking?.workbay?.id === bay.id;
                      const isThisDate = o.desiredDate === gridDate || (o.booking?.startAt && o.booking.startAt.startsWith(gridDate));
                      return isThisBay && isThisDate;
                    });

                    return (
                      <tr key={bay.id} className="hover:bg-zinc-900/20">
                        <td className="p-3 text-xs font-bold text-white sticky left-0 bg-zinc-950/95 backdrop-blur z-10 border-r border-zinc-900">
                          <div className="flex items-center gap-2">
                            <span className={`w-2 h-2 rounded-full ${bay.type === 'wet' ? 'bg-sky-400' : bay.type === 'cure' ? 'bg-amber-400' : 'bg-emerald-400'}`} />
                            <span className="truncate max-w-[150px]">{bay.name}</span>
                          </div>
                          <span className="block text-[10px] text-zinc-500 font-normal mt-0.5 capitalize">
                            {bay.type === 'wet' ? 'Мокрый бокс' : bay.type === 'dry' ? 'Сухой бокс' : bay.type === 'cure' ? 'Сушка' : 'Универсальный'}
                          </span>
                        </td>

                        {(() => {
                          const cells: React.ReactNode[] = [];
                          let skipUntilIndex = -1;

                          GRID_HOURS.forEach((hour, hourIdx) => {
                            if (hourIdx < skipUntilIndex) {
                              return;
                            }

                            const hourNum = parseInt(hour.slice(0, 2), 10);
                            const orderInSlot = bayOrders.find((o) => {
                              let h = -1;
                              if (o.booking?.startAt) {
                                h = new Date(o.booking.startAt).getHours();
                              } else if (o.agreedEntryDateTime) {
                                const timePart = o.agreedEntryDateTime.includes('T')
                                  ? o.agreedEntryDateTime.split('T')[1]
                                  : o.agreedEntryDateTime.split(' ')[1];
                                if (timePart) h = parseInt(timePart.slice(0, 2), 10);
                              }
                              if (h === -1 && o.desiredTime) {
                                h = parseInt(o.desiredTime.slice(0, 2), 10);
                              }
                              return h === hourNum;
                            });

                            if (orderInSlot) {
                              let durationHours = 1;
                              if (orderInSlot.booking?.startAt && orderInSlot.booking?.endAt) {
                                const diffMs = new Date(orderInSlot.booking.endAt).getTime() - new Date(orderInSlot.booking.startAt).getTime();
                                const hrs = Math.round(diffMs / (1000 * 60 * 60));
                                if (hrs > 1) durationHours = hrs;
                              }

                              const colSpan = Math.min(durationHours, GRID_HOURS.length - hourIdx);
                              skipUntilIndex = hourIdx + colSpan;

                              let statusColor = 'bg-amber-500/10 border-amber-500/40 text-amber-300';
                              let indicatorColor = 'bg-amber-400';
                              let statusLabel = 'Новый';

                              if (orderInSlot.status === 'completed' || orderInSlot.isPaid) {
                                statusColor = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300';
                                indicatorColor = 'bg-emerald-400';
                                statusLabel = orderInSlot.isPaid ? 'Оплачен' : 'Готов';
                              } else if (orderInSlot.status === 'in_progress') {
                                statusColor = 'bg-purple-500/15 border-purple-500/40 text-purple-300';
                                indicatorColor = 'bg-purple-400';
                                statusLabel = 'В боксе';
                              } else if (orderInSlot.status === 'agreed') {
                                statusColor = 'bg-sky-500/15 border-sky-500/40 text-sky-300';
                                indicatorColor = 'bg-sky-400';
                                statusLabel = 'Подтверждён';
                              } else if (orderInSlot.status === 'cancelled') {
                                statusColor = 'bg-rose-950/20 border-rose-900/30 text-rose-400 line-through';
                                indicatorColor = 'bg-rose-500';
                                statusLabel = 'Отменён';
                              }

                              cells.push(
                                <td
                                  key={hour}
                                  colSpan={colSpan}
                                  className="p-1.5 border-l border-zinc-900 align-top h-20"
                                  style={{ minWidth: `${colSpan * 96}px` }}
                                >
                                  <div
                                    onClick={() => handleOpenOrder(orderInSlot)}
                                    className={`h-full p-2 rounded-xl border text-left cursor-pointer transition-all flex flex-col justify-between hover:scale-[1.01] hover:shadow-lg ${statusColor}`}
                                    title={`Клик для просмотра заказа #${orderInSlot.id.slice(-6)}`}
                                  >
                                    <div>
                                      <div className="flex items-center justify-between gap-1 mb-0.5">
                                        <span className="font-extrabold text-[11px] truncate text-white leading-tight">
                                          {orderInSlot.carBrandModel}
                                        </span>
                                        <span className="flex items-center gap-1 shrink-0">
                                          <span className={`w-1.5 h-1.5 rounded-full ${indicatorColor}`} />
                                          <span className="text-[9px] font-semibold opacity-90">{statusLabel}</span>
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                        {orderInSlot.carLicensePlate && (
                                          <span className="px-1.5 py-0.2 rounded bg-black/60 border border-white/10 text-white font-mono font-bold text-[9px] tracking-wider">
                                            {orderInSlot.carLicensePlate}
                                          </span>
                                        )}
                                        <span className="text-[10px] text-zinc-300 truncate">
                                          {orderInSlot.clientName}
                                        </span>
                                      </div>
                                    </div>

                                    <div className="flex items-center justify-between text-[10px] font-mono font-bold mt-1 pt-1 border-t border-white/10">
                                      <span className="text-zinc-400 font-normal">
                                        {colSpan > 1 ? `${colSpan} ч.` : '1 ч.'}
                                      </span>
                                      <span className="font-extrabold">
                                        {(orderInSlot.agreedFinalPrice != null ? orderInSlot.agreedFinalPrice : orderInSlot.preliminaryTotal).toLocaleString('ru-RU')} ₽
                                      </span>
                                    </div>
                                  </div>
                                </td>
                              );
                            } else {
                              cells.push(
                                <td key={hour} className="p-1.5 border-l border-zinc-900 align-top h-20 w-24">
                                  <button
                                    type="button"
                                    onClick={() => handleOpenNewOrderModal(bay.id, hour)}
                                    className="w-full h-full min-h-[56px] rounded-xl border border-dashed border-zinc-900 hover:border-sky-500/40 hover:bg-sky-500/5 transition-all flex items-center justify-center text-zinc-700 hover:text-sky-400 group"
                                    title={`Записать клиента в ${bay.name} на ${hour}`}
                                  >
                                    <Plus className="w-3.5 h-3.5 group-hover:scale-125 transition-transform" />
                                  </button>
                                </td>
                              );
                            }
                          });

                          return cells;
                        })()}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : loading ? (
        <div className="py-16 text-center text-xs text-zinc-500">Загрузка заявок...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center bg-zinc-900/30 rounded-3xl border border-zinc-800 text-zinc-500 text-xs sm:text-sm">
          Заявок по выбранному фильтру не найдено.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredOrders.map((order) => {
            const formattedDate = new Date(order.createdAt).toLocaleDateString('ru-RU', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            });

            const statusColors: Record<string, string> = {
              new: 'bg-amber-500/15 text-amber-300 border-amber-500/35',
              agreed: 'bg-sky-500/15 text-sky-300 border-sky-500/35',
              in_progress: 'bg-purple-500/15 text-purple-300 border-purple-500/35',
              completed: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35',
              cancelled: 'bg-rose-500/15 text-rose-300 border-rose-500/35',
            };

            const statusLabels: Record<string, string> = {
              new: 'Новый',
              agreed: 'Подтверждён',
              in_progress: 'В боксе',
              completed: 'Готов к выдаче',
              cancelled: 'Отменён',
            };

            const cleanPhone = (order.clientPhone || '').replace(/\D/g, '');
            const clientMsg = `Здравствуйте, ${order.clientName}! Вас беспокоит студия детейлинга ${settings.shortName || 'DetailingHub'}. По поводу вашей записи #${order.id.slice(-6).toUpperCase()} (${order.carBrandModel}): `;

            const otherVisits = orders.filter(
              (other) =>
                other.id !== order.id &&
                (other.status === 'completed' || other.isPaid) &&
                (other.clientPhone || '').replace(/\D/g, '') === cleanPhone
            );

            return (
              <div
                key={order.id}
                className="p-4 sm:p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800/80 hover:border-zinc-700/80 transition-all space-y-3.5"
              >
                {/* Мета-строка (Уровень 3): Номер, Источник, Дата заявки */}
                <div className="flex items-center justify-between text-[11px] text-zinc-500 gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-medium">#{order.id.slice(-6).toUpperCase()}</span>
                    <span>•</span>
                    {renderSourceBadge(order.source)}
                    {order.actCompletedAt && (
                      <span className="px-1.5 py-0.2 rounded bg-emerald-500/10 border border-emerald-500/25 text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Акт оформлен</span>
                      </span>
                    )}
                  </div>
                  <span className="font-mono">{formattedDate}</span>
                </div>

                {/* Главный блок (Уровень 1): Автомобиль, Госномер, Статус */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-base sm:text-lg font-extrabold text-white">
                      {order.carBrandModel}
                    </span>
                    {order.carClass && (
                      <span className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-300 font-bold">
                        Класс {order.carClass}
                      </span>
                    )}
                    {order.carLicensePlate && (
                      <span className="px-2 py-0.5 rounded-lg bg-black/60 border border-white/10 text-white font-mono font-bold text-xs tracking-wider">
                        {order.carLicensePlate}
                      </span>
                    )}
                  </div>

                  <span
                    className={`self-start sm:self-auto px-3 py-1 rounded-xl text-xs font-bold border ${
                      statusColors[order.status]
                    }`}
                  >
                    {statusLabels[order.status]}
                  </span>
                </div>

                {/* Плашка времени и цены (Сразу под заголовком) */}
                <div className="p-3 sm:p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5 text-sm sm:text-base font-bold text-sky-300">
                      <Calendar className="w-4 h-4 text-sky-400 shrink-0" />
                      <span>
                        {formatEntryDateTime(order.agreedEntryDateTime || (order.desiredDate ? `${order.desiredDate} ${order.desiredTime || ''}` : null))}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                      <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      <span>
                        {order.serviceFormat === 'mobile'
                          ? (order.deliveryAddress || 'Выезд за пределы города')
                          : (order.booking?.workbay?.name ? `В боксе «${order.booking.workbay.name}»` : 'В студии')}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-zinc-800/60">
                    <span className="text-lg font-black text-white font-mono">
                      {(order.agreedFinalPrice || order.preliminaryTotal).toLocaleString('ru-RU')} ₽
                    </span>
                    <span
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                        order.isPaid
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                      }`}
                    >
                      {order.isPaid
                        ? `✓ Оплачено (${
                            order.paymentMethod === 'card'
                              ? 'Карта'
                              : order.paymentMethod === 'sbp'
                              ? 'СБП'
                              : 'Нал'
                          })`
                        : 'Не оплачен'}
                    </span>
                  </div>
                </div>

                {/* Блок клиента и услуг */}
                <div className="space-y-2 text-xs">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 text-sm font-semibold text-zinc-200">
                      <User className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span>{order.clientName}</span>
                      <a
                        href={`tel:${order.clientPhone}`}
                        className="text-zinc-400 hover:text-sky-400 font-mono text-xs font-normal ml-1"
                      >
                        ({order.clientPhone})
                      </a>
                    </div>

                    {otherVisits.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-400">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        <span>Постоянный клиент ({otherVisits.length})</span>
                      </span>
                    )}
                  </div>

                  <div className="text-zinc-300 line-clamp-2">
                    {order.items?.map((i) => i.name).join(', ') || 'Комплекс услуг'}
                  </div>

                  {order.privateStudioNote && (
                    <div className="p-2 rounded-xl bg-zinc-900 border border-amber-500/25 text-xs text-amber-300/90 leading-relaxed">
                      <span className="text-amber-400 font-bold mr-1">Заметка мастера:</span>
                      <span>{order.privateStudioNote}</span>
                    </div>
                  )}

                  {/* Бейджи фото */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
                    {order.photos && order.photos.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-500/10 border border-sky-500/20 text-sky-400 font-medium">
                        <Camera className="w-3 h-3" />
                        <span>Клиент: {order.photos.length}</span>
                      </span>
                    )}
                    {order.inspectionPhotosBefore && order.inspectionPhotosBefore.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-400 font-medium">
                        <Camera className="w-3 h-3" />
                        <span>До: {order.inspectionPhotosBefore.length}</span>
                      </span>
                    )}
                    {order.inspectionPhotosAfter && order.inspectionPhotosAfter.length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-medium">
                        <Camera className="w-3 h-3" />
                        <span>После: {order.inspectionPhotosAfter.length}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Кнопки действий внизу карточки (Mobile-First 44px) */}
                <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 pt-3 border-t border-zinc-800/60">
                  <a
                    href={`tel:${order.clientPhone}`}
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-zinc-800 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                  >
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Позвонить</span>
                  </a>

                  <a
                    href={`https://wa.me/${cleanPhone}?text=${encodeURIComponent(clientMsg)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    title="Открыть чат в WhatsApp с клиентом"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>

                  <a
                    href={`https://t.me/+${cleanPhone}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="min-h-[44px] px-3.5 py-2 rounded-xl bg-sky-500/15 hover:bg-sky-500/25 text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                    title="Открыть чат в Telegram с клиентом"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Telegram</span>
                  </a>

                  <button
                    type="button"
                    onClick={() => handleOpenOrder(order)}
                    className="col-span-2 sm:col-span-1 min-h-[44px] px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 shadow-md active:scale-95 transition-all"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Открыть заказ</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. МОДАЛЬНОЕ ОКНО УПРАВЛЕНИЯ ЗАКАЗОМ, АКТА И P&L */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl max-h-[95vh] flex flex-col shadow-2xl overflow-hidden">
            
            {/* Шапка модалки (Sticky Top) */}
            <div className="sticky top-0 bg-zinc-950/95 backdrop-blur border-b border-zinc-800 px-4 py-3 sm:px-6 sm:py-4 z-20 flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-2">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 truncate">
                  <span>Заказ #{activeOrder.id.slice(-6).toUpperCase()}</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 font-normal truncate">
                    {activeOrder.carBrandModel}
                  </span>
                </h3>
                <span className="text-xs text-zinc-400 mt-0.5 block truncate">
                  Клиент: {activeOrder.clientName} ({activeOrder.clientPhone})
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={`/order/${activeOrder.token}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[40px] px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  title="Открыть официальный бланк заказ-наряда А4"
                >
                  <FileText className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="hidden sm:inline">Печать А4</span>
                  <ExternalLink className="w-3 h-3 text-zinc-500" />
                </a>
                <button
                  type="button"
                  onClick={() => setActiveOrder(null)}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Прокручиваемое тело модалки */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
              {/* 1. СТАТУС ЗАКАЗА — СЕГМЕНТИРОВАННЫЙ ПЕРЕКЛЮЧАТЕЛЬ НАВЕРХУ */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block">
                  Статус записи
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 p-1 rounded-2xl bg-zinc-900 border border-zinc-800">
                  <button
                    type="button"
                    onClick={() => handleStatusSelect('new')}
                    className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      editStatus === 'new'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${editStatus === 'new' ? 'bg-amber-400 animate-pulse' : 'bg-zinc-600'}`} />
                    <span>Новый</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusSelect('agreed')}
                    className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      editStatus === 'agreed'
                        ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40 shadow-sm shadow-sky-500/10'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${editStatus === 'agreed' ? 'bg-sky-400' : 'bg-zinc-600'}`} />
                    <span>Подтверждён</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusSelect('in_progress')}
                    className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      editStatus === 'in_progress'
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm shadow-purple-500/10'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${editStatus === 'in_progress' ? 'bg-purple-400' : 'bg-zinc-600'}`} />
                    <span>В боксе</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusSelect('completed')}
                    className={`min-h-[40px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      editStatus === 'completed'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10'
                        : 'text-zinc-400 hover:text-white hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${editStatus === 'completed' ? 'bg-emerald-400' : 'bg-zinc-600'}`} />
                    <span>Готов к выдаче</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleStatusSelect('cancelled')}
                    className={`col-span-2 sm:col-span-1 min-h-[40px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      editStatus === 'cancelled'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/10'
                        : 'text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/60'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${editStatus === 'cancelled' ? 'bg-rose-400' : 'bg-zinc-600'}`} />
                    <span>Отменён</span>
                  </button>
                </div>
              </div>

              {/* БАННЕР ЕСЛИ СТАТУС ОТМЕНЁН */}
              {editStatus === 'cancelled' && (
                <div className="p-3.5 rounded-2xl bg-rose-950/20 border border-rose-900/40 text-xs text-rose-300 space-y-1">
                  <div className="font-bold text-rose-400 flex items-center gap-1.5">
                    <Ban className="w-4 h-4" />
                    <span>Заказ отменён {activeOrder.cancelledAt ? new Date(activeOrder.cancelledAt).toLocaleString('ru-RU') : ''}</span>
                  </div>
                  <p className="text-zinc-400">
                    <strong>Инициатор:</strong> {activeOrder.cancelledBy === 'client' ? 'Клиент через сайт' : 'Администратор студии'}
                    {(editCancelReason || activeOrder.cancelReason) && (
                      <span className="block mt-0.5">
                        <strong>Причина:</strong> {editCancelReason || activeOrder.cancelReason}
                      </span>
                    )}
                  </p>
                </div>
              )}

              {/* 2. ВКЛАДКИ: «Основное и оплата» и «Фотоотчёт» (Mobile-First 44px) */}
              <div className="grid grid-cols-2 gap-2 border-b border-zinc-800 pb-3">
                <button
                  type="button"
                  onClick={() => setModalTab('main')}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    modalTab === 'main'
                      ? 'bg-white text-zinc-950 shadow-md'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Основное и оплата</span>
                </button>

                <button
                  type="button"
                  onClick={() => setModalTab('photos')}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    modalTab === 'photos'
                      ? 'bg-white text-zinc-950 shadow-md'
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Фотоотчёт</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold ${
                      modalTab === 'photos' ? 'bg-zinc-900 text-white' : 'bg-zinc-800 text-zinc-300'
                    }`}
                  >
                    {(activeOrder.photos?.length || 0) + photosBefore.length + photosAfter.length}
                  </span>
                </button>
              </div>

              {/* 3. ВКЛАДКА 1: ОСНОВНОЕ И ОПЛАТА */}
              {modalTab === 'main' && (
                <div className="space-y-4">
                  {/* Состав услуг */}
                  <div className="space-y-1.5">
                    <span className="text-[11px] font-semibold text-zinc-400 block uppercase tracking-wider">
                      Выбранные услуги ({activeOrder.items?.length || 0})
                    </span>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {activeOrder.items?.map((it, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
                        >
                          <div>
                            <span className="text-zinc-200 font-medium">
                              {it.name} {it.quantity > 1 ? `x${it.quantity}` : ''}
                            </span>
                            {it.customDescription && (
                              <span className="text-[11px] text-sky-400 block">{it.customDescription}</span>
                            )}
                          </div>
                          <span className="font-mono font-semibold text-white">
                            {it.itemTotal?.toLocaleString('ru-RU')} ₽
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Параметры заезда и сумма (Mobile-First 16px inputs) */}
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                    <span className="text-[11px] font-semibold text-zinc-300 block uppercase tracking-wider">
                      Параметры заезда и сумма
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      {/* Строка 1, колонка 1: Дата заезда */}
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium text-xs">
                          Дата заезда
                        </label>
                        <input
                          id="agreed-entry-slot-input"
                          type="date"
                          value={editSlotDate}
                          onChange={(e) => setEditSlotDate(e.target.value)}
                          className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono text-base sm:text-sm focus:outline-none focus:border-sky-500 [color-scheme:dark]"
                        />
                      </div>

                      {/* Строка 1, колонка 2: Время заезда */}
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium text-xs">
                          Время заезда
                        </label>
                        <input
                          type="time"
                          value={editSlotTime}
                          onChange={(e) => setEditSlotTime(e.target.value)}
                          className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono text-base sm:text-sm focus:outline-none focus:border-sky-500 [color-scheme:dark]"
                        />
                      </div>

                      {/* Строка 2, колонка 1: Итоговая сумма */}
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium text-xs">
                          Итоговая сумма (₽)
                        </label>
                        <input
                          type="number"
                          value={editPrice}
                          onChange={(e) => setEditPrice(e.target.value)}
                          className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono text-base sm:text-sm focus:outline-none focus:border-sky-500"
                        />
                      </div>

                      {/* Строка 2, колонка 2: Госномер авто */}
                      <div>
                        <label className="block text-zinc-400 mb-1 font-medium text-xs">
                          Госномер авто
                        </label>
                        <input
                          type="text"
                          value={editPlate}
                          onChange={(e) => setEditPlate(e.target.value.toUpperCase())}
                          placeholder="А777АА 777"
                          className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white font-mono font-bold text-base sm:text-sm focus:outline-none focus:border-sky-500 uppercase"
                        />
                      </div>
                    </div>

                    {/* Панель «Оплата в студии» с быстрыми кнопками (Mobile-First 44px) */}
                    <div className="p-3.5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div>
                          <span className="block text-zinc-200 font-bold text-xs sm:text-sm">Оплата в студии</span>
                          <span className="text-[11px] text-zinc-400">Способ расчёта и статус оплаты</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsPaid(!isPaid)}
                          className={`min-h-[44px] w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                            isPaid
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                              : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-white'
                          }`}
                        >
                          <CheckCircle2 className={`w-4 h-4 ${isPaid ? 'text-emerald-400' : 'text-zinc-500'}`} />
                          <span>{isPaid ? '✓ Оплачено' : 'Не оплачен'}</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 pt-2 border-t border-zinc-900">
                        <button
                          type="button"
                          onClick={() => setEditPaymentMethod('cash')}
                          className={`min-h-[44px] px-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                            editPaymentMethod === 'cash'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-transparent'
                          }`}
                        >
                          <span>💵 Наличные</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditPaymentMethod('card')}
                          className={`min-h-[44px] px-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                            editPaymentMethod === 'card'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-transparent'
                          }`}
                        >
                          <span>💳 Карта</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditPaymentMethod('sbp')}
                          className={`min-h-[44px] px-2 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                            editPaymentMethod === 'sbp'
                              ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-transparent'
                          }`}
                        >
                          <span>📱 СБП</span>
                        </button>
                      </div>
                    </div>

                    {/* Поле «Заметка для мастеров» */}
                    <div>
                      <label className="block text-zinc-400 mb-1 font-medium text-xs">
                        Заметка для мастеров (не видна клиенту)
                      </label>
                      <textarea
                        value={editNote}
                        onChange={(e) => setEditNote(e.target.value)}
                        placeholder="Особенности автомобиля, пожелания клиента, код домофона..."
                        rows={2}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-white text-base sm:text-sm resize-none focus:outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* 4. ВКЛАДКА 2: ФОТООТЧЁТ */}
              {modalTab === 'photos' && (
                <div className="space-y-4">
                  {/* Фото клиента при заявке */}
                  <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-sky-400" />
                        Фото клиента при заявке ({activeOrder.photos?.length || 0})
                      </span>
                    </div>

                    {activeOrder.photos && activeOrder.photos.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                        {activeOrder.photos.map((p) => (
                          <a
                            key={p.id}
                            href={`/api/photos/${p.id}?token=${activeOrder.token}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="aspect-video rounded-xl overflow-hidden border border-zinc-800 bg-zinc-950 block group relative"
                          >
                            <img
                              src={`/api/photos/${p.id}?token=${activeOrder.token}`}
                              alt="Фото клиента"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                              <Eye className="w-4 h-4" />
                            </div>
                          </a>
                        ))}
                      </div>
                    ) : (
                      <div className="py-3 text-center text-zinc-500 text-xs bg-zinc-950/40 rounded-xl border border-zinc-800/40">
                        Клиент не прикреплял фото к онлайн-заявке
                      </div>
                    )}
                  </div>

                  {/* Фото «До» и «После» */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Фото ДО приёмки */}
                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-amber-400" />
                          Фото ДО приёмки ({photosBefore.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputBeforeRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs flex items-center gap-1 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          <span>+ Добавить</span>
                        </button>
                        <input
                          ref={fileInputBeforeRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, 'before')}
                        />
                      </div>

                      {photosBefore.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {photosBefore.map((p) => (
                            <div key={p.id} className="relative aspect-video rounded-lg overflow-hidden border border-zinc-800 group bg-zinc-950">
                              <img
                                src={`/api/photos/${p.id}?token=${activeOrder.token}`}
                                alt="До"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setPhotosBefore((prev) => prev.filter((item) => item.id !== p.id))}
                                className="absolute top-1 right-1 p-1 rounded bg-black/60 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Удалить фото"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-3 text-center text-zinc-500 text-xs bg-zinc-950/40 rounded-xl border border-zinc-800/40">
                          Нет загруженных фото «До»
                        </div>
                      )}
                    </div>

                    {/* Фото ПОСЛЕ работ */}
                    <div className="p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                          <Camera className="w-3.5 h-3.5 text-emerald-400" />
                          Фото ПОСЛЕ работ ({photosAfter.length})
                        </span>
                        <button
                          type="button"
                          onClick={() => fileInputAfterRef.current?.click()}
                          disabled={uploadingPhoto}
                          className="min-h-[36px] px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-medium text-xs flex items-center gap-1 transition-colors"
                        >
                          <Upload className="w-3 h-3" />
                          <span>+ Добавить</span>
                        </button>
                        <input
                          ref={fileInputAfterRef}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          className="hidden"
                          onChange={(e) => handlePhotoUpload(e, 'after')}
                        />
                      </div>

                      {photosAfter.length > 0 ? (
                        <div className="grid grid-cols-2 gap-2">
                          {photosAfter.map((p) => (
                            <div key={p.id} className="relative aspect-video rounded-lg overflow-hidden border border-emerald-500/30 group bg-zinc-950">
                              <img
                                src={`/api/photos/${p.id}?token=${activeOrder.token}`}
                                alt="После"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = 'none';
                                }}
                                className="w-full h-full object-cover"
                              />
                              <button
                                type="button"
                                onClick={() => setPhotosAfter((prev) => prev.filter((item) => item.id !== p.id))}
                                className="absolute top-1 right-1 p-1 rounded bg-black/60 text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Удалить фото"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-3 text-center text-zinc-500 text-xs bg-zinc-950/40 rounded-xl border border-zinc-800/40">
                          Нет загруженных фото «После»
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

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
            </div>

            {/* 5. НИЖНЯЯ ПАНЕЛЬ ДЕЙСТВИЙ (Sticky Bottom, Mobile-First 44px) */}
            <div className="sticky bottom-0 bg-zinc-950/95 backdrop-blur border-t border-zinc-800 p-4 z-20 flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setActiveOrder(null)}
                className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold text-zinc-400 hover:text-white"
              >
                Закрыть
              </button>
              <button
                type="button"
                onClick={() => handleSaveModal()}
                disabled={savingOrder}
                className="min-h-[44px] w-full sm:w-auto px-6 py-2.5 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-extrabold text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>{savingOrder ? 'Сохранение...' : 'Сохранить изменения'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* 5. МОДАЛЬНОЕ ОКНО: БЫСТРОЕ СОЗДАНИЕ ЗАПИСИ АДМИНИСТРАТОРОМ */}
      {isNewOrderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="px-5 py-4 sm:px-6 sm:py-4 border-b border-zinc-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-sky-500/15 text-sky-400 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-white">Новая запись администратора</h3>
                  <p className="text-[11px] text-zinc-400">Быстрое бронирование для звонков и клиентов</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsNewOrderModalOpen(false)}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewOrder} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
              {newOrderError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{newOrderError}</span>
                </div>
              )}

              {/* Тип записи: В кассу студии или личное авто владельца */}
              <div>
                <label className="block text-[11px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Тип записи (происхождение)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewSourceType('phone_admin')}
                    className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                      newSourceType === 'phone_admin'
                        ? 'bg-amber-500/15 border-amber-500/50 text-amber-300 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div>Звонок / Клиент</div>
                    <div className="text-[10px] font-normal text-zinc-500 mt-0.5">В кассу студии</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSourceType('owner_personal')}
                    className={`min-h-[44px] p-2.5 rounded-xl border text-xs font-bold transition-all text-left ${
                      newSourceType === 'owner_personal'
                        ? 'bg-purple-500/15 border-purple-500/50 text-purple-300 shadow-sm'
                        : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div>Личное / Владелец</div>
                    <div className="text-[10px] font-normal text-zinc-500 mt-0.5">Машина шефа / Тест</div>
                  </button>
                </div>
              </div>

              {/* Клиент */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Имя клиента *
                  </label>
                  <input
                    type="text"
                    required
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    placeholder="Алексей"
                    className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Телефон *
                  </label>
                  <input
                    type="tel"
                    required
                    value={newClientPhone}
                    onChange={(e) => setNewClientPhone(e.target.value)}
                    placeholder="+7 (999) 000-00-00"
                    className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-base sm:text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              {/* Автомобиль */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Марка и модель авто
                  </label>
                  <input
                    type="text"
                    value={newCarBrandModel}
                    onChange={(e) => setNewCarBrandModel(e.target.value)}
                    placeholder="BMW X5 M"
                    className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Госномер
                  </label>
                  <input
                    type="text"
                    value={newCarLicensePlate}
                    onChange={(e) => setNewCarLicensePlate(e.target.value.toUpperCase())}
                    placeholder="А777АА777"
                    className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-base sm:text-sm text-white font-mono font-bold focus:outline-none focus:border-sky-500 uppercase"
                  />
                </div>
              </div>

              {/* Бокс и дата/время */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Бокс (Пост)
                  </label>
                  <select
                    value={newWorkbayId}
                    onChange={(e) => setNewWorkbayId(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500"
                  >
                    <option value="">Без бокса</option>
                    {workbays.map((bay) => (
                      <option key={bay.id} value={bay.id}>
                        {bay.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Дата заезда
                  </label>
                  <input
                    type="date"
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-base sm:text-sm text-white font-mono focus:outline-none focus:border-sky-500 [color-scheme:dark]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Время заезда
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-base sm:text-sm text-white font-mono focus:outline-none focus:border-sky-500 [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Стоимость и описание */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Краткое описание работ
                  </label>
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Химчистка передних сидений + полировка фар"
                    className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-base sm:text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 uppercase mb-1">
                    Стоимость (₽)
                  </label>
                  <input
                    type="number"
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-base sm:text-sm text-white font-mono font-bold focus:outline-none focus:border-sky-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-3 border-t border-zinc-800 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsNewOrderModalOpen(false)}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs sm:text-sm font-semibold"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrder}
                  className="min-h-[44px] px-6 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-sky-600/20 active:scale-95 disabled:opacity-60 transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>{isCreatingOrder ? 'Создание...' : 'Создать запись'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
