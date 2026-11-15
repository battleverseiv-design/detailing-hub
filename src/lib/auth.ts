import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './db';

const COOKIE_NAME = 'detailing_admin_session';
const SESSION_TTL_DAYS = 7;

/**
 * Создать сессию админа и вернуть токен
 */
export async function createAdminSession(): Promise<string> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.adminSession.create({
    data: {
      token,
      expiresAt,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });

  return token;
}

/**
 * Проверить сессию администратора
 */
export async function verifyAdminSession(): Promise<boolean> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (!token) {
      return false;
    }

    const session = await prisma.adminSession.findUnique({
      where: { token },
    });

    if (!session) {
      return false;
    }

    if (new Date() > session.expiresAt) {
      // Сессия истекла
      await prisma.adminSession.delete({ where: { token } }).catch(() => {});
      return false;
    }

    return true;
  } catch (err) {
    console.error('Error verifying admin session:', err);
    return false;
  }
}

/**
 * Выйти из системы (удалить текущую сессию)
 */
export async function destroyAdminSession(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;

    if (token) {
      await prisma.adminSession.delete({ where: { token } }).catch(() => {});
      cookieStore.delete(COOKIE_NAME);
    }
  } catch (err) {
    console.error('Error destroying admin session:', err);
  }
}

/**
 * Сменить пароль администратора и завершить ВСЕ существующие сессии
 */
export async function changeAdminPassword(newPasswordPlain: string): Promise<void> {
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(newPasswordPlain, salt);

  await prisma.adminAccount.upsert({
    where: { id: 'admin' },
    update: { passwordHash },
    create: { id: 'admin', passwordHash },
  });

  // Завершить все активные сессии
  await prisma.adminSession.deleteMany({});
}

/**
 * Проверить пароль при логине
 */
export async function verifyAdminPassword(plainPassword: string): Promise<boolean> {
  const account = await prisma.adminAccount.findUnique({
    where: { id: 'admin' },
  });

  if (!account) {
    return false;
  }

  return bcrypt.compare(plainPassword, account.passwordHash);
}
