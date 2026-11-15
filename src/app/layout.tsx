import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/layout/ThemeContext';
import { DEFAULT_BRAND_CONFIG } from '@/config/brand.config';

const inter = Inter({
  subsets: ['latin', 'cyrillic'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: `${DEFAULT_BRAND_CONFIG.shortName} — Студия Детейлинга и Химчистки`,
  description: DEFAULT_BRAND_CONFIG.tagline,
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: DEFAULT_BRAND_CONFIG.shortName,
  },
};

export const viewport: Viewport = {
  themeColor: '#090a0d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`dark ${inter.variable}`} suppressHydrationWarning>
      <head>
        <Script
          src="https://telegram.org/js/telegram-web-app.js"
          strategy="beforeInteractive"
        />
      </head>
      <body className={`${inter.className} antialiased min-h-screen font-sans selection:bg-zinc-800 selection:text-white overflow-x-hidden w-full relative`}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
