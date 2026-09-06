import React from 'react';
import { THEMES, useTheme } from '../context/ThemeContext';
import { Check, Moon, Sun } from 'lucide-react';

interface ThemeSelectorProps {
  onClose: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onClose }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="absolute right-0 mt-2 w-64 rounded-2xl bg-surface border border-border p-2 shadow-xl z-50 animate-fade-in"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b border-border/70">
        <p className="text-xs font-semibold text-text-main">Appearance Theme</p>
        <p className="text-[11px] text-text-muted">Dark grey or paper white mode</p>
      </div>

      <div className="py-1.5 space-y-1">
        {THEMES.map((t) => {
          const isSelected = t.id === theme;
          return (
            <button
              key={t.id}
              onClick={() => {
                setTheme(t.id);
                onClose();
              }}
              className={`w-full text-left p-2.5 rounded-xl transition-all flex items-center justify-between group ${
                isSelected
                  ? 'bg-surface-elevated text-text-main'
                  : 'hover:bg-surface-elevated/60 text-text-muted hover:text-text-main'
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-6 h-6 rounded-lg border border-border shrink-0 flex items-center justify-center text-xs"
                  style={{ backgroundColor: t.badgeBg }}
                >
                  {t.id === 'dark' ? (
                    <Moon className="w-3.5 h-3.5 text-accent" />
                  ) : (
                    <Sun className="w-3.5 h-3.5 text-amber-500" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-medium text-text-main">{t.name}</p>
                  <p className="text-[10px] text-text-muted leading-tight">{t.tagline}</p>
                </div>
              </div>

              {isSelected && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
