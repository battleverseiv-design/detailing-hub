import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { getPhotoBuffer } from '@/lib/storage';
import { verifyAdminSession } from '@/lib/auth';
import { prisma } from '@/lib/db';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const ONE_HOUR_MS = 60 * 60 * 1000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== 'string') {
      return new NextResponse('Bad request', { status: 400 });
    }

    // 1. Проверка прав: Авторизован ли администратор студии
    const isAdmin = await verifyAdminSession();
    let isAuthorized = isAdmin;

    // 2. Проверка прав: Передан ли токен существующего заказа
    const token = req.nextUrl.searchParams.get('token');
    if (!isAuthorized && token) {
      const order = await prisma.order.findUnique({
        where: { token },
        select: {
          photosJson: true,
          inspectionPhotosBeforeJson: true,
          inspectionPhotosAfterJson: true,
        },
      });

      if (order) {
        const hasPhoto = Boolean(
          (order.photosJson && order.photosJson.includes(id)) ||
          (order.inspectionPhotosBeforeJson && order.inspectionPhotosBeforeJson.includes(id)) ||
          (order.inspectionPhotosAfterJson && order.inspectionPhotosAfterJson.includes(id))
        );

        if (hasPhoto) {
          isAuthorized = true;
        }
      }
    }

    // 3. Проверка прав: Превью только что загруженного фото до создания заказа
    // Разрешено только если файл существует, загружен менее 1 часа назад и еще не привязан ни к одному заказу
    if (!isAuthorized) {
      try {
        const safeFilename = path.basename(`${id}.webp`);
        const filePath = path.join(UPLOAD_DIR, safeFilename);
        const stats = await fs.stat(filePath);
        const fileAgeMs = Date.now() - stats.mtimeMs;

        if (fileAgeMs <= ONE_HOUR_MS) {
          // Проверяем, не принадлежит ли это фото уже какому-то оформленному заказу
          const attachedOrder = await prisma.order.findFirst({
            where: {
              OR: [
                { photosJson: { contains: id } },
                { inspectionPhotosBeforeJson: { contains: id } },
                { inspectionPhotosAfterJson: { contains: id } },
              ],
            },
            select: { id: true },
          });

          // Если фото еще ни к какому заказу не привязано — это свежий аплоад клиента во время оформления
          if (!attachedOrder) {
            isAuthorized = true;
          }
        }
      } catch {
        // Файла нет на диске или ошибка fs.stat
      }
    }

    // Если ни одно условие авторизации не выполнено — отклоняем запрос (403 Forbidden)
    if (!isAuthorized) {
      return new NextResponse('Access denied', { status: 403 });
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
