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
      {/* Floating Action Button (FAB) for Thumb Ergonomics */}
      <button
        onClick={onOpenAddModal}
        title="Add New Study Item"
        aria-label="Add New Study Item"
        className="fixed bottom-20 right-4 z-40 md:hidden w-14 h-14 rounded-2xl bg-primary hover:bg-primary-hover text-primary-text shadow-xl shadow-primary/35 flex items-center justify-center transition-transform active:scale-90"
      >
        <Plus className="w-6 h-6 stroke-[2.5]" />
      </button>

      {/* Fixed Bottom Glassmorphic Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 md:hidden bg-surface/90 backdrop-blur-xl border-t border-border/80 px-2 py-1.5 flex items-center justify-around select-none">
        <button
          onClick={() => setViewMode('bento')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            viewMode === 'bento'
              ? 'text-primary font-semibold'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              viewMode === 'bento' ? 'bg-primary/10' : ''
            }`}
          >
            <LayoutGrid className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Grid</span>
        </button>

        <button
          onClick={() => setViewMode('timeline')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            viewMode === 'timeline'
              ? 'text-primary font-semibold'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              viewMode === 'timeline' ? 'bg-primary/10' : ''
            }`}
          >
            <Clock className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Timeline</span>
        </button>

        <button
          onClick={() => setViewMode('canvas')}
          className={`flex flex-col items-center gap-1 py-1 px-3 rounded-xl transition-all ${
            viewMode === 'canvas'
              ? 'text-primary font-semibold'
              : 'text-text-muted hover:text-text-main'
          }`}
        >
          <div
            className={`p-1 rounded-lg transition-colors ${
              viewMode === 'canvas' ? 'bg-primary/10' : ''
            }`}
          >
            <Compass className="w-5 h-5" />
          </div>
          <span className="text-[10px] tracking-tight">Canvas</span>
        </button>

        <button
          onClick={onOpenFleetModal}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-text-muted hover:text-text-main transition-all"
        >
          <div className="p-1 rounded-lg relative">
            <Laptop className="w-5 h-5" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 absolute top-1 right-1" />
          </div>
          <span className="text-[10px] tracking-tight">Fleet</span>
        </button>

        <button
          onClick={onOpenStorageModal}
          className="flex flex-col items-center gap-1 py-1 px-3 rounded-xl text-text-muted hover:text-text-main transition-all"
        >
          <div className="p-1 rounded-lg">
            <HardDrive className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-mono tracking-tight">{mbUsed}MB</span>
        </button>
      </nav>
    </>
  );
};
