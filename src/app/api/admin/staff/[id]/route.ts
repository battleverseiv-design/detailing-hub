import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assertSameOrigin, changeCredential, destroyAllSessions, generatePin, requireRole } from '@/lib/auth';

/**
 * Изменить мастера: имя/телефон, активность, сброс PIN. Удаления нет — только деактивация
 * (иначе ломаются ссылки из заказов и журнала).
 * Body: { name?, phone?, isActive?, newPin?: string, resetPin?: true }
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;
  const { id } = await params;

  // Через этот роут правятся ТОЛЬКО мастера. Пароль админа меняется на странице «Безопасность».
  const target = await prisma.staffUser.findFirst({ where: { id, role: 'master' } });
  if (!target) return NextResponse.json({ error: 'Мастер не найден' }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Некорректный запрос' }, { status: 400 });

  const data: { name?: string; phone?: string | null; isActive?: boolean } = {};
  if (typeof body.name === 'string' && body.name.trim().length >= 2) data.name = body.name.trim().slice(0, 60);
  if (typeof body.phone === 'string') data.phone = body.phone.trim().slice(0, 30) || null;
  if (typeof body.isActive === 'boolean') data.isActive = body.isActive;

  if (Object.keys(data).length > 0) {
    await prisma.staffUser.update({ where: { id }, data });
  }
  // Отключённый сотрудник теряет доступ немедленно (getSession проверяет isActive), а сессии ещё и удаляем.
  if (data.isActive === false) await destroyAllSessions(id);

  if (body.resetPin === true || typeof body.newPin === 'string') {
    const pin: string = typeof body.newPin === 'string' && body.newPin ? body.newPin : generatePin();
    const problem = await changeCredential(id, 'master', pin);
    if (problem) return NextResponse.json({ error: problem }, { status: 400 });
    // Сгенерированный PIN показывается один раз; заданный вручную обратно не возвращаем
    return NextResponse.json({ success: true, ...(body.resetPin === true ? { pin } : {}) });
  }

  return NextResponse.json({ success: true });
}
