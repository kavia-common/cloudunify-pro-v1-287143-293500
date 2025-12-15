import { useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

const THEME_KEY = 'cup_theme';

// PUBLIC_INTERFACE
export function useTheme(): { theme: Theme; setTheme: (t: Theme) => void; toggleTheme: () => void } {
  /**
   * Hook to manage theme state, persisting to localStorage and applying the
   * data-theme attribute on the <html> element for CSS variable theming.
   */
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem(THEME_KEY) as Theme | null;
    if (saved === 'light' || saved === 'dark') return saved;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  const setTheme = (t: Theme) => setThemeState(t);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return { theme, setTheme, toggleTheme };
}
