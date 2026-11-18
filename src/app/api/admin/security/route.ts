import { NextRequest, NextResponse } from 'next/server';
import {
  assertSameOrigin,
  authenticate,
  changeCredential,
  requireRole,
} from '@/lib/auth';

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  const { user } = auth;

  try {
    const body = await req.json().catch(() => null);
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : '';
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : '';

    if (!currentPassword) {
      return NextResponse.json(
        { error: 'Введите текущий пароль' },
        { status: 400 }
      );
    }

    const valid = await authenticate(user.login, currentPassword);
    if (!valid) {
      return NextResponse.json(
        { error: 'Неверный текущий пароль' },
        { status: 401 }
      );
    }

    const problem = await changeCredential(user.id, 'admin', newPassword);
    if (problem) {
      return NextResponse.json({ error: problem }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменён. Все прежние сессии завершены. Войдите с новым паролем.',
    });
  } catch (err) {
    console.error('Password change error:', err);
    return NextResponse.json({ error: 'Ошибка смены пароля' }, { status: 500 });
  }
}
