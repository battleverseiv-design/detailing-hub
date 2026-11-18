import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin, requireRole } from '@/lib/auth';
import { getStudioSettings, saveStudioSettings } from '@/lib/studio-service';

export async function GET() {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  const settings = await getStudioSettings();
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const updated = await saveStudioSettings(body);
    return NextResponse.json({ success: true, settings: updated });
  } catch (err) {
    console.error('Error saving studio settings:', err);
    return NextResponse.json({ error: 'Ошибка сохранения настроек' }, { status: 500 });
  }
}
