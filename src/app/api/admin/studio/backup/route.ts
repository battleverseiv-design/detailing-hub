import { NextRequest, NextResponse } from 'next/server';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(_req: NextRequest) {
  const auth = await requireRole('admin');
  if (!auth.ok) return auth.response;

  try {
    const [orders, studioConfig, workbays, services, bookings, availabilities, dateOverrides] = await Promise.all([
      prisma.order.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.studioConfig.findUnique({ where: { id: 'default' } }),
      prisma.workbay.findMany({ orderBy: { order: 'asc' } }),
      prisma.service.findMany({ orderBy: { createdAt: 'desc' } }),
      prisma.booking.findMany({ orderBy: { startAt: 'desc' } }),
      prisma.availability.findMany({ orderBy: { dayOfWeek: 'asc' } }),
      prisma.dateOverride.findMany({ orderBy: { date: 'asc' } }),
    ]);

    const backupData = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      studioConfig: studioConfig ? JSON.parse(studioConfig.settingsJson) : null,
      workbays,
      services,
      availabilities,
      dateOverrides,
      bookingsCount: bookings.length,
      bookings,
      ordersCount: orders.length,
      orders: orders.map((o) => ({
        ...o,
        items: JSON.parse(o.itemsJson || '[]'),
        photos: JSON.parse(o.photosJson || '[]'),
        damages: JSON.parse(o.damagesJson || '[]'),
        inspectionPhotosBefore: JSON.parse(o.inspectionPhotosBeforeJson || '[]'),
        inspectionPhotosAfter: JSON.parse(o.inspectionPhotosAfterJson || '[]'),
        tariffsSnapshot: JSON.parse(o.tariffsSnapshotJson || '{}'),
      })),
    };

    const filename = `detailinghub-backup-${new Date().toISOString().slice(0, 10)}.json`;

    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    console.error('Backup export error:', err);
    return NextResponse.json({ error: 'Ошибка выгрузки бэкапа' }, { status: 500 });
  }
}
