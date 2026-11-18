import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin, authenticate, createSession, ensureOwner } from '@/lib/auth';
import { beginLoginAttempt, clearAttempts, clientIp } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  try {
    const body = await req.json().catch(() => null);
    const login = typeof body?.login === 'string' ? body.login.trim().toLowerCase().slice(0, 64) : '';
    const secret = typeof body?.secret === 'string' ? body.secret.slice(0, 200) : '';
    if (!login || !secret) {
      return NextResponse.json({ error: 'Введите логин и пароль (или PIN)' }, { status: 400 });
    }

    await ensureOwner();

    // Попытка фиксируется ДО проверки пароля (см. rate-limit.ts)
    const attempt = await beginLoginAttempt(login, clientIp(req));
    if (attempt.blocked) {
      return NextResponse.json(
        { error: 'Слишком много попыток. Попробуйте позже.' },
        { status: 429, headers: { 'Retry-After': String(attempt.retryAfterSec) } }
      );
    }

    const user = await authenticate(login, secret);
    if (!user) {
      // Одно и то же сообщение для «нет такого логина», «неверный пароль» и «сотрудник отключён»
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
    }

    await clearAttempts(attempt.ids);
    await createSession(user);
    return NextResponse.json({ success: true, role: user.role, name: user.name });
  } catch (err) {
    console.error('Login error:', err);
    return NextResponse.json({ error: 'Ошибка авторизации' }, { status: 500 });
  }
}
