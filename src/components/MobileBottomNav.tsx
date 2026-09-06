import React from 'react';
import { LayoutGrid, Clock, Compass, Laptop, Plus, HardDrive } from 'lucide-react';
import { ViewMode } from '../types';
import { useItems } from '../context/ItemContext';

interface MobileBottomNavProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenAddModal: () => void;
  onOpenFleetModal: () => void;
  onOpenStorageModal: () => void;
  isVisible?: boolean;
  onWake?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  viewMode,
  setViewMode,
  onOpenAddModal,
  onOpenFleetModal,
  onOpenStorageModal,
  isVisible = true,
  onWake,
}) => {
  const { storageQuota } = useItems();
  const mbUsed = (storageQuota.totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <>
      {/* Bottom Edge Peek Sensor: when nav is hidden, tapping or swiping near bottom reveals it */}
      {!isVisible && (
        <div
          onClick={() => onWake?.()}
          className="fixed bottom-0 left-0 right-0 h-4 z-30 cursor-pointer pointer-events-auto md:hidden"
          title="Tap to reveal navigation"
        />
      )}

      {/* Floating Action Button (FAB)
          Displayed in Timeline & Canvas views with Google M3 elevation */}
      {viewMode !== 'bento' && (
        <button
          onClick={onOpenAddModal}
          title="Add New Study Item"
          aria-label="Add New Study Item"
          className={`fixed right-4 z-40 md:hidden w-14 h-14 rounded-2xl bg-[#2481CC] hover:bg-[#1E70B0] text-white shadow-xl shadow-[#2481CC]/35 flex items-center justify-center transition-all duration-400 active:scale-90 ${
            isVisible ? 'bottom-22' : 'bottom-6'
          }`}
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Fixed Bottom Opaque Navigation Bar with Google M3 / Meta Pill Indicators */}
      <nav
        onTouchStart={() => onWake?.()}
        onMouseEnter={() => onWake?.()}
        className={`fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white dark:bg-[#18222D] border-t border-slate-200/90 dark:border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] px-2 pt-1.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] flex items-center justify-around select-none transition-all duration-400 ease-in-out ${
          isVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : 'translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        {/* 1. Grid View (Bento) */}
        <button
          onClick={() => setViewMode('bento')}
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
            className={`text-[11px] tracking-tight mt-1 transition-colors duration-200 ${
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
          onClick={() => setViewMode('timeline')}
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
            className={`text-[11px] tracking-tight mt-1 transition-colors duration-200 ${
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
          onClick={() => setViewMode('canvas')}
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
            className={`text-[11px] tracking-tight mt-1 transition-colors duration-200 ${
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
          onClick={onOpenFleetModal}
          className="flex flex-col items-center justify-center flex-1 py-1 group transition-transform active:scale-95"
        >
          <div className="w-14 h-7.5 rounded-full flex items-center justify-center relative transition-all duration-200 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-100/80 dark:group-hover:bg-slate-800/50">
            <Laptop className="w-5 h-5 stroke-[1.8]" />
            <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-[#18222D] absolute top-1.5 right-3.5 shadow-xs animate-pulse" />
          </div>
          <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 tracking-tight mt-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            Fleet
          </span>
        </button>

        {/* 5. Storage Quota Button */}
        <button
          onClick={onOpenStorageModal}
          className="flex flex-col items-center justify-center flex-1 py-1 group transition-transform active:scale-95"
        >
          <div className="w-14 h-7.5 rounded-full flex items-center justify-center transition-all duration-200 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-100/80 dark:group-hover:bg-slate-800/50">
            <HardDrive className="w-5 h-5 stroke-[1.8]" />
          </div>
          <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 tracking-tight mt-1 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            {mbUsed}MB
          </span>
        </button>
      </nav>
    </>
  );
};
