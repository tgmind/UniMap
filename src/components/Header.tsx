import React, { useState, useEffect, useRef } from 'react';
import {
  Compass,
  LayoutGrid,
  Clock,
  Search,
  Plus,
  HardDrive,
  Laptop,
  Moon,
  Sun,
  User,
  LogOut,
  SlidersHorizontal,
  Download,
} from 'lucide-react';
import { ViewMode } from '../types';
import { useItems } from '../context/ItemContext';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { usePwaInstall } from '../lib/usePwaInstall';
import { UniMapLogo } from './UniMapLogo';

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
  const { user, signOut, devices } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isInstallable, promptInstall } = usePwaInstall();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);

  const isHeaderActive = showMobileSearch || showUserMenu || Boolean(searchQuery.trim());
  const isHeaderShown = isVisible || isHeaderActive;

  // Helper to start/reset the auto-hide timer
  const startAutoHideTimer = (delayMs = 3500) => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    autoHideTimerRef.current = setTimeout(() => {
      // Only hide if not currently actively interacting (e.g. search or user menu open)
      if (!showMobileSearch && !showUserMenu && !searchQuery.trim()) {
        setIsVisible(false);
      }
    }, delayMs);
  };

  // On initial page load: show header for 3.5 seconds, then gracefully auto-hide
  useEffect(() => {
    startAutoHideTimer(3500);
    return () => {
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, []);

  // Intelligent scroll & deliberate gesture listener
  useEffect(() => {
    let lastScrollY = window.scrollY || document.documentElement.scrollTop;
    let touchStartY = 0;

    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      const isScrollingDown = currentScrollY > lastScrollY + 6;
      const isScrollingUp = currentScrollY < lastScrollY - 6;

      if (isScrollingDown) {
        // Scrolling down: immediately hide header for full immersion
        if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
        setIsVisible(false);
        setShowUserMenu(false);
        setShowMobileSearch(false);
      } else if (isScrollingUp && currentScrollY <= 40) {
        // Deliberately scrolling up to the top: reveal header & start auto-hide countdown
        setIsVisible(true);
        startAutoHideTimer(4000);
      } else if (currentScrollY <= 5 && isScrollingUp) {
        setIsVisible(true);
        startAutoHideTimer(4000);
      }

      lastScrollY = currentScrollY;
    };

    // Deliberate pull-down at top of screen (mobile swipe down when already near top)
    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      const currentY = e.touches[0].clientY;
      const diffY = currentY - touchStartY;

      if (currentScrollY <= 25 && diffY > 18) {
        // User deliberately pulled down at top: reveal header
        setIsVisible(true);
        startAutoHideTimer(4000);
      }
    };

    // Mouse wheel up at top (desktop)
    const handleWheel = (e: WheelEvent) => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      if (currentScrollY <= 25 && e.deltaY < -8) {
        setIsVisible(true);
        startAutoHideTimer(4000);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('wheel', handleWheel);
      if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
    };
  }, [showMobileSearch, showUserMenu, searchQuery]);

  const mbUsed = (storageQuota.totalBytes / (1024 * 1024)).toFixed(1);
  const percentUsed = Math.min(100, (storageQuota.totalBytes / storageQuota.maxBytes) * 100);

  return (
    <>
      {/* Top Edge Peek Sensor: allows user at top of screen to tap top edge to deliberately reveal header */}
      {!isHeaderShown && (
        <div
          onClick={() => {
            setIsVisible(true);
            startAutoHideTimer(4000);
          }}
          onMouseEnter={() => {
            setIsVisible(true);
            startAutoHideTimer(4000);
          }}
          className="fixed top-0 left-0 right-0 h-5 z-40 cursor-pointer pointer-events-auto"
          title="Tap to reveal header"
        />
      )}

      <header
        onMouseEnter={() => {
          if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
        }}
        onMouseLeave={() => {
          if (!isHeaderActive) startAutoHideTimer(3000);
        }}
        onTouchStart={() => {
          if (autoHideTimerRef.current) clearTimeout(autoHideTimerRef.current);
        }}
        className={`fixed top-0 left-0 right-0 z-40 w-full bg-transparent border-b border-transparent transition-all duration-400 ease-in-out ${
          isHeaderShown
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
        {/* Left Section: Brand & View Switcher */}
        <div className="flex items-center gap-4 sm:gap-6 min-w-0">
          {/* Logo */}
          <div
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer select-none"
            title="Scroll to top"
          >
            <UniMapLogo size={32} />
            <span className="font-semibold text-base tracking-tight text-text-main hidden sm:inline">
              UniMap
            </span>
          </div>

          {/* Segmented View Switcher (Desktop Only - Mobile uses Bottom Nav) */}
          <nav className="hidden md:flex items-center p-1 rounded-xl bg-surface-elevated border border-border">
            <button
              onClick={() => setViewMode('bento')}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'bento'
                  ? 'bg-surface text-text-main shadow-sm'
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid</span>
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
              <span>Timeline</span>
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
              <span>Canvas</span>
            </button>
          </nav>
        </div>

        {/* Center: Desktop Search Field */}
        <div className="hidden md:flex flex-1 max-w-md mx-2">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search notes, links, code, HTML files..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-elevated hover:bg-surface-elevated border border-border focus:border-border-strong rounded-xl pl-9 pr-12 py-1.5 text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors"
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-text-faint px-1.5 py-0.5 rounded border border-border bg-surface">
              ⌘K
            </kbd>
          </div>
        </div>

        {/* Right Section: Controls & Actions */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Mobile Search Toggle Button */}
          <button
            onClick={() => setShowMobileSearch(!showMobileSearch)}
            title="Search notes"
            className={`md:hidden p-2 rounded-xl border transition-colors ${
              showMobileSearch || searchQuery
                ? 'bg-primary/10 border-primary text-primary'
                : 'text-text-muted hover:text-text-main bg-surface-elevated border border-border'
            }`}
          >
            <Search className="w-3.5 h-3.5" />
          </button>

          {/* Desktop Storage Usage Meter */}
          <button
            onClick={onOpenStorageModal}
            title="Free Storage Status (1 GB Supabase Quota)"
            className="hidden md:flex items-center gap-2 px-2.5 py-1.5 rounded-xl text-xs text-text-muted hover:text-text-main bg-surface-elevated hover:bg-surface-elevated border border-border transition-colors font-mono"
          >
            <HardDrive className="w-3.5 h-3.5 text-accent" />
            <span className="text-[11px]">{mbUsed} MB</span>
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

          {/* Desktop Connected Device Fleet Button */}
          <button
            onClick={onOpenFleetModal}
            title="Device Fleet & QR Pairing"
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs text-text-muted hover:text-text-main bg-surface-elevated hover:bg-surface-elevated border border-border transition-colors"
          >
            <Laptop className="w-3.5 h-3.5 text-accent" />
            <span className="text-[11px] font-medium hidden lg:inline">Fleet</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          </button>

          {/* Theme Switcher Toggle (1-Click Dark/Light Mode) */}
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to Light Mode (Editorial Canvas)' : 'Switch to Dark Mode (Grey)'}
            className="p-2 rounded-xl text-text-muted hover:text-text-main bg-surface-elevated hover:bg-surface-hover border border-border transition-colors flex items-center justify-center group"
            aria-label="Toggle dark or light theme"
          >
            {theme === 'dark' ? (
              <Moon className="w-3.5 h-3.5 text-accent transition-transform group-hover:scale-110" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-amber-500 transition-transform group-hover:scale-110" />
            )}
          </button>

          {/* Install PWA Button */}
          {isInstallable && (
            <button
              onClick={promptInstall}
              title="Install UniMap App on this device"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-accent/15 hover:bg-accent/25 text-accent text-xs font-semibold border border-accent/30 shadow-xs transition-all active:scale-95"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Install App</span>
            </button>
          )}

          {/* Desktop Primary Action Button: "Add Item" */}
          <button
            onClick={onOpenAddModal}
            className="hidden md:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
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
                    {user?.email || 'scholar@unimap.cloud'}
                  </p>
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

                  {isInstallable && (
                    <button
                      onClick={promptInstall}
                      className="w-full text-left px-3 py-1.5 rounded-lg text-primary font-semibold hover:bg-primary/10 flex items-center gap-2"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Install UniMap App</span>
                    </button>
                  )}
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

      {/* Mobile Expandable Search Drawer */}
      {showMobileSearch && (
        <div className="md:hidden px-4 pb-3 pt-1 animate-fade-in">
          <div className="relative w-full">
            <Search className="w-4 h-4 text-text-faint absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search notes, code, links, HTML..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-surface-elevated/95 backdrop-blur-md border border-border focus:border-primary rounded-xl pl-9 pr-9 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors shadow-lg"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-muted hover:text-text-main p-1"
              >
                ✕
              </button>
            )}
          </div>
        </div>
      )}
    </header>
    </>
  );
};
