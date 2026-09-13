import React from 'react';
import { LayoutGrid, Clock, Laptop, Plus, HardDrive } from 'lucide-react';
import { ViewMode } from '../types';
import { useItems } from '../context/ItemContext';

interface MobileBottomNavProps {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  onOpenAddModal: () => void;
  onOpenFleetModal: (tab?: 'devices' | 'qr_generate' | 'qr_scan') => void;
  onOpenStorageModal: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  viewMode,
  setViewMode,
  onOpenAddModal,
  onOpenFleetModal,
  onOpenStorageModal,
}) => {
  const { storageQuota } = useItems();
  const mbUsed = (storageQuota.totalBytes / (1024 * 1024)).toFixed(1);

  return (
    <>
      {/* Floating Action Button (FAB) for Timeline view - positioned above permanent bottom nav */}
      {viewMode === 'timeline' && (
        <button
          onClick={onOpenAddModal}
          title="Add New Item"
          aria-label="Add New Item"
          className="fixed right-4 bottom-20 z-40 md:hidden w-13 h-13 rounded-2xl bg-[#2481CC] hover:bg-[#1E70B0] text-white shadow-xl shadow-[#2481CC]/35 flex items-center justify-center transition-all duration-200 active:scale-90"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      )}

      {/* Permanent Always-Visible Mobile Bottom Navigation Bar */}
      <nav
        role="navigation"
        aria-label="Bottom navigation panel"
        className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-white/95 dark:bg-[#18222D]/95 backdrop-blur-md border-t border-slate-200/90 dark:border-white/10 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] select-none h-16 sm:h-18 px-2 pt-1 pb-[max(0.4rem,env(safe-area-inset-bottom))] pointer-events-auto flex items-center justify-around"
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
            className={`text-[11px] tracking-tight mt-0.5 transition-colors duration-200 ${
              viewMode === 'timeline'
                ? 'font-semibold text-[#1A73E8] dark:text-[#50A7EA]'
                : 'font-medium text-slate-500 dark:text-slate-400'
            }`}
          >
            Timeline
          </span>
        </button>

        {/* 3. Fleet Modal Button with Live Online Badge */}
        <button
          onClick={() => onOpenFleetModal()}
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

        {/* 4. Storage Quota Button */}
        <button
          onClick={onOpenStorageModal}
          className="flex flex-col items-center justify-center flex-1 py-1 group transition-transform active:scale-95"
        >
          <div className="w-14 h-7.5 rounded-full flex items-center justify-center transition-all duration-200 text-slate-500 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white group-hover:bg-slate-100/80 dark:group-hover:bg-slate-800/50">
            <HardDrive className="w-5 h-5 stroke-[1.8]" />
          </div>
          <span className="text-[11px] font-mono font-medium text-slate-500 dark:text-slate-400 tracking-tight mt-0.5 group-hover:text-slate-900 dark:group-hover:text-white transition-colors">
            {mbUsed}MB
          </span>
        </button>
      </nav>
    </>
  );
};
