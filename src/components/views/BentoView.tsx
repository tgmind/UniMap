import React from 'react';
import { ItemCard } from '../ItemCard';
import { useItems } from '../../context/ItemContext';
import { ItemType } from '../../types';
import { Globe, Image as ImageIcon, FileText, Code, Link2, Sparkles, Filter, Laptop } from 'lucide-react';

interface BentoViewProps {
  onOpenAddModal: () => void;
  onOpenMedia: (url: string, title: string) => void;
}

export const BentoView: React.FC<BentoViewProps> = ({ onOpenAddModal, onOpenMedia }) => {
  const { items, selectedType, setSelectedType, selectedDevice, setSelectedDevice, searchQuery } = useItems();

  // Filter items
  const filtered = items.filter((item) => {
    // Type filter
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    // Device filter
    if (selectedDevice !== 'all' && item.device_name !== selectedDevice) return false;
    // Search query
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

  // Unique devices for filter dropdown
  const uniqueDevices = Array.from(new Set(items.map((i) => i.device_name).filter(Boolean)));

  const typePills: { id: ItemType | 'all'; label: string; icon: React.ReactNode }[] = [
    { id: 'all', label: 'All Items', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'html', label: 'HTML Docs', icon: <Globe className="w-3.5 h-3.5" /> },
    { id: 'media', label: 'Media & Images', icon: <ImageIcon className="w-3.5 h-3.5" /> },
    { id: 'code', label: 'Code Snippets', icon: <Code className="w-3.5 h-3.5" /> },
    { id: 'text', label: 'Notes', icon: <FileText className="w-3.5 h-3.5" /> },
    { id: 'link', label: 'Links', icon: <Link2 className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Filter and Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-2xl bg-surface border border-border">
        {/* Type Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {typePills.map((pill) => (
            <button
              key={pill.id}
              onClick={() => setSelectedType(pill.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
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
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Device:</span>
          </div>
          <select
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="bg-surface-elevated border border-border text-xs text-text-main px-3 py-1.5 rounded-xl focus:outline-none focus:border-primary cursor-pointer"
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

      {/* Grid of Cards */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((item) => (
            <ItemCard key={item.id} item={item} onOpenMedia={onOpenMedia} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="p-12 text-center rounded-3xl bg-surface border border-dashed border-border space-y-4 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto text-primary">
            <Sparkles className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-base font-bold text-text-main">No study items found</h3>
            <p className="text-xs text-text-muted mt-1">
              Save your first HTML document, whiteboard photo, code snippet, or lecture note to begin cross-device sync.
            </p>
          </div>
          <button
            onClick={onOpenAddModal}
            className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-glow-sm transition-all"
          >
            Add New Item
          </button>
        </div>
      )}
    </div>
  );
};
