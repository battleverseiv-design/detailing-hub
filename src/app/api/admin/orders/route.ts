import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  const isAuth = await verifyAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  try {
    const search = req.nextUrl.searchParams.get('search') || '';
    const status = req.nextUrl.searchParams.get('status') || '';

    const where: any = {};

    if (status && status !== 'all') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { clientName: { contains: search } },
        { clientPhone: { contains: search } },
        { carBrandModel: { contains: search } },
        { carLicensePlate: { contains: search } },
        { id: { contains: search } },
      ];
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        booking: {
          include: { workbay: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const parsedOrders = orders.map((o) => ({
      ...o,
      items: JSON.parse(o.itemsJson || '[]'),
      photos: JSON.parse(o.photosJson || '[]'),
      tariffsSnapshot: JSON.parse(o.tariffsSnapshotJson || '{}'),
      damages: JSON.parse(o.damagesJson || '[]'),
      inspectionPhotosBefore: JSON.parse(o.inspectionPhotosBeforeJson || '[]'),
      inspectionPhotosAfter: JSON.parse(o.inspectionPhotosAfterJson || '[]'),
    }));

    return NextResponse.json(parsedOrders);
  } catch (err: any) {
    console.error('Error fetching admin orders:', err);
    return NextResponse.json({ error: 'Ошибка получения заказов' }, { status: 500 });
  }
}
