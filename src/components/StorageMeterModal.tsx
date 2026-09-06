import React from 'react';
import { HardDrive, X, Database, Zap, Trash2, Download, Image as ImageIcon, Globe, Code, FileText } from 'lucide-react';
import { useItems } from '../context/ItemContext';
import { downloadItem } from '../lib/downloadHelper';

interface StorageMeterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageMeterModal: React.FC<StorageMeterModalProps> = ({ isOpen, onClose }) => {
  const { storageQuota, items, deleteItem } = useItems();

  if (!isOpen) return null;

  const totalMb = (storageQuota.totalBytes / (1024 * 1024)).toFixed(1);
  const maxMb = (storageQuota.maxBytes / (1024 * 1024)).toFixed(0);
  const percentUsed = Math.min(100, (storageQuota.totalBytes / storageQuota.maxBytes) * 100);

  const dbMb = (storageQuota.dbBytes / (1024 * 1024)).toFixed(1);
  const maxDbMb = (storageQuota.maxDbBytes / (1024 * 1024)).toFixed(0);
  const dbPercentUsed = Math.min(100, (storageQuota.dbBytes / storageQuota.maxDbBytes) * 100);

  const sortedBySize = [...items].sort((a, b) => (b.file_size || 0) - (a.file_size || 0));

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl p-6 shadow-xl overflow-hidden max-h-[90vh] flex flex-col space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h2 className="text-base font-semibold text-text-main">Storage & Usage</h2>
            <p className="text-xs text-text-muted mt-0.5">Real-time status of your free cloud quota</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-faint hover:text-text-main hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Gauges */}
        <div className="space-y-4 overflow-y-auto flex-1 pr-1">
          {/* File Storage */}
          <div className="p-4 rounded-xl bg-surface-elevated/60 border border-border space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-main flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-accent" />
                Media & HTML Storage
              </span>
              <span className="font-mono text-text-muted">{percentUsed.toFixed(1)}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-surface border border-border overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${percentUsed > 85 ? 'bg-red-500' : 'bg-primary'}`}
                style={{ width: `${Math.max(2, percentUsed)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-text-faint font-mono">
              <span>{totalMb} MB used</span>
              <span>{maxMb} MB free limit</span>
            </div>
          </div>

          {/* Database Storage */}
          <div className="p-4 rounded-xl bg-surface-elevated/60 border border-border space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-text-main flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-primary" />
                Database Storage
              </span>
              <span className="font-mono text-text-muted">{dbPercentUsed.toFixed(1)}%</span>
            </div>

            <div className="w-full h-2 rounded-full bg-surface border border-border overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${dbPercentUsed > 85 ? 'bg-red-500' : 'bg-accent'}`}
                style={{ width: `${Math.max(2, dbPercentUsed)}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-xs text-text-faint font-mono">
              <span>{dbMb} MB used</span>
              <span>{maxDbMb} MB limit</span>
            </div>
          </div>

          {/* Largest Files Table */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-text-main">Largest Files</span>
              <span className="text-text-faint">Download then delete to reclaim space</span>
            </div>

            <div className="rounded-xl border border-border bg-surface-elevated/40 divide-y divide-border/60 overflow-hidden">
              {sortedBySize.slice(0, 5).map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-surface-elevated transition-colors">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-medium text-text-main text-break-word">{item.title}</p>
                    <p className="text-[11px] text-text-faint flex items-center gap-1.5">
                      <span className="capitalize">{item.type}</span>
                      <span>•</span>
                      <span>{item.device_name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="font-mono text-[11px] text-text-muted">{formatBytes(item.file_size)}</span>
                    <button
                      onClick={() => downloadItem(item)}
                      title="Download"
                      className="p-1 rounded text-text-faint hover:text-text-main transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      title="Delete"
                      className="p-1 rounded text-text-faint hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-border/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-xs font-medium text-text-main transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
