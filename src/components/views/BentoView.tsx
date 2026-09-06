import React from 'react';
import { ItemCard } from '../ItemCard';
import { useItems } from '../../context/ItemContext';
import { ItemType } from '../../types';
import { Globe, Image as ImageIcon, FileText, Code, Link2, Sparkles, Filter, Plus } from 'lucide-react';

interface BentoViewProps {
  onOpenAddModal: () => void;
  onOpenMedia: (url: string, title: string) => void;
}

export const BentoView: React.FC<BentoViewProps> = ({ onOpenAddModal, onOpenMedia }) => {
  const { items, selectedType, setSelectedType, selectedDevice, setSelectedDevice, searchQuery } = useItems();

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
    { id: 'all', label: 'All Items', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'html', label: 'HTML Docs', icon: <Globe className="w-3.5 h-3.5 text-sky-400" /> },
    { id: 'code', label: 'Code', icon: <Code className="w-3.5 h-3.5 text-violet-400" /> },
    { id: 'media', label: 'Media', icon: <ImageIcon className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'text', label: 'Notes', icon: <FileText className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'link', label: 'Links', icon: <Link2 className="w-3.5 h-3.5 text-emerald-400" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Control Bar: Filters & Device Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 pb-3 border-b border-border/60">
        {/* Type Filter Tabs with Smooth Mobile Scroller */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth py-1 -my-1">
          {typePills.map((pill) => {
            const isSelected = selectedType === pill.id;
            return (
              <button
                key={pill.id}
                onClick={() => setSelectedType(pill.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all active:scale-95 ${
                  isSelected
                    ? 'bg-primary text-primary-text shadow-sm shadow-primary/20'
                    : 'bg-surface-elevated/70 text-text-muted hover:text-text-main hover:bg-surface-elevated border border-border/60'
                }`}
              >
                {pill.icon}
                <span>{pill.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-surface text-text-faint'
                  }`}
                >
                  {counts[pill.id]}
                </span>
              </button>
            );
          })}
        </div>

        {/* Device Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0 self-start sm:self-auto">
          <span className="text-xs text-text-muted flex items-center gap-1.5 font-medium">
            <Filter className="w-3.5 h-3.5 text-text-faint" />
            <span className="hidden sm:inline">Fleet:</span>
          </span>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="bg-surface-elevated border border-border text-xs text-text-main font-medium px-3 py-1.5 rounded-xl focus:outline-none focus:border-primary cursor-pointer shadow-2xs"
          >
            <option value="all">All Synced Devices ({items.length})</option>
            {uniqueDevices.map((dev) => (
              <option key={dev} value={dev}>
                {dev}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Items with Generous Responsive Spacing */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 lg:gap-7">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
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
    </div>
  );
};
