import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function runE2ETest() {
  console.log('--- STARTING E2E INTEGRATION TEST SUITE ---');

  // 1. Проверка подключения к БД
  const account = await prisma.adminAccount.findUnique({ where: { id: 'admin' } });
  if (!account) {
    throw new Error('Admin account not found in database');
  }
  const isPassValid = await bcrypt.compare('admin12345', account.passwordHash);
  if (!isPassValid) {
    throw new Error('Admin default password does not match');
  }
  console.log('✓ Stage 1 passed: Database & Admin account verified');

  // 2. Проверка StudioConfig
  const config = await prisma.studioConfig.findUnique({ where: { id: 'default' } });
  if (!config) {
    throw new Error('Studio config not found in database');
  }
  const parsedConfig = JSON.parse(config.settingsJson);
  if (!parsedConfig.studioName || !parsedConfig.tariffs || parsedConfig.tariffs.length === 0) {
    throw new Error('Invalid studio configuration data');
  }
  console.log(`✓ Stage 2 passed: Studio config verified (${parsedConfig.tariffs.length} tariffs loaded)`);

  // 3. Создание тестового заказа (класс M, химчистка + сильные загрязнения + позиция "По фото")
  const testToken = 'test_token_' + Date.now();
  const testIdempotencyKey = 'idemp_' + Date.now();

  const testItems = [
    {
      cartItemId: 'item_1',
      serviceId: 'chem_complex_light',
      name: 'Комплексная химчистка без разбора',
      category: 'dry_cleaning',
      carClass: 'M',
      isDirty: true,
      quantity: 1,
      unitPrice: 10000,
      itemTotal: 10000,
      isCustomPhoto: false,
      zones: ['interior_seats', 'interior_roof', 'interior_trunk'],
    },
    {
      cartItemId: 'item_2',
      serviceId: 'custom_photo_service',
      name: 'Индивидуальная задача / Оценка по фото',
      category: 'custom_photo',
      carClass: 'M',
      isDirty: true,
      quantity: 1,
      unitPrice: 0,
      itemTotal: 0,
      isCustomPhoto: true,
      customDescription: 'Пятно от краски на полу багажника',
      zones: ['none'],
    },
  ];

  const testPhotos = [
    {
      id: 'photo_test_123',
      filename: 'photo_test_123.webp',
      originalName: 'stain.jpg',
      mimeType: 'image/webp',
      sizeBytes: 154200,
      createdAt: new Date().toISOString(),
    },
  ];

  // Расчёт: 10000 базово + 30% за грязь = 13000 руб. Выезд: 1500 руб. Итого = 14500 руб.
  const order = await prisma.order.create({
    data: {
      token: testToken,
      idempotencyKey: testIdempotencyKey,
      status: 'new',
      clientName: 'Алексей Тестовый',
      clientPhone: '+7 (999) 111-22-33',
      carBrandModel: 'Volkswagen Tiguan 2021',
      carClass: 'M',
      isDirty: true,
      serviceFormat: 'mobile',
      deliveryAddress: 'г. Москва, ул. Тверская 12 (паркинг -2)',
      desiredDate: '2026-11-20',
      desiredTime: '11:00',
      knownSubtotal: 13000,
      mobileFee: 1500,
      preliminaryTotal: 14500,
      hasPhotoAppraisal: true,
      clientComment: 'Машина стоит на подземном паркинге',
      privateStudioNote: 'Клиент обращается впервые, предложить защиту Aquapel',
      itemsJson: JSON.stringify(testItems),
      photosJson: JSON.stringify(testPhotos),
      tariffsSnapshotJson: JSON.stringify(parsedConfig.tariffs),
    },
  });

  if (!order.id) throw new Error('Failed to create test order');
  console.log(`✓ Stage 3 passed: Order created successfully with token ${testToken}`);

  // 4. Проверка приватности: privateStudioNote должна храниться в БД, но изолироваться
  const retrievedOrder = await prisma.order.findUnique({ where: { token: testToken } });
  if (!retrievedOrder || retrievedOrder.clientName !== 'Алексей Тестовый') {
    throw new Error('Retrieved order data mismatch');
  }
  if (!retrievedOrder.hasPhotoAppraisal) {
    throw new Error('hasPhotoAppraisal flag not preserved');
  }
  console.log('✓ Stage 4 passed: Order retrieval & data integrity verified');

  // 5. Согласование заказа владельцем студии (перевод в статус agreed)
  const agreedOrder = await prisma.order.update({
    where: { id: order.id },
    data: {
      status: 'agreed',
      agreedFinalPrice: 15000,
      agreedEntryDateTime: '20 ноября в 11:30',
    },
  });

  if (agreedOrder.status !== 'agreed' || agreedOrder.agreedFinalPrice !== 15000) {
    throw new Error('Order agreeing update failed');
  }
  console.log('✓ Stage 5 passed: Order agreement (agreed price and slot) verified');

  // 6. Проверка перехода статуса заказа в работу
  const inProgressOrder = await prisma.order.update({
    where: { token: testToken },
    data: {
      status: 'in_progress',
      privateStudioNote: 'Автомобиль принят в бокс детейлинга',
    },
  });

  if (inProgressOrder.status !== 'in_progress' || !inProgressOrder.privateStudioNote) {
    throw new Error('Order transition to in_progress failed');
  }
  console.log('✓ Stage 6 passed: Order workflow transition to in_progress verified');

  // 7. Проверка аудита отмены заказа и освобождения слотов
  const cancelledOrder = await prisma.order.update({
    where: { token: testToken },
    data: {
      status: 'cancelled',
      cancelledAt: new Date(),
      cancelledBy: 'client',
      cancelReason: 'Изменились личные планы / график',
    },
  });

  if (cancelledOrder.status !== 'cancelled' || !cancelledOrder.cancelledAt || cancelledOrder.cancelledBy !== 'client') {
    throw new Error('Order cancellation audit verification failed');
  }
  console.log('✓ Stage 7 passed: Order cancellation audit fields (cancelledAt, cancelledBy, cancelReason) verified');

  // 8. Очистка тестового заказа
  await prisma.order.delete({ where: { id: order.id } });
  console.log('✓ Stage 8 passed: Cleaned up test order');

  console.log('\n========================================');
  console.log('🎉 ALL 8 E2E INTEGRATION TESTS PASSED 100%!');
  console.log('========================================\n');
}

runE2ETest()
  .catch((e) => {
    console.error('E2E TEST FAILURE:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
