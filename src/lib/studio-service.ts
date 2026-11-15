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
      game: {
        ...DEFAULT_BRAND_CONFIG.game,
        ...(parsed.game || {}),
      },
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
 * Сохранить обновлённые настройки студии в БД
 */
export async function saveStudioSettings(updatedSettings: Partial<StudioSettings>): Promise<StudioSettings> {
  const current = await getStudioSettings();
  const merged: StudioSettings = {
    ...current,
    ...updatedSettings,
    game: {
      ...current.game,
      ...(updatedSettings.game || {}),
    },
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

  return merged;
}
