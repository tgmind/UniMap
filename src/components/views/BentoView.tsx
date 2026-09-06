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

  const typePills: { id: ItemType | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'html', label: 'HTML Docs', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'media', label: 'Media', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'code', label: 'Code', icon: <Code className="w-3.5 h-3.5" /> },
    { id: 'text', label: 'Notes', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'link', label: 'Links', icon: <Link2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-5">
      {/* Control Bar: Filters & Device Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-border/40">
        {/* Type Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {typePills.map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedType(pill.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all ${
                selectedType === pill.id
                  ? 'bg-primary text-primary-text shadow-sm'
                  : 'text-text-muted hover:text-text-main hover:bg-surface-elevated'
              }`}
            >
              {pill.icon}
              <span>{pill.label}</span>
            </button>
          ))}
        </div>

        {/* Device Filter Dropdown */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-text-muted flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-text-faint" />
            <span className="hidden sm:inline">Device:</span>
          </span>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="bg-surface-elevated/70 border border-border text-xs text-text-main px-3 py-1.5 rounded-xl focus:outline-none focus:border-border-strong cursor-pointer"
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

      {/* Grid of Items */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4.5">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
          ))}
        </div>
      ) : (
        /* Minimalist Clean Empty State */
        <div className="py-20 text-center rounded-2xl bg-surface/50 border border-border space-y-3 max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-surface-elevated border border-border flex items-center justify-center mx-auto text-text-muted">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-text-main">No study items found</h3>
            <p className="text-xs text-text-muted max-w-xs mx-auto mt-1">
              Add your first HTML calculator, formula sheet, whiteboard photo, or code snippet to start cross-device sync.
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Item</span>
          </button>
        </div>
      )}
    </div>
  );
};
