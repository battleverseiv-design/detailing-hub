import { NextRequest, NextResponse } from 'next/server';
import { getAvailableSlots } from '@/lib/booking-engine';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId') || searchParams.get('slug') || 'demo';
    const serviceId = searchParams.get('serviceId') || undefined;
    const serviceIdsParam = searchParams.get('serviceIds');
    const serviceIds = serviceIdsParam ? serviceIdsParam.split(',').filter(Boolean) : undefined;
    const date = searchParams.get('date');
    const carClass = searchParams.get('carClass') || 'M';
    const workbayId = searchParams.get('workbayId') || undefined;

    if (!date) {
      return NextResponse.json(
        { error: 'Параметр date (YYYY-MM-DD) обязателен' },
        { status: 400 }
      );
    }

    const result = await getAvailableSlots({
      userIdOrSlug: userId,
      serviceId,
      serviceIds,
      dateStr: date,
      carClass,
      workbayId,
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching slots:', error);
    return NextResponse.json(
      { error: error.message || 'Ошибка сервера при расчёте слотов' },
      { status: 500 }
    );
  }
}
