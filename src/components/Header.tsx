import React, { useState } from 'react';
import {
  Compass,
  LayoutGrid,
  Clock,
  Search,
  Plus,
  HardDrive,
  Laptop,
  Palette,
  User,
  LogOut,
  SlidersHorizontal,
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
  const { searchQuery, setSearchQuery, storageQuota } = useItems();
  const { user, signOut, isGuestMode, devices } = useAuth();
  const { activeThemeDef } = useTheme();
  const [showThemeMenu, setShowThemeMenu] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const mbUsed = (storageQuota.totalBytes / (1024 * 1024)).toFixed(1);
  const percentUsed = Math.min(100, (storageQuota.totalBytes / storageQuota.maxBytes) * 100);

  return (
    <header className="sticky top-0 z-30 w-full border-b border-border bg-surface/90 backdrop-blur-md transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left Section: Brand & View Switcher */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-text shadow-sm">
              <Compass className="w-4 h-4" />
            </div>
            <span className="font-semibold text-base tracking-tight text-text-main hidden sm:inline">
              UniMap
            </span>
          </div>

          {/* Segmented View Switcher (Apple / Google Style) */}
          <nav className="flex items-center p-1 rounded-xl bg-surface-elevated border border-border">
            <button
              onClick={() => setViewMode('bento')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'bento'
                  ? 'bg-surface text-text-main shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Grid</span>
            </button>
            <button
              onClick={() => setViewMode('canvas')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'canvas'
                  ? 'bg-surface text-text-main shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Canvas</span>
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'timeline'
                  ? 'bg-surface text-text-main shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Timeline</span>
            </button>
          </nav>
        </div>

        {/* Center: Search Field */}
        <div className="hidden md:flex flex-1 max-w-md mx-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes, links, code, HTML files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-elevated/70 hover:bg-surface-elevated border border-border focus:border-border-strong rounded-xl pl-9 pr-12 py-1.5 text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-faint px-1.5 py-0.5 rounded border border-border bg-surface">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Section: Controls & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Subtle Storage Usage Meter */}
          <button
            onClick={onOpenStorageModal}
            title="Free Storage Status (1 GB Supabase Quota)"
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-text-muted hover:text-text-main bg-surface-elevated/50 hover:bg-surface-elevated border border-border transition-colors font-mono"
          >
            <HardDrive className="w-3.5 h-3.5 text-accent" />
            <span className="text-[11px] hidden sm:inline">{mbUsed} MB</span>
            {/* Micro Progress Bar */}
            <div className="w-10 h-1.5 rounded-full bg-surface border border-border overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  percentUsed > 85 ? 'bg-red-500' : 'bg-primary'
                }`}
                style={{ width: `${Math.max(4, percentUsed)}%` }}
              />
            </div>
          </button>

          {/* Connected Device Fleet Button */}
          <button
            onClick={onOpenFleetModal}
            title="Device Fleet & QR Pairing"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-text-muted hover:text-text-main bg-surface-elevated/50 hover:bg-surface-elevated border border-border transition-colors"
          >
            <Laptop className="w-3.5 h-3.5 text-accent" />
            <span className="text-[11px] font-medium hidden lg:inline">Fleet</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </button>

          {/* Theme Switcher Toggle */}
          <div className="relative">
            <button
              onClick={() => setShowThemeMenu(!showThemeMenu)}
              title={`Theme: ${activeThemeDef.name}`}
              className="p-2 rounded-xl text-text-muted hover:text-text-main bg-surface-elevated/50 hover:bg-surface-elevated border border-border transition-colors"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>
            {showThemeMenu && <ThemeSelector onClose={() => setShowThemeMenu(false)} />}
          </div>

          {/* Primary Action Button: "Add Item" */}
          <button
            onClick={onOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">New</span>
          </button>

          {/* User Account Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-8 h-8 rounded-xl bg-surface-elevated border border-border flex items-center justify-center text-text-main hover:border-border-strong transition-colors text-xs font-semibold"
            >
              {user?.display_name ? user.display_name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5 text-text-muted" />}
            </button>

            {showUserMenu && (
              <div
                className="absolute right-0 mt-2 w-60 rounded-2xl bg-surface border border-border p-2 shadow-xl z-50 animate-fade-in text-xs"
                onClick={() => setShowUserMenu(false)}
              >
                <div className="px-3 py-2 border-b border-border/70">
                  <p className="font-semibold text-text-main text-break-word">
                    {user?.display_name || 'Scholar'}
                  </p>
                  <p className="text-[11px] text-text-muted font-mono text-break-word">
                    {user?.email || 'local.vault@unimap'}
                  </p>
                  {isGuestMode && (
                    <span className="inline-block mt-1 text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted border border-border">
                      Offline Mode
                    </span>
                  )}
                </div>

                <div className="py-1">
                  <button
                    onClick={onOpenFleetModal}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-text-main hover:bg-surface-elevated flex items-center gap-2"
                  >
                    <Laptop className="w-3.5 h-3.5 text-accent" />
                    <span>Manage Devices ({devices.length})</span>
                  </button>

                  <button
                    onClick={onOpenStorageModal}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-text-main hover:bg-surface-elevated flex items-center gap-2"
                  >
                    <HardDrive className="w-3.5 h-3.5 text-text-muted" />
                    <span>Storage & Quota</span>
                  </button>

                  <button
                    onClick={onOpenConfigModal}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-elevated flex items-center gap-2"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 text-text-faint" />
                    <span>Backend Config</span>
                  </button>
                </div>

                <div className="pt-1 border-t border-border/70">
                  <button
                    onClick={() => signOut()}
                    className="w-full text-left px-3 py-1.5 rounded-lg text-red-400 hover:bg-red-500/10 flex items-center gap-2"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
