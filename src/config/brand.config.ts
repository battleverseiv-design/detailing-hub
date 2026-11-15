/**
 * ЕДИНЫЙ КОНФИГ БРЕНДИРОВАНИЯ И СТАРТОВЫХ НАСТРОЕК
 * 
 * Значения отсюда используются как базовые (default), а также могут
 * переопределяться в реальном времени из админ-панели владельца (/admin/studio).
 */

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
  telegramBotToken?: string;
  telegramChatId?: string;
  telegramApiUrl?: string; // Прокси или альтернативный URL API Telegram
  currency: string; // "₽"
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

  // Блок преимуществ на главной (Bento Grid)
  bentoFeatures?: BentoFeature[];

  // Интерактивный слайдер До/После
  beforeAfterItems?: BeforeAfterItem[];

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
  telegramBotToken: '',
  telegramChatId: '',
  currency: '₽',
  workHours: 'Ежедневно с 09:00 до 21:00',
  accentColor: '#0284c7',

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

  // Карточки преимуществ (Bento Grid)
  bentoFeatures: [
    {
      id: 'bento_chemistry',
      title: 'Немецкая премиум-автохимия',
      subtitle: 'Koch Chemie, Detail, Gyeon',
      description: 'Безопасные биоразлагаемые pH-нейтральные составы. Бережно к коже, велюру, алькантаре и лаку без едкого запаха.',
      badge: 'Премиум',
      icon: 'sparkles',
      active: true,
    },
    {
      id: 'bento_light',
      title: 'Инспекционный свет CRI 95+',
      subtitle: 'Софиты с чистым дневным спектром',
      description: 'Видим каждую микрориску, паутинку и голограмму. Исключаем появление пятен и пропусков при выдаче.',
      badge: 'Точность',
      icon: 'light',
      active: true,
    },
    {
      id: 'bento_boxes',
      title: 'Закрытые тёплые боксы',
      subtitle: 'Климат-контроль и обеспыливание',
      description: 'Керамика 9H и полиуретановые бронепленки кристаллизуются при строго заданной температуре и влажности.',
      badge: 'Стерильность',
      icon: 'shield',
      active: true,
    },
    {
      id: 'bento_warranty',
      title: 'Честная гарантия студии',
      subtitle: 'Электронный акт и фотофиксация',
      description: 'Гарантия на гидрофоб и защитные покрытия. Бесплатный контрольный осмотр через 14 дней после работ.',
      badge: 'Гарантия',
      icon: 'warranty',
      active: true,
    },
  ],

  // Слайдер «До и После»
  beforeAfterItems: [
    {
      id: 'body_polishing',
      title: 'Восстановительная полировка и керамика',
      description: 'Удаление 95% круговых царапин-паутинок, глубокий мокрый глянец и мощный гидрофобный щит.',
      beforeImage: '/images/before-after/body_before.jpg?v=orig',
      afterImage: '/images/before-after/body_after.jpg?v=orig',
      beforeLabel: 'До полировки',
      afterLabel: 'После керамики 9H',
    },
    {
      id: 'interior_leather',
      title: 'Глубокая химчистка премиум-кожи',
      description: 'Очистка пор от въевшегося жира и пота. Восстановление заводской матовой бархатистой текстуры.',
      beforeImage: '/images/before-after/interior_before.jpg?v=v4',
      afterImage: '/images/before-after/interior_after.jpg?v=v4',
      beforeLabel: 'До чистки',
      afterLabel: 'После кондиционера',
    },
  ],

  mobileServiceEnabled: true,
  mobileServiceTitle: 'Выезд мастера к вам',
  mobileServiceDesc: 'Мастер приедет со всем профессиональным оборудованием (экстрактор, пар, автохимия Koch Chemie / Detail) на ваш подземный паркинг или к дому',
  mobileServicePrice: 1500,

  minOrderAmount: 3000,
  dirtyCarMarkupPercent: 30,

  showMasterTooltips: true,
};
