import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession, changeAdminPassword } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const isAuth = await verifyAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const { newPassword } = await req.json();

    if (!newPassword || String(newPassword).length < 6) {
      return NextResponse.json(
        { error: 'Новый пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    await changeAdminPassword(String(newPassword));
    return NextResponse.json({
      success: true,
      message: 'Пароль успешно изменён. Все прежние сессии завершены. Войдите с новым паролем.',
    });
  } catch (err: any) {
    console.error('Password change error:', err);
    return NextResponse.json({ error: 'Ошибка смены пароля' }, { status: 500 });
  }
}
