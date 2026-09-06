import React from 'react';
import { useItems } from '../../context/ItemContext';
import { ItemCard } from '../ItemCard';
import { Clock, Calendar } from 'lucide-react';
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

  // Group items by relative date bucket
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
      { label: 'Earlier Exam Notes', items: earlier },
    ].filter((g) => g.items.length > 0);
  };

  const groups = groupItemsByDate(filtered);

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      {groups.length > 0 ? (
        groups.map((group) => (
          <div key={group.label} className="relative pl-6 sm:pl-8 border-l-2 border-border/80 space-y-4">
            {/* Timeline Pin Node */}
            <div className="absolute -left-[9px] top-0.5 w-4 h-4 rounded-full bg-surface border-2 border-primary flex items-center justify-center">
              <div className="w-1.5 h-1.5 rounded-full bg-primary" />
            </div>

            {/* Section Header */}
            <div className="flex items-center gap-2 text-xs font-bold text-text-main uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5 text-accent" />
              <span>{group.label}</span>
              <span className="text-[10px] font-mono font-normal text-text-muted px-2 py-0.5 rounded-full bg-surface border border-border">
                {group.items.length} items
              </span>
            </div>

            {/* Items Grid for this date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {group.items.map((item) => (
                <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="text-center py-12 text-text-muted text-xs">
          No items found matching the timeline filter.
        </div>
      )}
    </div>
  );
};
