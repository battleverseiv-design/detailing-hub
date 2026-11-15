import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getStudioSettings } from '@/lib/studio-service';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    if (!token) {
      return NextResponse.json({ error: 'Не указан токен' }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { token },
    });

    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    // Если промокод уже выдан ранее
    if (order.miniGameBonusCode) {
      return NextResponse.json({
        success: true,
        bonusCode: order.miniGameBonusCode,
        alreadyClaimed: true,
      });
    }

    const settings = await getStudioSettings();
    const prefix = settings.game.bonusPromoPrefix || 'CLEAN';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const newBonusCode = `${prefix}-${randomSuffix}`;

    await prisma.order.update({
      where: { token },
      data: {
        miniGamePlayed: true,
        miniGameBonusCode: newBonusCode,
      },
    });

    return NextResponse.json({
      success: true,
      bonusCode: newBonusCode,
      bonusText: settings.game.bonusText,
      validityDays: settings.game.bonusValidityDays,
      minOrderRub: settings.game.bonusMinOrderRub,
    });
  } catch (err: any) {
    console.error('Error claiming game bonus:', err);
    return NextResponse.json(
      { error: 'Ошибка фиксации промокода' },
      { status: 500 }
    );
  }
}
