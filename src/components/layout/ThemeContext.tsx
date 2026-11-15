'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme] = useState<Theme>('dark');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('detailing_theme', 'dark');
      document.documentElement.classList.add('dark');
    } catch {
      document.documentElement.classList.add('dark');
    }
    setMounted(true);
  }, []);

  const setTheme = () => {
    // Тёмная премиальная тема зафиксирована
    document.documentElement.classList.add('dark');
  };

  const toggleTheme = () => {
    // Тёмная премиальная тема зафиксирована
    document.documentElement.classList.add('dark');
  };

  // Предотвращаем гидратацию до монтирования
  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
