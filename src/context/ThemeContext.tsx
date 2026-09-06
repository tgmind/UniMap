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
    id: 'slate',
    name: 'Google Slate',
    tagline: 'Refined Material Dark & Adaptive Blue',
    badgeBg: '#0E1015',
    primaryColor: '#3B82F6',
    accentColor: '#38BDF8',
    isDark: true,
  },
  {
    id: 'meta',
    name: 'Meta Horizon',
    tagline: 'Deep Midnight Navy & Sapphire Accent',
    badgeBg: '#0B0F19',
    primaryColor: '#2563EB',
    accentColor: '#60A5FA',
    isDark: true,
  },
  {
    id: 'apple',
    name: 'Apple Onyx',
    tagline: 'Pure Monochrome Titanium & OLED Pitch',
    badgeBg: '#000000',
    primaryColor: '#FFFFFF',
    accentColor: '#A1A1AA',
    isDark: true,
  },
  {
    id: 'light',
    name: 'Editorial Canvas',
    tagline: 'Minimalist Clean Paper & Slate Ink',
    badgeBg: '#F8F9FA',
    primaryColor: '#0F172A',
    accentColor: '#2563EB',
    isDark: false,
  },
];

interface ThemeContextType {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  activeThemeDef: ThemeDefinition;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const saved = localStorage.getItem('unimap_theme') as ThemeMode;
    if (saved && THEMES.some((t) => t.id === saved)) return saved;
    return 'slate';
  });

  useEffect(() => {
    if (theme === 'slate') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
    localStorage.setItem('unimap_theme', theme);
  }, [theme]);

  const setTheme = (newTheme: ThemeMode) => {
    setThemeState(newTheme);
  };

  const activeThemeDef = THEMES.find((t) => t.id === theme) || THEMES[0];

  return (
    <ThemeContext.Provider value={{ theme, setTheme, activeThemeDef }}>
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
