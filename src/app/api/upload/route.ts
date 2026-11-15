import { NextRequest, NextResponse } from 'next/server';
import { saveUploadedPhoto } from '@/lib/storage';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'Файл не передан' }, { status: 400 });
    }

    const savedPhoto = await saveUploadedPhoto(file);
    return NextResponse.json(savedPhoto);
  } catch (err: any) {
    console.error('Upload error:', err);
    return NextResponse.json(
      { error: err.message || 'Ошибка обработки файла' },
      { status: 400 }
    );
  }
}
