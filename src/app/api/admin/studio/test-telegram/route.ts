import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin, requireRole } from '@/lib/auth';
import { testTelegramConnection } from '@/lib/telegram';

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const { token, chatId, apiUrl } = body;

    const result = await testTelegramConnection(token, chatId, apiUrl);
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: result.message });
  } catch {
    return NextResponse.json({ error: 'Ошибка отправки' }, { status: 500 });
  }
}
