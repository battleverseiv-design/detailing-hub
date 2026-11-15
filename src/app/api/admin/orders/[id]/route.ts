import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';
import { deletePhotoFile } from '@/lib/storage';
import { OrderPhoto } from '@/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await verifyAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id } });
  if (!order) {
    return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
  }

  return NextResponse.json({
    ...order,
    items: JSON.parse(order.itemsJson || '[]'),
    photos: JSON.parse(order.photosJson || '[]'),
    tariffsSnapshot: JSON.parse(order.tariffsSnapshotJson || '{}'),
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await verifyAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { status, agreedFinalPrice, agreedEntryDateTime, privateStudioNote } = body;

  // Если статус переводится в "agreed", проверяем обязательность согласованной цены и даты
  if (status === 'agreed') {
    if (agreedFinalPrice == null || isNaN(Number(agreedFinalPrice))) {
      return NextResponse.json(
        { error: 'Для перевода в статус «Согласована» необходимо указать согласованную итоговую цену' },
        { status: 400 }
      );
    }
    if (!agreedEntryDateTime || !String(agreedEntryDateTime).trim()) {
      return NextResponse.json(
        { error: 'Для перевода в статус «Согласована» необходимо указать дату и время заезда авто' },
        { status: 400 }
      );
    }
  }

  try {
    const updated = await prisma.order.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(agreedFinalPrice !== undefined ? { agreedFinalPrice: Number(agreedFinalPrice) } : {}),
        ...(agreedEntryDateTime !== undefined ? { agreedEntryDateTime: String(agreedEntryDateTime).trim() } : {}),
        ...(privateStudioNote !== undefined ? { privateStudioNote: String(privateStudioNote) } : {}),
      },
    });

    return NextResponse.json({
      success: true,
      order: {
        ...updated,
        items: JSON.parse(updated.itemsJson || '[]'),
        photos: JSON.parse(updated.photosJson || '[]'),
      },
    });
  } catch (err: any) {
    console.error('Error updating order:', err);
    return NextResponse.json({ error: 'Ошибка обновления заказа' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isAuth = await verifyAdminSession();
  if (!isAuth) {
    return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });
  }

  const { id } = await params;

  try {
    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) {
      return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });
    }

    // Удаляем связанные фото с диска
    const photos: OrderPhoto[] = JSON.parse(order.photosJson || '[]');
    for (const photo of photos) {
      if (photo.id) {
        await deletePhotoFile(photo.id);
      }
    }

    await prisma.order.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Error deleting order:', err);
    return NextResponse.json({ error: 'Ошибка удаления заказа' }, { status: 500 });
  }
}
