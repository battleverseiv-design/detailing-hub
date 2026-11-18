import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { assertSameOrigin, generatePin, hashCredential, requireRole, validateCredential } from '@/lib/auth';

const LOGIN_RE = /^[a-z0-9._-]{3,32}$/;

export async function GET() {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  const staff = await prisma.staffUser.findMany({
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
    // passwordHash намеренно НЕ выбирается
    select: { id: true, login: true, name: true, phone: true, role: true, isActive: true, createdAt: true },
  });
  return NextResponse.json({ staff });
}

/** Создать МАСТЕРА. Админов через API создать нельзя: единственный владелец создаётся миграцией/seed. */
export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  const login = typeof body?.login === 'string' ? body.login.trim().toLowerCase() : '';
  const name = typeof body?.name === 'string' ? body.name.trim().slice(0, 60) : '';
  const phone = typeof body?.phone === 'string' ? body.phone.trim().slice(0, 30) : null;
  if (!LOGIN_RE.test(login)) {
    return NextResponse.json({ error: 'Логин: 3–32 символа, a-z, 0-9, точка, дефис, подчёркивание' }, { status: 400 });
  }
  if (name.length < 2) return NextResponse.json({ error: 'Укажите имя' }, { status: 400 });

  const pin = typeof body?.pin === 'string' && body.pin ? body.pin : generatePin();
  const problem = validateCredential('master', pin);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });

  try {
    const created = await prisma.staffUser.create({
      data: { login, name, phone, role: 'master', passwordHash: await hashCredential(pin), credVersion: 2 },
      select: { id: true, login: true, name: true, phone: true, role: true, isActive: true },
    });
    // PIN показывается один раз: в БД он хранится только в виде хэша
    return NextResponse.json({ success: true, staff: created, pin });
  } catch (err) {
    if ((err as { code?: string })?.code === 'P2002') {
      return NextResponse.json({ error: 'Такой логин уже занят' }, { status: 409 });
    }
    console.error('create staff error:', err);
    return NextResponse.json({ error: 'Не удалось создать сотрудника' }, { status: 500 });
  }
}
