import React from 'react';
import { LayoutGrid, Clock, Compass, Laptop, Plus, HardDrive, ChevronUp, ChevronDown } from 'lucide-react';
import { ViewMode } from '../types';
import { useItems } from '../context/ItemContext';

interface MobileBottomNavProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenAddModal: () => void;
  onOpenFleetModal: (tab?: 'devices' | 'qr_generate' | 'qr_scan') => void;
  onOpenStorageModal: () => void;
  isVisible?: boolean;
  onWake?: () => void;
  isExpanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  viewMode,
  setViewMode,
  onOpenAddModal,
  onOpenFleetModal,
  onOpenStorageModal,
  isExpanded: controlledExpanded,
  onExpandChange,
}) => {
  const { storageQuota } = useItems();
  const mbUsed = (storageQuota.totalBytes / (1024 * 1024)).toFixed(1);

  const [internalExpanded, setInternalExpanded] = React.useState(true);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const setIsExpanded = React.useCallback(
    (val: boolean) => {
      setInternalExpanded(val);
      onExpandChange?.(val);
    },
    [onExpandChange]
  );

  const autoCompactTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const startAutoCompactTimer = React.useCallback(
    (delayMs = 4000) => {
      if (autoCompactTimerRef.current) {
        clearTimeout(autoCompactTimerRef.current);
      }
      autoCompactTimerRef.current = setTimeout(() => {
        setIsExpanded(false);
      }, delayMs);
    },
    [setIsExpanded]
  );

  const expandNav = () => {
    setIsExpanded(true);
    startAutoCompactTimer(4000);
  };

  const compactNav = () => {
    if (autoCompactTimerRef.current) {
      clearTimeout(autoCompactTimerRef.current);
    }
    setIsExpanded(false);
  };

  // On mount: display expanded for 3.5 seconds so user notices the tabs, then smoothly compact into the thin bar
  React.useEffect(() => {
    setIsExpanded(true);
    startAutoCompactTimer(3500);
    return () => {
      if (autoCompactTimerRef.current) clearTimeout(autoCompactTimerRef.current);
    };
  }, [setIsExpanded, startAutoCompactTimer]);

  const handleTabClick = (mode: ViewMode) => {
    setViewMode(mode);
    // Give user 2.5s to see their selection before smoothly compacting
    startAutoCompactTimer(2500);
  };

  const handleFleetClick = () => {
    compactNav();
    onOpenFleetModal();
  };

  const handleStorageClick = () => {
    compactNav();
    onOpenStorageModal();
  };

  const touchStartYRef = React.useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
    if (autoCompactTimerRef.current) {
      clearTimeout(autoCompactTimerRef.current);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartYRef.current !== null) {
      const deltaY = touchStartYRef.current - e.changedTouches[0].clientY;
      if (!isExpanded && deltaY > 6) {
        // Swiped or pulled up
        expandNav();
      } else if (isExpanded && deltaY < -15) {
        // Swiped or pulled down
        compactNav();
      } else if (!isExpanded && Math.abs(deltaY) <= 6) {
        // Direct tap on mobile
        expandNav();
      }
      touchStartYRef.current = null;
    }
  };

  return (
    <>
      {/* Floating Action Button (FAB)
          Displayed in Timeline view. In Canvas view, Add is integrated into the compact bottom switcher. */}
      {viewMode === 'timeline' && (
        <button
          onClick={onOpenAddModal}
          title="Add New Item"
          aria-label="Add New Item"
          className={`fixed right-4 z-40 md:hidden w-14 h-14 rounded-2xl bg-[#2481CC] hover:bg-[#1E70B0] text-white shadow-xl shadow-[#2481CC]/35 flex items-center justify-center transition-all duration-300 active:scale-90 ${
            isExpanded ? 'bottom-24' : 'bottom-10'
          }`}
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Modern Opaque Bottom Navigation Bar
          - In compact state: A sleek, clickable modern thin bar with upward arrow indicator (tap or pull up to expand)
          - In expanded state: Full Google M3 & Meta navigation buttons, automatically compacting after inactivity */}
      <nav
        onClick={!isExpanded ? expandNav : undefined}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseEnter={() => {
          if (autoCompactTimerRef.current) {
            clearTimeout(autoCompactTimerRef.current);
          }
        }}
        onMouseLeave={() => {
          if (isExpanded) {
            startAutoCompactTimer(3000);
          }
        }}
        role="navigation"
        aria-label={!isExpanded ? 'Bottom navigation, tap or pull up to expand' : 'Bottom navigation panel'}
        aria-expanded={isExpanded}
        className={`fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-[#18222D] border-t border-slate-200/90 dark:border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] select-none transition-all duration-300 ease-out overflow-hidden ${
          isExpanded
            ? 'h-[74px] px-2 pt-0.5 pb-[max(0.4rem,env(safe-area-inset-bottom))] pointer-events-auto'
            : 'h-7 px-4 pt-0.5 pb-[env(safe-area-inset-bottom)] cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/40 active:bg-slate-100 dark:active:bg-slate-800/70 group'
        }`}
        title={!isExpanded ? 'Tap or pull up to open navigation' : undefined}
      >
        {!isExpanded ? (
          /* Modern Thin Bar Handle with Small Upward Arrow Indicator */
          <div className="w-full h-full flex flex-col items-center justify-center -mt-0.5 pointer-events-none">
            <div className="flex flex-col items-center justify-center group-hover:scale-105 transition-transform duration-200">
              <ChevronUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500 group-hover:text-primary dark:group-hover:text-primary transition-colors duration-200 animate-bounce-up stroke-[2.5]" />
              <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 group-hover:w-16 group-hover:bg-primary transition-all duration-300 shadow-2xs -mt-0.5" />
            </div>
          </div>
        ) : (
          /* Expanded Full Google M3 / Meta Navigation Panel */
          <div className="w-full h-full flex flex-col justify-between">
            {/* Centered Top Collapse Handle */}
            <div
              onClick={(e) => {
                e.stopPropagation();
                compactNav();
              }}
              className="w-full flex justify-center py-0.5 cursor-pointer group/collapse"
              title="Tap to collapse navigation"
            >
              <div className="w-9 h-1 rounded-full bg-slate-300 dark:bg-slate-600 group-hover/collapse:bg-slate-400 dark:group-hover/collapse:bg-slate-500 transition-colors" />
            </div>

            {/* 5 Navigation Buttons */}
            <div className="flex items-center justify-around flex-1">
              {/* 1. Grid View (Bento) */}
              <button
                onClick={() => handleTabClick('bento')}
                className="flex flex-col items-center justify-center flex-1 py-1 group transition-transform active:scale-95"
              >
                <div
                  className={`w-14 h-7.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                    viewMode === 'bento'
                      ? 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#2481CC]/25 dark:text-[#50A7EA] shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-100/80 dark:group-hover:bg-slate-800/50'
                  }`}
                >
                  <LayoutGrid
                    className={`w-5 h-5 transition-transform duration-200 ${
                      viewMode === 'bento' ? 'stroke-[2.4] scale-105' : 'stroke-[1.8]'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] tracking-tight mt-0.5 transition-colors duration-200 ${
                    viewMode === 'bento'
                      ? 'font-semibold text-[#1A73E8] dark:text-[#50A7EA]'
                      : 'font-medium text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Grid
                </span>
              </button>

              {/* 2. Timeline View */}
              <button
                onClick={() => handleTabClick('timeline')}
                className="flex flex-col items-center justify-center flex-1 py-1 group transition-transform active:scale-95"
              >
                <div
                  className={`w-14 h-7.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                    viewMode === 'timeline'
                      ? 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#2481CC]/25 dark:text-[#50A7EA] shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-100/80 dark:group-hover:bg-slate-800/50'
                  }`}
                >
                  <Clock
                    className={`w-5 h-5 transition-transform duration-200 ${
                      viewMode === 'timeline' ? 'stroke-[2.4] scale-105' : 'stroke-[1.8]'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] tracking-tight mt-0.5 transition-colors duration-200 ${
                    viewMode === 'timeline'
                      ? 'font-semibold text-[#1A73E8] dark:text-[#50A7EA]'
                      : 'font-medium text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Timeline
                </span>
              </button>

              {/* 3. Canvas View */}
              <button
                onClick={() => handleTabClick('canvas')}
                className="flex flex-col items-center justify-center flex-1 py-1 group transition-transform active:scale-95"
              >
                <div
                  className={`w-14 h-7.5 rounded-full flex items-center justify-center transition-all duration-200 ${
                    viewMode === 'canvas'
                      ? 'bg-[#E8F0FE] text-[#1A73E8] dark:bg-[#2481CC]/25 dark:text-[#50A7EA] shadow-2xs'
                      : 'text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-100/80 dark:group-hover:bg-slate-800/50'
                  }`}
                >
                  <Compass
                    className={`w-5 h-5 transition-transform duration-200 ${
                      viewMode === 'canvas' ? 'stroke-[2.4] scale-105' : 'stroke-[1.8]'
                    }`}
                  />
                </div>
                <span
                  className={`text-[11px] tracking-tight mt-0.5 transition-colors duration-200 ${
                    viewMode === 'canvas'
                      ? 'font-semibold text-[#1A73E8] dark:text-[#50A7EA]'
                      : 'font-medium text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Canvas
                </span>
              </button>

              {/* 4. Fleet Modal Button with Live Online Badge */}
              <button
                onClick={handleFleetClick}
                className="flex flex-col items-center justify-center flex-1 py-1 group transition-transform active:scale-95"
              >
                <div className="w-14 h-7.5 rounded-full flex items-center justify-center relative transition-all duration-200 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-100/80 dark:group-hover:bg-slate-800/50">
                  <Laptop className="w-5 h-5 stroke-[1.8]" />
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#18222D] absolute top-1.5 right-3.5 shadow-xs animate-pulse" />
                </div>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-tight mt-0.5 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  Fleet
                </span>
              </button>

              {/* 5. Storage Quota Button */}
              <button
                onClick={handleStorageClick}
                className="flex flex-col items-center justify-center flex-1 py-1 group transition-transform active:scale-95"
              >
                <div className="w-14 h-7.5 rounded-full flex items-center justify-center transition-all duration-200 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-100/80 dark:group-hover:bg-slate-800/50">
                  <HardDrive className="w-5 h-5 stroke-[1.8]" />
                </div>
                <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 tracking-tight mt-0.5 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
                  {mbUsed}MB
                </span>
              </button>
            </div>
          </div>
        )}
      </nav>
    </>
  );
};
