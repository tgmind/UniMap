import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Image as ImageIcon,
  FileCode,
  Globe,
  Send,
  X,
  Smile,
  ZoomIn,
  CheckCircle2,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { useItems } from '../context/ItemContext';
import { ItemType } from '../types';
import { CompressionPreset, smartCompress } from '../lib/smartCompress';

export const MessengerComposer: React.FC = () => {
  const { addItem } = useItems();
  const [text, setText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileType, setAttachedFileType] = useState<'media' | 'html' | null>(null);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // SmartCompress state for bottom composer
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>('study_doc');
  const [compressedFile, setCompressedFile] = useState<File | Blob | null>(null);
  const [compressedDataUrl, setCompressedDataUrl] = useState<string>('');
  const [compressedPreview, setCompressedPreview] = useState<string>('');
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [savings, setSavings] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showLoupe, setShowLoupe] = useState(false);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height as user types or pastes multiline text
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 24), 140)}px`;
    }
  }, [text]);

  const runCompression = async (file: File, preset: CompressionPreset) => {
    if (!file.type.startsWith('image/')) {
      setOriginalSize(file.size);
      setCompressedSize(file.size);
      setSavings(0);
      return;
    }

    setIsCompressing(true);
    try {
      const result = await smartCompress(file, preset);
      setCompressedFile(result.file);
      setCompressedDataUrl(result.dataUrl);
      setCompressedPreview(result.previewUrl);
      setOriginalSize(result.originalSize);
      setCompressedSize(result.compressedSize);
      setSavings(result.savingsPercentage);
    } catch (err) {
      console.error('Messenger compression error:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handleMediaSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setAttachedFileType('media');
      setIsCodeMode(false);
      setShowAttachMenu(false);
      if (file.type.startsWith('image/')) {
        await runCompression(file, compressionPreset);
      }
    }
  };

  const handlePresetChange = async (preset: CompressionPreset) => {
    setCompressionPreset(preset);
    if (attachedFile && attachedFile.type.startsWith('image/')) {
      await runCompression(attachedFile, preset);
    }
  };

  const handleHtmlSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setAttachedFileType('html');
      setIsCodeMode(false);
      setShowAttachMenu(false);
    }
  };

  const clearAttachment = () => {
    setAttachedFile(null);
    setAttachedFileType(null);
    setCompressedFile(null);
    setCompressedDataUrl('');
    setCompressedPreview('');
    setOriginalSize(0);
    setCompressedSize(0);
    setSavings(0);
    setShowLoupe(false);
    setIsCodeMode(false);
    if (mediaInputRef.current) mediaInputRef.current.value = '';
    if (htmlInputRef.current) htmlInputRef.current.value = '';
  };

  // Clipboard paste: auto-detect pasted image or code mode
  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    // Check if clipboard contains an image file
    if (e.clipboardData.files && e.clipboardData.files.length > 0) {
      const file = e.clipboardData.files[0];
      if (file.type.startsWith('image/')) {
        e.preventDefault();
        setAttachedFile(file);
        setAttachedFileType('media');
        setIsCodeMode(false);
        await runCompression(file, compressionPreset);
        return;
      }
    }

    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    const isCodePattern =
      /[{};()=><\[\]]/.test(pasted) &&
      /(function|class|import|export|const|let|var|def |<\w+>|return)/i.test(pasted);

    if (isCodePattern) {
      setIsCodeMode(true);
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const activeText = text.trim();
    if (!activeText && !attachedFile && !compressedDataUrl) return;

    setIsSending(true);

    try {
      let finalType: ItemType = 'text';
      let title = '';
      let finalFile: File | Blob | undefined = compressedFile || attachedFile || undefined;
      let finalFileName = attachedFile?.name;

      const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
      const isPureUrl = urlRegex.test(activeText);

      if (attachedFileType === 'html') {
        finalType = 'html';
        title = attachedFile ? attachedFile.name.replace(/\.[^/.]+$/, '') : 'HTML Document';
      } else if (attachedFileType === 'media' || compressedDataUrl) {
        finalType = 'media';
        title = attachedFile ? attachedFile.name : 'Media Asset';
        if (compressedFile && attachedFile) {
          finalFileName = attachedFile.name.replace(/\.[^/.]+$/, '.webp');
        }
      } else if (isCodeMode) {
        finalType = 'code';
        title = activeText.slice(0, 40).split('\n')[0].trim() || 'Code Snippet';
      } else if (isPureUrl) {
        finalType = 'link';
        try {
          const urlObj = new URL(activeText.startsWith('http') ? activeText : `https://${activeText}`);
          title = urlObj.hostname.replace('www.', '');
        } catch {
          title = 'Web Link';
        }
      } else {
        finalType = 'text';
        title = activeText.split('\n')[0].slice(0, 50).trim() || 'Study Note';
      }

      await addItem({
        type: finalType,
        title: title,
        content: activeText || (attachedFile ? attachedFile.name : ''),
        file: finalFile,
        dataUrl: compressedDataUrl || undefined,
        fileName: finalFileName,
        fileSize: compressedSize || (finalFile ? (finalFile as any).size : activeText.length),
        mimeType: finalType === 'media' ? 'image/webp' : (attachedFile?.type || 'text/plain'),
        tags: [finalType.toUpperCase(), 'Synced'],
      });

      setText('');
      clearAttachment();
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    } catch (err) {
      console.error('Failed to send item:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Desktop: Enter sends message, Shift+Enter adds newline
    if (e.key === 'Enter' && !e.shiftKey && window.innerWidth > 640) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatBytes = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="w-full relative select-none">
      {/* Hidden File Inputs */}
      <input
        ref={mediaInputRef}
        type="file"
        accept="image/*,video/*,audio/*,application/pdf"
        className="hidden"
        onChange={handleMediaSelected}
      />
      <input
        ref={htmlInputRef}
        type="file"
        accept=".html,.htm"
        className="hidden"
        onChange={handleHtmlSelected}
      />

      {/* Attachment Popover Menu */}
      {showAttachMenu && (
        <div
          className="absolute bottom-full mb-3 right-12 z-30 p-1.5 rounded-2xl bg-surface border border-border shadow-2xl animate-fade-in flex items-center gap-1.5 backdrop-blur-xl"
          onClick={() => setShowAttachMenu(false)}
        >
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Gallery</span>
          </button>

          <button
            type="button"
            onClick={() => htmlInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-500 hover:bg-sky-500/10 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>HTML Tool</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setIsCodeMode(true);
              setAttachedFile(null);
              setAttachedFileType(null);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-violet-500 hover:bg-violet-500/10 transition-colors"
          >
            <FileCode className="w-4 h-4" />
            <span>Code</span>
          </button>
        </div>
      )}

      {/* Full SmartCompress Quality Drawer for Grid View Media Upload */}
      {attachedFile && attachedFileType === 'media' && (
        <div className="mb-2 p-2.5 sm:p-3 rounded-2xl bg-surface/95 dark:bg-[#18222D]/95 backdrop-blur-xl border border-[#2481CC]/30 dark:border-white/15 shadow-xl animate-fade-in max-w-xl mx-auto space-y-2">
          {/* Header Row: Thumbnail + Details + Controls */}
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Image Preview Thumbnail with 1-Tap Loupe inspection */}
              {compressedPreview ? (
                <div
                  onClick={() => setShowLoupe(!showLoupe)}
                  className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl overflow-hidden bg-black/10 dark:bg-black/30 border border-border/80 shrink-0 cursor-pointer relative group/thumb shadow-2xs"
                  title="Click to check text clarity"
                >
                  <img
                    src={compressedPreview}
                    alt="Preview"
                    className="w-full h-full object-cover group-hover/thumb:scale-105 transition-transform"
                  />
                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <ZoomIn className="w-3.5 h-3.5" />
                  </div>
                </div>
              ) : (
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center shrink-0">
                  <ImageIcon className="w-5 h-5" />
                </div>
              )}

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-text-main text-xs sm:text-[13px] truncate">
                    {attachedFile.name}
                  </span>
                  {isCompressing && (
                    <Loader2 className="w-3 h-3 text-[#2481CC] animate-spin shrink-0" />
                  )}
                </div>

                {/* Compression Metrics: Original -> Optimized (-XX% saved) */}
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-text-muted mt-0.5">
                  <span className="text-text-faint">{formatBytes(originalSize)}</span>
                  <span>→</span>
                  <span className="text-emerald-500 dark:text-emerald-400 font-medium">
                    {formatBytes(compressedSize)}
                  </span>
                  {savings > 0 && (
                    <span className="px-1.5 py-0.2 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold">
                      -{savings}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Loupe & Dismiss */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowLoupe(!showLoupe)}
                title="Inspect equation clarity"
                className={`p-1.5 rounded-lg text-xs font-medium flex items-center gap-1 transition-colors ${
                  showLoupe
                    ? 'bg-[#2481CC]/15 text-[#2481CC] dark:text-[#50A7EA]'
                    : 'text-text-muted hover:text-text-main hover:bg-surface-elevated'
                }`}
              >
                <ZoomIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline text-[11px]">{showLoupe ? 'Hide Loupe' : 'Clarity'}</span>
              </button>

              <button
                type="button"
                onClick={clearAttachment}
                title="Remove image"
                className="p-1.5 rounded-lg text-text-faint hover:text-red-400 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Interactive SmartCompress Preset Selector Buttons */}
          <div className="flex items-center gap-1.5 pt-0.5 border-t border-border/40">
            <span className="text-[10px] uppercase font-mono font-bold tracking-wider text-text-faint shrink-0 pr-1">
              Preset:
            </span>
            <button
              type="button"
              onClick={() => handlePresetChange('study_doc')}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                compressionPreset === 'study_doc'
                  ? 'bg-[#2481CC] text-white shadow-xs'
                  : 'bg-surface-elevated text-text-muted hover:text-text-main border border-border/60'
              }`}
            >
              <span>Study Doc</span>
              <span className="hidden sm:inline text-[9.5px] opacity-80">(2.5K)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('diagram')}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                compressionPreset === 'diagram'
                  ? 'bg-[#2481CC] text-white shadow-xs'
                  : 'bg-surface-elevated text-text-muted hover:text-text-main border border-border/60'
              }`}
            >
              <span>Diagram</span>
              <span className="hidden sm:inline text-[9.5px] opacity-80">(Color)</span>
            </button>
            <button
              type="button"
              onClick={() => handlePresetChange('original')}
              className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all flex items-center justify-center gap-1 ${
                compressionPreset === 'original'
                  ? 'bg-[#2481CC] text-white shadow-xs'
                  : 'bg-surface-elevated text-text-muted hover:text-text-main border border-border/60'
              }`}
            >
              <span>Original</span>
              <span className="hidden sm:inline text-[9.5px] opacity-80">(Raw)</span>
            </button>
          </div>

          {/* Zoomed Clarity Inspection Box */}
          {showLoupe && compressedPreview && (
            <div className="rounded-xl overflow-hidden border border-border bg-black/60 p-1 flex items-center justify-center max-h-52 animate-fade-in">
              <img
                src={compressedPreview}
                alt="Clarity preview"
                className="max-h-48 object-contain rounded-lg shadow-inner"
              />
            </div>
          )}
        </div>
      )}

      {/* Active Attachment Floating Chip for Non-Media (HTML / Code) */}
      {((attachedFile && attachedFileType !== 'media') || (isCodeMode && !attachedFile)) && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-surface border border-border/80 shadow-md flex items-center justify-between gap-2 text-xs animate-fade-in max-w-md mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            {attachedFileType === 'html' && <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
            {isCodeMode && !attachedFile && <FileCode className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
            <span className="font-medium text-text-main truncate text-[11px] sm:text-xs">
              {attachedFile ? attachedFile.name : 'Code Snippet Mode'}
            </span>
            {attachedFile && (
              <span className="text-[10px] font-mono text-text-faint">
                ({formatBytes(attachedFile.size)})
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={clearAttachment}
            className="p-1 rounded-md text-text-faint hover:text-text-main"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Telegram Floating Message Bar: Auto-Expanding Textarea Capsule + Circular Blue Send Button */}
      <form onSubmit={handleSend} className="flex items-end gap-2 max-w-3xl mx-auto">
        {/* Telegram Input Capsule */}
        <div className="flex-1 min-w-0 min-h-[44px] rounded-[22px] bg-[#EBF2EA] dark:bg-[#121C26] shadow-md border border-black/10 dark:border-white/10 px-3 py-1.5 flex items-end gap-2 transition-all focus-within:ring-2 focus-within:ring-[#2481CC]/25 focus-within:border-[#2481CC]/60 focus-within:bg-[#E2ECE1] dark:focus-within:bg-[#162330]">
          {/* Smiley Icon */}
          <button
            type="button"
            onClick={() => setText((t) => t + '📌 ')}
            className="text-text-faint hover:text-text-main transition-colors shrink-0 pb-1.5"
            title="Insert pin marker"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Auto-Expanding Multiline Textarea */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder={
              attachedFile
                ? 'Add a caption to this photo...'
                : 'Message (paste WhatsApp/Telegram notes)...'
            }
            className="flex-1 min-w-0 bg-transparent border-0 text-xs sm:text-sm text-text-main placeholder-text-faint focus:outline-none resize-none leading-relaxed py-1 max-h-36 overflow-y-auto"
          />

          {/* Clear Button if text exists */}
          {text && (
            <button
              type="button"
              onClick={() => setText('')}
              className="p-1 text-text-faint hover:text-text-main transition-colors shrink-0 pb-1.5"
              title="Clear input"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Paperclip Attachment Button */}
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            title="Attach file, media, or code"
            className={`p-1.5 rounded-full transition-all shrink-0 pb-1.5 ${
              showAttachMenu || attachedFile || isCodeMode
                ? 'text-[#2481CC] dark:text-[#50A7EA] bg-[#2481CC]/10'
                : 'text-text-faint hover:text-text-main'
            }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>
        </div>

        {/* Telegram Circular Blue Send Button */}
        <button
          type="submit"
          disabled={isSending || (!text.trim() && !attachedFile && !compressedDataUrl)}
          title="Send message (Enter)"
          className="w-11 h-11 rounded-full bg-[#2481CC] hover:bg-[#1E70B0] text-white flex items-center justify-center shadow-md active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shrink-0 mb-0.5"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4 translate-x-px" />
          )}
        </button>
      </form>
    </div>
  );
};
