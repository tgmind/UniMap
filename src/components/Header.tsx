import React, { useState } from 'react';
import {
  Compass,
  Grid,
  Clock,
  Search,
  Plus,
  HardDrive,
  Laptop,
  Palette,
  User,
  LogOut,
  Database,
  Sparkles,
} from 'lucide-react';
import { ViewMode } from '../types';
import { useItems } from '../context/ItemContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeSelector } from './ThemeSelector';

interface HeaderProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenAddModal: () => void;
  onOpenStorageModal: () => void;
  onOpenFleetModal: () => void;
  onOpenAuthModal: () => void;
  onOpenConfigModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  viewMode,
  setViewMode,
  onOpenAddModal,
  onOpenStorageModal,
  onOpenFleetModal,
  onOpenAuthModal,
  onOpenConfigModal,
}) => {
  const { searchQuery, setSearchQuery, selectedType, setSelectedType, storageQuota } = useItems();
  const { user, signOut, isDemoMode, devices } = useAuth();
  const { activeThemeDef } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // Calculate storage percentage towards 1,000 MB
  const percentUsed = ((storageQuota.totalBytes / storageQuota.maxBytes) * 100).toFixed(1);
  const mbUsed = (storageQuota.totalBytes / (1024 * 1024)).toFixed(1);

  // Storage color
  const storageColor =
    parseFloat(percentUsed) > 90
      ? 'text-red-400 border-red-500/40 bg-red-500/10'
      : parseFloat(percentUsed) > 70
      ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
      : 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10';

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-background/85 backdrop-blur-xl transition-colors">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-16 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="relative group cursor-pointer flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-sm">
              <div className="w-full h-full bg-background rounded-[10px] flex items-center justify-center overflow-hidden">
                <img src="/logo.svg" alt="UniMap" className="w-8 h-8 group-hover:scale-110 transition-transform duration-300" />
              </div>
            </div>
            <div className="hidden sm:block">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-text-main to-text-muted bg-clip-text text-transparent">
                  UniMap
                </span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded-full border border-border bg-surface text-accent font-semibold tracking-wider">
                  Sync
                </span>
              </div>
              <p className="text-[11px] text-text-muted font-medium tracking-tight">
                Universal Cross-Device Vault
              </p>
            </div>
          </div>

          {/* View Mode Switcher */}
          <div className="flex items-center p-1 rounded-xl bg-surface border border-border ml-2 sm:ml-4">
            <button
              onClick={() => setViewMode('canvas')}
              title="Spatial Map View"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'canvas'
                  ? 'bg-primary text-primary-text shadow-sm'
                  : 'text-text-muted hover:text-text-main hover:bg-surface-hover'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Map</span>
            </button>
            <button
              onClick={() => setViewMode('bento')}
              title="Bento Grid View"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'bento'
                  ? 'bg-primary text-primary-text shadow-sm'
                  : 'text-text-muted hover:text-text-main hover:bg-surface-hover'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Bento</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              title="Timeline River View"
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'timeline'
                  ? 'bg-primary text-primary-text shadow-sm'
                  : 'text-text-muted hover:text-text-main hover:bg-surface-hover'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Timeline</span>
            </button>
          </div>
        </div>

        {/* Center: Search Bar */}
        <div className="hidden lg:flex flex-1 max-w-md relative mx-2">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search notes, code, links, HTML files... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-surface border border-border rounded-xl pl-9 pr-4 py-1.5 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-2.5">
          {/* Live Free Storage Monitor Pill */}
          <button
            onClick={onOpenStorageModal}
            title="Live Free Tier Storage Quota (Supabase 1 GB Limit)"
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono border transition-all hover:scale-105 ${storageColor}`}
          >
            <HardDrive className="w-3.5 h-3.5" />
            <span className="font-semibold">{mbUsed} MB</span>
            <span className="opacity-70 text-[10px]">/ 1 GB</span>
          </button>

          {/* Connected Device Fleet */}
          <button
            onClick={onOpenFleetModal}
            title="Active Devices & QR Quick Login"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs bg-surface border border-border text-text-main hover:border-primary/50 transition-colors relative"
          >
            <Laptop className="w-3.5 h-3.5 text-accent" />
            <span className="hidden md:inline font-medium">Fleet</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </button>

          {/* Theme Selector Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              title={`Theme: ${activeThemeDef.name}`}
              className="p-2 rounded-xl bg-surface border border-border text-text-muted hover:text-text-main hover:border-primary/50 transition-colors"
            >
              <Palette className="w-4 h-4" />
            </button>
            {showThemeMenu && (
              <ThemeSelector onClose={() => setShowThemeMenu(false)} />
            )}
          </div>

          {/* Quick Add Button */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-semibold text-xs shadow-glow-sm transition-all hover:scale-105 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Item</span>
          </button>

          {/* Account / User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-main hover:border-primary transition-colors"
            >
              <User className="w-4 h-4 text-text-muted" />
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-2xl glass-dropdown p-2 shadow-2xl z-50 animate-fade-in text-xs"
                onClick={() => setShowUserMenu(false)}
              >
                <div className="px-3 py-2 border-b border-border/50">
                  <p className="font-semibold text-text-main truncate">
                    {user?.display_name || 'Exam Scholar'}
                  </p>
                  <p className="text-[10px] text-text-muted font-mono truncate">
                    {user?.email || 'local.vault@unimap'}
                  </p>
                  {isDemoMode && (
                    <span className="inline-block mt-1 text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">
                      Local Offline Mode
                    </span>
                  )}
                </div>

                <div className="py-1">
                  <button
                    onClick={onOpenAuthModal}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-text-main hover:bg-surface-hover flex items-center gap-2"
                  >
                    <User className="w-3.5 h-3.5 text-accent" />
                    <span>{isDemoMode ? 'Log In / Sign Up' : 'Account Settings'}</span>
                  </button>
                  <button
                    onClick={onOpenConfigModal}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-text-main hover:bg-surface-hover flex items-center gap-2"
                  >
                    <Database className="w-3.5 h-3.5 text-primary" />
                    <span>Supabase Cloud Config</span>
                  </button>
                </div>

                {!isDemoMode && (
                  <div className="pt-1 border-t border-border/50">
                    <button
                      onClick={() => signOut()}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
