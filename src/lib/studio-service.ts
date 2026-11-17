import { prisma } from './db';
import { DEFAULT_BRAND_CONFIG, BrandConfig } from '@/config/brand.config';
import { DEFAULT_SERVICES } from './pricing';
import { ServiceItem, StudioSettings } from '@/types';

/**
 * Получить актуальные настройки студии (из БД или дефолтные)
 */
export async function getStudioSettings(): Promise<StudioSettings> {
  try {
    const configRecord = await prisma.studioConfig.findUnique({
      where: { id: 'default' },
    });

    if (!configRecord) {
      return {
        ...DEFAULT_BRAND_CONFIG,
        tariffs: DEFAULT_SERVICES,
      };
    }

    const parsed = JSON.parse(configRecord.settingsJson);
    return {
      ...DEFAULT_BRAND_CONFIG,
      ...parsed,
      classMultipliers: {
        ...DEFAULT_BRAND_CONFIG.classMultipliers,
        ...(parsed.classMultipliers || {}),
      },
      priceRoundStep: parsed.priceRoundStep ?? DEFAULT_BRAND_CONFIG.priceRoundStep,
      categories: parsed.categories && parsed.categories.length > 0 ? parsed.categories : DEFAULT_BRAND_CONFIG.categories,
      bentoFeatures: parsed.bentoFeatures && parsed.bentoFeatures.length > 0 ? parsed.bentoFeatures : DEFAULT_BRAND_CONFIG.bentoFeatures,
      beforeAfterItems: parsed.beforeAfterItems && parsed.beforeAfterItems.length > 0 ? parsed.beforeAfterItems : DEFAULT_BRAND_CONFIG.beforeAfterItems,
      tariffs: (() => {
        const rawTariffs: ServiceItem[] = (parsed.tariffs && parsed.tariffs.length > 0 ? parsed.tariffs : DEFAULT_SERVICES).map((t: ServiceItem, idx: number) => {
          let cat = t.category;
          if (cat === 'dry_cleaning') {
            cat = t.id.startsWith('chem_complex') ? 'packages' : 'interior';
          } else if (cat === 'body_polishing' || cat === 'protection_packages') {
            cat = t.id.startsWith('package_') ? 'packages' : 'exterior';
          }
          return {
            ...t,
            category: cat,
            order: t.order ?? idx + 1,
            isPackage: t.isPackage ?? (cat === 'packages' || t.id.startsWith('chem_complex') || t.id.startsWith('package_')),
            includedServiceIds: t.includedServiceIds ?? (
              t.id === 'chem_complex_light' ? ['chem_local_seats', 'chem_local_headliner', 'chem_local_trunk'] :
              t.id === 'chem_deep_disassembly' ? ['chem_local_seats', 'chem_local_headliner', 'chem_local_trunk', 'chem_ozonation'] :
              t.id === 'package_full_detailing' ? ['chem_local_seats', 'chem_local_headliner', 'chem_local_trunk', 'pol_light_gloss', 'prot_aquapel'] :
              t.id === 'package_pre_sale' ? ['chem_local_seats', 'chem_local_headliner', 'chem_local_trunk', 'pol_light_gloss', 'prot_aquapel', 'wash_engine_bay'] :
              t.id === 'package_ceramic_armor' ? ['pol_deep_restore', 'prot_ceramic_coating', 'prot_aquapel', 'wash_engine_bay'] :
              []
            ),
          };
        });

        const existingIds = new Set(rawTariffs.map((x) => x.id));
        DEFAULT_SERVICES.forEach((ds) => {
          if (!existingIds.has(ds.id)) {
            rawTariffs.push({ ...ds, order: rawTariffs.length + 1 });
          }
        });
        return rawTariffs;
      })(),
    };
  } catch (err) {
    console.error('Error loading studio settings from DB, using defaults:', err);
    return {
      ...DEFAULT_BRAND_CONFIG,
      tariffs: DEFAULT_SERVICES,
    };
  }
}

/**
 * Публичные настройки студии — БЕЗ секретов (токен бота, chat id, URL прокси Telegram).
 * Только эту функцию можно вызывать в серверных компонентах, которые передают данные
 * в клиентские компоненты (props сериализуются в HTML/RSC-payload и видны любому посетителю).
 * Полный getStudioSettings() — только для API-роутов и серверной логики.
 */
export type PublicStudioSettings = Omit<
  StudioSettings,
  'telegramBotToken' | 'telegramChatId' | 'telegramApiUrl'
>;

export async function getPublicSettings(): Promise<PublicStudioSettings> {
  const {
    telegramBotToken: _token,
    telegramChatId: _chatId,
    telegramApiUrl: _apiUrl,
    ...publicSettings
  } = await getStudioSettings();
  return publicSettings;
}

/**
 * Автоматическая синхронизация тарифов студии в таблицу Prisma Service
 * Гарантирует Единый Источник Правды для календаря, двухфазных таймингов и постов (Workbays)
 */
export async function syncTariffsToServices(tariffs: ServiceItem[]): Promise<void> {
  try {
    let user = await prisma.user.findFirst({
      where: { OR: [{ id: 'demo-master-id' }, { slug: 'demo' }] },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: 'demo-master-id',
          slug: 'demo',
          name: 'Главный мастер студии',
          email: 'demo@detailinghub.local',
          phone: '+7 (999) 000-22-33',
        },
      });
    }

    const currentTariffIds = new Set<string>();

    for (const item of tariffs) {
      currentTariffIds.add(item.id);
      const activeMin = item.activeDurationMinutes || item.durationMinutes || 60;
      const cureMin = item.cureDurationMinutes || 0;
      const bufferMin = item.bufferMinutes != null ? item.bufferMinutes : 15;
      const totalDuration = activeMin + cureMin + bufferMin;
      const baseS = item.basePrices?.S || 1000;
      const baseM = item.basePrices?.M || baseS * 1.25;
      const baseL = item.basePrices?.L || baseS * 1.5;

      const multipliers = {
        S: 1.0,
        M: Number((baseM / baseS).toFixed(2)) || 1.25,
        L: Number((baseL / baseS).toFixed(2)) || 1.5,
      };

      await prisma.service.upsert({
        where: { id: item.id },
        update: {
          userId: user.id,
          title: item.name,
          description: item.shortDesc || item.fullDesc || '',
          price: baseS,
          durationMinutes: totalDuration,
          activeDurationMinutes: activeMin,
          cureDurationMinutes: cureMin,
          bufferMinutes: bufferMin,
          requiredBayType: item.requiredBayType || 'any',
          requiredServiceIdsJson: JSON.stringify(item.requiredServiceIds || []),
          classMultipliersJson: JSON.stringify(multipliers),
          isActive: true,
        },
        create: {
          id: item.id,
          userId: user.id,
          title: item.name,
          description: item.shortDesc || item.fullDesc || '',
          price: baseS,
          durationMinutes: totalDuration,
          activeDurationMinutes: activeMin,
          cureDurationMinutes: cureMin,
          bufferMinutes: bufferMin,
          requiredBayType: item.requiredBayType || 'any',
          requiredServiceIdsJson: JSON.stringify(item.requiredServiceIds || []),
          classMultipliersJson: JSON.stringify(multipliers),
          isActive: true,
        },
      });
    }

    // Деактивируем услуги, удаленные из каталога тарифов
    const allServices = await prisma.service.findMany({ where: { userId: user.id } });
    for (const s of allServices) {
      if (!currentTariffIds.has(s.id) && s.isActive) {
        await prisma.service.update({
          where: { id: s.id },
          data: { isActive: false },
        });
      }
    }
  } catch (err) {
    console.error('Error syncing tariffs to Prisma Service table:', err);
  }
}

/**
 * Сохранить обновлённые настройки студии в БД
 */
export async function saveStudioSettings(updatedSettings: Partial<StudioSettings>): Promise<StudioSettings> {
  const current = await getStudioSettings();
  const merged: StudioSettings = {
    ...current,
    ...updatedSettings,
    tariffs: updatedSettings.tariffs || current.tariffs,
  };

  await prisma.studioConfig.upsert({
    where: { id: 'default' },
    update: {
      settingsJson: JSON.stringify(merged),
    },
    create: {
      id: 'default',
      settingsJson: JSON.stringify(merged),
    },
  });

  // Автоматический upsert услуг в таблицу Service для единого источника правды
  await syncTariffsToServices(merged.tariffs);

  return merged;
}

export const DEFAULT_WORKBAYS = [
  {
    id: 'bay-wet-1',
    name: 'Бокс №1 (Мокрый / Мойка & Экстракция)',
    type: 'wet',
    description: 'Гидроизолированный бокс с трапом, мойкой высокого давления и экстракторами',
    order: 1,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bay-dry-2',
    name: 'Бокс №2 (Сухой / Полировка & Пленки)',
    type: 'dry',
    description: 'Обеспыленный бокс с профессиональным рассеянным и точечным светом CRI 95+',
    order: 2,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bay-cure-3',
    name: 'Бокс №3 (Сушка & Кристаллизация)',
    type: 'cure',
    description: 'Сушильный пост с ИК-лампами для полимеризации керамики и кварца',
    order: 3,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'bay-univ-4',
    name: 'Бокс №4 (Универсальный детейлинг)',
    type: 'universal',
    description: 'Пост для комплексных работ и оперативного обслуживания',
    order: 4,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

/**
 * Получить список всех боксов студии
 */
export async function getStudioWorkbays() {
  try {
    const bays = await prisma.workbay.findMany({
      orderBy: { order: 'asc' },
    });
    if (bays.length === 0) {
      // Инициализируем дефолтные боксы
      for (const bay of DEFAULT_WORKBAYS) {
        await prisma.workbay.create({
          data: bay,
        });
      }
      return await prisma.workbay.findMany({
        orderBy: { order: 'asc' },
      });
    }
    return bays;
  } catch (err) {
    console.error('Error fetching workbays:', err);
    return DEFAULT_WORKBAYS;
  }
}

