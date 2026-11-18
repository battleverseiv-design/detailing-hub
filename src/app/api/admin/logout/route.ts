import { NextRequest, NextResponse } from 'next/server';
import { assertSameOrigin, destroySession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const csrf = assertSameOrigin(req);
  if (csrf) return csrf;

  await destroySession();
  return NextResponse.json({ success: true });
}
