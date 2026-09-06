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
} from 'lucide-react';
import { DeviceOS, ItemType, UniItem } from '../types';
import { downloadItem, runHtmlInBrowser } from '../lib/downloadHelper';
import { useItems } from '../context/ItemContext';

interface ItemCardProps {
  item: UniItem;
  onOpenMedia?: (url: string, title: string) => void;
}

const TYPE_META: Record<
  ItemType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    accentGradient: string;
    pillStyle: string;
  }
> = {
  html: {
    label: 'HTML Document',
    icon: Globe,
    accentGradient: 'from-sky-500 to-blue-600',
    pillStyle: 'bg-sky-500/10 text-sky-500 dark:text-sky-400 border-sky-500/25',
  },
  code: {
    label: 'Code Snippet',
    icon: Code,
    accentGradient: 'from-violet-500 to-indigo-600',
    pillStyle: 'bg-violet-500/10 text-violet-600 dark:text-violet-400 border-violet-500/25',
  },
  media: {
    label: 'Media Asset',
    icon: ImageIcon,
    accentGradient: 'from-rose-500 to-pink-600',
    pillStyle: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/25',
  },
  text: {
    label: 'Study Note',
    icon: FileText,
    accentGradient: 'from-amber-500 to-orange-600',
    pillStyle: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25',
  },
  link: {
    label: 'Web Link',
    icon: Link2,
    accentGradient: 'from-emerald-500 to-teal-600',
    pillStyle: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25',
  },
};

export const ItemCard: React.FC<ItemCardProps> = ({ item, onOpenMedia }) => {
  const { deleteItem, togglePin } = useItems();
  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const typeMeta = TYPE_META[item.type] || TYPE_META.text;
  const TypeIcon = typeMeta.icon;

  const getOsLabel = (os: DeviceOS) => {
    switch (os) {
      case 'linux': return 'Linux';
      case 'windows': return 'Windows';
      case 'android': return 'Android';
      case 'ios': return 'iPad/iOS';
      case 'macos': return 'macOS';
      default: return 'Device';
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
            className="text-blue-500 dark:text-blue-400 hover:text-blue-600 dark:hover:text-blue-300 underline font-semibold break-all inline-flex items-baseline gap-0.5 transition-colors"
          >
            <span>{part}</span>
            <ExternalLink className="w-2.5 h-2.5 inline shrink-0 opacity-80" />
          </a>
        );
      }
      return part;
    });
  };

  return (
    <article
      className={`subtle-card rounded-2xl flex flex-col justify-between overflow-hidden relative group transition-all duration-200 hover:-translate-y-1 ${
        item.is_pinned ? 'ring-2 ring-primary shadow-glow-sm' : ''
      }`}
    >
      {/* 3px Vibrant Top Accent Stripe for Instant Visual Type Identification */}
      <div className={`h-[3px] w-full bg-gradient-to-r ${typeMeta.accentGradient}`} />

      {/* Card Header */}
      <div className="p-4 sm:p-5 pb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          {/* Distinct Badges: Color-coded Type Pill + Device Chip + Timestamp */}
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold border shadow-xs ${typeMeta.pillStyle}`}
            >
              <TypeIcon className="w-3 h-3 shrink-0" />
              <span>{typeMeta.label}</span>
            </span>

            <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted border border-border">
              {getOsLabel(item.device_os)} • {item.device_name}
            </span>

            <span className="text-[11px] text-text-faint font-medium">
              {formatDate(item.created_at)}
            </span>
          </div>

          {/* Full Bold Title (NO TEXT CHOPPING) */}
          <h3 className="font-bold text-sm sm:text-base text-text-main text-break-word leading-snug">
            {item.title}
          </h3>
        </div>

        {/* Pin & Delete Actions */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            onClick={() => togglePin(item.id)}
            title={item.is_pinned ? 'Unpin item' : 'Pin item to top'}
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
            title="Delete item"
            className="p-1.5 rounded-lg text-text-faint hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Recessed Content Well */}
      <div className="px-4 sm:px-5 pb-4 flex-1 flex flex-col justify-between space-y-3">
        {/* HTML Document Item */}
        {item.type === 'html' && (
          <div className="space-y-3">
            <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-xs text-text-muted space-y-1.5">
              <div className="flex items-center gap-2 text-text-main font-semibold">
                <Globe className="w-4 h-4 text-sky-500 shrink-0" />
                <span>Standalone Web Document</span>
              </div>
              <p className="text-[11px] font-mono text-text-muted text-break-word">
                {item.file_name || 'document.html'}
              </p>
            </div>

            {/* Run in Browser & Download Buttons */}
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={handleRunHtml}
                className="flex-1 py-2 px-3.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-sm active:scale-[0.98]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Run in Browser</span>
              </button>
              <button
                onClick={handleDownload}
                title="Download HTML file"
                className="py-2 px-3.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-text-main text-xs font-medium flex items-center gap-1.5 transition-colors active:scale-[0.98]"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>
        )}

        {/* Media / Image Item */}
        {item.type === 'media' && (
          <div className="space-y-2.5">
            {item.file_url ? (
              <div
                onClick={() => onOpenMedia?.(item.file_url!, item.title)}
                className="relative rounded-xl overflow-hidden bg-black/20 border border-border cursor-pointer group/media max-h-60 flex items-center justify-center"
              >
                <img
                  src={item.file_url}
                  alt={item.title}
                  className="w-full h-auto max-h-60 object-contain group-hover/media:scale-[1.02] transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-semibold backdrop-blur-[2px]">
                  Click to Expand Full Resolution
                </div>
              </div>
            ) : (
              <div className="p-3.5 rounded-xl bg-surface-elevated border border-border text-xs text-text-muted flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-rose-500 shrink-0" />
                <span className="text-break-word">{item.file_name || 'Attached Media'}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-1 text-xs">
              <span className="font-mono text-[11px] text-text-faint font-medium">
                {item.file_size ? `${(item.file_size / 1024).toFixed(1)} KB` : 'SmartCompressed (2.5K)'}
              </span>
              <button
                onClick={handleDownload}
                className="py-1.5 px-3 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border text-text-main font-medium text-xs flex items-center gap-1.5 transition-colors active:scale-95"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download High-Res</span>
              </button>
            </div>
          </div>
        )}

        {/* Code Snippet */}
        {item.type === 'code' && (
          <div className="space-y-2.5">
            <div
              className={`rounded-xl bg-surface-elevated border border-border p-3.5 font-mono text-xs text-text-main overflow-x-auto ${
                isExpanded ? 'max-h-none' : 'max-h-44'
              }`}
            >
              <pre className="text-[11px] leading-relaxed text-break-word whitespace-pre-wrap">{item.content}</pre>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="py-1.5 px-3 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border text-text-main font-medium text-xs flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Code'}</span>
                </button>
                {isLongContent && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-text-muted hover:text-text-main flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md hover:bg-surface-elevated transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span>{isExpanded ? 'Show less' : 'Expand snippet'}</span>
                  </button>
                )}
              </div>

              <button
                onClick={handleDownload}
                className="text-text-muted hover:text-text-main flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md hover:bg-surface-elevated transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>
            </div>
          </div>
        )}

        {/* Link Bookmark */}
        {item.type === 'link' && (
          <div className="space-y-2.5">
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3.5 rounded-xl bg-surface-elevated border border-border hover:border-border-strong transition-all hover:shadow-xs group/link"
            >
              <div className="flex items-start gap-2 text-xs font-semibold text-text-main">
                <Link2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                <span className="text-break-word flex-1 group-hover/link:text-primary transition-colors">{item.content}</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0 text-text-faint mt-0.5" />
              </div>
              {item.metadata?.urlPreview?.description && (
                <p className="text-[11px] text-text-muted mt-2 text-break-word leading-normal">
                  {item.metadata.urlPreview.description}
                </p>
              )}
            </a>

            <div className="flex items-center justify-between text-xs pt-1">
              <button
                onClick={handleCopy}
                className="py-1.5 px-3 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border text-text-main font-medium text-xs flex items-center gap-1.5 transition-colors active:scale-95"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'URL Copied!' : 'Copy Link'}</span>
              </button>
              <a
                href={item.content}
                target="_blank"
                rel="noopener noreferrer"
                className="text-text-muted hover:text-text-main flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md hover:bg-surface-elevated transition-colors"
              >
                <span>Open Site</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}

        {/* Study Notes & Markdown Text */}
        {item.type === 'text' && (
          <div className="space-y-2.5">
            <div
              className={`p-3.5 rounded-xl bg-surface-elevated border border-border text-xs text-text-main leading-relaxed text-break-word whitespace-pre-wrap ${
                isExpanded ? 'max-h-none' : 'max-h-40 overflow-hidden relative'
              }`}
            >
              {renderContentWithLinks(item.content)}
              {!isExpanded && isLongContent && (
                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface-elevated to-transparent" />
              )}
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopy}
                  className="py-1.5 px-3 rounded-lg bg-surface-elevated hover:bg-surface-hover border border-border text-text-main font-medium text-xs flex items-center gap-1.5 transition-colors active:scale-95"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
                {isLongContent && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-text-muted hover:text-text-main flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md hover:bg-surface-elevated transition-colors"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span>{isExpanded ? 'Show less' : 'Read full note'}</span>
                  </button>
                )}
              </div>

              <button
                onClick={handleDownload}
                className="text-text-muted hover:text-text-main flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-md hover:bg-surface-elevated transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download .txt</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Tags */}
      {item.metadata?.tags && item.metadata.tags.length > 0 && (
        <div className="px-4 sm:px-5 py-2.5 bg-surface-elevated/40 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
          {item.metadata.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-surface-elevated text-text-muted border border-border text-break-word"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
};
