import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import sharp from 'sharp';
import { OrderPhoto } from '@/types';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

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

  await fs.mkdir(UPLOAD_DIR, { recursive: true });

  const photoId = crypto.randomUUID();
  const filename = `${photoId}.webp`;
  const filePath = path.join(UPLOAD_DIR, filename);

  // Сжатие и конвертация в оптимизированный WebP (макс. 1920x1920)
  const compressedBuffer = await sharp(buffer)
    .resize(1920, 1920, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: 85 })
    .toBuffer();

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
 * Получить путь к сохранённому файлу
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
    console.error('Error reading photo:', err);
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
