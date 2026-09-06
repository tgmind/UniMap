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
  subLabel?: string;
  items: UniItem[];
}

export const BentoView: React.FC<BentoViewProps> = ({ onOpenAddModal, onOpenMedia }) => {
  const { items, selectedType, setSelectedType, selectedDevice, setSelectedDevice, searchQuery } =
    useItems();

  const [isPanelVisible, setIsPanelVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Auto-hide filter bar on scroll-down for full screen immersion, reveal on scroll-up or top
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;
      if (currentScrollY <= 25) {
        setIsPanelVisible(true);
      } else if (currentScrollY > lastScrollY.current + 8) {
        setIsPanelVisible(false);
      } else if (currentScrollY < lastScrollY.current - 12) {
        setIsPanelVisible(true);
      }
      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Filter items
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
    { id: 'text', label: 'Notes', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'link', label: 'Links', icon: <Link2 className="w-3.5 h-3.5" /> },
    { id: 'media', label: 'Media', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'code', label: 'Code', icon: <Code className="w-3.5 h-3.5" /> },
    { id: 'html', label: 'HTML', icon: <Globe className="w-3.5 h-3.5" /> },
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
      let subLabel = '';

      if (itemDateStr === todayDateStr) {
        key = 'today';
        label = 'Today';
        subLabel = itemDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      } else if (itemDateStr === yesterdayDateStr) {
        key = 'yesterday';
        label = 'Yesterday';
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
        subLabel = itemDate.toLocaleDateString(undefined, { weekday: 'short' });
      }

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          label,
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
      {/* Sleek, Modern Auto-Hiding Filter Strip */}
      <div
        className={`sticky top-0 z-20 py-2.5 -mx-3 sm:-mx-6 px-3 sm:px-6 bg-background/95 backdrop-blur-xl border-b border-border/50 transition-all duration-300 ease-out ${
          isPanelVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-3 max-w-7xl mx-auto">
          {/* Scrollable Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 min-w-0">
            {typePills.map((pill) => {
              const isSelected = selectedType === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setSelectedType(pill.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-95 shrink-0 ${
                    isSelected
                      ? 'bg-primary text-primary-text font-semibold shadow-xs'
                      : 'bg-surface border border-border text-text-muted hover:text-text-main hover:bg-surface-elevated'
                  }`}
                >
                  {pill.icon}
                  <span>{pill.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded-full ${
                      isSelected ? 'text-primary-text/80' : 'text-text-faint'
                    }`}
                  >
                    {counts[pill.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Compact Device Selector */}
          <div className="shrink-0">
            <div className="relative">
              <Filter className="w-3 h-3 text-text-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="bg-surface border border-border text-xs text-text-main font-medium pl-7 pr-3 py-1.5 rounded-full focus:outline-none focus:border-primary cursor-pointer shadow-2xs max-w-[130px] sm:max-w-[180px] truncate"
              >
                <option value="all">All Devices ({items.length})</option>
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

      {/* Grid of Items: Clean Date Sections with Ample Separation & No Broken Watermarks */}
      {filtered.length > 0 ? (
        <div className="space-y-8 sm:space-y-10 pt-1">
          {/* Dedicated Pinned Section */}
          {pinnedItems.length > 0 && (
            <section className="space-y-4">
              <div className="flex items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                  <Pin className="w-3 h-3" />
                  <span>Pinned</span>
                </span>
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[11px] font-mono text-text-faint">
                  {pinnedItems.length} {pinnedItems.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {pinnedItems.map((item) => (
                  <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
                ))}
              </div>
            </section>
          )}

          {/* Chronological Date Groups */}
          {dateGroups.map((group) => (
            <section key={group.key} className="space-y-4">
              {/* Clean, Professional Section Divider */}
              <div className="flex items-center gap-2.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-text-muted font-mono">
                    {group.label}
                  </span>
                  {group.subLabel && (
                    <span className="text-[11px] font-mono text-text-faint opacity-80">
                      • {group.subLabel}
                    </span>
                  )}
                </div>
                <div className="h-px flex-1 bg-border/60" />
                <span className="text-[11px] font-mono text-text-faint">
                  {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                </span>
              </div>

              {/* Grid of Cards with Generous Spacing */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
                {group.items.map((item) => (
                  <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* Minimalist Clean Empty State */
        <div className="py-20 px-4 text-center rounded-3xl bg-surface border border-border space-y-4 max-w-lg mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-primary shadow-2xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-text-main">No study items found</h3>
            <p className="text-xs text-text-muted max-w-xs mx-auto mt-1 leading-relaxed">
              Create your first note, paste links, or upload media to begin seamless cross-device synchronization.
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Item</span>
          </button>
        </div>
      )}

      {/* Floating Messenger Capsule Composer */}
      <div className="sticky bottom-16 sm:bottom-4 z-20 pt-2 pb-1">
        <MessengerComposer />
      </div>
    </div>
  );
};
