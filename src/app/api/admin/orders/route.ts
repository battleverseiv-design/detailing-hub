import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { requireRole } from '@/lib/auth';
import { prisma } from '@/lib/db';
import {
  MASTER_VISIBLE_STATUSES,
  masterOrderWhere,
  serializeOrderForAdmin,
  serializeOrderForMaster,
} from '@/lib/permissions';

export async function GET(req: NextRequest) {
  const auth = await requireRole('admin', 'master');
  if (!auth.ok) return auth.response;
  const { user } = auth;

  try {
    const search = req.nextUrl.searchParams.get('search') || '';
    const status = req.nextUrl.searchParams.get('status') || '';

    let where: Prisma.OrderWhereInput;

    if (user.role === 'master') {
      if (status && status !== 'all' && !MASTER_VISIBLE_STATUSES.includes(status)) {
        return NextResponse.json([]);
      }
      where = {
        ...masterOrderWhere(user.id),
        ...(status && status !== 'all' ? { status } : {}),
      };
    } else {
      where = status && status !== 'all' ? { status } : {};
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        booking: {
          include: { workbay: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const serialized =
      user.role === 'admin'
        ? orders.map((o) => ({
            ...serializeOrderForAdmin(o),
            tariffsSnapshot: (() => {
              try {
                return JSON.parse(o.tariffsSnapshotJson || '{}');
              } catch {
                return {};
              }
            })(),
          }))
        : orders.map((o) => serializeOrderForMaster(o, user.id));

    // Регистронезависимый поиск в JS (SQLite LIKE чувствителен к регистру кириллицы)
    const filteredOrders = search
      ? serialized.filter((o) => {
          const s = search.trim().toLowerCase();
          return (
            (o.clientName && o.clientName.toLowerCase().includes(s)) ||
            (o.clientPhone && o.clientPhone.toLowerCase().includes(s)) ||
            (o.carBrandModel && o.carBrandModel.toLowerCase().includes(s)) ||
            (o.carLicensePlate && o.carLicensePlate.toLowerCase().includes(s)) ||
            (o.id && o.id.toLowerCase().includes(s))
          );
        })
      : serialized;

    return NextResponse.json(filteredOrders);
  } catch (err) {
    console.error('Error fetching admin orders:', err);
    return NextResponse.json({ error: 'Ошибка получения заказов' }, { status: 500 });
  }
}
