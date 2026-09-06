import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';

interface ThemeDefinition {
  id: ThemeMode;
  name: string;
  tagline: string;
  badgeBg: string;
  primaryColor: string;
  accentColor: string;
  isDark: boolean;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'dark',
    name: 'Dark Mode',
    tagline: 'Refined Slate & Neutral Greys',
    badgeBg: '#0E1015',
    primaryColor: '#3B82F6',
    accentColor: '#38BDF8',
    isDark: true,
  },
  {
    id: 'light',
    name: 'Editorial Canvas',
    tagline: 'Clean Studio Paper White Mode',
    badgeBg: '#FFFFFF',
    primaryColor: '#0F172A',
    accentColor: '#2563EB',
    isDark: false,
  },
];

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  activeThemeDef: ThemeDefinition;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('unimap_theme');
    if (saved === 'light') return 'light';
    return 'dark';
  });

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
    localStorage.setItem('unimap_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  const activeThemeDef = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, activeThemeDef }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
