import React from 'react';
import { getPublicSettings } from '@/lib/studio-service';
import { StudioClientApp } from './StudioClientApp';

export const revalidate = 0; // Всегда свежие настройки из БД

export default async function HomePage() {
  const settings = await getPublicSettings();

  return <StudioClientApp settings={settings} />;
}
