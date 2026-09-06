import React from 'react';
import { useItems } from '../../context/ItemContext';
import { ItemCard } from '../ItemCard';
import { Calendar } from 'lucide-react';
import { UniItem } from '../../types';

interface TimelineViewProps {
  onOpenMedia: (url: string, title: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({ onOpenMedia }) => {
  const { items, searchQuery } = useItems();

  const filtered = items.filter((item) => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        item.title?.toLowerCase().includes(q) ||
        item.content?.toLowerCase().includes(q) ||
        item.device_name?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const groupItemsByDate = (list: UniItem[]) => {
    const today: UniItem[] = [];
    const yesterday: UniItem[] = [];
    const thisWeek: UniItem[] = [];
    const earlier: UniItem[] = [];

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfYesterday = startOfToday - 86400000;
    const startOfThisWeek = startOfToday - 6 * 86400000;

    for (const item of list) {
      const itemTime = new Date(item.created_at).getTime();
      if (itemTime >= startOfToday) {
        today.push(item);
      } else if (itemTime >= startOfYesterday) {
        yesterday.push(item);
      } else if (itemTime >= startOfThisWeek) {
        thisWeek.push(item);
      } else {
        earlier.push(item);
      }
    }

    return [
      { label: 'Today', items: today },
      { label: 'Yesterday', items: yesterday },
      { label: 'This Week', items: thisWeek },
      { label: 'Earlier', items: earlier },
    ].filter((g) => g.items.length > 0);
  };

  const groups = groupItemsByDate(filtered);

  return (
    <div className="max-w-5xl mx-auto space-y-8 py-2">
      {groups.length > 0 ? (
        groups.map((group) => (
          <section key={group.label} className="relative pl-6 sm:pl-8 border-l border-border/80 space-y-4">
            {/* Timeline Dot Indicator */}
            <div className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />

            {/* Date Group Heading */}
            <div className="flex items-center gap-2 text-xs font-semibold text-text-main">
              <Calendar className="w-3.5 h-3.5 text-text-muted" />
              <span>{group.label}</span>
              <span className="text-[11px] font-mono font-normal text-text-faint">
                ({group.items.length})
              </span>
            </div>

            {/* Responsive Grid for this date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {group.items.map((item) => (
                <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="text-center py-20 text-text-muted text-xs">
          No items found in timeline.
        </div>
      )}
    </div>
  );
};
