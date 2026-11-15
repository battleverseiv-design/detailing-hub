import { CarClass, CartItem, PricingSummary, ServiceCategory, ServiceItem, ServiceZone } from '@/types';
import { DEFAULT_BRAND_CONFIG } from '@/config/brand.config';

/**
 * Вспомогательное округление цены до заданного шага (50, 100, 500 ₽)
 */
export function roundPrice(price: number, step: number = 100): number {
  if (!step || step <= 1) return Math.round(price);
  return Math.round(price / step) * step;
}

/**
 * Расчёт цены по множителю класса авто
 */
export function calcPriceByMultiplier(
  basePrice: number,
  multiplier: number,
  roundStep: number = 100
): number {
  return roundPrice(basePrice * multiplier, roundStep);
}

/**
 * БАЗОВЫЙ СПИСОК УСЛУГ СТУДИИ ДЕТЕЙЛИНГА
 */
export const DEFAULT_SERVICES: ServiceItem[] = [
  // 1. КОМПЛЕКСЫ ("ВСЁ ВКЛЮЧЕНО" СО СКИДКОЙ)
  {
    id: 'chem_complex_light',
    name: 'Комплексная химчистка без разбора',
    category: 'packages',
    shortDesc: 'Очистка сидений, ковролина, пластика, торпедо, дверных карт и стекол',
    fullDesc: 'Торнадор, щадящая био-химия Koch Chemie, экстракторная экстракция грязи, сушка турбо-пушкой. Без снятия сидений.',
    basePrices: { S: 8000, M: 10000, L: 13000 },
    zones: ['interior_seats', 'interior_roof', 'interior_trunk'],
    popular: true,
    badge: 'Популярно',
    isPackage: true,
    includedServiceIds: ['chem_local_seats', 'chem_local_headliner', 'chem_local_trunk'],
    order: 1,
  },
  {
    id: 'chem_deep_disassembly',
    name: 'Глубокая химчистка с частичным разбором',
    category: 'packages',
    shortDesc: 'Полное снятие передних сидений, мойка пола под полозьями, очистка труднодоступных мест',
    fullDesc: 'Максимальное удаление въевшейся грязи, солей, пролитых напитков и пылевых клещей. Снятие сидений с соблюдением моментов затяжки и безопасности подушек Airbag.',
    basePrices: { S: 14000, M: 17000, L: 21000 },
    zones: ['interior_seats', 'interior_roof', 'interior_trunk'],
    badge: 'Топ чистоты',
    isPackage: true,
    includedServiceIds: ['chem_local_seats', 'chem_local_headliner', 'chem_local_trunk', 'chem_ozonation'],
    order: 2,
  },
  {
    id: 'package_full_detailing',
    name: 'Комплекс «Полный детейлинг: Салон + Кузов»',
    category: 'packages',
    shortDesc: 'Комплексная химчистка салона + зеркальная полировка кузова + антидождь',
    fullDesc: 'Идеальный выбор для обновления авто до состояния нового: экстракция всего салона Koch Chemie, мягкая полировка ЛКП без голограмм и покрытие Aquapel.',
    basePrices: { S: 16000, M: 19500, L: 24000 },
    zones: ['interior_seats', 'interior_roof', 'interior_trunk', 'body_paint', 'lights_glass'],
    badge: 'Хит • Выгода 20%',
    popular: true,
    isPackage: true,
    includedServiceIds: ['chem_local_seats', 'chem_local_headliner', 'chem_local_trunk', 'pol_light_gloss', 'prot_aquapel'],
    order: 3,
  },
  {
    id: 'package_pre_sale',
    name: 'Комплекс «Предпродажная подготовка»',
    category: 'packages',
    shortDesc: 'Комплекс: химчистка салона + лёгкая полировка + антидождь + мойка мотора',
    fullDesc: 'Позволяет продать автомобиль на 10-15% дороже. Включает комплексную чистку салона, полировку кузова, чернение резины и чистку подкапотного пространства.',
    basePrices: { S: 21000, M: 25000, L: 30000 },
    zones: ['interior_seats', 'interior_roof', 'body_paint', 'lights_glass', 'engine_bay'],
    badge: 'Выгода 25%',
    isPackage: true,
    includedServiceIds: ['chem_local_seats', 'chem_local_headliner', 'chem_local_trunk', 'pol_light_gloss', 'prot_aquapel', 'wash_engine_bay'],
    order: 4,
  },
  {
    id: 'package_ceramic_armor',
    name: 'Комплекс «Керамическая защита 360°»',
    category: 'packages',
    shortDesc: 'Восстановительная полировка + 2 слоя керамики 9H + антидождь + мойка мотора',
    fullDesc: 'Бескомпромиссная защита лака от реагентов, выгорания и паутинки. Мощнейший гидрофоб и зеркальный сочный глянец на 2 года.',
    basePrices: { S: 29000, M: 35000, L: 43000 },
    zones: ['body_paint', 'lights_glass', 'engine_bay'],
    badge: 'Премиум броня',
    isPackage: true,
    includedServiceIds: ['pol_deep_restore', 'prot_ceramic_coating', 'prot_aquapel', 'wash_engine_bay'],
    order: 5,
  },

  // 2. САЛОН (ЛОКАЛЬНАЯ ЧИСТКА И УХОД)
  {
    id: 'chem_local_seats',
    name: 'Локальная чистка сидений',
    category: 'interior',
    shortDesc: 'Глубокая экстракторная чистка сидений от пятен',
    fullDesc: 'Выведение локальных пятен, кофе, жира и пыли со спинок и подушек сидений.',
    basePrices: { S: 1200, M: 1500, L: 1800 },
    allowsQuantity: true,
    unitLabel: 'сиденье',
    maxQuantity: 8,
    zones: ['interior_seats'],
    order: 1,
  },
  {
    id: 'chem_local_headliner',
    name: 'Химчистка потолка и стоек',
    category: 'interior',
    shortDesc: 'Деликатная сухая и паровая очистка потолочной ткани без провисания',
    fullDesc: 'Используется пенная деликатная химия без избыточного увлажнения, предотвращая отклеивание и провисание обшивки потолка.',
    basePrices: { S: 3000, M: 3800, L: 4500 },
    zones: ['interior_roof'],
    order: 2,
  },
  {
    id: 'chem_local_trunk',
    name: 'Химчистка багажного отделения',
    category: 'interior',
    shortDesc: 'Очистка пола багажника, боковых панелей и ниши запаски',
    fullDesc: 'Удаление масляных пятен, следов грязи, песка и пыли. Чистка коврика багажника.',
    basePrices: { S: 2500, M: 3000, L: 3800 },
    zones: ['interior_trunk'],
    order: 3,
  },
  {
    id: 'chem_ozonation',
    name: 'Озонация и нейтрализация запахов (сухой туман)',
    category: 'interior',
    shortDesc: 'Уничтожение бактерий, плесени в воздуховодах и запаха табака',
    fullDesc: 'Генератор медицинского озона 20г/ч + ароматическая дезинфекция сухим туманом Harvard Chemical.',
    basePrices: { S: 1800, M: 2200, L: 2700 },
    zones: ['interior_seats', 'interior_roof'],
    order: 4,
  },
  {
    id: 'chem_leather_care',
    name: 'Питание и консервация кожаного салона',
    category: 'interior',
    shortDesc: 'Матовый крем-бальзам премиум-класса против заломов и трещин',
    fullDesc: 'Очистка пор кожи щётками из конского волоса и нанесение увлажняющего гидрофобного крема Leraton/LeTech.',
    basePrices: { S: 3500, M: 4500, L: 5500 },
    zones: ['interior_seats'],
    order: 5,
  },

  // 3. КУЗОВ И ЗАЩИТА
  {
    id: 'pol_light_gloss',
    name: 'Лёгкая освежающая полировка (Anti-Holo)',
    category: 'exterior',
    shortDesc: 'Удаление мелкой паутинки, возвращение глубокого сочного глянца',
    fullDesc: 'Одношаговая полировка эксцентриковыми машинками Rupes с мягким кругом. Безопасно для толщины лака.',
    basePrices: { S: 9000, M: 11000, L: 14000 },
    zones: ['body_paint'],
    popular: true,
    order: 1,
  },
  {
    id: 'pol_deep_restore',
    name: 'Восстановительная абразивная полировка',
    category: 'exterior',
    shortDesc: 'Удаление до 90% царапин, притёртостей и рисок',
    fullDesc: 'Трёхшаговая коррекция лака (тяжёлая паста + финиш + антиголограмма). Идеальная гладкость зеркала.',
    basePrices: { S: 18000, M: 22000, L: 27000 },
    zones: ['body_paint'],
    badge: 'Зеркало',
    order: 2,
  },
  {
    id: 'pol_headlights',
    name: 'Глубокая полировка фар (пара)',
    category: 'exterior',
    shortDesc: 'Восстановление прозрачности и яркости светового пучка',
    fullDesc: 'Шлифовка помутневшего верхнего слоя поликарбоната и финишная полировка в глянец.',
    basePrices: { S: 2500, M: 2500, L: 2500 },
    zones: ['lights_glass'],
    order: 3,
  },
  {
    id: 'prot_aquapel',
    name: 'Антидождь премиум (Лобовое + передние стёкла)',
    category: 'exterior',
    shortDesc: 'Капли слетают на скорости от 50 км/ч, щетки почти не нужны',
    fullDesc: 'Глубокая очистка стекла пастой с оксидом церия + оригинальный гидрофобный состав Aquapel (срок действия до 8-12 месяцев).',
    basePrices: { S: 2500, M: 3000, L: 3500 },
    zones: ['lights_glass'],
    popular: true,
    order: 4,
  },
  {
    id: 'prot_solid_wax',
    name: 'Покрытие твёрдым воском / жидким стеклом',
    category: 'exterior',
    shortDesc: 'Глубокий мокрый блеск и водоотталкивающий эффект на 3-6 месяцев',
    fullDesc: 'Карнаубский воск премиум-класса Fusso Coat или жидкое стекло Willson Body Glass Guard.',
    basePrices: { S: 6000, M: 7500, L: 9000 },
    zones: ['body_paint'],
    order: 5,
  },
  {
    id: 'prot_ceramic_coating',
    name: 'Керамическое покрытие 2+1 (2 слоя базы + гидрофоб)',
    category: 'exterior',
    shortDesc: 'Защита от реагентов, птичьего помёта, выгорания и мощнейший гидрофоб',
    fullDesc: 'Нанесение керамического состава 9H (Krytex / Everglass). В стоимость входит обезжиривание и межслойная сушка ИК-лампами.',
    basePrices: { S: 25000, M: 30000, L: 37000 },
    zones: ['body_paint'],
    badge: 'Максимум',
    requiredServiceIds: ['pol_deep_restore'],
    durationMinutes: 720,
    activeDurationMinutes: 180,
    cureDurationMinutes: 540,
    bufferMinutes: 30,
    requiredBayType: 'cure',
    order: 6,
  },
  {
    id: 'wash_engine_bay',
    name: 'Детейлинг подкапотного пространства с консервацией',
    category: 'exterior',
    shortDesc: 'Диэлектрическая мойка сухим паром + защитный антистатический консервант',
    fullDesc: 'Безопасная мойка спецсоставами Koch Motorplast. Защита проводки от окисления и влаги, благородный матовый вид под капотом.',
    basePrices: { S: 3500, M: 4000, L: 4800 },
    zones: ['engine_bay'],
    order: 7,
  },

  // 4. ОЦЕНКА ПО ФОТО
  {
    id: 'custom_photo_service',
    name: 'Индивидуальная задача / Оценка по фото',
    category: 'exterior',
    shortDesc: 'Нестандартное авто, сильные загрязнения, локальный окрас, чистка после животных',
    fullDesc: 'Опишите задачу и приложите фото. Мастер свяжется с вами и назовёт точную стоимость и сроки.',
    basePrices: { S: 0, M: 0, L: 0 },
    zones: ['none'],
    isCustomPhoto: true,
    order: 8,
  },
];

/**
 * Округление цены до целых десятков рублей (в пользу клиента)
 */
export function roundToTens(val: number): number {
  return Math.round(val / 10) * 10;
}

/**
 * Расчёт стоимости одной позиции корзины
 */
export function calculateItemPrice(
  service: ServiceItem,
  carClass: CarClass,
  isDirty: boolean,
  quantity: number = 1,
  dirtyMarkupPercent: number = DEFAULT_BRAND_CONFIG.dirtyCarMarkupPercent
): { unitPrice: number; itemTotal: number } {
  if (service.isCustomPhoto) {
    return { unitPrice: 0, itemTotal: 0 };
  }

  // Для класса OTHER берем тариф L как базовый ориентир
  const priceClass = carClass === 'OTHER' ? 'L' : carClass;
  const baseUnitPrice = service.basePrices[priceClass] || 0;
  
  const unitPrice = roundToTens(baseUnitPrice);
  const itemTotal = roundToTens(unitPrice * Math.max(1, quantity));

  return { unitPrice, itemTotal };
}

/**
 * ЕДИНАЯ ЧИСТАЯ ФУНКЦИЯ РАСЧЁТА ЗАКАЗА ДЛЯ КЛИЕНТА И СЕРВЕРА
 */
export function calculateOrderSummary(
  items: CartItem[],
  carClass: CarClass,
  isDirty: boolean,
  serviceFormat: 'studio' | 'mobile',
  config: {
    minOrderAmount?: number;
    dirtyCarMarkupPercent?: number;
    mobileServicePrice?: number;
    mobileServiceEnabled?: boolean;
  } = {}
): PricingSummary {
  const minOrderAmount = config.minOrderAmount ?? DEFAULT_BRAND_CONFIG.minOrderAmount;
  const dirtyMarkupPercent = config.dirtyCarMarkupPercent ?? DEFAULT_BRAND_CONFIG.dirtyCarMarkupPercent;
  const mobilePrice = config.mobileServicePrice ?? DEFAULT_BRAND_CONFIG.mobileServicePrice;

  let itemsSubtotal = 0;
  let hasPhotoAppraisal = false;

  for (const item of items) {
    if (item.isCustomPhoto) {
      hasPhotoAppraisal = true;
    } else {
      itemsSubtotal += item.itemTotal;
    }
  }

  // Применение надбавки за сильные загрязнения
  let dirtyMarkupAmount = 0;
  if (isDirty && itemsSubtotal > 0) {
    dirtyMarkupAmount = roundToTens(itemsSubtotal * (dirtyMarkupPercent / 100));
  }
  const subtotalWithDirty = itemsSubtotal + dirtyMarkupAmount;

  // Проверка минимального чека (относится только к известным работам)
  let minOrderDeficit = 0;
  let workTotal = subtotalWithDirty;

  if (itemsSubtotal > 0 && subtotalWithDirty < minOrderAmount) {
    minOrderDeficit = minOrderAmount - subtotalWithDirty;
    workTotal = minOrderAmount;
  }

  // Доплата за выезд (добавляется поверх суммы работ, не съедается минимальным чеком)
  const mobileFee = serviceFormat === 'mobile' ? mobilePrice : 0;
  const preliminaryTotal = workTotal + mobileFee;

  // Форматирование итоговой надписи
  let displayTotalFormatted = '';
  if (hasPhotoAppraisal && workTotal > 0) {
    displayTotalFormatted = `от ${preliminaryTotal.toLocaleString('ru-RU')} ₽ + оценка по фото`;
  } else if (hasPhotoAppraisal && workTotal === 0) {
    displayTotalFormatted = 'Оценка по фото';
  } else if (preliminaryTotal > 0) {
    displayTotalFormatted = `${preliminaryTotal.toLocaleString('ru-RU')} ₽`;
  } else {
    displayTotalFormatted = '0 ₽';
  }

  return {
    itemsSubtotal,
    dirtyMarkupAmount,
    subtotalWithDirty,
    minOrderAmount,
    minOrderDeficit,
    workTotal,
    serviceFormat,
    mobileFee,
    preliminaryTotal,
    hasPhotoAppraisal,
    displayTotalFormatted,
  };
}

/**
 * Получение зон автомобиля, которые должны подсвечиваться на SVG-схеме
 */
export function getActiveCarZones(items: CartItem[]): Set<ServiceZone> {
  const zones = new Set<ServiceZone>();
  for (const item of items) {
    if (item.zones) {
      for (const zone of item.zones) {
        if (zone !== 'none') {
          zones.add(zone);
        }
      }
    }
  }
  return zones;
}

// -----------------------------------------------------------
// МАТРИЦА ПРАВИЛ И ТЕХНОЛОГИЧЕСКИХ ЗАВИСИМОСТЕЙ ТАРИФОВ
// -----------------------------------------------------------

export interface ServiceDependencyWarning {
  serviceId: string;
  serviceName: string;
  requiredServiceId: string;
  requiredServiceName: string;
  message: string;
}

export interface UpsellRecommendation {
  serviceId: string;
  serviceName: string;
  category: ServiceCategory;
  price: number;
  badge?: string;
  reason: string;
}

/**
 * Проверка технологических зависимостей выбранных услуг.
 * Например: Керамическое покрытие 9H требует предварительной абразивной полировки.
 */
export function validateServiceDependencies(
  items: CartItem[],
  allTariffs: ServiceItem[]
): {
  isValid: boolean;
  warnings: ServiceDependencyWarning[];
} {
  const tariffMap = new Map(allTariffs.map((t) => [t.id, t]));
  const selectedServiceIds = new Set<string>();

  // Собираем все выбранные ID, а также ID входящих в комплексы услуг
  for (const item of items) {
    selectedServiceIds.add(item.serviceId);
    const tariff = tariffMap.get(item.serviceId);
    if (tariff?.includedServiceIds) {
      for (const incId of tariff.includedServiceIds) {
        selectedServiceIds.add(incId);
      }
    }
  }

  const warnings: ServiceDependencyWarning[] = [];

  for (const item of items) {
    const tariff = tariffMap.get(item.serviceId);
    if (!tariff?.requiredServiceIds || tariff.requiredServiceIds.length === 0) continue;

    for (const reqId of tariff.requiredServiceIds) {
      if (!selectedServiceIds.has(reqId)) {
        const reqTariff = tariffMap.get(reqId);
        const reqName = reqTariff ? reqTariff.name : reqId;
        warnings.push({
          serviceId: item.serviceId,
          serviceName: item.name,
          requiredServiceId: reqId,
          requiredServiceName: reqName,
          message: `Услуга «${item.name}» требует предварительного выполнения «${reqName}» для соблюдения технологии.`,
        });
      }
    }
  }

  return {
    isValid: warnings.length === 0,
    warnings,
  };
}

/**
 * Смарт-апсейлы и сопутствующие услуги на основе выбранного состава
 */
export function getRecommendedUpsells(
  items: CartItem[],
  allTariffs: ServiceItem[],
  carClass: CarClass = 'M'
): UpsellRecommendation[] {
  const tariffMap = new Map(allTariffs.map((t) => [t.id, t]));
  const selectedIds = new Set(items.map((i) => i.serviceId));

  // Также учитываем то, что уже входит в комплексы
  for (const item of items) {
    const t = tariffMap.get(item.serviceId);
    if (t?.includedServiceIds) {
      t.includedServiceIds.forEach((inc) => selectedIds.add(inc));
    }
  }

  const recommendations: UpsellRecommendation[] = [];
  const priceClass = carClass === 'OTHER' ? 'L' : carClass;

  // 0. Приоритетные услуги, явно отмеченные владельцем студии галочкой "Рекомендовать в корзине"
  for (const t of allTariffs) {
    if (t.recommendInCart && !selectedIds.has(t.id) && !t.isPackage && !t.isCustomPhoto) {
      recommendations.push({
        serviceId: t.id,
        serviceName: t.name,
        category: t.category,
        price: t.basePrices[priceClass] || 0,
        badge: t.badge || 'Рекомендуем',
        reason: t.shortDesc || 'Популярная дополнительная услуга студии',
      });
      if (recommendations.length >= 3) {
        return recommendations;
      }
    }
  }

  const hasInterior = items.some((i) => i.category === 'interior' || i.serviceId.startsWith('chem_'));
  const hasPolishing = items.some((i) => i.serviceId.startsWith('pol_') || i.serviceId.includes('polish'));
  const hasAquapel = selectedIds.has('prot_aquapel');
  const hasOzonation = selectedIds.has('chem_ozonation');
  const hasLeatherCare = selectedIds.has('chem_leather_care');
  const hasWax = selectedIds.has('prot_solid_wax') || selectedIds.has('prot_ceramic_coating');

  // 1. Если выбрана химчистка, но нет озонации -> рекомендуем озонацию
  if (hasInterior && !hasOzonation && tariffMap.has('chem_ozonation')) {
    const t = tariffMap.get('chem_ozonation')!;
    recommendations.push({
      serviceId: t.id,
      serviceName: t.name,
      category: t.category,
      price: t.basePrices[priceClass] || 2000,
      badge: 'Антибактериально',
      reason: 'Удалит стойкие запахи и продезинфицирует воздуховоды после химчистки',
    });
  }

  // 2. Если выбрана химчистка или сиденья, но нет консервации кожи -> рекомендуем
  if (hasInterior && !hasLeatherCare && tariffMap.has('chem_leather_care')) {
    const t = tariffMap.get('chem_leather_care')!;
    recommendations.push({
      serviceId: t.id,
      serviceName: t.name,
      category: t.category,
      price: t.basePrices[priceClass] || 4000,
      badge: 'Защита кожи',
      reason: 'Защитит очищенную кожу от заломов, пересыхания и трещин',
    });
  }

  // 3. Если выбрана полировка, но нет антидождя -> рекомендуем антидождь
  if (hasPolishing && !hasAquapel && tariffMap.has('prot_aquapel')) {
    const t = tariffMap.get('prot_aquapel')!;
    recommendations.push({
      serviceId: t.id,
      serviceName: t.name,
      category: t.category,
      price: t.basePrices[priceClass] || 3000,
      badge: 'Видимость 100%',
      reason: 'Вода и грязь слетают на скорости без работы дворников',
    });
  }

  // 4. Если выбрана полировка, но нет воска/керамики -> рекомендуем воск
  if (hasPolishing && !hasWax && tariffMap.has('prot_solid_wax')) {
    const t = tariffMap.get('prot_solid_wax')!;
    recommendations.push({
      serviceId: t.id,
      serviceName: t.name,
      category: t.category,
      price: t.basePrices[priceClass] || 7000,
      badge: 'Финишный блеск',
      reason: 'Законсервирует зеркальный глянец лака и защитит от реагентов на 6 месяцев',
    });
  }

  return recommendations.slice(0, 3);
}

/**
 * Расчёт матрицы стоимости и времени (База × Класс × Состояние)
 */
export function calculateMatrixItemPricing(
  service: ServiceItem,
  carClass: CarClass,
  isDirty: boolean,
  quantity: number = 1,
  config: {
    classMultipliers?: { S: number; M: number; L: number };
    dirtyMarkupPercent?: number;
    priceRoundStep?: number;
  } = {}
) {
  const roundStep = config.priceRoundStep ?? 100;
  const multipliers = config.classMultipliers ?? { S: 1.0, M: 1.25, L: 1.5 };
  const effectiveClass = carClass === 'OTHER' ? 'L' : carClass;
  const classMultiplier = multipliers[effectiveClass] || 1.0;

  // Базовая стоимость на класс S
  const baseS = service.basePrices?.S || 0;
  const basePriceForClass = service.basePrices?.[effectiveClass] ?? roundPrice(baseS * classMultiplier, roundStep);
  const unitPrice = roundPrice(basePriceForClass, roundStep);
  const itemTotal = unitPrice * Math.max(1, quantity);

  // Расчёт двухфазного времени с учётом класса кузова
  const activeBase = service.activeDurationMinutes ?? service.durationMinutes ?? 60;
  const cureBase = service.cureDurationMinutes ?? 0;
  const bufferBase = service.bufferMinutes ?? 15;

  // Крупный авто требует пропорционально больше времени мастера
  const activeDurationMinutes = Math.round(activeBase * classMultiplier);
  const cureDurationMinutes = cureBase; // Время сушки химического состава одинаково
  const bufferMinutes = bufferBase;
  const totalDurationMinutes = activeDurationMinutes + cureDurationMinutes + bufferMinutes;

  return {
    unitPrice,
    itemTotal,
    activeDurationMinutes,
    cureDurationMinutes,
    bufferMinutes,
    totalDurationMinutes,
  };
}

