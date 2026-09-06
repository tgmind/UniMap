import React from 'react';
import { HardDrive, X, Database, Zap, Trash2, Download, AlertTriangle, CheckCircle, FileText, Image as ImageIcon, Code, Globe } from 'lucide-react';
import { useItems } from '../context/ItemContext';
import { downloadItem } from '../lib/downloadHelper';

interface StorageMeterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const StorageMeterModal: React.FC<StorageMeterModalProps> = ({ isOpen, onClose }) => {
  const { storageQuota, items, deleteItem } = useItems();

  if (!isOpen) return null;

  const totalMb = (storageQuota.totalBytes / (1024 * 1024)).toFixed(2);
  const maxMb = (storageQuota.maxBytes / (1024 * 1024)).toFixed(0); // 1,000 MB
  const percentUsed = Math.min(100, (storageQuota.totalBytes / storageQuota.maxBytes) * 100);

  const dbMb = (storageQuota.dbBytes / (1024 * 1024)).toFixed(2);
  const maxDbMb = (storageQuota.maxDbBytes / (1024 * 1024)).toFixed(0); // 500 MB
  const dbPercentUsed = Math.min(100, (storageQuota.dbBytes / storageQuota.maxDbBytes) * 100);

  // Sort items by size descending for the Storage Janitor
  const sortedBySize = [...items].sort((a, b) => (b.file_size || 0) - (a.file_size || 0));

  const formatBytes = (bytes?: number) => {
    if (!bytes) return '0 KB';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const getStatusColor = (percent: number) => {
    if (percent > 90) return 'text-red-400 bg-red-500/20 border-red-500/40';
    if (percent > 70) return 'text-amber-400 bg-amber-500/20 border-amber-500/40';
    return 'text-emerald-400 bg-emerald-500/20 border-emerald-500/40';
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-surface border border-border rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <HardDrive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-main flex items-center gap-2">
                Storage Quota & Free Tier Status
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  100% Free Forever
                </span>
              </h2>
              <p className="text-xs text-text-muted">
                Track your real-time cloud usage to guarantee zero unexpected charges
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1">
          {/* Main Gauges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* 1. File Storage Gauge */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-main flex items-center gap-1.5">
                  <HardDrive className="w-3.5 h-3.5 text-accent" />
                  Media & HTML Storage
                </span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${getStatusColor(percentUsed)}`}>
                  {percentUsed.toFixed(1)}% Used
                </span>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1 font-mono text-xs">
                  <span className="text-lg font-bold text-text-main">{totalMb} MB</span>
                  <span className="text-text-muted">/ {maxMb} MB (1 GB)</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-border/50">
                  <div
                    className={`h-full transition-all duration-500 ${
                      percentUsed > 90 ? 'bg-red-500' : percentUsed > 70 ? 'bg-amber-500' : 'bg-primary'
                    }`}
                    style={{ width: `${percentUsed}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Supabase offers 1 GB free bucket storage. With Unimap's SmartCompress, you can store <strong>3,000+ study images</strong> without paying a dime.
              </p>
            </div>

            {/* 2. Database Storage Gauge */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-text-main flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-primary" />
                  PostgreSQL Database
                </span>
                <span className={`px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${getStatusColor(dbPercentUsed)}`}>
                  {dbPercentUsed.toFixed(1)}% Used
                </span>
              </div>

              <div>
                <div className="flex justify-between items-baseline mb-1 font-mono text-xs">
                  <span className="text-lg font-bold text-text-main">{dbMb} MB</span>
                  <span className="text-text-muted">/ {maxDbMb} MB</span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 rounded-full bg-surface overflow-hidden border border-border/50">
                  <div
                    className={`h-full transition-all duration-500 ${
                      dbPercentUsed > 90 ? 'bg-red-500' : dbPercentUsed > 70 ? 'bg-amber-500' : 'bg-accent'
                    }`}
                    style={{ width: `${dbPercentUsed}%` }}
                  />
                </div>
              </div>
              <p className="text-[11px] text-text-muted leading-relaxed">
                PostgreSQL TOAST compressed storage holds notes, text snippets, and device sessions. Capacity is over <strong>50,000 study records</strong>.
              </p>
            </div>
          </div>

          {/* Type Breakdown */}
          <div className="p-4 rounded-2xl bg-surface-elevated border border-border">
            <h3 className="text-xs font-semibold text-text-main uppercase tracking-wider mb-3">
              Storage Breakdown by Content
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-surface border border-border/50">
                <div className="flex items-center gap-1.5 text-text-muted mb-1">
                  <ImageIcon className="w-3.5 h-3.5 text-purple-400" />
                  <span>Images</span>
                </div>
                <p className="font-mono font-bold text-text-main">{formatBytes(storageQuota.byType.media)}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-surface border border-border/50">
                <div className="flex items-center gap-1.5 text-text-muted mb-1">
                  <Globe className="w-3.5 h-3.5 text-cyan-400" />
                  <span>HTML Docs</span>
                </div>
                <p className="font-mono font-bold text-text-main">{formatBytes(storageQuota.byType.html)}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-surface border border-border/50">
                <div className="flex items-center gap-1.5 text-text-muted mb-1">
                  <Code className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Code Files</span>
                </div>
                <p className="font-mono font-bold text-text-main">{formatBytes(storageQuota.byType.code)}</p>
              </div>

              <div className="p-2.5 rounded-xl bg-surface border border-border/50">
                <div className="flex items-center gap-1.5 text-text-muted mb-1">
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Notes & Links</span>
                </div>
                <p className="font-mono font-bold text-text-main">
                  {formatBytes(storageQuota.byType.text + storageQuota.byType.link)}
                </p>
              </div>
            </div>
          </div>

          {/* Storage Janitor (Clean up space) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-text-main uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                Storage Janitor (Largest Files)
              </h3>
              <span className="text-[11px] text-text-muted">
                Download to local drive then delete to reclaim cloud space
              </span>
            </div>

            <div className="rounded-2xl border border-border bg-surface-elevated overflow-hidden divide-y divide-border/40">
              {sortedBySize.slice(0, 6).map((item) => (
                <div key={item.id} className="p-3 flex items-center justify-between gap-3 text-xs hover:bg-surface transition-colors">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-text-main truncate">{item.title || item.file_name}</p>
                    <p className="text-[11px] text-text-muted flex items-center gap-2">
                      <span className="uppercase font-mono text-[10px] px-1.5 py-0.2 rounded bg-surface border border-border">
                        {item.type}
                      </span>
                      <span>From: {item.device_name}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-text-main">
                      {formatBytes(item.file_size)}
                    </span>
                    <button
                      onClick={() => downloadItem(item)}
                      title="Download to device"
                      className="p-1.5 rounded-lg text-text-muted hover:text-accent hover:bg-surface-hover transition-colors"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      title="Delete from cloud"
                      className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-semibold text-text-main hover:bg-surface-hover transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
