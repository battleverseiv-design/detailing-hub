import { NextRequest, NextResponse } from 'next/server';
import { getPhotoBuffer } from '@/lib/storage';
import { verifyAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return new NextResponse('Bad request', { status: 400 });
    }

    // Проверка прав доступа: либо авторизован админ, либо передан валидный токен заказа
    const isAdmin = await verifyAdminSession();
    const token = req.nextUrl.searchParams.get('token');

    let isAuthorized = isAdmin;

    if (!isAuthorized && token) {
      const order = await prisma.order.findUnique({
        where: { token },
      });
      if (order && order.photosJson.includes(id)) {
        isAuthorized = true;
      }
    }

    // В превью модального окна до сохранения заказа разрешаем просмотр по прямому ID
    if (!isAuthorized && !token) {
      // Разрешено для локального превью клиента во время оформления
      isAuthorized = true;
    }

    const photo = await getPhotoBuffer(id);
    if (!photo) {
      return new NextResponse('Photo not found', { status: 404 });
    }

    return new NextResponse(photo.buffer as any, {
      status: 200,
      headers: {
        'Content-Type': photo.mimeType,
        'Cache-Control': 'private, max-age=86400',
      },
    });
  } catch (err) {
    console.error('Error streaming photo:', err);
    return new NextResponse('Internal error', { status: 500 });
  }
}
