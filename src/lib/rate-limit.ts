import { prisma } from './db';

const WINDOW_MS = 15 * 60 * 1000;
const MAX_PER_LOGIN = 8; // попыток на один логин за окно
const MAX_PER_IP = 20; //  попыток с одного IP за окно

export function clientIp(req: Request): string {
  // За прокси (Vercel/Netlify/nginx) берём первый адрес из x-forwarded-for.
  // Убедитесь, что ваша платформа перезаписывает этот заголовок, а не дописывает клиентский.
  const xff = req.headers.get('x-forwarded-for');
  return (xff?.split(',')[0] || req.headers.get('x-real-ip') || 'unknown').trim();
}

/**
 * Попытка записывается ДО проверки пароля. Если бы мы сначала считали, а потом записывали,
 * 100 параллельных запросов прошли бы проверку лимита одновременно.
 * При успешном входе строки удаляются (clearAttempts) — честный пользователь лимит не копит.
 */
export async function beginLoginAttempt(login: string, ip: string) {
  const [a, b] = await prisma.$transaction([
    prisma.loginAttempt.create({ data: { key: `login:${login}` } }),
    prisma.loginAttempt.create({ data: { key: `ip:${ip}` } }),
  ]);

  const since = new Date(Date.now() - WINDOW_MS);
  const [byLogin, byIp] = await Promise.all([
    prisma.loginAttempt.count({ where: { key: `login:${login}`, createdAt: { gte: since } } }),
    prisma.loginAttempt.count({ where: { key: `ip:${ip}`, createdAt: { gte: since } } }),
  ]);

  // Редкая уборка старых записей
  if (Math.random() < 0.02) {
    prisma.loginAttempt
      .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } })
      .catch(() => {});
  }

  return {
    ids: [a.id, b.id] as string[],
    blocked: byLogin > MAX_PER_LOGIN || byIp > MAX_PER_IP,
    retryAfterSec: Math.ceil(WINDOW_MS / 1000),
  };
}

export async function clearAttempts(ids: string[]): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { id: { in: ids } } });
}
