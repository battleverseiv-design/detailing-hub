'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  Edit2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Save, 
  User, 
  Phone, 
  Check, 
  X,
  ChevronLeft,
  ChevronRight,
  Palmtree,
  MessageSquare,
  AlertTriangle,
  ArrowRight,
  Warehouse,
  FileText,
  XCircle,
  ExternalLink,
  Car,
  Power
} from 'lucide-react';

interface WorkbayItem {
  id: string;
  name: string;
  type: string;
  description: string | null;
  isActive: boolean;
  order: number;
}

interface ServiceItem {
  id: string;
  title: string;
  description: string | null;
  durationMinutes: number;
  activeDurationMinutes?: number;
  cureDurationMinutes?: number;
  bufferMinutes: number;
  price: number;
  requiredBayType?: string;
  isActive: boolean;
}

interface AvailabilityItem {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isWorkingDay: boolean;
}

interface DateOverrideItem {
  id: string;
  date: string;
  isDayOff: boolean;
  customStartTime: string | null;
  customEndTime: string | null;
}

interface ConflictOrder {
  id: string;
  clientName: string;
  clientPhone: string;
  carBrandModel: string;
  desiredDate: string | null;
  desiredTime: string | null;
  agreedEntryDateTime: string | null;
}

const MONTH_NAMES = [
  'Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь',
  'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'
];
const DAYS_NAMES = ['Воскресенье', 'Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота'];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const WEEK_HEADERS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function formatRussianDate(dStr: string): string {
  if (!dStr) return '';
  const [y, m, d] = dStr.split('-').map(Number);
  if (!y || !m || !d) return dStr;
  const date = new Date(y, m - 1, d);
  const dayStr = date.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short', year: 'numeric' }).replace(' г.', '');
  const weekdays = ['вс', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const wd = weekdays[date.getDay()];
  return `${dayStr}, ${wd}`;
}

export default function AdminBookingPage() {
  const [activeTab, setActiveTab] = useState<'calendar' | 'schedule' | 'bays'>('calendar');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Данные
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [workbays, setWorkbays] = useState<WorkbayItem[]>([]);
  const [schedule, setSchedule] = useState<AvailabilityItem[]>([]);
  const [overrides, setOverrides] = useState<DateOverrideItem[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);

  // Конфликтные бронирования при закрытии дат
  const [conflicts, setConflicts] = useState<ConflictOrder[]>([]);

  // Визуальный календарь
  const today = new Date();
  const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [calendarYear, setCalendarYear] = useState(today.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(today.getMonth()); // 0-11
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(todayDateStr);

  // Форма отпуска / каникул (диапазон)
  const [vacationStart, setVacationStart] = useState('');
  const [vacationEnd, setVacationEnd] = useState('');

  // Форма поста (Workbay)
  const [isEditingBay, setIsEditingBay] = useState(false);
  const [bayForm, setBayForm] = useState<{
    id?: string;
    name: string;
    type: string;
    description: string;
    isActive: boolean;
    order: number;
  }>({
    name: '',
    type: 'universal',
    description: '',
    isActive: true,
    order: 1,
  });

  // Форма услуги с двухфазным временем
  const [isEditingService, setIsEditingService] = useState(false);
  const [serviceForm, setServiceForm] = useState<{
    id?: string;
    title: string;
    description: string;
    durationMinutes: number;
    activeDurationMinutes: number;
    cureDurationMinutes: number;
    bufferMinutes: number;
    price: number;
    requiredBayType: string;
    isActive: boolean;
  }>({
    title: '',
    description: '',
    durationMinutes: 120,
    activeDurationMinutes: 90,
    cureDurationMinutes: 30,
    bufferMinutes: 15,
    price: 5000,
    requiredBayType: 'any',
    isActive: true,
  });

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4000);
  };

  // Загрузка настроек и существующих заказов
  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsRes, ordersRes] = await Promise.all([
        fetch('/api/admin/booking/settings?userId=demo'),
        fetch('/api/admin/orders'),
      ]);

      if (settingsRes.ok) {
        const sData = await settingsRes.json();
        setServices(sData.services || []);
        
        const rawSchedule: AvailabilityItem[] = sData.availability || [];
        const fullSchedule: AvailabilityItem[] = [];
        for (let day = 0; day < 7; day++) {
          const found = rawSchedule.find((item) => item.dayOfWeek === day);
          fullSchedule.push(
            found || {
              dayOfWeek: day,
              startTime: '09:00',
              endTime: '21:00',
              isWorkingDay: true,
            }
          );
        }
        setSchedule(fullSchedule);
        setOverrides(sData.overrides || []);
        setWorkbays(sData.workbays || []);
      }

      if (ordersRes.ok) {
        const oData = await ordersRes.json();
        setAllOrders(Array.isArray(oData) ? oData : []);
      }
    } catch (e: any) {
      console.error(e);
      showFeedback('error', 'Ошибка загрузки данных');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Заказы выбранного дня в календаре
  const selectedDayOrders = useMemo(() => {
    if (!selectedCalendarDate) return [];
    return allOrders.filter((o) => {
      if (o.desiredDate === selectedCalendarDate) return true;
      if (o.agreedEntryDateTime && o.agreedEntryDateTime.startsWith(selectedCalendarDate)) return true;
      if (o.booking?.startAt && String(o.booking.startAt).startsWith(selectedCalendarDate)) return true;
      return false;
    });
  }, [allOrders, selectedCalendarDate]);

  const selectedDateOverride = useMemo(() => {
    return overrides.find((o) => o.date === selectedCalendarDate);
  }, [overrides, selectedCalendarDate]);

  const isSelectedDateDayOff = useMemo(() => {
    if (selectedDateOverride) return selectedDateOverride.isDayOff;
    if (!selectedCalendarDate) return false;
    const [y, m, d] = selectedCalendarDate.split('-').map(Number);
    const dayOfWeek = new Date(y, m - 1, d).getDay();
    const sched = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    return sched ? !sched.isWorkingDay : false;
  }, [selectedDateOverride, selectedCalendarDate, schedule]);

  // Генерация сетки дней текущего выбранного месяца
  const calendarDays = useMemo(() => {
    const firstDay = new Date(calendarYear, calendarMonth, 1);
    const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
    const daysInMonth = lastDay.getDate();

    // 0 = Вс, 1 = Пн ... 6 = Сб. Переводим в 0 = Пн ... 6 = Вс
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const days: Array<{
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isDayOff: boolean;
      override?: DateOverrideItem;
      hasBookings: boolean;
      bookingsCount: number;
    }> = [];

    // Пустые ячейки до начала месяца
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push({
        dateStr: `prev-${i}`,
        dayNumber: 0,
        isCurrentMonth: false,
        isDayOff: false,
        hasBookings: false,
        bookingsCount: 0,
      });
    }

    const overridesMap = new Map(overrides.map((o) => [o.date, o]));
    const scheduleMap = new Map(schedule.map((s) => [s.dayOfWeek, s]));

    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(calendarMonth + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${calendarYear}-${mStr}-${dStr}`;

      const currDate = new Date(calendarYear, calendarMonth, d);
      const dayOfWeek = currDate.getDay();
      const sched = scheduleMap.get(dayOfWeek);
      const override = overridesMap.get(dateStr);

      let isDayOff = false;
      if (override) {
        isDayOff = override.isDayOff;
      } else if (sched) {
        isDayOff = !sched.isWorkingDay;
      }

      // Подсчет активных заказов на эту дату
      const matchingOrders = allOrders.filter(
        (o) => o.desiredDate === dateStr && o.status !== 'cancelled'
      );

      days.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isDayOff,
        override,
        hasBookings: matchingOrders.length > 0,
        bookingsCount: matchingOrders.length,
      });
    }

    return days;
  }, [calendarYear, calendarMonth, overrides, schedule, allOrders]);

  // Навигация по месяцам
  const handlePrevMonth = () => {
    if (calendarMonth === 0) {
      setCalendarMonth(11);
      setCalendarYear((prev) => prev - 1);
    } else {
      setCalendarMonth((prev) => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarMonth(0);
      setCalendarYear((prev) => prev + 1);
    } else {
      setCalendarMonth((prev) => prev + 1);
    }
  };

  // Клик по конкретной дате в календаре: переключение "Выходной" / "Рабочий"
  const handleToggleCalendarDate = async (dateStr: string) => {
    const existing = overrides.find((o) => o.date === dateStr);
    const newIsDayOff = existing ? !existing.isDayOff : true;

    setSaving(true);
    try {
      const res = await fetch('/api/admin/booking/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_override',
          data: {
            date: dateStr,
            isDayOff: newIsDayOff,
          },
        }),
      });

      if (!res.ok) throw new Error('Ошибка обновления даты');
      const data = await res.json();

      setOverrides((prev) => {
        const filtered = prev.filter((o) => o.date !== dateStr);
        return [...filtered, data.override].sort((a, b) => a.date.localeCompare(b.date));
      });

      if (data.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
        showFeedback('error', `На эту дату закрытия есть ${data.conflicts.length} активных записей!`);
      } else {
        showFeedback('success', newIsDayOff ? `Дата ${dateStr} закрыта (выходной)` : `Дата ${dateStr} открыта для записи`);
      }
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Установка каникул / отпуска диапазоном (например, 25.12 - 10.01)
  const handleApplyVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vacationStart || !vacationEnd) {
      showFeedback('error', 'Укажите даты начала и окончания отпуска');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/booking/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_override_range',
          data: {
            startDate: vacationStart,
            endDate: vacationEnd,
            isDayOff: true,
          },
        }),
      });

      if (!res.ok) throw new Error('Ошибка закрытия периода');
      const data = await res.json();

      setOverrides(data.overrides || []);

      if (data.conflicts && data.conflicts.length > 0) {
        setConflicts(data.conflicts);
        showFeedback('error', `Внимание! На выбранные даты каникул найдено ${data.conflicts.length} записей!`);
      } else {
        setConflicts([]);
        showFeedback('success', `Период с ${vacationStart} по ${vacationEnd} успешно закрыт как каникулы`);
      }

      setVacationStart('');
      setVacationEnd('');
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Снятие блокировки с диапазона дат
  const handleClearVacationRange = async () => {
    if (!vacationStart || !vacationEnd) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/booking/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_override_range',
          data: {
            startDate: vacationStart,
            endDate: vacationEnd,
          },
        }),
      });

      if (!res.ok) throw new Error('Ошибка разблокировки');
      const data = await res.json();
      setOverrides(data.overrides || []);
      setConflicts([]);
      showFeedback('success', 'Блокировка периода снята');
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Сохранение недельного графика
  const handleSaveSchedule = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/booking/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_availability',
          data: { schedule },
        }),
      });

      if (!res.ok) throw new Error('Ошибка сохранения графика');
      showFeedback('success', 'Базовый график сохранен');
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Сохранение поста (Workbay)
  const handleSaveBay = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/booking/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_workbay',
          data: bayForm,
        }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения поста');
      const data = await res.json();
      if (bayForm.id) {
        setWorkbays((prev) => prev.map((b) => (b.id === bayForm.id ? data.workbay : b)));
        showFeedback('success', `Пост «${data.workbay.name}» обновлён`);
      } else {
        setWorkbays((prev) => [...prev, data.workbay]);
        showFeedback('success', `Пост «${data.workbay.name}» успешно добавлен`);
      }
      setIsEditingBay(false);
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Удаление поста
  const handleDeleteBay = async (id: string, name: string) => {
    if (!confirm(`Удалить бокс «${name}»?`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/booking/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_workbay',
          data: { id },
        }),
      });
      if (!res.ok) throw new Error('Ошибка удаления поста');
      setWorkbays((prev) => prev.filter((b) => b.id !== id));
      showFeedback('success', `Пост «${name}» удалён`);
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Сохранение услуги расписания
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch('/api/admin/booking/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'save_service',
          data: serviceForm,
        }),
      });
      if (!res.ok) throw new Error('Ошибка сохранения услуги');
      const data = await res.json();
      if (serviceForm.id) {
        setServices((prev) => prev.map((s) => (s.id === serviceForm.id ? data.service : s)));
        showFeedback('success', `Услуга «${data.service.title}» обновлена`);
      } else {
        setServices((prev) => [...prev, data.service]);
        showFeedback('success', `Услуга «${data.service.title}» добавлена`);
      }
      setIsEditingService(false);
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Удаление услуги
  const handleDeleteService = async (id: string, title: string) => {
    if (!confirm(`Удалить услугу «${title}»?`)) return;
    setSaving(true);
    try {
      const res = await fetch('/api/admin/booking/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_service',
          data: { id },
        }),
      });
      if (!res.ok) throw new Error('Ошибка удаления услуги');
      setServices((prev) => prev.filter((s) => s.id !== id));
      showFeedback('success', `Услуга «${title}» удалена`);
    } catch (e: any) {
      showFeedback('error', e.message);
    } finally {
      setSaving(false);
    }
  };

  // Быстрая ссылка на WhatsApp для предупреждения клиента
  const getWhatsAppLink = (client: ConflictOrder) => {
    const cleanPhone = client.clientPhone.replace(/[^\d]/g, '');
    const dateFormatted = client.desiredDate || client.agreedEntryDateTime || 'согласованную дату';
    const msg = `Здравствуйте, ${client.clientName}! Вас беспокоит студия детейлинга. К сожалению, на ${dateFormatted} мастер не сможет принять ваш автомобиль (больничный/каникулы). Подскажите, пожалуйста, в какой день вам будет удобно перенести визит?`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-zinc-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
        <span className="text-sm">Загрузка календаря и слотов...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Шапка раздела */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-sky-400" />
            Календарь, слоты и отпуска
          </h1>
          <p className="text-xs sm:text-sm text-zinc-400 mt-1">
            Управление рабочими датами, закрытие отпусков/больничных и разрешение конфликтов с клиентами
          </p>
        </div>

        {/* Табы (Mobile-First min-h-[44px]) */}
        <div className="grid grid-cols-1 sm:flex bg-zinc-900 p-1.5 rounded-2xl text-xs sm:text-sm font-semibold border border-zinc-800 gap-1 w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveTab('calendar')}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl transition-all flex items-center justify-center ${
              activeTab === 'calendar'
                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            Календарь и отпуска
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('schedule')}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl transition-all flex items-center justify-center ${
              activeTab === 'schedule'
                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            Базовый график недели
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('bays')}
            className={`min-h-[44px] px-4 py-2.5 rounded-xl transition-all flex items-center justify-center ${
              activeTab === 'bays'
                ? 'bg-white text-zinc-950 font-bold shadow-sm'
                : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
            }`}
          >
            Боксы студии ({workbays.length})
          </button>
        </div>
      </div>

      {/* Плавающий тост (Floating Toast) — фиксирован в углу, не сдвигает страницу */}
      {feedbackMsg && (
        <div className="fixed bottom-5 right-5 left-5 sm:left-auto sm:max-w-md z-50 pointer-events-none">
          <div
            className={`p-4 rounded-2xl text-xs font-semibold flex items-center gap-3 border shadow-2xl backdrop-blur-xl pointer-events-auto animate-fadeIn ${
              feedbackMsg.type === 'success'
                ? 'bg-emerald-950/95 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-950/95 border-rose-500/40 text-rose-200'
            }`}
          >
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            )}
            <span className="leading-snug">{feedbackMsg.text}</span>
          </div>
        </div>
      )}

      {/* 1. ВКЛАДКА: ВИЗУАЛЬНЫЙ КАЛЕНДАРЬ МЕСЯЦЕВ + ОТПУСКА */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          
          {/* БАННЕР ПРЕДУПРЕЖДЕНИЯ О КОНФЛИКТАХ (ЕСЛИ ЗАКРЫТЫ ДНИ С ЗАПИСЯМИ) */}
          {conflicts.length > 0 && (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-200 space-y-3 animate-fadeIn">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <span>Внимание! В закрываемом периоде есть активные записи ({conflicts.length}):</span>
              </div>
              <p className="text-xs text-zinc-300">
                Мастер не сможет принять авто. Свяжитесь с клиентами для переноса или отмены:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                {conflicts.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <div className="font-semibold text-white">{c.clientName} ({c.carBrandModel})</div>
                      <div className="text-[11px] text-zinc-400 font-mono">
                        {c.desiredDate} {c.desiredTime || ''} • {c.clientPhone}
                      </div>
                    </div>

                    <a
                      href={getWhatsAppLink(c)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-all shadow-sm shrink-0"
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>WhatsApp</span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* СЕТКА: КАЛЕНДАРЬ МЕСЯЦА (СЛЕВА) И ФОРМА КАНИКУЛ (СПРАВА) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* КАЛЕНДАРЬ МЕСЯЦА (8 КОЛОНОК) */}
            <div className="lg:col-span-8 p-5 sm:p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 space-y-4">
              
              {/* Переключатель месяца */}
              <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
                <div className="flex items-center gap-3">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    {MONTH_NAMES[calendarMonth]} {calendarYear}
                  </h2>
                  <span className="text-xs text-zinc-500">
                    Выберите день для просмотра загрузки боксов
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Заголовки дней недели (Пн-Вс) */}
              <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-zinc-500 py-1">
                {WEEK_HEADERS.map((h, i) => (
                  <div key={h} className={i >= 5 ? 'text-zinc-600' : ''}>
                    {h}
                  </div>
                ))}
              </div>

              {/* Сетка дней */}
              <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                {calendarDays.map((item, idx) => {
                  if (!item.isCurrentMonth) {
                    return (
                      <div
                        key={`empty-${idx}`}
                        className="h-14 sm:h-16 rounded-xl bg-zinc-950/20 border border-transparent"
                      />
                    );
                  }

                  const isPast = new Date(item.dateStr) < new Date(today.toISOString().slice(0, 10));
                  const isSelected = item.dateStr === selectedCalendarDate;

                  return (
                    <button
                      key={item.dateStr}
                      type="button"
                      onClick={() => setSelectedCalendarDate(item.dateStr)}
                      className={`h-14 sm:h-16 shrink-0 overflow-hidden p-1 sm:p-2 rounded-xl sm:rounded-2xl text-left border transition-all flex flex-col justify-between group relative ${
                        isSelected
                          ? 'ring-2 ring-white border-white/80 bg-zinc-800/90 shadow-lg shadow-white/10'
                          : item.isDayOff
                          ? 'bg-rose-950/20 border-rose-900/40 text-rose-300 hover:border-rose-700/60'
                          : 'bg-zinc-900/60 border-zinc-800/80 text-zinc-200 hover:border-zinc-700 hover:bg-zinc-900'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs sm:text-sm font-bold ${item.isDayOff ? 'text-rose-400' : 'text-white'}`}>
                          {item.dayNumber}
                        </span>

                        {item.hasBookings && (
                          <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-sky-400 animate-pulse" title="Есть активные записи" />
                        )}
                      </div>

                      <div className="text-[9px] sm:text-[10px] truncate leading-tight w-full">
                        {item.isDayOff && (
                          <span className="text-rose-400 font-medium block truncate">Выходной</span>
                        )}
                        {item.bookingsCount > 0 && (
                          <span className="text-sky-300 font-mono font-bold block truncate">
                            {item.bookingsCount} зак.
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Легенда */}
              <div className="flex items-center gap-4 pt-3 border-t border-zinc-800/60 text-xs text-zinc-400">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                  <span>Рабочий день</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <span>Выходной / Закрыто</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                  <span>Есть запись клиента</span>
                </div>
              </div>
            </div>

            {/* ПРАВАЯ КОЛОНКА (КАНИКУЛЫ / ДИАПАЗОН ДАТ) (4 КОЛОНКИ) */}
            <div className="lg:col-span-4 space-y-4">
              
              {/* Форма отпуска */}
              <form
                onSubmit={handleApplyVacation}
                className="p-5 sm:p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 space-y-4 shadow-xl"
              >
                <div className="flex items-center gap-2 text-white font-bold text-sm">
                  <Palmtree className="w-4 h-4 text-emerald-400" />
                  <span>Каникулы и отпуск</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Закройте запись на любой период вперёд (например, новогодние каникулы с 25 декабря по 10 января).
                </p>

                <div className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Дата начала (С)
                    </label>
                    <input
                      type="date"
                      value={vacationStart}
                      onChange={(e) => setVacationStart(e.target.value)}
                      className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-base sm:text-sm text-white [color-scheme:dark]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-medium text-zinc-400 mb-1">
                      Дата окончания (По)
                    </label>
                    <input
                      type="date"
                      value={vacationEnd}
                      onChange={(e) => setVacationEnd(e.target.value)}
                      className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-base sm:text-sm text-white [color-scheme:dark]"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-2">
                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-md disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Palmtree className="w-4 h-4" />}
                    <span>Закрыть период каникул</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearVacationRange}
                    disabled={saving || !vacationStart || !vacationEnd}
                    className="min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white text-xs sm:text-sm font-semibold transition-colors disabled:opacity-40"
                  >
                    Снять блокировку с этого периода
                  </button>
                </div>
              </form>

              {/* Список индивидуальных закрытых дат */}
              <div className="p-5 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 space-y-3">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">
                  Все закрытые даты ({overrides.filter((o) => o.isDayOff).length})
                </span>

                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {overrides.filter((o) => o.isDayOff).length === 0 ? (
                    <span className="text-xs text-zinc-500 italic block">
                      Нет закрытых дат. Студия работает по стандартному графику.
                    </span>
                  ) : (
                    overrides
                      .filter((o) => o.isDayOff)
                      .map((o) => (
                        <div
                          key={o.id}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-between text-xs"
                        >
                          <span className="font-medium text-zinc-200">{formatRussianDate(o.date)}</span>
                          <button
                            type="button"
                            onClick={() => handleToggleCalendarDate(o.date)}
                            className="text-zinc-500 hover:text-rose-400 p-1 transition-colors"
                            title="Открыть дату"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* СЕКЦИЯ: РАСПИСАНИЕ И ЗАГРУЗКА БОКСОВ НА ВЫБРАННЫЙ ДЕНЬ */}
          <div className="p-5 sm:p-6 rounded-3xl bg-zinc-950/70 border border-zinc-800/80 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs uppercase font-bold text-zinc-500 tracking-wider">
                    Детализация постов студии
                  </span>
                  <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                    isSelectedDateDayOff
                      ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {isSelectedDateDayOff ? 'Выходной / Студия закрыта' : 'Рабочий день'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mt-0.5 flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-sky-400" />
                  <span>
                    {selectedCalendarDate ? new Date(selectedCalendarDate).toLocaleDateString('ru-RU', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    }) : ''}
                  </span>
                </h3>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => selectedCalendarDate && handleToggleCalendarDate(selectedCalendarDate)}
                  disabled={saving}
                  className={`min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all border flex items-center justify-center gap-2 w-full sm:w-auto ${
                    isSelectedDateDayOff
                      ? 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30'
                  }`}
                >
                  <Power className="w-4 h-4" />
                  <span>{isSelectedDateDayOff ? 'Открыть этот день для записи' : 'Сделать день выходным'}</span>
                </button>
              </div>
            </div>

            {/* СЕТКА ПО БОКСАМ СТУДИИ */}
            <div className="space-y-4">
              {workbays.length === 0 ? (
                <div className="p-6 text-center text-xs text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800">
                  Боксы студии еще не настроены. Перейдите во вкладку «Посты студии», чтобы добавить боксы.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {workbays.map((bay) => {
                    const bayOrders = selectedDayOrders.filter((o) => {
                      if (o.booking?.workbayId === bay.id) return true;
                      if (!o.booking?.workbayId && o.booking?.service?.requiredBayType === bay.type) return true;
                      return false;
                    });

                    const activeBayOrders = bayOrders.filter((o) => o.status !== 'cancelled');
                    const cancelledBayOrders = bayOrders.filter((o) => o.status === 'cancelled');

                    return (
                      <div
                        key={bay.id}
                        className="p-3.5 sm:p-4 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 space-y-2.5 flex flex-col justify-between"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-sm text-white flex items-center gap-2">
                              <Warehouse className="w-4 h-4 text-sky-400" />
                              <span>{bay.name}</span>
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-400 font-mono uppercase">
                              {bay.type === 'wet' ? 'Мокрый' : bay.type === 'dry' ? 'Сухой' : bay.type === 'cure' ? 'Сушка' : 'Универсал'}
                            </span>
                          </div>
                          {bay.description && (
                            <p className="text-[11px] text-zinc-400">{bay.description}</p>
                          )}
                        </div>

                        {/* Список броней в этом боксе */}
                        <div className="space-y-2 pt-2 border-t border-zinc-800/60">
                          {activeBayOrders.length === 0 && cancelledBayOrders.length === 0 ? (
                            <div className="py-3 px-3 text-center text-xs text-zinc-500 bg-zinc-950/40 rounded-xl border border-dashed border-zinc-800 space-y-2">
                              <span className="block text-zinc-400 font-medium">✓ Бокс свободен в течение смены</span>
                              <Link
                                href={`/admin/orders?newOrder=1&date=${selectedCalendarDate}&workbayId=${bay.id}`}
                                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-sky-600/15 hover:bg-sky-600 text-sky-400 hover:text-white border border-sky-500/30 text-xs sm:text-sm font-bold transition-all w-full sm:w-auto"
                              >
                                <Plus className="w-4 h-4" />
                                <span>+ Записать в этот бокс</span>
                              </Link>
                            </div>
                          ) : (
                            <>
                              {activeBayOrders.map((ord) => (
                                <div
                                  key={ord.id}
                                  className="p-2.5 rounded-xl bg-zinc-950/80 border border-sky-500/30 text-xs space-y-1"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-white flex items-center gap-1.5 truncate">
                                      <Car className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                      <span className="truncate">{ord.carBrandModel}</span>
                                    </span>
                                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20 font-bold shrink-0">
                                      {ord.agreedEntryDateTime ? ord.agreedEntryDateTime.slice(-5) : ord.desiredTime || '09:00'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between text-zinc-400 text-[11px]">
                                    <span className="truncate">{ord.clientName} ({ord.clientPhone})</span>
                                    <span className="font-bold text-zinc-200 shrink-0">
                                      {(ord.agreedFinalPrice != null ? ord.agreedFinalPrice : ord.preliminaryTotal)?.toLocaleString('ru-RU')} ₽
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between pt-1 border-t border-zinc-900 text-[10px]">
                                    <span className="text-zinc-500 font-mono">
                                      Статус: {ord.status === 'in_progress' ? 'В боксе' : ord.status === 'agreed' ? 'Подтверждён' : 'Новый'}
                                    </span>
                                    <a
                                      href={`/order/${ord.token}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-sky-400 hover:text-sky-300 font-semibold flex items-center gap-1"
                                    >
                                      <span>Заказ-наряд А4</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </a>
                                  </div>
                                </div>
                              ))}

                              {/* Кнопка быстрой записи в бокс (Mobile-First 44px) */}
                              <Link
                                href={`/admin/orders?newOrder=1&date=${selectedCalendarDate}&workbayId=${bay.id}`}
                                className="min-h-[44px] w-full py-2.5 px-4 rounded-xl bg-zinc-950 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-zinc-800 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-colors"
                              >
                                <Plus className="w-4 h-4 text-sky-400" />
                                <span>+ Записать в этот бокс</span>
                              </Link>

                              {/* Отменённые бронирования (освобожденные слоты) */}
                              {cancelledBayOrders.map((ord) => (
                                <div
                                  key={ord.id}
                                  className="p-2 rounded-xl bg-rose-950/10 border border-rose-900/30 text-xs space-y-0.5 opacity-75"
                                >
                                  <div className="flex items-center justify-between text-rose-300">
                                    <span className="line-through font-medium">{ord.carBrandModel} • {ord.clientName}</span>
                                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                      Отменено
                                    </span>
                                  </div>
                                  {ord.cancelReason && (
                                    <p className="text-[10px] text-zinc-400 italic">
                                      Причина: {ord.cancelReason}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. ВКЛАДКА: БАЗОВЫЙ ГРАФИК НЕДЕЛИ */}
      {activeTab === 'schedule' && (
        <div className="p-5 rounded-2xl bg-zinc-950/70 border border-zinc-800 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Базовый график работы студии</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Повторяющийся шаблон по дням недели. Если дата не закрыта как исключение, слоты рассчитываются по этому графику.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSaveSchedule}
              disabled={saving}
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 shadow-sm transition-all disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>Сохранить график</span>
            </button>
          </div>

          <div className="divide-y divide-zinc-800 border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/30">
            {DAY_ORDER.map((dayOfWeek) => {
              const item = schedule.find((s) => s.dayOfWeek === dayOfWeek) || {
                dayOfWeek,
                startTime: '09:00',
                endTime: '21:00',
                isWorkingDay: true,
              };

              return (
                <div
                  key={dayOfWeek}
                  className={`p-3.5 sm:px-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    item.isWorkingDay ? 'bg-zinc-900/30' : 'bg-zinc-950/40 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={`day-${dayOfWeek}`}
                      checked={item.isWorkingDay}
                      onChange={() => {
                        setSchedule((prev) =>
                          prev.map((s) =>
                            s.dayOfWeek === dayOfWeek ? { ...s, isWorkingDay: !s.isWorkingDay } : s
                          )
                        );
                      }}
                      className="w-4 h-4 rounded text-sky-600 bg-zinc-800 border-zinc-700 cursor-pointer"
                    />
                    <label
                      htmlFor={`day-${dayOfWeek}`}
                      className="text-xs sm:text-sm font-medium text-white cursor-pointer select-none"
                    >
                      {DAYS_NAMES[dayOfWeek]}
                    </label>
                  </div>

                  {item.isWorkingDay ? (
                    <div className="flex items-center gap-2 self-start sm:self-auto text-xs">
                      <span className="text-zinc-500">с</span>
                      <input
                        type="time"
                        value={item.startTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSchedule((prev) =>
                            prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, startTime: val } : s))
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-mono"
                      />
                      <span className="text-zinc-500">до</span>
                      <input
                        type="time"
                        value={item.endTime}
                        onChange={(e) => {
                          const val = e.target.value;
                          setSchedule((prev) =>
                            prev.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, endTime: val } : s))
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-white text-xs font-mono"
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500 italic">Постоянный выходной</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ВКЛАДКА: ПОСТЫ И БОКСЫ СТУДИИ (WORKBAYS) */}
      {activeTab === 'bays' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">Посты и боксы студии</h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Движок расписания распределяет автомобили по физическим боксам с контролем сушки и полимеризации.
              </p>
            </div>

            {!isEditingBay && (
              <button
                type="button"
                onClick={() => {
                  setBayForm({
                    name: '',
                    type: 'universal',
                    description: '',
                    isActive: true,
                    order: workbays.length + 1,
                  });
                  setIsEditingBay(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-semibold text-xs flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Добавить бокс</span>
              </button>
            )}
          </div>

          {/* Форма добавления/редактирования бокса */}
          {isEditingBay && (
            <form onSubmit={handleSaveBay} className="p-5 rounded-2xl bg-zinc-900/90 border border-zinc-700/80 space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  {bayForm.id ? 'Редактировать пост' : 'Новый пост студии'}
                </h3>
                <button
                  type="button"
                  onClick={() => setIsEditingBay(false)}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Название поста / бокса
                  </label>
                  <input
                    type="text"
                    required
                    value={bayForm.name}
                    onChange={(e) => setBayForm({ ...bayForm, name: e.target.value })}
                    placeholder="напр. Бокс №1 (Мокрый / Экстракция)"
                    className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-base sm:text-sm font-semibold focus:border-sky-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                    Специализация поста
                  </label>
                  <select
                    value={bayForm.type}
                    onChange={(e) => setBayForm({ ...bayForm, type: e.target.value })}
                    className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-base sm:text-sm font-semibold focus:border-sky-500 outline-none"
                  >
                    <option value="universal">Универсальный детейлинг</option>
                    <option value="wet">Мокрый бокс (мойка/экстракция)</option>
                    <option value="dry">Сухой бокс (полировка/пленки)</option>
                    <option value="cure">Камера сушки / кристаллизация</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Оснащение и комментарий
                </label>
                <input
                  type="text"
                  value={bayForm.description}
                  onChange={(e) => setBayForm({ ...bayForm, description: e.target.value })}
                  placeholder="напр. Трап слива, АВД, контурный свет CRI 95+, турбосушка"
                  className="min-h-[44px] w-full px-3.5 py-2.5 rounded-xl bg-zinc-950 border border-zinc-700 text-white text-base sm:text-sm focus:border-sky-500 outline-none"
                />
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-semibold text-zinc-300">
                  <input
                    type="checkbox"
                    checked={bayForm.isActive}
                    onChange={(e) => setBayForm({ ...bayForm, isActive: e.target.checked })}
                    className="w-4 h-4 rounded text-sky-500"
                  />
                  <span>Пост активен и доступен для записи</span>
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingBay(false)}
                    className="min-h-[44px] px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs sm:text-sm font-semibold"
                  >
                    Отмена
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-white hover:bg-zinc-100 text-zinc-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm disabled:opacity-50"
                  >
                    {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                    <span>Сохранить</span>
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Список боксов */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {workbays.map((bay) => (
              <div
                key={bay.id}
                className="p-4 rounded-2xl bg-zinc-950/70 border border-zinc-800 flex flex-col justify-between gap-3 hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div>
                      <h4 className="text-sm font-semibold text-white">{bay.name}</h4>
                      {bay.description && (
                        <p className="text-xs text-zinc-400 mt-0.5 line-clamp-2">{bay.description}</p>
                      )}
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${
                        bay.isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                          : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                      }`}
                    >
                      {bay.isActive ? 'В работе' : 'Отключен'}
                    </span>
                  </div>

                  <div className="mt-2 flex items-center gap-2 text-[11px]">
                    <span className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 font-mono">
                      Тип: {bay.type === 'wet' ? 'Мокрый' : bay.type === 'dry' ? 'Сухой' : bay.type === 'cure' ? 'Сушка / ИК' : 'Универсал'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
                  <button
                    type="button"
                    onClick={() => {
                      setBayForm({
                        id: bay.id,
                        name: bay.name,
                        type: bay.type,
                        description: bay.description || '',
                        isActive: bay.isActive,
                        order: bay.order,
                      });
                      setIsEditingBay(true);
                    }}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                    title="Редактировать"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteBay(bay.id, bay.name)}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Удалить"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
