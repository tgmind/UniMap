import React, { useRef, useState } from 'react';
import {
  Pin,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Trash2,
  ExternalLink,
  Globe,
  CheckCircle2,
} from 'lucide-react';
import { UniItem } from '../types';
import { useItems } from '../context/ItemContext';
import { runHtmlInBrowser } from '../lib/downloadHelper';

interface CompactPinnedCardsProps {
  items: UniItem[];
  onOpenMedia?: (url: string, title: string, item?: UniItem) => void;
}

export const CompactPinnedCards: React.FC<CompactPinnedCardsProps> = ({
  items,
  onOpenMedia,
}) => {
  const { togglePin, deleteItem } = useItems();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!items || items.length === 0) return null;

  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleCopy = (e: React.MouseEvent, item: UniItem) => {
    e.stopPropagation();
    navigator.clipboard.writeText(item.content || item.title);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 1600);
  };

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getDomain = (urlStr: string) => {
    try {
      const u = new URL(urlStr.startsWith('http') ? urlStr : `https://${urlStr}`);
      return u.hostname.replace('www.', '');
    } catch {
      return 'Link';
    }
  };

  return (
    <section className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-blue-500/10 via-sky-500/10 to-indigo-500/10 dark:from-blue-600/20 dark:via-sky-600/15 dark:to-indigo-600/20 border border-blue-400/30 dark:border-blue-500/30 p-3 sm:p-4 backdrop-blur-sm shadow-xs transition-all">
      {/* Top Header Strip with Count and Scroll Controls */}
      <div className="flex items-center justify-between gap-2 mb-2.5 px-0.5 select-none">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-[#2481CC] text-white flex items-center justify-center shadow-2xs">
            <Pin className="w-3.5 h-3.5 fill-current" />
          </div>
          <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-blue-200 tracking-tight flex items-center gap-1.5">
            <span>Pinned Messages</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#2481CC]/20 text-[#2481CC] dark:text-[#50A7EA] font-semibold">
              {items.length}
            </span>
          </h3>
        </div>

        {/* Scroll Arrows for Desktop */}
        <div className="hidden sm:flex items-center gap-1">
          <button
            onClick={() => handleScroll('left')}
            title="Scroll left"
            aria-label="Scroll pinned messages left"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            title="Scroll right"
            aria-label="Scroll pinned messages right"
            className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Horizontal Scroll Track */}
      <div
        ref={scrollContainerRef}
        className="flex items-stretch gap-3 overflow-x-auto pb-1.5 pt-0.5 scrollbar-thin scrollbar-thumb-blue-400/40 snap-x scroll-smooth"
      >
        {items.map((item) => {
          const isCopied = copiedId === item.id;
          const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
          const detectedUrls = item.content ? item.content.match(urlRegex) || [] : [];
          const singleUrl = detectedUrls.length === 1 ? detectedUrls[0] : null;

          return (
            <article
              key={item.id}
              className="w-64 sm:w-72 shrink-0 snap-start bg-white/95 dark:bg-[#18222D]/95 border border-blue-200/70 dark:border-blue-800/40 rounded-xl p-3 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
            >
              {/* Card Header: Device info + Pin/Delete actions */}
              <div className="flex items-center justify-between gap-1.5 pb-1.5 mb-1.5 border-b border-border/40">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[11px] font-bold text-[#E53935] dark:text-[#FF5252] truncate">
                    {item.device_name || 'White Vault'}
                  </span>
                  <span className="text-[9px] text-text-faint font-mono">•</span>
                  <span className="text-[9px] uppercase font-mono text-text-faint tracking-wider">
                    {item.type}
                  </span>
                </div>

                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    onClick={() => togglePin(item.id)}
                    title="Unpin message"
                    aria-label="Unpin message"
                    className="p-1 rounded text-[#2481CC] dark:text-[#50A7EA] hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                  >
                    <Pin className="w-3 h-3 fill-current" />
                  </button>
                  <button
                    onClick={() => deleteItem(item.id)}
                    title="Delete message"
                    aria-label="Delete message"
                    className="p-1 rounded text-text-faint hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>

              {/* Card Body: Compact Content Representation */}
              <div className="space-y-1.5 flex-1 min-w-0 mb-2">
                {item.title && (
                  <h4 className="font-bold text-xs sm:text-[13px] text-text-main line-clamp-1 text-break-word">
                    {item.title}
                  </h4>
                )}

                {/* 1. Media Type */}
                {item.type === 'media' && item.file_url ? (
                  <div
                    onClick={() => onOpenMedia?.(item.file_url!, item.title, item)}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-surface-elevated/70 hover:bg-surface-elevated border border-border/40 cursor-pointer transition-colors"
                  >
                    <img
                      src={item.file_url}
                      alt={item.title || 'Media thumbnail'}
                      className="w-9 h-9 rounded object-cover shrink-0 bg-black/10"
                      loading="lazy"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-text-muted truncate">
                        {item.file_name || 'Media image'}
                      </p>
                      <span className="text-[9px] font-mono text-blue-500 dark:text-blue-400 font-medium">
                        View Photo ↗
                      </span>
                    </div>
                  </div>
                ) : item.type === 'link' || singleUrl ? (
                  /* 2. Link Type */
                  <a
                    href={
                      item.type === 'link'
                        ? item.content.startsWith('http')
                          ? item.content
                          : `https://${item.content}`
                        : singleUrl!.startsWith('http')
                        ? singleUrl!
                        : `https://${singleUrl!}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-2 p-2 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40 hover:bg-blue-100/60 dark:hover:bg-blue-900/40 transition-colors group/link"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#2481CC] shrink-0" />
                    <span className="text-[11px] font-semibold text-[#2481CC] dark:text-[#50A7EA] truncate flex-1">
                      {getDomain(item.type === 'link' ? item.content : singleUrl!)}
                    </span>
                    <ExternalLink className="w-3 h-3 text-[#2481CC] shrink-0 opacity-70 group-hover/link:opacity-100" />
                  </a>
                ) : item.type === 'html' ? (
                  /* 3. HTML App Type */
                  <div className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
                    <span className="text-[11px] font-medium text-text-muted truncate">Interactive App</span>
                    <button
                      onClick={() => runHtmlInBrowser(item.content, item.title)}
                      className="px-2 py-0.5 rounded bg-[#2481CC] hover:bg-[#1E70B0] text-white text-[10px] font-bold shrink-0 transition-colors"
                    >
                      Run ↗
                    </button>
                  </div>
                ) : item.type === 'code' ? (
                  /* 4. Code Type */
                  <div className="p-2 rounded-lg bg-[#0E1621] text-slate-200 font-mono text-[10px] line-clamp-2 leading-relaxed overflow-hidden">
                    {item.content}
                  </div>
                ) : (
                  /* 5. Standard Text */
                  <p className="text-[11px] text-text-muted line-clamp-2 select-text leading-relaxed text-break-word">
                    {item.content}
                  </p>
                )}
              </div>

              {/* Card Footer: Timestamp & Copy Button */}
              <div className="pt-1.5 border-t border-border/30 flex items-center justify-between text-[10px] text-text-faint">
                <div className="flex items-center gap-1 font-mono">
                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                  <span>{formatTime(item.created_at)}</span>
                </div>

                <button
                  onClick={(e) => handleCopy(e, item)}
                  title={isCopied ? 'Copied' : 'Copy content'}
                  className="inline-flex items-center gap-1 font-medium text-text-muted hover:text-[#2481CC] px-1.5 py-0.5 rounded hover:bg-surface-elevated transition-colors"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span className="text-emerald-500 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
