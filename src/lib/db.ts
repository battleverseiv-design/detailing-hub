import { PrismaClient } from '@prisma/client';

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

export const prisma =
  globalThis.prismaGlobal ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Оптимизация SQLite для многопоточных и конкурентных запросов:
// WAL (Write-Ahead Logging) предотвращает блокировки при параллельном чтении и записи
// busy_timeout = 5000 дает пулу 5 секунд на ожидание освобождения базы вместо падения с SQLITE_BUSY
prisma.$queryRawUnsafe('PRAGMA journal_mode = WAL;')
  .then(() => prisma.$queryRawUnsafe('PRAGMA busy_timeout = 5000;'))
  .catch((err) => {
    // Безопасный перехват в средах, где PRAGMA не поддерживается или БД еще не инициализирована
    if (process.env.NODE_ENV === 'development') {
      console.warn('[SQLite PRAGMA Init]:', err?.message || err);
    }
  });

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prisma;
}
