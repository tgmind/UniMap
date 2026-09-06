import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Image as ImageIcon,
  FileCode,
  Globe,
  Send,
  X,
  Smile,
  FileText,
} from 'lucide-react';
import { useItems } from '../context/ItemContext';
import { ItemType } from '../types';

export const MessengerComposer: React.FC = () => {
  const { addItem } = useItems();
  const [text, setText] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileType, setAttachedFileType] = useState<'media' | 'html' | null>(null);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);

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

  const handleMediaSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAttachedFile(file);
      setAttachedFileType('media');
      setIsCodeMode(false);
      setShowAttachMenu(false);
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
    setIsCodeMode(false);
    if (mediaInputRef.current) mediaInputRef.current.value = '';
    if (htmlInputRef.current) htmlInputRef.current.value = '';
  };

  // Clipboard paste: auto-detect code mode if code keywords are present
  const handlePaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
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
    if (!activeText && !attachedFile) return;

    setIsSending(true);

    try {
      let finalType: ItemType = 'text';
      let title = '';

      const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
      const isPureUrl = urlRegex.test(activeText);

      if (attachedFileType === 'html') {
        finalType = 'html';
        title = attachedFile ? attachedFile.name.replace(/\.[^/.]+$/, '') : 'HTML Document';
      } else if (attachedFileType === 'media') {
        finalType = 'media';
        title = attachedFile ? attachedFile.name : 'Media Asset';
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
        // Extract clean first line as title or generic note
        title = activeText.split('\n')[0].slice(0, 50).trim() || 'Study Note';
      }

      await addItem({
        type: finalType,
        title: title,
        content: activeText || (attachedFile ? attachedFile.name : ''),
        file: attachedFile || undefined,
        fileName: attachedFile?.name,
        fileSize: attachedFile?.size,
        mimeType: attachedFile?.type,
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

      {/* Active Attachment Floating Chip */}
      {(attachedFile || isCodeMode) && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-surface border border-border/80 shadow-md flex items-center justify-between gap-2 text-xs animate-fade-in max-w-md mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            {attachedFileType === 'media' && <ImageIcon className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
            {attachedFileType === 'html' && <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
            {isCodeMode && !attachedFile && <FileCode className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
            <span className="font-medium text-text-main truncate text-[11px] sm:text-xs">
              {attachedFile ? attachedFile.name : 'Code Snippet Mode'}
            </span>
            {attachedFile && (
              <span className="text-[10px] font-mono text-text-faint">
                ({(attachedFile.size / 1024).toFixed(1)} KB)
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
        {/* Telegram Input Capsule (One shade darker than whitish card background for distinct visual separation) */}
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

          {/* Auto-Expanding Multiline Textarea (Preserves 100% of Newlines & Formatting) */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Message (paste WhatsApp/Telegram notes)..."
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
          disabled={isSending || (!text.trim() && !attachedFile)}
          title="Send message (Enter)"
          className="w-11 h-11 rounded-full bg-[#2481CC] hover:bg-[#1E70B0] text-white flex items-center justify-center shadow-md active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shrink-0 mb-0.5"
        >
          <Send className="w-4 h-4 translate-x-px" />
        </button>
      </form>
    </div>
  );
};
