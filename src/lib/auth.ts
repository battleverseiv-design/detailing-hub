import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from './db';

export type Role = 'admin' | 'master';

export interface SessionUser {
  id: string;
  login: string;
  name: string;
  role: Role;
}

const COOKIE_NAME = 'dh_session';
// Админ живёт дольше, мастер — на одну смену: общий телефон в боксе не должен оставаться «залогиненным» неделями.
const SESSION_TTL_MS: Record<Role, number> = {
  admin: 7 * 24 * 60 * 60 * 1000,
  master: 12 * 60 * 60 * 1000,
};

const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');

// ---------------------------------------------------------------------------
// Хранение паролей и PIN
// ---------------------------------------------------------------------------
// PIN из 4–8 цифр — это максимум 10^8 вариантов. Если утечёт дамп БД, голый bcrypt-хэш
// PIN перебирается мгновенно. Поэтому перед bcrypt значение прогоняется через HMAC с секретом
// из окружения (PIN_PEPPER): без этого секрета хэш из дампа бесполезен.
function pepper(plain: string): string {
  const key = process.env.PIN_PEPPER;
  if (!key || key.length < 32) {
    throw new Error('PIN_PEPPER не задан или короче 32 символов');
  }
  return crypto.createHmac('sha256', key).update(plain).digest('base64'); // 44 символа < лимита bcrypt в 72 байта
}

export const hashCredential = (plain: string) => bcrypt.hash(pepper(plain), 12);

/** credVersion 1 — старый хэш админа (bcrypt без pepper), 2 — текущий формат. */
export async function verifyCredential(plain: string, hash: string, credVersion: number) {
  return bcrypt.compare(credVersion >= 2 ? pepper(plain) : plain, hash);
}

// Хэш-пустышка: при несуществующем логине всё равно делаем bcrypt.compare,
// чтобы по времени ответа нельзя было перебирать список логинов.
let dummyHash: string | null = null;
async function getDummyHash() {
  if (!dummyHash) dummyHash = await bcrypt.hash('dummy-password-for-timing', 12);
  return dummyHash;
}

const WEAK_PINS = new Set(['0000', '1234', '4321', '1212', '2580', '12345', '123456', '654321', '1234567', '12345678']);

/** Политика секретов: админ — пароль, мастер — цифровой PIN. */
export function validateCredential(role: Role, plain: string): string | null {
  if (role === 'admin') {
    return plain.length >= 10 ? null : 'Пароль администратора — минимум 10 символов';
  }
  if (!/^\d{4,8}$/.test(plain)) return 'PIN должен состоять из 4–8 цифр';
  if (/^(\d)\1+$/.test(plain) || WEAK_PINS.has(plain)) return 'Слишком простой PIN';
  return null;
}

/** Случайный 6-значный PIN, проходящий политику (без 000000, 111111 и т.п.). */
export function generatePin(): string {
  for (;;) {
    const pin = crypto.randomInt(0, 1_000_000).toString().padStart(6, '0');
    if (!validateCredential('master', pin)) return pin;
  }
}

// ---------------------------------------------------------------------------
// Вход / сессии
// ---------------------------------------------------------------------------

/**
 * Одноразовая миграция: если сотрудников ещё нет, а старый AdminAccount есть,
 * создаём владельца с логином «admin» и ТЕМ ЖЕ паролем (хэш копируется как есть,
 * при первом успешном входе он будет перехэширован с pepper).
 */
export async function ensureOwner(): Promise<void> {
  if ((await prisma.staffUser.count()) > 0) return;
  const legacy = await prisma.adminAccount.findUnique({ where: { id: 'admin' } });
  if (!legacy) return;
  await prisma.staffUser
    .create({
      data: {
        login: 'admin',
        name: 'Администратор',
        role: 'admin',
        passwordHash: legacy.passwordHash,
        credVersion: 1,
      },
    })
    .catch(() => {}); // два одновременных первых входа: сработает unique(login)
}

export async function authenticate(login: string, secret: string): Promise<SessionUser | null> {
  const staff = await prisma.staffUser.findUnique({ where: { login } });
  const ok = await verifyCredential(
    secret,
    staff?.passwordHash ?? (await getDummyHash()),
    staff?.credVersion ?? 2
  );
  if (!staff || !staff.isActive || !ok) return null;

  if (staff.credVersion < 2) {
    await prisma.staffUser.update({
      where: { id: staff.id },
      data: { passwordHash: await hashCredential(secret), credVersion: 2 },
    });
  }
  return { id: staff.id, login: staff.login, name: staff.name, role: staff.role as Role };
}

export async function createSession(user: { id: string; role: Role }): Promise<void> {
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS[user.role]);

  // В БД лежит только хэш токена: утечка таблицы сессий не даёт войти в систему.
  await prisma.staffSession.create({
    data: { tokenHash: sha256(token), staffId: user.id, expiresAt },
  });

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
}

/**
 * Текущий сотрудник или null. Роль и isActive читаются из БД на КАЖДОМ запросе:
 * деактивация или смена роли действуют мгновенно, а не «когда истечёт сессия».
 */
export async function getSession(): Promise<SessionUser | null> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const session = await prisma.staffSession.findUnique({
      where: { tokenHash: sha256(token) },
      include: { staff: true },
    });
    if (!session) return null;

    if (session.expiresAt < new Date()) {
      await prisma.staffSession.delete({ where: { id: session.id } }).catch(() => {});
      return null;
    }
    if (!session.staff.isActive) return null;

    return {
      id: session.staff.id,
      login: session.staff.login,
      name: session.staff.name,
      role: session.staff.role as Role,
    };
  } catch (err) {
    console.error('getSession error:', err);
    return null;
  }
}

export async function destroySession(): Promise<void> {
  try {
    const store = await cookies();
    const token = store.get(COOKIE_NAME)?.value;
    if (token) {
      await prisma.staffSession.deleteMany({ where: { tokenHash: sha256(token) } });
      store.delete(COOKIE_NAME);
    }
  } catch (err) {
    console.error('destroySession error:', err);
  }
}

export async function destroyAllSessions(staffId: string): Promise<void> {
  await prisma.staffSession.deleteMany({ where: { staffId } });
}

/** Смена пароля/PIN сотрудника: политика по роли + завершение ВСЕХ его сессий. */
export async function changeCredential(staffId: string, role: Role, plain: string): Promise<string | null> {
  const problem = validateCredential(role, plain);
  if (problem) return problem;
  await prisma.staffUser.update({
    where: { id: staffId },
    data: { passwordHash: await hashCredential(plain), credVersion: 2 },
  });
  await destroyAllSessions(staffId);
  return null;
}

// ---------------------------------------------------------------------------
// Проверки доступа
// ---------------------------------------------------------------------------

type AuthOk = { ok: true; user: SessionUser };
type AuthFail = { ok: false; response: NextResponse };

/**
 * Единая точка проверки в API-роутах:
 *   const auth = await requireRole('admin');
 *   if (!auth.ok) return auth.response;
 *   const { user } = auth;
 */
export async function requireRole(...roles: Role[]): Promise<AuthOk | AuthFail> {
  const user = await getSession();
  const noStore = { 'Cache-Control': 'no-store' };
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Не авторизован' }, { status: 401, headers: noStore }) };
  }
  if (!roles.includes(user.role)) {
    return { ok: false, response: NextResponse.json({ error: 'Недостаточно прав' }, { status: 403, headers: noStore }) };
  }
  return { ok: true, user };
}

/** Для серверных layout/page: редирект вместо JSON. */
export async function requirePageRole(...roles: Role[]): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect('/admin/login');
  if (!roles.includes(user.role)) redirect('/admin/orders');
  return user;
}

/**
 * Защита от CSRF для мутирующих запросов (помимо SameSite=Lax):
 * браузер всегда шлёт Origin при кросс-сайтовом POST — он обязан совпасть с нашим хостом.
 */
export function assertSameOrigin(req: Request): NextResponse | null {
  const origin = req.headers.get('origin');
  if (!origin) return null;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  try {
    if (new URL(origin).host === host) return null;
  } catch {
    /* fallthrough */
  }
  return NextResponse.json({ error: 'Запрещено' }, { status: 403 });
}

/**
 * Совместимость: старый код вызывает verifyAdminSession(). Теперь это «роль admin»,
 * поэтому любой НЕпереписанный роут автоматически закрыт для мастеров (deny by default).
 */
export async function verifyAdminSession(): Promise<boolean> {
  return (await getSession())?.role === 'admin';
}
