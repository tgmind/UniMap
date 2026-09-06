import React, { useState, useEffect, useRef } from 'react';
import { ItemCard } from '../ItemCard';
import { MessengerComposer } from '../MessengerComposer';
import { useItems } from '../../context/ItemContext';
import { ItemType, UniItem } from '../../types';
import {
  Globe,
  Image as ImageIcon,
  FileText,
  Code,
  Link2,
  Sparkles,
  Filter,
  Plus,
  Pin,
} from 'lucide-react';

interface BentoViewProps {
  onOpenAddModal: () => void;
  onOpenMedia: (url: string, title: string) => void;
}

interface DateGroup {
  key: string;
  label: string;
  watermark: string;
  subLabel?: string;
  items: UniItem[];
}

export const BentoView: React.FC<BentoViewProps> = ({ onOpenAddModal, onOpenMedia }) => {
  const { items, selectedType, setSelectedType, selectedDevice, setSelectedDevice, searchQuery } =
    useItems();

  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Intelligently auto-hide the filter panel on scroll-down to grant 100% full-screen card immersion
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      if (currentScrollY <= 25) {
        setIsPanelVisible(true);
      } else if (currentScrollY > lastScrollY.current + 8) {
        // User scrolling down: hide filter panel
        setIsPanelVisible(false);
      } else if (currentScrollY < lastScrollY.current - 12) {
        // User scrolling up: reveal filter panel smoothly
        setIsPanelVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter items based on type, device, and search query
  const filtered = items.filter((item) => {
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    if (selectedDevice !== 'all' && item.device_name !== selectedDevice) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title?.toLowerCase().includes(q);
      const matchContent = item.content?.toLowerCase().includes(q);
      const matchDevice = item.device_name?.toLowerCase().includes(q);
      const matchTags = item.metadata?.tags?.some((t) => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchDevice && !matchTags) return false;
    }
    return true;
  });

  const uniqueDevices = Array.from(new Set(items.map((i) => i.device_name).filter(Boolean)));

  const counts: Record<ItemType | 'all', number> = {
    all: items.length,
    html: items.filter((i) => i.type === 'html').length,
    media: items.filter((i) => i.type === 'media').length,
    code: items.filter((i) => i.type === 'code').length,
    text: items.filter((i) => i.type === 'text').length,
    link: items.filter((i) => i.type === 'link').length,
  };

  const typePills: { id: ItemType | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'text', label: 'Notes', icon: <FileText className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'link', label: 'Links', icon: <Link2 className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'media', label: 'Media', icon: <ImageIcon className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'code', label: 'Code', icon: <Code className="w-3.5 h-3.5 text-violet-400" /> },
    { id: 'html', label: 'HTML', icon: <Globe className="w-3.5 h-3.5 text-sky-400" /> },
  ];

  // Organize items by pinned vs date groups
  const pinnedItems = filtered.filter((i) => i.is_pinned);
  const unpinnedItems = filtered.filter((i) => !i.is_pinned);

  const groupItemsByDate = (list: UniItem[]): DateGroup[] => {
    const sorted = [...list].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    const now = new Date();
    const todayDateStr = now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const yesterdayDateStr = yesterday.toDateString();

    const groupsMap = new Map<string, DateGroup>();

    for (const item of sorted) {
      const itemDate = new Date(item.created_at);
      const itemDateStr = itemDate.toDateString();

      let key = '';
      let label = '';
      let watermark = '';
      let subLabel = '';

      if (itemDateStr === todayDateStr) {
        key = 'today';
        label = 'Today';
        watermark = 'TODAY';
        subLabel = itemDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } else if (itemDateStr === yesterdayDateStr) {
        key = 'yesterday';
        label = 'Yesterday';
        watermark = 'YESTERDAY';
        subLabel = itemDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } else {
        const y = itemDate.getFullYear();
        const isCurrentYear = y === now.getFullYear();
        const monthDay = itemDate.toLocaleDateString(undefined, {
          month: 'short',
          day: 'numeric',
        });
        key = itemDate.toISOString().slice(0, 10);
        label = isCurrentYear ? monthDay : `${monthDay}, ${y}`;
        watermark =
          itemDate.toLocaleDateString(undefined, { month: 'short' }).toUpperCase() +
          ' ' +
          itemDate.getDate();
        subLabel = itemDate.toLocaleDateString(undefined, { weekday: 'short' });
      }

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          label,
          watermark,
          subLabel,
          items: [],
        });
      }
      groupsMap.get(key)!.items.push(item);
    }

    return Array.from(groupsMap.values());
  };

  const dateGroups = groupItemsByDate(unpinnedItems);

  return (
    <div className="space-y-6">
      {/* Intelligently Hiding & Compact Filter Panel */}
      <div
        className={`sticky top-0 z-20 py-2 -mx-3 sm:-mx-6 px-3 sm:px-6 bg-background/90 backdrop-blur-xl border-b border-border/60 transition-all duration-300 ease-out ${
          isPanelVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Compact Single-Row Category Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 min-w-0">
            {typePills.map((pill) => {
              const isSelected = selectedType === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setSelectedType(pill.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 shrink-0 ${
                    isSelected
                      ? 'bg-primary text-primary-text shadow-sm shadow-primary/20'
                      : 'bg-surface-elevated/80 text-text-muted hover:text-text-main hover:bg-surface-elevated border border-border/60'
                  }`}
                >
                  {pill.icon}
                  <span className="truncate">{pill.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-surface text-text-faint'
                    }`}
                  >
                    {counts[pill.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Compact Device Fleet Selector */}
          <div className="shrink-0">
            <div className="relative">
              <Filter className="w-3 h-3 text-text-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="bg-surface-elevated/90 border border-border/60 text-xs text-text-main font-medium pl-7 pr-3 py-1.5 rounded-xl focus:outline-none focus:border-primary cursor-pointer shadow-2xs max-w-[130px] sm:max-w-[200px] truncate"
              >
                <option value="all">Fleet: All ({items.length})</option>
                {uniqueDevices.map((dev) => (
                  <option key={dev} value={dev}>
                    {dev}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Items: Organized by Dates Embedded in Background with Ample Separation */}
      {filtered.length > 0 ? (
        <div className="space-y-12 sm:space-y-16 pt-2">
          {/* Dedicated Pinned Section (if any items are pinned) */}
          {pinnedItems.length > 0 && (
            <section className="relative group">
              {/* Background Watermark Embedded Typography */}
              <div className="absolute -top-6 sm:-top-8 left-1 select-none pointer-events-none text-5xl sm:text-7xl font-black font-mono tracking-tighter text-primary/[0.04] dark:text-primary/[0.05] uppercase">
                PINNED
              </div>

              {/* Foreground Header with Ample Separation */}
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-primary/10 border border-primary/25 text-primary font-mono tracking-wide shadow-2xs backdrop-blur-md flex items-center gap-1.5">
                  <Pin className="w-3.5 h-3.5" />
                  <span>Pinned to Vault</span>
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-primary/30 via-border/50 to-transparent" />
                <span className="text-[11px] text-text-faint font-mono font-medium">
                  {pinnedItems.length} {pinnedItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Grid of Pinned Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
                {pinnedItems.map((item) => (
                  <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
                ))}
              </div>
            </section>
          )}

          {/* Date-Organized Groups */}
          {dateGroups.map((group) => (
            <section key={group.key} className="relative group">
              {/* Background Watermark Typography Embedded Directly Behind Cards */}
              <div className="absolute -top-6 sm:-top-8 left-1 select-none pointer-events-none text-5xl sm:text-7xl font-black font-mono tracking-tighter text-text-main/[0.03] dark:text-text-main/[0.04] uppercase">
                {group.watermark}
              </div>

              {/* Foreground Floating Date Header */}
              <div className="flex items-center gap-3 mb-5 sm:mb-6">
                <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-surface-elevated/90 border border-border/80 text-text-muted font-mono tracking-wide shadow-2xs backdrop-blur-md flex items-center gap-2">
                  <span>{group.label}</span>
                  {group.subLabel && (
                    <span className="text-[10px] text-text-faint font-normal opacity-75">
                      • {group.subLabel}
                    </span>
                  )}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-border/70 via-border/30 to-transparent" />
                <span className="text-[11px] text-text-faint font-mono font-medium">
                  {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Grid Cards with Ample Breathing Room */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
                {group.items.map((item) => (
                  <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* Minimalist Clean Empty State */
        <div className="py-20 px-4 text-center rounded-3xl bg-surface/60 border border-border space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-text-muted shadow-2xs">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-text-main">No study items found</h3>
            <p className="text-xs text-text-muted max-w-xs mx-auto mt-1 leading-relaxed">
              Add your first HTML calculator, formula sheet, whiteboard photo, or code snippet to start cross-device sync.
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-sm transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Item</span>
          </button>
        </div>
      )}

      {/* Pinned Bottom Messenger Typing Bar (WhatsApp / Instagram Style) */}
      <div className="sticky bottom-16 sm:bottom-4 z-20 pt-2 pb-1">
        <MessengerComposer />
      </div>
    </div>
  );
};
