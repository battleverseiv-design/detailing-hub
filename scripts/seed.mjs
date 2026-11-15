import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEFAULT_BRAND_CONFIG = {
  studioName: 'DetailingHub | Студия Детейлинга и Химчистки',
  shortName: 'DetailingHub',
  tagline: 'Бережная глубокая химчистка салона и зеркальная полировка кузова в студии и с выездом к вашему дому',
  city: 'Москва',
  address: 'ул. Автозаводская, 23к7, бокс 12',
  phone: '+7 (999) 000-22-33',
  phoneRaw: '+79990002233',
  telegramUrl: 'https://t.me/chistiy_bort_demo',
  whatsappUrl: 'https://wa.me/79990002233',
  workHours: 'Ежедневно с 09:00 до 21:00',
  accentColor: '#0284c7',

  mobileServiceEnabled: true,
  mobileServiceTitle: 'Выезд мастера к вам',
  mobileServiceDesc: 'Мастер приедет со всем профессиональным оборудованием (экстрактор, пар, химия Koch Chemie) на ваш подземный паркинг или к дому',
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

const DEFAULT_SERVICES = [
  {
    id: 'chem_complex_light',
    name: 'Комплексная химчистка без разбора',
    category: 'dry_cleaning',
    shortDesc: 'Очистка сидений, ковролина, пластика, торпедо, дверных карт и стекол',
    fullDesc: 'Торнадор, щадящая био-химия Koch Chemie, экстракторная экстракция грязи, сушка турбо-пушкой. Без снятия сидений.',
    basePrices: { S: 8000, M: 10000, L: 13000 },
    zones: ['interior_seats', 'interior_roof', 'interior_trunk'],
    popular: true,
    badge: 'Популярно',
  },
  {
    id: 'chem_deep_disassembly',
    name: 'Глубокая химчистка с частичным разбором',
    category: 'dry_cleaning',
    shortDesc: 'Полное снятие передних сидений, мойка пола под полозьями, очистка труднодоступных мест',
    fullDesc: 'Максимальное удаление въевшейся грязи, солей, пролитых напитков и пылевых клещей. Снятие сидений с соблюдением моментов затяжки и безопасности подушек Airbag.',
    basePrices: { S: 14000, M: 17000, L: 21000 },
    zones: ['interior_seats', 'interior_roof', 'interior_trunk'],
    badge: 'Топ чистоты',
  },
  {
    id: 'chem_local_seats',
    name: 'Локальная чистка сидений',
    category: 'dry_cleaning',
    shortDesc: 'Глубокая экстракторная чистка сидений от пятен',
    fullDesc: 'Выведение локальных пятен, кофе, жира и пыли со спинок и подушек сидений.',
    basePrices: { S: 1200, M: 1500, L: 1800 },
    allowsQuantity: true,
    unitLabel: 'сиденье',
    maxQuantity: 8,
    zones: ['interior_seats'],
  },
  {
    id: 'chem_local_headliner',
    name: 'Химчистка потолка и стоек',
    category: 'dry_cleaning',
    shortDesc: 'Деликатная сухая и паровая очистка потолочной ткани без провисания',
    fullDesc: 'Используется пенная деликатная химия без избыточного увлажнения, предотвращая отклеивание и провисание обшивки потолка.',
    basePrices: { S: 3000, M: 3800, L: 4500 },
    zones: ['interior_roof'],
  },
  {
    id: 'chem_local_trunk',
    name: 'Химчистка багажного отделения',
    category: 'dry_cleaning',
    shortDesc: 'Очистка пола багажника, боковых панелей и ниши запаски',
    fullDesc: 'Удаление масляных пятен, следов грязи, песка и пыли. Чистка коврика багажника.',
    basePrices: { S: 2500, M: 3000, L: 3800 },
    zones: ['interior_trunk'],
  },
  {
    id: 'chem_ozonation',
    name: 'Озонация и нейтрализация запахов (сухой туман)',
    category: 'dry_cleaning',
    shortDesc: 'Уничтожение бактерий, плесени в воздуховодах и запаха табака',
    fullDesc: 'Генератор медицинского озона 20г/ч + ароматическая дезинфекция сухим туманом Harvard Chemical.',
    basePrices: { S: 1800, M: 2200, L: 2700 },
    zones: ['interior_seats', 'interior_roof'],
  },
  {
    id: 'chem_leather_care',
    name: 'Питание и консервация кожаного салона',
    category: 'dry_cleaning',
    shortDesc: 'Матовый крем-бальзам премиум-класса против заломов и трещин',
    fullDesc: 'Очистка пор кожи щётками из конского волоса и нанесение увлажняющего гидрофобного крема Leraton/LeTech.',
    basePrices: { S: 3500, M: 4500, L: 5500 },
    zones: ['interior_seats'],
  },
  {
    id: 'pol_light_gloss',
    name: 'Лёгкая освежающая полировка (Anti-Holo)',
    category: 'body_polishing',
    shortDesc: 'Удаление мелкой паутинки, возвращение глубокого сочного глянца',
    fullDesc: 'Одношаговая полировка эксцентриковыми машинками Rupes с мягким кругом. Безопасно для толщины лака.',
    basePrices: { S: 9000, M: 11000, L: 14000 },
    zones: ['body_paint'],
    popular: true,
  },
  {
    id: 'pol_deep_restore',
    name: 'Восстановительная абразивная полировка',
    category: 'body_polishing',
    shortDesc: 'Удаление до 90% царапин, притёртостей и рисок',
    fullDesc: 'Трёхшаговая коррекция лака (тяжёлая паста + финиш + антиголограмма). Идеальная гладкость зеркала.',
    basePrices: { S: 18000, M: 22000, L: 27000 },
    zones: ['body_paint'],
    badge: 'Зеркало',
  },
  {
    id: 'pol_headlights',
    name: 'Глубокая полировка фар (пара)',
    category: 'body_polishing',
    shortDesc: 'Восстановление прозрачности и яркости светового пучка',
    fullDesc: 'Шлифовка помутневшего верхнего слоя поликарбоната и финишная полировка в глянец.',
    basePrices: { S: 2500, M: 2500, L: 2500 },
    zones: ['lights_glass'],
  },
  {
    id: 'wash_engine_bay',
    name: 'Детейлинг подкапотного пространства с консервацией',
    category: 'body_polishing',
    shortDesc: 'Диэлектрическая мойка сухим паром + защитный антистатический консервант',
    fullDesc: 'Безопасная мойка спецсоставами Koch Motorplast. Защита проводки от окисления и влаги, благородный матовый вид под капотом.',
    basePrices: { S: 3500, M: 4000, L: 4800 },
    zones: ['engine_bay'],
  },
  {
    id: 'prot_aquapel',
    name: 'Антидождь премиум (Лобовое + передние стёкла)',
    category: 'protection_packages',
    shortDesc: 'Капли слетают на скорости от 50 км/ч, щетки почти не нужны',
    fullDesc: 'Глубокая очистка стекла пастой с оксидом церия + оригинальный гидрофобный состав Aquapel (срок действия до 8-12 месяцев).',
    basePrices: { S: 2500, M: 3000, L: 3500 },
    zones: ['lights_glass'],
    popular: true,
  },
  {
    id: 'prot_solid_wax',
    name: 'Покрытие твёрдым воском / жидким стеклом',
    category: 'protection_packages',
    shortDesc: 'Глубокий мокрый блеск и водоотталкивающий эффект на 3-6 месяцев',
    fullDesc: 'Карнаубский воск премиум-класса Fusso Coat или жидкое стекло Willson Body Glass Guard.',
    basePrices: { S: 6000, M: 7500, L: 9000 },
    zones: ['body_paint'],
  },
  {
    id: 'prot_ceramic_coating',
    name: 'Керамическое покрытие 2+1 (2 слоя базы + гидрофоб)',
    category: 'protection_packages',
    shortDesc: 'Защита от реагентов, птичьего помёта, выгорания и мощнейший гидрофоб',
    fullDesc: 'Нанесение керамического состава 9H (Krytex / Everglass). В стоимость входит обезжиривание и межслойная сушка ИК-лампами.',
    basePrices: { S: 25000, M: 30000, L: 37000 },
    zones: ['body_paint'],
    badge: 'Максимум',
  },
  {
    id: 'package_pre_sale',
    name: 'Комплекс «Предпродажная подготовка»',
    category: 'protection_packages',
    shortDesc: 'Комплекс: химчистка салона + лёгкая полировка + антидождь + мойка мотора',
    fullDesc: 'Позволяет продать автомобиль на 10-15% дороже. Включает комплексную чистку салона, полировку кузова, чернение резины и чистку подкапотного пространства.',
    basePrices: { S: 21000, M: 25000, L: 30000 },
    zones: ['interior_seats', 'interior_roof', 'body_paint', 'lights_glass', 'engine_bay'],
    badge: 'Выгода 25%',
  },
  {
    id: 'custom_photo_service',
    name: 'Индивидуальная задача / Оценка по фото',
    category: 'custom_photo',
    shortDesc: 'Нестандартное авто, сильные загрязнения, локальный окрас, чистка после животных',
    fullDesc: 'Опишите задачу и приложите фото. Мастер свяжется с вами и назовёт точную стоимость и сроки.',
    basePrices: { S: 0, M: 0, L: 0 },
    zones: ['none'],
    isCustomPhoto: true,
  },
];

async function main() {
  console.log('Seeding initial data...');

  // 1. Создать/обновить пароль администратора (по умолчанию: admin12345)
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('admin12345', salt);

  await prisma.adminAccount.upsert({
    where: { id: 'admin' },
    update: { passwordHash },
    create: {
      id: 'admin',
      passwordHash,
    },
  });
  console.log('Admin account initialized: login with password "admin12345"');

  // 2. Создать/обновить StudioConfig
  const fullConfig = {
    ...DEFAULT_BRAND_CONFIG,
    tariffs: DEFAULT_SERVICES,
  };

  await prisma.studioConfig.upsert({
    where: { id: 'default' },
    update: {
      settingsJson: JSON.stringify(fullConfig),
    },
    create: {
      id: 'default',
      settingsJson: JSON.stringify(fullConfig),
    },
  });
  console.log('Studio configuration and tariffs initialized.');

  // 3. Создать/обновить Master / Tenant для модуля онлайн-записи
  const demoUser = await prisma.user.upsert({
    where: { slug: 'demo' },
    update: {
      name: 'DetailingHub (Мастер Иван)',
      email: 'master@detailinghub.ru',
      phone: '+7 (999) 000-22-33',
      timezone: 'Europe/Moscow',
    },
    create: {
      id: 'demo-master-id',
      slug: 'demo',
      name: 'DetailingHub (Мастер Иван)',
      email: 'master@detailinghub.ru',
      phone: '+7 (999) 000-22-33',
      timezone: 'Europe/Moscow',
    },
  });

  // Услуги мастера
  const demoServices = [
    { id: 'srv-dry-clean', title: 'Комплексная химчистка салона', durationMinutes: 180, bufferMinutes: 30, price: 10000, description: 'Глубокая экстракция сидений, ковролина, потолка и сушка турбо-пушкой' },
    { id: 'srv-polish', title: 'Восстановительная полировка кузова', durationMinutes: 240, bufferMinutes: 30, price: 16000, description: 'Устранение до 90% царапин, голограмм и зеркальный финиш' },
    { id: 'srv-anti-rain', title: 'Нанесение антидождя (полусфера)', durationMinutes: 60, bufferMinutes: 15, price: 3000, description: 'Гидрофобное покрытие Aquapel / Krytex на лобовое и передние стёкла' },
    { id: 'srv-leather', title: 'Очистка и консервация кожи', durationMinutes: 90, bufferMinutes: 15, price: 5000, description: 'Матовый крем-бальзам Koch Chemie против заломов и сухости' }
  ];

  for (const s of demoServices) {
    await prisma.service.upsert({
      where: { id: s.id },
      update: { ...s, userId: demoUser.id, isActive: true },
      create: { ...s, userId: demoUser.id, isActive: true },
    });
  }

  // Базовый график работы (Пн - Вс с 09:00 до 21:00)
  for (let day = 0; day <= 6; day++) {
    await prisma.availability.upsert({
      where: { userId_dayOfWeek: { userId: demoUser.id, dayOfWeek: day } },
      update: { startTime: '09:00', endTime: '21:00', isWorkingDay: true },
      create: { userId: demoUser.id, dayOfWeek: day, startTime: '09:00', endTime: '21:00', isWorkingDay: true },
    });
  }
  console.log('Demo master booking profile & services initialized (slug: "demo").');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
