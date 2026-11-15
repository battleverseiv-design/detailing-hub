import React from 'react';
import Link from 'next/link';
import { WifiOff, RotateCcw } from 'lucide-react';

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-zinc-950 text-white">
      <div className="text-center max-w-sm space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-sky-400">
          <WifiOff className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-extrabold">Нет соединения с интернетом</h1>
        <p className="text-xs text-zinc-400">
          Проверьте подключение к сети Wi-Fi или мобильному интернету и обновите страницу.
        </p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Повторить попытку</span>
        </Link>
      </div>
    </div>
  );
}
