import { BrandConfig } from '@/config/brand.config';

export type CarClass = 'S' | 'M' | 'L' | 'OTHER';

export type ServiceCategory = 
  | 'packages'            // Комплексы
  | 'interior'            // Салон
  | 'exterior'            // Кузов
  | 'dry_cleaning'        // Обратная совместимость
  | 'body_polishing'      // Обратная совместимость
  | 'protection_packages' // Обратная совместимость
  | 'custom_photo'        // Оценка по фото
  | (string & {});

export interface CategoryDefinition {
  id: string;
  name: string;
  order: number;
}

export type ServiceZone = 
  | 'interior_seats'  // Сиденья и пол
  | 'interior_roof'   // Потолок и стойки
  | 'interior_trunk'  // Багажное отделение
  | 'body_paint'      // Кузов и ЛКП
  | 'lights_glass'    // Стёкла и фары
  | 'engine_bay'      // Моторный отсек
  | 'none';

export interface ServiceItem {
  id: string;
  name: string;
  category: ServiceCategory;
  shortDesc: string;
  fullDesc: string;
  basePrices: {
    S: number;
    M: number;
    L: number;
  };
  allowsQuantity?: boolean;
  unitLabel?: string; // напр. "сиденье", "элемент"
  maxQuantity?: number;
  zones: ServiceZone[];
  isCustomPhoto?: boolean;
  popular?: boolean;
  badge?: string;
  isPackage?: boolean;           // Комплексный пакет "все включено"
  includedServiceIds?: string[]; // ID услуг, входящих в этот комплекс
  order?: number;                // Порядок сортировки (Drag & Drop)
  recommendInCart?: boolean;     // Рекомендовать в корзине перед чекаутом (Апсейл)

  // Двухфазные слоты и посты (Workbays)
  durationMinutes?: number;
  activeDurationMinutes?: number; // Активная работа мастера
  cureDurationMinutes?: number;   // Сушка / кристаллизация (бокс занят, мастер свободен)
  bufferMinutes?: number;         // Буфер между заездами
  requiredBayType?: string;       // wet, dry, cure, any
  requiredServiceIds?: string[];  // Зависимости услуг (например, полировка перед керамикой)
}

export interface CartItem {
  cartItemId: string; // уникальный ID в корзине
  serviceId: string;
  name: string;
  category: ServiceCategory;
  carClass: CarClass;
  isDirty: boolean;
  quantity: number;
  unitPrice: number;
  itemTotal: number;
  isCustomPhoto: boolean;
  customDescription?: string;
  zones: ServiceZone[];
}

export interface PricingSummary {
  itemsSubtotal: number;       // Базовая сумма работ без надбавок
  dirtyMarkupAmount: number;   // Сумма надбавки за загрязнения
  subtotalWithDirty: number;   // Сумма работ с учетом загрязнений
  minOrderAmount: number;      // Порог минимального заказа
  minOrderDeficit: number;     // Сколько добавлено для дотягивания до минимума
  workTotal: number;           // Итоговая сумма за работы (с учетом минимума)
  serviceFormat: 'studio' | 'mobile';
  mobileFee: number;           // Фиксированная доплата за выезд (поверх работ)
  preliminaryTotal: number;    // Финальная предварительная сумма
  hasPhotoAppraisal: boolean;  // Есть ли позиции "По фото"
  displayTotalFormatted: string; // "8 400 ₽" или "от 8 400 ₽ + оценка по фото" или "По фото"
}

export interface OrderPhoto {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface VehicleDamage {
  id: string;
  zone: string;
  type: string; // 'scratch' | 'chip' | 'dent' | 'scuff' | 'repaint' | 'crack' | 'wear'
  description?: string;
  severity?: 'low' | 'medium' | 'high';
}

export interface InspectionPhoto {
  id: string;
  filename?: string;
  url?: string;
  zone?: string;
  description?: string;
  createdAt?: string;
}

export interface OrderRecord {
  id: string;
  token: string;
  idempotencyKey?: string | null;
  status: 'new' | 'agreed' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;

  clientName: string;
  clientPhone: string;
  carBrandModel: string;
  carClass: CarClass;
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
  items: CartItem[];
  photos: OrderPhoto[];
  tariffsSnapshot: Record<string, any>;

  // Боксы и запись
  bookingId?: string | null;

  // Автомобиль и цифровой акт
  carVin?: string | null;
  carLicensePlate?: string | null;
  mileage?: number | null;
  fuelLevel?: number | null;
  damagesJson?: string;
  inspectionPhotosBeforeJson?: string;
  inspectionPhotosAfterJson?: string;
  clientSignatureUrl?: string | null;
  masterSignatureUrl?: string | null;
  actCompletedAt?: string | null;

  // Финансы, P&L и оплата
  suppliesCostRub?: number;
  masterCommissionPct?: number;
  masterPayoutRub?: number;
  netProfitRub?: number;
  isPaid?: boolean;
  paymentMethod?: 'cash' | 'card' | 'sbp' | string;
}

export interface BentoFeature {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  badge?: string;
  icon?: string;
  active: boolean;
}

export interface BeforeAfterItem {
  id: string;
  title: string;
  description: string;
  beforeImage: string;
  afterImage: string;
  beforeLabel?: string;
  afterLabel?: string;
}

export interface StudioSettings extends BrandConfig {
  tariffs: ServiceItem[];
}
