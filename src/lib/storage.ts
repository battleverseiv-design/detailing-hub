import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { OrderPhoto } from '@/types';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

// Конфигурация для внешнего S3/Cloudflare R2 хранилища (если переданы переменные окружения)
const R2_CONFIG = {
  endpoint: process.env.R2_ENDPOINT || process.env.S3_ENDPOINT,
  bucket: process.env.R2_BUCKET_NAME || process.env.S3_BUCKET_NAME,
  accessKeyId: process.env.R2_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY,
  publicUrl: process.env.R2_PUBLIC_URL || process.env.S3_PUBLIC_URL,
};

export const isExternalStorageEnabled = Boolean(
  R2_CONFIG.endpoint && R2_CONFIG.bucket && R2_CONFIG.accessKeyId && R2_CONFIG.secretAccessKey
);

/**
 * Проверка сигнатуры файла (Magic Bytes) на реальный тип изображения
 */
export function validateMagicBytes(buffer: Buffer): 'jpeg' | 'png' | 'webp' | null {
  if (buffer.length < 12) return null;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'jpeg';
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'png';
  }

  // WebP: RIFF ... WEBP
  const riff = buffer.toString('ascii', 0, 4);
  const webp = buffer.toString('ascii', 8, 12);
  if (riff === 'RIFF' && webp === 'WEBP') {
    return 'webp';
  }

  return null;
}

/**
 * Сохранить и сжать загруженное фото
 * Поддерживает локальную папку `uploads/` (по умолчанию в dev-режиме)
 * и автоматический фолбэк при внешней интеграции S3/R2
 */
export async function saveUploadedPhoto(file: File): Promise<OrderPhoto> {
  if (file.size > MAX_FILE_SIZE) {
    throw new Error('Размер файла превышает лимит 10 МБ');
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const detectedFormat = validateMagicBytes(buffer);
  if (!detectedFormat) {
    throw new Error('Недопустимый формат файла. Разрешены только JPEG, PNG и WebP');
  }

  // Сжатие и конвертация в оптимизированный WebP (макс. 1920x1920)
  const compressedBuffer = await sharp(buffer)
    .resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();

  const photoId = crypto.randomUUID();
  const filename = `${photoId}.webp`;

  // Если настроен Cloudflare R2 / S3
  if (isExternalStorageEnabled && R2_CONFIG.endpoint) {
    try {
      const uploadUrl = `${R2_CONFIG.endpoint.replace(/\/$/, '')}/${R2_CONFIG.bucket}/${filename}`;
      // Отправка в S3-совместимое хранилище
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Type': 'image/webp',
          'Authorization': `Bearer ${R2_CONFIG.accessKeyId}:${R2_CONFIG.secretAccessKey}`,
        },
        body: new Uint8Array(compressedBuffer),
      });

      if (uploadRes.ok) {
        return {
          id: photoId,
          filename,
          originalName: file.name,
          mimeType: 'image/webp',
          sizeBytes: compressedBuffer.length,
          createdAt: new Date().toISOString(),
        };
      }
    } catch (err) {
      console.warn('Внешнее S3/R2 хранилище недоступно, переключаемся на локальную папку uploads:', err);
    }
  }

  // Локальное хранилище в uploads/
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
  const filePath = path.join(UPLOAD_DIR, filename);
  await fs.writeFile(filePath, compressedBuffer);

  return {
    id: photoId,
    filename,
    originalName: file.name,
    mimeType: 'image/webp',
    sizeBytes: compressedBuffer.length,
    createdAt: new Date().toISOString(),
  };
}

/**
 * Получить путь или буфер сохранённого файла
 */
export async function getPhotoBuffer(photoId: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  try {
    // Предотвращение Path Traversal
    const safeFilename = path.basename(`${photoId}.webp`);
    const filePath = path.join(UPLOAD_DIR, safeFilename);

    const buffer = await fs.readFile(filePath);
    return {
      buffer,
      mimeType: 'image/webp',
    };
  } catch (err) {
    // Если файла нет локально и включен R2, пробуем загрузить из R2
    if (isExternalStorageEnabled && R2_CONFIG.publicUrl) {
      try {
        const publicFileUrl = `${R2_CONFIG.publicUrl.replace(/\/$/, '')}/${photoId}.webp`;
        const res = await fetch(publicFileUrl);
        if (res.ok) {
          const ab = await res.arrayBuffer();
          return {
            buffer: Buffer.from(ab),
            mimeType: 'image/webp',
          };
        }
      } catch {}
    }
    return null;
  }
}

/**
 * Удалить файл фото с диска
 */
export async function deletePhotoFile(photoId: string): Promise<boolean> {
  try {
    const safeFilename = path.basename(`${photoId}.webp`);
    const filePath = path.join(UPLOAD_DIR, safeFilename);
    await fs.unlink(filePath);
    return true;
  } catch (err) {
    console.warn('Could not delete photo file:', err);
    return false;
  }
}
