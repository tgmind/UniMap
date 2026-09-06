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
  const [isExpanded, setIsExpanded] = useState(false);

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

  return (
    <article
      className={`subtle-card rounded-2xl flex flex-col justify-between overflow-hidden relative group ${
        item.is_pinned ? 'ring-1 ring-primary/40' : ''
      }`}
    >
      {/* Top Metadata Header */}
      <div className="p-4 pb-2.5 flex items-start justify-between gap-3 border-b border-border/40">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-text-muted">
            <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated text-text-muted border border-border">
              {getOsLabel(item.device_os)}
            </span>
            <span className="text-text-muted font-normal text-break-word">
              {item.device_name}
            </span>
            <span className="text-text-faint">•</span>
            <span className="text-text-faint">{formatDate(item.created_at)}</span>
          </div>

          {/* Full Title (NO TEXT CHOPPING) */}
          <h3 className="font-semibold text-sm text-text-main text-break-word leading-snug pt-0.5">
            {item.title}
          </h3>
        </div>

        {/* Pin & Delete Actions */}
        <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => togglePin(item.id)}
            title={item.is_pinned ? 'Unpin' : 'Pin item'}
            className={`p-1.5 rounded-lg transition-colors ${
              item.is_pinned ? 'text-primary bg-primary/10' : 'text-text-faint hover:text-text-main hover:bg-surface-elevated'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteItem(item.id)}
            title="Delete"
            className="p-1.5 rounded-lg text-text-faint hover:text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Content Body */}
      <div className="p-4 py-3 flex-1 space-y-3">
        {/* HTML Item */}
        {item.type === 'html' && (
          <div className="space-y-3">
            <div className="p-3 rounded-xl bg-surface-elevated/70 border border-border text-xs text-text-muted space-y-1">
              <div className="flex items-center gap-1.5 text-text-main font-medium">
                <Globe className="w-3.5 h-3.5 text-accent" />
                <span>HTML Web Document</span>
              </div>
              <p className="text-[11px] font-mono text-text-muted text-break-word">
                {item.file_name || 'document.html'}
              </p>
            </div>

            {/* Run in Browser & Download Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handleRunHtml}
                className="flex-1 py-1.5 px-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-text font-medium text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Run in Browser</span>
              </button>
              <button
                onClick={handleDownload}
                title="Download HTML file"
                className="py-1.5 px-3 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-text-main text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
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
                className="relative rounded-xl overflow-hidden bg-black/20 border border-border cursor-pointer group/media max-h-56 flex items-center justify-center"
              >
                <img
                  src={item.file_url}
                  alt={item.title}
                  className="w-full h-auto max-h-56 object-contain group-hover/media:scale-[1.02] transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center text-white text-xs font-medium">
                  Click to Expand Full Resolution
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-elevated border border-border text-xs text-text-muted flex items-center gap-2">
                <ImageIcon className="w-3.5 h-3.5 text-accent" />
                <span className="text-break-word">{item.file_name || 'Attached Media'}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-0.5 text-xs">
              <span className="font-mono text-[11px] text-text-faint">
                {item.file_size ? `${(item.file_size / 1024).toFixed(1)} KB` : 'SmartCompressed'}
              </span>
              <button
                onClick={handleDownload}
                className="text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download File</span>
              </button>
            </div>
          </div>
        )}

        {/* Code Snippet */}
        {item.type === 'code' && (
          <div className="space-y-2">
            <div
              className={`rounded-xl bg-surface-elevated border border-border p-3 font-mono text-xs text-text-main overflow-x-auto ${
                isExpanded ? 'max-h-none' : 'max-h-40'
              }`}
            >
              <pre className="text-[11px] leading-relaxed text-break-word whitespace-pre-wrap">{item.content}</pre>
            </div>

            <div className="flex items-center justify-between pt-0.5 text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className="text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                {isLongContent && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-text-faint hover:text-text-muted flex items-center gap-0.5 text-[11px]"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span>{isExpanded ? 'Less' : 'More'}</span>
                  </button>
                )}
              </div>

              <button
                onClick={handleDownload}
                className="text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download</span>
              </button>
            </div>
          </div>
        )}

        {/* Link Bookmark */}
        {item.type === 'link' && (
          <div className="space-y-2">
            <a
              href={item.content}
              target="_blank"
              rel="noopener noreferrer"
              className="block p-3 rounded-xl bg-surface-elevated/70 border border-border hover:border-border-strong transition-colors"
            >
              <div className="flex items-start gap-2 text-xs font-medium text-text-main">
                <Link2 className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                <span className="text-break-word flex-1">{item.content}</span>
                <ExternalLink className="w-3 h-3 shrink-0 text-text-faint mt-0.5" />
              </div>
              {item.metadata?.urlPreview?.description && (
                <p className="text-[11px] text-text-muted mt-1.5 text-break-word leading-normal">
                  {item.metadata.urlPreview.description}
                </p>
              )}
            </a>

            <div className="flex items-center justify-between text-xs pt-0.5">
              <button
                onClick={handleCopy}
                className="text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy URL'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save Shortcut</span>
              </button>
            </div>
          </div>
        )}

        {/* Notes & Markdown Text */}
        {item.type === 'text' && (
          <div className="space-y-2">
            <div
              className={`text-xs text-text-muted leading-relaxed text-break-word whitespace-pre-wrap ${
                isExpanded ? 'max-h-none' : 'max-h-36 overflow-hidden relative'
              }`}
            >
              {item.content}
              {!isExpanded && isLongContent && (
                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-surface to-transparent" />
              )}
            </div>

            <div className="flex items-center justify-between pt-0.5 text-xs">
              <div className="flex items-center gap-3">
                <button
                  onClick={handleCopy}
                  className="text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
                {isLongContent && (
                  <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="text-text-faint hover:text-text-muted flex items-center gap-0.5 text-[11px]"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    <span>{isExpanded ? 'Show less' : 'Show more'}</span>
                  </button>
                )}
              </div>

              <button
                onClick={handleDownload}
                className="text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download .txt</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card Footer: Tags */}
      {item.metadata?.tags && item.metadata.tags.length > 0 && (
        <div className="px-4 py-2 border-t border-border/40 flex items-center gap-1.5 flex-wrap">
          {item.metadata.tags.map((tag, i) => (
            <span
              key={i}
              className="text-[10px] px-2 py-0.5 rounded-md bg-surface-elevated/70 text-text-muted text-break-word"
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
};
