import React, { useState } from 'react';
import {
  Globe,
  Image as ImageIcon,
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
  Cloud,
  Loader2,
  HardDrive,
  CheckCircle2,
} from 'lucide-react';
import { UniItem } from '../types';
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

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Find all URLs inside content
  const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
  const detectedUrls = item.content ? item.content.match(urlRegex) || [] : [];
  const singleUrl = detectedUrls.length === 1 ? detectedUrls[0] : null;

  // Render text with Telegram clean blue links without ugly [↗] icons breaking the sentence flow
  const renderContentWithLinks = (text: string) => {
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
            className="text-[#2481CC] dark:text-[#50A7EA] hover:underline font-medium break-all transition-colors"
          >
            {part}
          </a>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Check if title is redundant (e.g. copied text where title was auto-generated from first line)
  const isTitleRedundant =
    !item.title ||
    item.title === item.content ||
    item.title === 'Study Note' ||
    item.title === 'New Entry' ||
    item.content.trim().startsWith(item.title.trim()) ||
    (item.title.length > 20 && item.content.trim().slice(0, 40).includes(item.title.trim().slice(0, 20)));

  // If text has more than 16 lines or 600 characters, offer expandable toggle
  const lineCount = item.content ? item.content.split('\n').length : 0;
  const isLongContent = lineCount > 16 || (item.content && item.content.length > 500);

  // Extract domain name for Telegram preview card
  const getDomain = (urlStr: string) => {
    try {
      const u = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
      return u.hostname.replace('www.', '');
    } catch {
      return 'Telegram';
    }
  };

  return (
    <article
      className={`telegram-bubble rounded-2xl sm:rounded-[20px] p-3.5 sm:p-4.5 relative transition-all duration-200 flex flex-col justify-between ${
        item.is_pinned ? 'ring-2 ring-[#2481CC]/80 shadow-md' : ''
      }`}
    >
      {/* Top Header: Channel Title & Quick Actions */}
      <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-border/25">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-bold text-xs sm:text-[13px] text-[#E53935] dark:text-[#FF5252] truncate tracking-wide">
            {item.device_name || 'UniMap Cloud Channel'}
          </span>
          <span className="text-[10px] text-text-faint font-mono">•</span>
          <span className="text-[10px] text-text-faint uppercase font-mono tracking-wider">
            {item.type}
          </span>
        </div>

        {/* Pin & Delete icons */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => togglePin(item.id)}
            title={item.is_pinned ? 'Unpin message' : 'Pin message'}
            className={`p-1 rounded-md transition-colors ${
              item.is_pinned
                ? 'text-[#2481CC] dark:text-[#50A7EA]'
                : 'text-text-faint hover:text-text-main'
            }`}
          >
            <Pin className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => deleteItem(item.id)}
            title="Delete message"
            className="p-1 rounded-md text-text-faint hover:text-red-400 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Message Content Area */}
      <div className="space-y-2.5 flex-1">
        {/* Render distinct title ONLY if it does not duplicate content */}
        {!isTitleRedundant && (
          <h3 className="font-bold text-sm sm:text-base text-text-main text-break-word leading-snug">
            {item.title}
          </h3>
        )}

        {/* 1. Text & Notes (Authentic Telegram typography with 100% newline preservation) */}
        {item.type === 'text' && (
          <div className="space-y-2">
            <div
              className={`text-[14px] sm:text-[15px] text-text-main leading-[1.65] text-break-word whitespace-pre-wrap select-text font-normal ${
                isExpanded ? 'max-h-none' : 'max-h-[460px] overflow-hidden relative'
              }`}
            >
              {renderContentWithLinks(item.content)}
              {!isExpanded && isLongContent && (
                <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface to-transparent pointer-events-none" />
              )}
            </div>

            {isLongContent && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs font-semibold text-[#2481CC] dark:text-[#50A7EA] hover:underline flex items-center gap-1 pt-1"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{isExpanded ? 'Show less' : 'Read full post'}</span>
              </button>
            )}

            {/* Telegram-Style Rich Link Preview Card (when a single URL is mentioned) */}
            {singleUrl && (
              <a
                href={singleUrl.startsWith('http') ? singleUrl : `https://${singleUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block mt-2.5 p-3 rounded-xl bg-[#2481CC]/5 dark:bg-[#50A7EA]/10 border-l-[3.5px] border-[#2481CC] dark:border-[#50A7EA] hover:bg-[#2481CC]/10 transition-colors group/preview"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-[#2481CC] dark:text-[#50A7EA] truncate">
                    {getDomain(singleUrl)}
                  </span>
                  <ExternalLink className="w-3 h-3 text-[#2481CC] dark:text-[#50A7EA] shrink-0 opacity-75 group-hover/preview:opacity-100" />
                </div>
                <p className="text-[11px] text-text-muted truncate mt-0.5 font-mono">{singleUrl}</p>
                <div className="mt-1.5 text-[11px] font-bold text-[#2481CC] dark:text-[#50A7EA] uppercase tracking-wider">
                  VIEW CHANNEL / LINK
                </div>
              </a>
            )}
          </div>
        )}

        {/* 2. Pure Link Bookmark */}
        {item.type === 'link' && (
          <a
            href={item.content.startsWith('http') ? item.content : `https://${item.content}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block p-3 rounded-xl bg-[#2481CC]/5 dark:bg-[#50A7EA]/10 border-l-[3.5px] border-[#2481CC] dark:border-[#50A7EA] hover:bg-[#2481CC]/10 transition-colors group/link"
          >
            <div className="flex items-start gap-2.5">
              <Link2 className="w-4 h-4 text-[#2481CC] dark:text-[#50A7EA] shrink-0 mt-0.5" />
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-semibold text-text-main group-hover/link:text-[#2481CC] transition-colors text-break-word">
                  {item.title || getDomain(item.content)}
                </p>
                <p className="text-[11px] text-text-faint truncate mt-0.5 font-mono">{item.content}</p>
                <div className="mt-1.5 text-[11px] font-bold text-[#2481CC] dark:text-[#50A7EA] uppercase tracking-wider">
                  OPEN LINK ↗
                </div>
              </div>
            </div>
          </a>
        )}

        {/* 3. Code Snippet */}
        {item.type === 'code' && (
          <div className="space-y-2">
            <div
              className={`rounded-xl bg-[#0E1621] border border-border/60 p-3 font-mono text-xs text-slate-100 overflow-x-auto ${
                isExpanded ? 'max-h-none' : 'max-h-60'
              }`}
            >
              <pre className="text-[11.5px] leading-relaxed text-break-word whitespace-pre-wrap font-mono">
                {item.content}
              </pre>
            </div>

            {isLongContent && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="text-xs font-semibold text-[#2481CC] dark:text-[#50A7EA] hover:underline flex items-center gap-1"
              >
                {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                <span>{isExpanded ? 'Show less code' : 'Expand full code'}</span>
              </button>
            )}
          </div>
        )}

        {/* 4. Media Asset */}
        {(item.type === 'media' || (item.file_url && item.type !== 'html')) && (
          <div className="space-y-2">
            {item.file_url ? (
              <div
                onClick={() => onOpenMedia?.(item.file_url!, item.title)}
                className="rounded-xl overflow-hidden bg-black/5 dark:bg-black/20 border border-border/50 cursor-pointer group/media max-h-96 flex items-center justify-center relative shadow-2xs"
              >
                <img
                  src={item.file_url}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-auto max-h-96 object-contain group-hover/media:scale-[1.01] transition-transform duration-200"
                />
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur-xs text-[10px] text-white font-mono font-medium flex items-center gap-1 pointer-events-none">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>{item.file_size ? `${(item.file_size / 1024).toFixed(0)} KB` : 'Image'}</span>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-surface-elevated text-xs text-text-muted flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-[#2481CC] shrink-0" />
                <span className="truncate">{item.file_name || 'Attached Media'}</span>
              </div>
            )}

            {/* Media Caption Text */}
            {item.content && item.content !== item.file_name && item.content !== item.title && item.type === 'media' && (
              <p className="text-[13px] sm:text-[14px] text-text-main leading-relaxed text-break-word whitespace-pre-wrap pt-0.5 select-text">
                {renderContentWithLinks(item.content)}
              </p>
            )}
          </div>
        )}

        {/* 5. Standalone HTML App */}
        {item.type === 'html' && (
          <div className="p-3.5 rounded-xl bg-[#2481CC]/5 dark:bg-[#50A7EA]/10 border border-[#2481CC]/20 space-y-2.5">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#2481CC] shrink-0" />
              <p className="text-xs font-semibold text-text-main truncate">
                {item.title || item.file_name || 'Interactive Web App'}
              </p>
            </div>
            <button
              onClick={handleRunHtml}
              className="w-full py-2 px-3 rounded-xl bg-[#2481CC] hover:bg-[#1E70B0] text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98]"
            >
              <span>Launch App</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Bottom Action & Time Strip with Upload Status Indicator */}
      <div className="mt-2.5 pt-2 border-t border-border/20 flex items-center justify-between text-xs">
        {/* 1-Tap Copy Action Button */}
        <button
          onClick={handleCopy}
          title={copied ? 'Copied' : 'Copy message text'}
          className="inline-flex items-center gap-1 text-[11px] text-text-muted hover:text-[#2481CC] transition-colors font-medium px-2 py-0.5 rounded-md hover:bg-surface-elevated active:scale-95"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-500" />
              <span className="text-emerald-500 font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copy Post</span>
            </>
          )}
        </button>

        {/* Upload / Sync Status Indicator & Timestamp */}
        <div className="flex items-center gap-2">
          {item.metadata?.sync_status === 'uploading' && (
            <span className="text-amber-500 font-medium flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20" title="Saving media asset...">
              <Loader2 className="w-3 h-3 animate-spin shrink-0" />
              <span>Saving...</span>
            </span>
          )}
          {item.metadata?.sync_status === 'synced' && (
            <span className="text-emerald-500 font-medium flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20" title="Cloud Synced">
              <Cloud className="w-3 h-3 text-emerald-500 shrink-0" />
              <span>Synced</span>
            </span>
          )}
          {(item.metadata?.sync_status === 'local_only' || !item.metadata?.sync_status) && (
            <span className="text-primary font-medium flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md bg-primary/10 border border-primary/20" title="Stored on Device">
              <HardDrive className="w-3 h-3 text-primary shrink-0" />
              <span>Saved</span>
            </span>
          )}

          <span className="text-[11px] text-text-faint font-mono select-none">
            {formatTime(item.created_at)}
          </span>
        </div>
      </div>
    </article>
  );
};
