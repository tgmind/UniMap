import React from 'react';
import { THEMES, useTheme } from '../context/ThemeContext';
import { Check } from 'lucide-react';

interface ThemeSelectorProps {
  onClose: () => void;
}

export const ThemeSelector: React.FC<ThemeSelectorProps> = ({ onClose }) => {
  const { theme, setTheme } = useTheme();

  return (
    <div
      className="absolute right-0 mt-2 w-72 rounded-2xl glass-dropdown p-2 shadow-2xl z-50 animate-fade-in border border-border"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 py-2 border-b border-border/50">
        <p className="text-xs font-semibold text-text-main">Select Workspace Theme</p>
        <p className="text-[11px] text-text-muted">Personalized for exam study sessions</p>
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
              className={`w-full text-left p-2 rounded-xl transition-all flex items-center justify-between group ${
                isSelected
                  ? 'bg-surface-elevated border border-primary/40'
                  : 'hover:bg-surface-hover border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5">
                {/* Visual theme badge */}
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center border border-white/10 shadow-sm relative overflow-hidden"
                  style={{ backgroundColor: t.badgeBg }}
                >
                  <div
                    className="w-3 h-3 rounded-full absolute -top-0.5 -right-0.5"
                    style={{ backgroundColor: t.accentColor }}
                  />
                  <div
                    className="w-3 h-3 rounded-full absolute -bottom-0.5 -left-0.5"
                    style={{ backgroundColor: t.primaryColor }}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-text-main">{t.name}</p>
                  <p className="text-[10px] text-text-muted leading-tight">{t.tagline}</p>
                </div>
              </div>

              {isSelected && <Check className="w-4 h-4 text-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
