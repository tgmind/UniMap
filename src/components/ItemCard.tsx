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
  ChevronDown,
  ChevronUp,
  Laptop,
  Smartphone,
  Terminal,
} from 'lucide-react';
import { DeviceOS, ItemType, UniItem } from '../types';
import { downloadItem, runHtmlInBrowser } from '../lib/downloadHelper';
import { useItems } from '../context/ItemContext';

interface ItemCardProps {
  item: UniItem;
  onOpenMedia?: (url: string, title: string) => void;
}

const TYPE_CONFIG: Record<
  ItemType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    pillClass: string;
    dotColor: string;
  }
> = {
  text: {
    label: 'Note',
    icon: FileText,
    pillClass: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    dotColor: 'bg-amber-500',
  },
  link: {
    label: 'Link',
    icon: Link2,
    pillClass: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    dotColor: 'bg-emerald-500',
  },
  code: {
    label: 'Code',
    icon: Code,
    pillClass: 'text-violet-500 bg-violet-500/10 border-violet-500/20',
    dotColor: 'bg-violet-500',
  },
  media: {
    label: 'Media',
    icon: ImageIcon,
    pillClass: 'text-rose-500 bg-rose-500/10 border-rose-500/20',
    dotColor: 'bg-rose-500',
  },
  html: {
    label: 'HTML App',
    icon: Globe,
    pillClass: 'text-sky-500 bg-sky-500/10 border-sky-500/20',
    dotColor: 'bg-sky-500',
  },
};

export const ItemCard: React.FC<ItemCardProps> = ({ item, onOpenMedia }) => {
  const { deleteItem, togglePin } = useItems();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const typeConfig = TYPE_CONFIG[item.type] || TYPE_CONFIG.text;
  const TypeIcon = typeConfig.icon;

  const getDeviceIcon = (os: DeviceOS) => {
    switch (os) {
      case 'android':
      case 'ios':
        return <Smartphone className="w-3 h-3 opacity-70" />;
      case 'linux':
        return <Terminal className="w-3 h-3 opacity-70" />;
      default:
        return <Laptop className="w-3 h-3 opacity-70" />;
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
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

  const isLongContent = item.content && item.content.length > 280;

  const renderContentWithLinks = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
    const parts = text.split(urlRegex);

    return parts.map((part, index) => {
      if (part.match(urlRegex)) {
        const href = part.startsWith('http') ? part : `https://${part}`;
        return (
          <a
            key={index}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="text-blue-500 dark:text-blue-400 hover:underline font-medium break-all inline-flex items-baseline gap-0.5 transition-colors"
          >
            <span>{part}</span>
            <ExternalLink className="w-2.5 h-2.5 inline shrink-0 opacity-70" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <article
      className={`subtle-card rounded-2xl flex flex-col justify-between overflow-hidden relative group transition-all duration-200 ${
        item.is_pinned ? 'ring-1 ring-primary/60 shadow-md' : ''
      }`}
    >
      {/* Top Header Row */}
      <div className="p-4 sm:p-5 pb-2.5 flex items-center justify-between gap-3 border-b border-border/40">
        {/* Left: Category Pill + Device & Timestamp */}
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-xs font-semibold border ${typeConfig.pillClass}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${typeConfig.dotColor}`} />
            <span>{typeConfig.label}</span>
          </span>

          <div className="flex items-center gap-1 text-[11px] text-text-faint font-medium">
            {getDeviceIcon(item.device_os)}
            <span className="truncate max-w-[120px]">{item.device_name}</span>
            <span>•</span>
            <span>{formatDate(item.created_at)}</span>
          </div>
        </div>

        {/* Right: Pin & Delete Action Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => togglePin(item.id)}
            title={item.is_pinned ? 'Unpin note' : 'Pin note to top'}
            className={`p-1.5 rounded-lg transition-colors ${
              item.is_pinned
                ? 'text-primary bg-primary/10'
                : 'text-text-faint hover:text-text-main hover:bg-surface-elevated'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteItem(item.id)}
            title="Delete note"
            className="p-1.5 rounded-lg text-text-faint hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Area: Clean, Content-First, Natural Typography */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
        {/* Title (if defined and distinct from content) */}
        {item.title && item.title !== item.content && (
          <h3 className="font-semibold text-sm sm:text-base text-text-main text-break-word leading-snug">
            {item.title}
          </h3>
        )}

        {/* 1. Study Note (Text) */}
        {item.type === 'text' && (
          <div className="space-y-2">
            <div
              className={`text-xs sm:text-sm text-text-main/90 leading-relaxed text-break-word whitespace-pre-wrap select-text ${
                isExpanded ? 'max-h-none' : 'max-h-48 overflow-hidden relative'
              }`}
            >
              {renderContentWithLinks(item.content)}
              {!isExpanded && isLongContent && (
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
              )}
            </div>

            {isLongContent && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-text-muted hover:text-primary flex items-center gap-1 text-xs font-medium pt-1 transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{isExpanded ? 'Show less' : 'Read more'}</span>
              </button>
            )}
          </div>
        )}

        {/* 2. Link Bookmark */}
        {item.type === 'link' && (
          <a
            href={item.content}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl bg-surface-elevated/70 hover:bg-surface-elevated border border-border/70 hover:border-primary/40 transition-all group/link"
          >
            <div className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0 mt-0.5">
                <Link2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-text-main group-hover/link:text-primary transition-colors text-break-word">
                  {item.title || item.content}
                </p>
                <p className="text-[11px] text-text-faint truncate mt-0.5">{item.content}</p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-text-faint group-hover/link:text-primary shrink-0 transition-colors mt-1" />
            </div>
          </a>
        )}

        {/* 3. Code Snippet */}
        {item.type === 'code' && (
          <div className="space-y-2">
            <div
              className={`rounded-xl bg-[#0F1219] border border-border/60 p-3 font-mono text-xs text-slate-200 overflow-x-auto ${
                isExpanded ? 'max-h-none' : 'max-h-48'
              }`}
            >
              <pre className="text-[11px] leading-relaxed text-break-word whitespace-pre-wrap font-mono">
                {item.content}
              </pre>
            </div>

            {isLongContent && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-text-muted hover:text-primary flex items-center gap-1 text-xs font-medium transition-colors"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{isExpanded ? 'Show less code' : 'Expand full code'}</span>
              </button>
            )}
          </div>
        )}

        {/* 4. Media Asset */}
        {item.type === 'media' && (
          <div className="space-y-2">
            {item.file_url ? (
              <div
                onClick={() => onOpenMedia?.(item.file_url!, item.title)}
                className="rounded-xl overflow-hidden bg-black/20 border border-border/60 cursor-pointer group/media max-h-64 flex items-center justify-center relative"
              >
                <img
                  src={item.file_url}
                  alt={item.title}
                  className="w-full h-auto max-h-64 object-contain group-hover/media:scale-[1.02] transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold backdrop-blur-xs">
                  Tap to Expand
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-elevated border border-border/60 text-xs text-text-muted flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="truncate">{item.file_name || 'Media Asset'}</span>
              </div>
            )}
          </div>
        )}

        {/* 5. Standalone HTML App */}
        {item.type === 'html' && (
          <div className="p-3.5 rounded-xl bg-surface-elevated/70 border border-border/70 space-y-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-500 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text-main truncate">Standalone Web App</p>
                <p className="text-[11px] font-mono text-text-faint truncate">{item.file_name || 'app.html'}</p>
              </div>
            </div>

            <button
              onClick={handleRunHtml}
              className="w-full py-2 px-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Launch in Browser</span>
            </button>
          </div>
        )}
      </div>

      {/* Footer: Tags & Discreet Quick Actions */}
      <div className="px-4 sm:px-5 py-2.5 border-t border-border/40 bg-surface-elevated/30 flex items-center justify-between gap-2 text-xs">
        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap min-w-0 flex-1">
          {item.metadata?.tags && item.metadata.tags.length > 0 ? (
            item.metadata.tags.slice(0, 3).map((tag, i) => (
              <span
                key={i}
                className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted border border-border/50 truncate max-w-[90px]"
              >
                #{tag}
              </span>
            ))
          ) : (
            <span className="text-[10px] text-text-faint font-mono">
              {item.file_size ? `${(item.file_size / 1024).toFixed(1)} KB` : 'Synced'}
            </span>
          )}
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleCopy}
            title={copied ? 'Copied to clipboard' : 'Copy content'}
            className="p-1.5 rounded-lg text-text-faint hover:text-text-main hover:bg-surface-elevated transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={handleDownload}
            title="Download item"
            className="p-1.5 rounded-lg text-text-faint hover:text-text-main hover:bg-surface-elevated transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </article>
  );
};
