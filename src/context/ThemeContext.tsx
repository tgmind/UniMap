import React, { createContext, useContext, useEffect, useState } from 'react';
import { ThemeMode } from '../types';

interface ThemeDefinition {
  id: ThemeMode;
  name: string;
  tagline: string;
  badgeBg: string;
  primaryColor: string;
  accentColor: string;
  fontStyle: string;
}

export const THEMES: ThemeDefinition[] = [
  {
    id: 'midnight',
    name: 'Midnight Obsidian',
    tagline: 'OLED Pure Black & Electric Violet',
    badgeBg: '#050508',
    primaryColor: '#8B5CF6',
    accentColor: '#06B6D4',
    fontStyle: 'font-sans',
  },
  {
    id: 'tokyo',
    name: 'Tokyo Night',
    tagline: 'Indigo Cyber & Soft Lavender',
    badgeBg: '#0F111A',
    primaryColor: '#6366F1',
    accentColor: '#A855F7',
    fontStyle: 'font-sans',
  },
  {
    id: 'scholar',
    name: 'Paper Scholar',
    tagline: 'Warm Parchment & Amber Editorial',
    badgeBg: '#181614',
    primaryColor: '#D97706',
    accentColor: '#EAB308',
    fontStyle: 'font-serif',
  },
  {
    id: 'aurora',
    name: 'Nordic Aurora',
    tagline: 'Deep Slate Glass & Mint Emerald',
    badgeBg: '#070D14',
    primaryColor: '#10B981',
    accentColor: '#38BDF8',
    fontStyle: 'font-sans',
  },
  {
    id: 'terminal',
    name: 'Retro Terminal',
    tagline: 'Monochrome Neo-Brutalist & Phosphor Green',
    badgeBg: '#000000',
    primaryColor: '#22C55E',
    accentColor: '#F59E0B',
    fontStyle: 'font-mono',
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
    return (localStorage.getItem('unimap_theme') as ThemeMode) || 'midnight';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
