/**
 * ЕДИНЫЙ КОНФИГ БРЕНДИРОВАНИЯ И СТАРТОВЫХ НАСТРОЕК
 * 
 * Легко адаптируется под любую студию детейлинга или частного мастера за 2 минуты.
 * Значения отсюда используются как базовые (default), а также могут
 * переопределяться в реальном времени из админ-панели владельца (/admin/studio).
 */

export interface BrandConfig {
  studioName: string;
  shortName: string;
  tagline: string;
  city: string;
  address: string;
  phone: string;
  phoneRaw: string;
  telegramUrl: string;
  whatsappUrl: string;
  workHours: string;
  accentColor: string;
  
  // Условия обслуживания
  mobileServiceEnabled: boolean;
  mobileServiceTitle: string;
  mobileServiceDesc: string;
  mobileServicePrice: number; // Стоимость выезда (руб)
  
  // Правила расчёта
  minOrderAmount: number; // Минимальный чек работ (руб)
  dirtyCarMarkupPercent: number; // Надбавка за сильные загрязнения / шерсть (%)
  
  // Мини-игра на экране успеха
  game: {
    mode: 'off' | 'fun' | 'bonus'; // 3 режима владельца
    bonusText: string;
    bonusDiscountRub: number;
    bonusPromoPrefix: string;
    bonusValidityDays: number;
    bonusMinOrderRub: number;
  };

  // Множители классов авто и округление
  classMultipliers: {
    S: number;
    M: number;
    L: number;
  };
  priceRoundStep: number; // Шаг округления: 0, 50, 100, 500

  // Категории каталога
  categories: {
    id: string;
    name: string;
    order: number;
  }[];

  // Интерфейсные подсказки мастера
  showMasterTooltips: boolean;
}

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  studioName: 'DetailingHub | Студия Детейлинга и Химчистки',
  shortName: 'DetailingHub',
  tagline: 'Бережная глубокая химчистка салона и зеркальная полировка кузова в студии и с выездом к вашему дому',
  city: 'Москва',
  address: 'ул. Автозаводская, 23к7, бокс 12',
  phone: '+7 (999) 000-22-33',
  phoneRaw: '+79990002233',
  telegramUrl: 'https://t.me/detailinghub_demo',
  whatsappUrl: 'https://wa.me/79990002233',
  workHours: 'Ежедневно с 09:00 до 21:00',
  accentColor: '#0284c7', // Премиальный небесно-аквамариновый цвет

  classMultipliers: {
    S: 1.0,
    M: 1.25,
    L: 1.5,
  },
  priceRoundStep: 100,

  categories: [
    { id: 'packages', name: 'Комплексы', order: 1 },
    { id: 'interior', name: 'Химчистка', order: 2 },
    { id: 'exterior', name: 'Кузов и защита', order: 3 },
  ],

  mobileServiceEnabled: true,
  mobileServiceTitle: 'Выезд мастера к вам',
  mobileServiceDesc: 'Мастер приедет со всем профессиональным оборудованием (экстрактор, пар, автохимия Koch Chemie / Detail) на ваш подземный паркинг или к дому',
  mobileServicePrice: 1500,

  minOrderAmount: 3000,
  dirtyCarMarkupPercent: 30,

  game: {
    mode: 'bonus',
    bonusText: 'Антидождь на лобовое стекло в подарок или скидка 500 ₽',
    bonusDiscountRub: 500,
    bonusPromoPrefix: 'CLEAN',
    bonusValidityDays: 30,
    bonusMinOrderRub: 4000,
  },

  showMasterTooltips: true,
};
