import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { getStudioSettings, saveStudioSettings } from '@/lib/studio-service';

export async function GET() {
  const isAuth = await verifyAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const settings = await getStudioSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const isAuth = await verifyAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const updated = await saveStudioSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err: any) {
    console.error('Error saving studio settings:', err);
    return NextResponse.json({ error: 'Ошибка сохранения настроек' }, { status: 500 });
  }
}
