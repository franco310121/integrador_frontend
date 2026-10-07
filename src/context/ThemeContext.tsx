import { createContext, useContext, useEffect, type ReactNode } from 'react';

// Se mantiene la firma anterior para no romper consumidores existentes.
// El proveedor únicamente aplica y devuelve el tema claro.
export type ThemeMode = 'light' | 'dark';

export interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const THEME_KEY = 'sm_theme';
const ThemeContext = createContext<ThemeContextType | null>(null);

const lightTheme: ThemeContextType = {
  theme: 'light',
  isDark: false,
  // Compatibilidad temporal hasta retirar los botones de cambio de tema.
  toggleTheme: () => {},
  setTheme: (_mode: ThemeMode) => {},
};

export function ThemeProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    try {
      // Sustituye cualquier preferencia oscura guardada anteriormente.
      localStorage.setItem(THEME_KEY, 'light');
    } catch {
      // La aplicación también funciona si el navegador bloquea el almacenamiento.
    }

    const root = document.documentElement;
    for (const element of [root, document.body]) {
      element.setAttribute('data-theme', 'light');
      element.setAttribute('data-bs-theme', 'light');
      element.classList.remove('theme-dark');
      element.classList.add('theme-light');
    }
  }, []);

  return (
    <ThemeContext.Provider value={lightTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}