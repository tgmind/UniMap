import React, { useState } from 'react';
import {
  Globe,
  Image as ImageIcon,
  FileText,
  Code,
  Link2,
  Download,
  ExternalLink,
  Copy,
  Check,
  Trash2,
  Pin,
  Laptop,
  Smartphone,
  Tablet,
  Play,
  Rocket,
} from 'lucide-react';
import { DeviceOS, UniItem } from '../types';
import { downloadItem, runHtmlInBrowser } from '../lib/downloadHelper';
import { useItems } from '../context/ItemContext';

interface ItemCardProps {
  item: UniItem;
  onOpenMedia?: (url: string, title: string) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onOpenMedia }) => {
  const { deleteItem, togglePin } = useItems();
  const [copied, setCopied] = useState(false);

  const getOsBadge = (os: DeviceOS) => {
    switch (os) {
      case 'linux':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30">Linux</span>;
      case 'windows':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/30">Windows</span>;
      case 'android':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Android</span>;
      case 'ios':
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/30">iPad / iOS</span>;
      default:
        return <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-surface border border-border text-text-muted">Device</span>;
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    downloadItem(item);
  };

  const handleRunHtml = (e: React.MouseEvent) => {
    e.stopPropagation();
    runHtmlInBrowser(item.content, item.title);
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.round(diffMs / 60000);
    if (diffMins < 60) return `${Math.max(1, diffMins)}m ago`;
    const diffHours = Math.round(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  return (
    <div
      className={`group relative rounded-2xl bg-surface border transition-all duration-300 hover:shadow-card hover:-translate-y-0.5 flex flex-col justify-between overflow-hidden ${
        item.is_pinned
          ? 'border-primary/50 shadow-glow-sm bg-gradient-to-b from-surface-elevated to-surface'
          : 'border-border hover:border-border-strong'
      }`}
    >
      {/* Card Header: Device metadata & Actions */}
      <div className="p-4 pb-2 flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {getOsBadge(item.device_os)}
            <span className="text-xs text-text-muted font-medium truncate">
              {item.device_name}
            </span>
            <span className="text-[10px] text-text-faint">•</span>
            <span className="text-[10px] text-text-faint">{formatDate(item.created_at)}</span>
          </div>

          <h3 className="font-bold text-sm text-text-main line-clamp-1 group-hover:text-primary transition-colors">
            {item.title}
          </h3>
        </div>

        {/* Pin & Delete Buttons */}
        <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => togglePin(item.id)}
            title={item.is_pinned ? 'Unpin' : 'Pin to top'}
            className={`p-1.5 rounded-lg transition-colors ${
              item.is_pinned
                ? 'text-primary bg-primary/10'
                : 'text-text-muted hover:text-text-main hover:bg-surface-hover'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteItem(item.id)}
            title="Delete"
            className="p-1.5 rounded-lg text-text-muted hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Content Body based on type */}
      <div className="px-4 py-2 flex-1">
        {/* HTML Item */}
        {item.type === 'html' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-surface-elevated border border-cyan-500/20 text-xs text-text-muted">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold mb-1">
                <Globe className="w-4 h-4" />
                <span>Interactive HTML Document</span>
              </div>
              <p className="text-[11px] text-text-muted line-clamp-2 font-mono">
                {item.file_name || 'interactive_document.html'}
              </p>
            </div>

            {/* Actions: Run in Browser & Download */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunHtml}
                className="flex-1 py-1.5 px-3 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-sm transition-all hover:scale-[1.02]"
              >
                <Rocket className="w-3.5 h-3.5" />
                Run in Browser
              </button>
              <button
                onClick={handleDownload}
                title="Download HTML file"
                className="py-1.5 px-3 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-text-main text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download
              </button>
            </div>
          </div>
        )}

        {/* Media / Image Item */}
        {item.type === 'media' && (
          <div className="space-y-2">
            {item.file_url ? (
              <div
                onClick={() => onOpenMedia?.(item.file_url!, item.title)}
                className="relative rounded-xl overflow-hidden aspect-video bg-black/40 border border-border cursor-pointer group/img"
              >
                <img
                  src={item.file_url}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold">
                  Click to View Full Resolution
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-elevated border border-border text-xs text-text-muted flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-accent" />
                <span>Media File ({item.file_name})</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-mono text-text-muted">
                {item.file_size ? `${(item.file_size / 1024).toFixed(1)} KB` : 'SmartCompressed'}
              </span>
              <button
                onClick={handleDownload}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download File
              </button>
            </div>
          </div>
        )}

        {/* Code Item */}
        {item.type === 'code' && (
          <div className="space-y-2">
            <div className="relative rounded-xl bg-surface-elevated border border-border/80 p-3 font-mono text-xs text-text-main overflow-x-auto max-h-36">
              <pre className="text-[11px] leading-relaxed">{item.content}</pre>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleCopy}
                className="text-xs text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download Code
              </button>
            </div>
          </div>
        )}

        {/* Link Item */}
        {item.type === 'link' && (
          <div className="space-y-2.5">
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl bg-surface-elevated border border-border hover:border-primary/50 transition-colors group/link"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-text-main group-hover/link:text-primary">
                <Link2 className="w-3.5 h-3.5 text-accent" />
                <span className="truncate">{item.content}</span>
                <ExternalLink className="w-3 h-3 ml-auto opacity-70" />
              </div>
              {item.metadata?.urlPreview?.description && (
                <p className="text-[11px] text-text-muted mt-1 line-clamp-2">
                  {item.metadata.urlPreview.description}
                </p>
              )}
            </a>

            <div className="flex items-center justify-between">
              <button
                onClick={handleCopy}
                className="text-xs text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'URL Copied' : 'Copy Link'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="text-xs text-text-muted hover:text-text-main flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Save Shortcut
              </button>
            </div>
          </div>
        )}

        {/* Text / Markdown Item */}
        {item.type === 'text' && (
          <div className="space-y-2">
            <div className="text-xs text-text-muted leading-relaxed line-clamp-4 whitespace-pre-wrap">
              {item.content}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={handleCopy}
                className="text-xs text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Text'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="text-xs text-accent hover:underline flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                Download .txt
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Tags */}
      {item.metadata?.tags && item.metadata.tags.length > 0 && (
        <div className="px-4 py-2.5 border-t border-border/50 flex items-center gap-1.5 flex-wrap">
          {item.metadata.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated border border-border/60 text-text-muted"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
