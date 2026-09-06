import React, { useState, useEffect } from 'react';
import { ItemCard } from '../ItemCard';
import { MessengerComposer } from '../MessengerComposer';
import { useItems } from '../../context/ItemContext';
import { UniItem } from '../../types';
import { Sparkles, Plus, Pin, ChevronDown } from 'lucide-react';

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
  const { items, searchQuery } = useItems();
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Search filter (if user searches via header)
  const filtered = items.filter((item) => {
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

  // Track scroll position to show/hide the floating scroll-to-bottom arrow
  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const windowHeight = window.innerHeight;
      const documentHeight = document.documentElement.scrollHeight;
      // Show arrow if page is scrollable and user is scrolled up (not near the bottom)
      const isScrollable = documentHeight > windowHeight + 120;
      const isNotNearBottom = scrollY + windowHeight < documentHeight - 160;
      setShowScrollBottom(isScrollable && isNotNearBottom);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleScroll);
    };
  }, [filtered.length]);

  const scrollToBottom = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight,
      behavior: 'smooth',
    });
  };

  // Separate pinned items from chronological items
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
    <div className="space-y-4 pt-1">
      {/* Telegram Message Stream with Distant Background & 5% Side Margins */}
      {filtered.length > 0 ? (
        <div className="space-y-5 pb-2 px-[5%] sm:px-6 max-w-4xl mx-auto">
          {/* Pinned Messages Section */}
          {pinnedItems.length > 0 && (
            <section className="space-y-3">
              {/* Telegram Center Date / Pinned Pill */}
              <div className="flex justify-center my-2">
                <span className="px-3.5 py-1 rounded-full text-xs font-medium bg-[#2481CC] text-white shadow-xs select-none flex items-center gap-1.5">
                  <Pin className="w-3 h-3" />
                  <span>Pinned Messages ({pinnedItems.length})</span>
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pinnedItems.map((item) => (
                  <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
                ))}
              </div>
            </section>
          )}

          {/* Chronological Date Groups with In-Flow Telegram Date Badges (Zero Overlap Collision) */}
          {dateGroups.map((group) => (
            <section key={group.key} className="space-y-3">
              {/* Natural In-Flow Telegram Date Badge */}
              <div className="flex justify-center my-3 select-none">
                <span className="px-3.5 py-0.5 rounded-full text-xs font-medium bg-black/40 dark:bg-white/20 text-white backdrop-blur-md shadow-xs">
                  {group.label}
                </span>
              </div>

              {/* Message Cards Stream (5% Margin on Sides, Narrower & Centered) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              Paste your exam notifications, study notes, or WhatsApp/Telegram updates below to save them.
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

      {/* Floating Scroll to Bottom Arrow Button */}
      {showScrollBottom && (
        <button
          onClick={scrollToBottom}
          title="Scroll to bottom"
          aria-label="Scroll to bottom"
          className="fixed right-4 sm:right-8 bottom-32 sm:bottom-22 z-30 w-11 h-11 rounded-full bg-surface/95 dark:bg-[#182533]/95 border border-border/80 shadow-xl flex items-center justify-center text-[#2481CC] dark:text-[#50A7EA] backdrop-blur-md transition-all duration-200 hover:scale-110 active:scale-95 animate-fade-in group"
        >
          <ChevronDown className="w-5 h-5 stroke-[2.5] group-hover:translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* Pinned Bottom Telegram Input Bar */}
      <div className="sticky bottom-16 sm:bottom-4 z-20 pt-2 pb-1 px-[5%] sm:px-6 max-w-4xl mx-auto">
        <MessengerComposer />
      </div>
    </div>
  );
};
