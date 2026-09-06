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

  // Separate pinned items from date-grouped items
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

      if (itemDateStr === todayDateStr) {
        key = 'today';
        label = 'Today';
      } else if (itemDateStr === yesterdayDateStr) {
        key = 'yesterday';
        label = 'Yesterday';
      } else {
        const y = itemDate.getFullYear();
        const isCurrentYear = y === now.getFullYear();
        const monthDay = itemDate.toLocaleDateString(undefined, {
          month: 'long',
          day: 'numeric',
        });
        key = itemDate.toISOString().slice(0, 10);
        label = isCurrentYear ? monthDay : `${monthDay}, ${y}`;
      }

      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          key,
          label,
          items: [],
        });
      }
      groupsMap.get(key)!.items.push(item);
    }

    return Array.from(groupsMap.values());
  };

  const dateGroups = groupItemsByDate(unpinnedItems);

  return (
    <div className="space-y-4">
      {/* Floating Filter Bar */}
      <div
        className={`sticky top-0 z-20 py-2 -mx-3 sm:-mx-6 px-3 sm:px-6 transition-all duration-300 ease-out ${
          isPanelVisible
            ? 'translate-y-0 opacity-100 pointer-events-auto'
            : '-translate-y-full opacity-0 pointer-events-none'
        }`}
      >
        <div className="flex items-center justify-between gap-2 max-w-7xl mx-auto bg-surface/85 backdrop-blur-xl px-3 py-1.5 rounded-2xl shadow-sm border border-border/60">
          {/* Scrollable Category Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 min-w-0">
            {typePills.map((pill) => {
              const isSelected = selectedType === pill.id;
              return (
                <button
                  key={pill.id}
                  onClick={() => setSelectedType(pill.id)}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all active:scale-95 shrink-0 ${
                    isSelected
                      ? 'bg-[#2481CC] text-white font-semibold shadow-xs'
                      : 'bg-surface-elevated/80 text-text-muted hover:text-text-main border border-border/40'
                  }`}
                >
                  {pill.icon}
                  <span>{pill.label}</span>
                  <span
                    className={`text-[10px] font-mono px-1 rounded-full ${
                      isSelected ? 'text-white/80' : 'text-text-faint'
                    }`}
                  >
                    {counts[pill.id]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Compact Fleet Dropdown */}
          <div className="shrink-0">
            <div className="relative">
              <Filter className="w-3 h-3 text-text-faint absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="bg-surface-elevated/80 border border-border/50 text-xs text-text-main font-medium pl-7 pr-3 py-1 rounded-full focus:outline-none focus:border-[#2481CC] cursor-pointer shadow-2xs max-w-[120px] sm:max-w-[160px] truncate"
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

      {/* Telegram Message Stream with Distant Background */}
      {filtered.length > 0 ? (
        <div className="space-y-6 pb-2">
          {/* Pinned Messages Section */}
          {pinnedItems.length > 0 && (
            <section className="space-y-3">
              {/* Telegram Floating Center Date Pill */}
              <div className="flex justify-center my-2">
                <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#2481CC] text-white shadow-xs select-none flex items-center gap-1.5">
                  <Pin className="w-3 h-3" />
                  <span>Pinned Messages ({pinnedItems.length})</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5 max-w-7xl mx-auto">
                {pinnedItems.map((item) => (
                  <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
                ))}
              </div>
            </section>
          )}

          {/* Date-Grouped Message Sections */}
          {dateGroups.map((group) => (
            <section key={group.key} className="space-y-3">
              {/* Telegram Iconic Floating Center Date Pill */}
              <div className="flex justify-center my-2.5 sticky top-14 z-10 pointer-events-none">
                <span className="px-3 py-0.5 rounded-full text-xs font-medium bg-black/40 dark:bg-white/20 text-white backdrop-blur-md shadow-xs select-none pointer-events-auto">
                  {group.label}
                </span>
              </div>

              {/* Message Cards Stream */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4.5 max-w-7xl mx-auto">
                {group.items.map((item) => (
                  <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="py-20 px-4 text-center rounded-3xl bg-surface/90 border border-border/80 space-y-4 max-w-md mx-auto shadow-sm">
          <div className="w-12 h-12 rounded-full bg-[#2481CC]/10 text-[#2481CC] flex items-center justify-center mx-auto shadow-2xs">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">No messages in vault</h3>
            <p className="text-xs text-text-muted max-w-xs mx-auto mt-1 leading-relaxed">
              Paste your lecture notes, WhatsApp study materials, or Telegram updates below to save them.
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2481CC] hover:bg-[#1E70B0] text-white text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Create Item</span>
          </button>
        </div>
      )}

      {/* Pinned Bottom Telegram Input Bar */}
      <div className="sticky bottom-16 sm:bottom-4 z-20 pt-2 pb-1">
        <MessengerComposer />
      </div>
    </div>
  );
};
