'use client';

import React, { useState, useEffect } from 'react';
import { StudioSettings, BentoFeature, BeforeAfterItem } from '@/types';
import { DEFAULT_BRAND_CONFIG } from '@/config/brand.config';
import { 
  Save, 
  AlertCircle, 
  Check, 
  Building2, 
  Phone, 
  Bot, 
  Database, 
  Download, 
  Send, 
  Loader2,
  Sparkles,
  Camera,
  Layers
} from 'lucide-react';

export default function AdminStudioPage() {
  const [settings, setSettings] = useState<StudioSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Telegram test state
  const [testingTg, setTestingTg] = useState(false);
  const [tgResult, setTgResult] = useState<{ success?: boolean; message?: string } | null>(null);

  // Backup state
  const [exportingBackup, setExportingBackup] = useState(false);

  useEffect(() => {
    fetch('/api/admin/studio')
      .then((r) => r.json())
      .then((data) => {
        // Гарантируем наличие bentoFeatures и beforeAfterItems
        if (!data.bentoFeatures || data.bentoFeatures.length === 0) {
          data.bentoFeatures = DEFAULT_BRAND_CONFIG.bentoFeatures;
        }
        if (!data.beforeAfterItems || data.beforeAfterItems.length === 0) {
          data.beforeAfterItems = DEFAULT_BRAND_CONFIG.beforeAfterItems;
        }
        setSettings(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setLoading(false);
      });
  }, []);

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

      if (!res.ok) throw new Error('Ошибка сохранения настроек');

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Ошибка сохранения');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!settings) return;
    setTestingTg(true);
    setTgResult(null);

    try {
      const res = await fetch('/api/admin/studio/test-telegram', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: settings.telegramBotToken,
          chatId: settings.telegramChatId,
          apiUrl: settings.telegramApiUrl,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setTgResult({ success: false, message: data.error || 'Ошибка отправки' });
      } else {
        setTgResult({ success: true, message: data.message || 'Тестовое сообщение успешно отправлено!' });
      }
    } catch (err: any) {
      setTgResult({ success: false, message: err.message || 'Ошибка соединения' });
    } finally {
      setTestingTg(false);
    }
  };

  const handleDownloadBackup = async () => {
    setExportingBackup(true);
    try {
      const res = await fetch('/api/admin/studio/backup');
      if (!res.ok) throw new Error('Ошибка создания бэкапа');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `detailinghub-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      alert('Ошибка при скачивании бэкапа: ' + err.message);
    } finally {
      setExportingBackup(false);
    }
  };

  if (loading || !settings) {
    return <div className="py-12 text-center text-xs text-zinc-400">Загрузка данных студии...</div>;
  }

  const bentoList: BentoFeature[] = settings.bentoFeatures || DEFAULT_BRAND_CONFIG.bentoFeatures || [];
  const beforeAfterList: BeforeAfterItem[] = settings.beforeAfterItems || DEFAULT_BRAND_CONFIG.beforeAfterItems || [];

  return (
    <div className="space-y-6 pb-20">
      <form onSubmit={handleSave} className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Настройки студии и маркетинг
            </h1>
            <p className="text-xs text-zinc-400 mt-1">
              Контакты, Telegram-уведомления, блок преимуществ (Bento Grid) и слайдер До/После
            </p>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-extrabold text-xs shadow-md shadow-sky-600/20 active:scale-95 disabled:opacity-60 transition-all flex items-center gap-2 self-start sm:self-auto"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Сохранение...' : 'Сохранить изменения'}</span>
          </button>
        </div>

        {success && (
          <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0" />
            <span>Настройки студии успешно обновлены на сайте!</span>
          </div>
        )}

        {error && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 1. Основная информация */}
        <div className="bg-zinc-950/80 rounded-3xl p-6 border border-zinc-800/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>Название и слоган</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Полное название студии
              </label>
              <input
                type="text"
                value={settings.studioName}
                onChange={(e) => setSettings({ ...settings, studioName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Короткое название (в шапку и логотип)
              </label>
              <input
                type="text"
                value={settings.shortName}
                onChange={(e) => setSettings({ ...settings, shortName: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-zinc-300 mb-1">
              Слоган и описание
            </label>
            <input
              type="text"
              value={settings.tagline}
              onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
              className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
            />
          </div>
        </div>

        {/* 2. Контакты и локация */}
        <div className="bg-zinc-950/80 rounded-3xl p-6 border border-zinc-800/80 shadow-sm space-y-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Phone className="w-4 h-4 text-sky-400" />
            <span>Контакты и локация</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Город
              </label>
              <input
                type="text"
                value={settings.city}
                onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Адрес бокса / студии
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Телефон для клиентов
              </label>
              <input
                type="text"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Режим работы
              </label>
              <input
                type="text"
                value={settings.workHours}
                onChange={(e) => setSettings({ ...settings, workHours: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Ссылка на Telegram (канал или личка)
              </label>
              <input
                type="text"
                value={settings.telegramUrl}
                onChange={(e) => setSettings({ ...settings, telegramUrl: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Ссылка на WhatsApp
              </label>
              <input
                type="text"
                value={settings.whatsappUrl}
                onChange={(e) => setSettings({ ...settings, whatsappUrl: e.target.value })}
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>
        </div>

        {/* 3. БЛОК ПРЕИМУЩЕСТВ (BENTO GRID НА ГЛАВНОЙ) */}
        <div className="bg-zinc-950/80 rounded-3xl p-6 border border-zinc-800/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>Стандарты студии (Bento Grid блок на главной)</span>
            </h3>
            <span className="text-[11px] text-zinc-400">Редактируйте тексты, бейджи и видимость карточек</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bentoList.map((item, index) => (
              <div
                key={item.id || index}
                className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-sky-400">Карточка #{index + 1}</span>
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={item.active !== false}
                      onChange={(e) => {
                        const updated = [...bentoList];
                        updated[index] = { ...updated[index], active: e.target.checked };
                        setSettings({ ...settings, bentoFeatures: updated });
                      }}
                      className="w-4 h-4 rounded text-sky-500 bg-zinc-950 border-zinc-700"
                    />
                    <span className="text-[11px] text-zinc-300 font-semibold">Отображать</span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Заголовок</label>
                    <input
                      type="text"
                      value={item.title}
                      onChange={(e) => {
                        const updated = [...bentoList];
                        updated[index] = { ...updated[index], title: e.target.value };
                        setSettings({ ...settings, bentoFeatures: updated });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-bold text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">Бейдж / метка</label>
                    <input
                      type="text"
                      value={item.badge || ''}
                      onChange={(e) => {
                        const updated = [...bentoList];
                        updated[index] = { ...updated[index], badge: e.target.value };
                        setSettings({ ...settings, bentoFeatures: updated });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-xs text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Подзаголовок</label>
                  <input
                    type="text"
                    value={item.subtitle}
                    onChange={(e) => {
                      const updated = [...bentoList];
                      updated[index] = { ...updated[index], subtitle: e.target.value };
                      setSettings({ ...settings, bentoFeatures: updated });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-xs text-sky-300 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Описание карточки</label>
                  <textarea
                    rows={2}
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...bentoList];
                      updated[index] = { ...updated[index], description: e.target.value };
                      setSettings({ ...settings, bentoFeatures: updated });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-xs text-zinc-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4. СЛАЙДЕР «ДО И ПОСЛЕ» */}
        <div className="bg-zinc-950/80 rounded-3xl p-6 border border-zinc-800/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800/80 pb-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-sky-400" />
              <span>Слайдер «До и После» (Фотографии и подписи)</span>
            </h3>
            <span className="text-[11px] text-zinc-400">Настраивайте пары снимков и описания работ</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {beforeAfterList.map((item, index) => (
              <div
                key={item.id || index}
                className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3"
              >
                <span className="text-xs font-bold text-sky-400">Слайдер #{index + 1}: {item.title}</span>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Название сравнения</label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const updated = [...beforeAfterList];
                      updated[index] = { ...updated[index], title: e.target.value };
                      setSettings({ ...settings, beforeAfterItems: updated });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-xs font-bold text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-zinc-400 mb-1">Описание работ</label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...beforeAfterList];
                      updated[index] = { ...updated[index], description: e.target.value };
                      setSettings({ ...settings, beforeAfterItems: updated });
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-xs text-zinc-300"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">URL фото ДО</label>
                    <input
                      type="text"
                      value={item.beforeImage}
                      onChange={(e) => {
                        const updated = [...beforeAfterList];
                        updated[index] = { ...updated[index], beforeImage: e.target.value };
                        setSettings({ ...settings, beforeAfterItems: updated });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-[11px] text-zinc-300 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-zinc-400 mb-1">URL фото ПОСЛЕ</label>
                    <input
                      type="text"
                      value={item.afterImage}
                      onChange={(e) => {
                        const updated = [...beforeAfterList];
                        updated[index] = { ...updated[index], afterImage: e.target.value };
                        setSettings({ ...settings, beforeAfterItems: updated });
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-zinc-700 bg-zinc-950 text-[11px] text-zinc-300 font-mono"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 5. Уведомления Telegram */}
        <div className="bg-zinc-950/80 rounded-3xl p-6 border border-zinc-800/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Bot className="w-4 h-4 text-sky-400" />
              <span>Уведомления в Telegram</span>
            </h3>
            <span className="text-[11px] text-zinc-400">Мгновенные оповещения о новых записях</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Telegram Bot Token (от @BotFather)
              </label>
              <input
                type="password"
                value={settings.telegramBotToken || ''}
                onChange={(e) => setSettings({ ...settings, telegramBotToken: e.target.value })}
                placeholder="123456789:ABCdefGhIJKlmNoPQRsTUVwxyZ"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-zinc-300 mb-1">
                Telegram Chat ID (от @userinfobot)
              </label>
              <input
                type="text"
                value={settings.telegramChatId || ''}
                onChange={(e) => setSettings({ ...settings, telegramChatId: e.target.value })}
                placeholder="123456789 или -100123456789"
                className="w-full px-3.5 py-2 rounded-xl border border-zinc-700 bg-zinc-900 text-xs font-semibold text-white focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={testingTg || !settings.telegramBotToken || !settings.telegramChatId}
              onClick={handleTestTelegram}
              className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs active:scale-95 disabled:opacity-50 transition-all flex items-center gap-2 border border-zinc-800"
            >
              {testingTg ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5 text-sky-400" />}
              <span>{testingTg ? 'Отправка...' : 'Проверить уведомления'}</span>
            </button>

            {tgResult && (
              <span className={`text-xs font-semibold flex items-center gap-1.5 ${tgResult.success ? 'text-emerald-400' : 'text-rose-400'}`}>
                {tgResult.success ? <Check className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                <span>{tgResult.message}</span>
              </span>
            )}
          </div>
        </div>

        {/* 6. Резервное копирование */}
        <div className="bg-zinc-950/80 rounded-3xl p-6 border border-zinc-800/80 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Database className="w-4 h-4 text-sky-400" />
              <span>Резервная копия студии</span>
            </h3>
            <span className="text-[11px] text-zinc-400">Экспорт настроек, цен и тарифов в JSON</span>
          </div>

          <p className="text-xs text-zinc-400">
            Скачайте резервную копию со всеми тарифами, категориями, ценами и настройками студии для безопасности.
          </p>

          <button
            type="button"
            disabled={exportingBackup}
            onClick={handleDownloadBackup}
            className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs border border-zinc-800 transition-all flex items-center gap-2"
          >
            {exportingBackup ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-sky-400" />}
            <span>Скачать бэкап настроек</span>
          </button>
        </div>
      </form>
    </div>
  );
}
