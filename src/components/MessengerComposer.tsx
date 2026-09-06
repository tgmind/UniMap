import React, { useState, useRef } from 'react';
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
  const [pastedMultilineContent, setPastedMultilineContent] = useState<string | null>(null);
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [attachedFileType, setAttachedFileType] = useState<'media' | 'html' | null>(null);
  const [isCodeMode, setIsCodeMode] = useState(false);
  const [showAttachMenu, setShowAttachMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);

  const mediaInputRef = useRef<HTMLInputElement>(null);
  const htmlInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
    setPastedMultilineContent(null);
    if (mediaInputRef.current) mediaInputRef.current.value = '';
    if (htmlInputRef.current) htmlInputRef.current.value = '';
  };

  // Active clipboard paste handler to capture WhatsApp & Telegram texts, exam links, and codes
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData('text');
    if (!pasted) return;

    if (pasted.includes('\n') || pasted.includes('\r')) {
      e.preventDefault();
      setPastedMultilineContent(pasted);

      const isCodePattern =
        /[{};()=><\[\]]/.test(pasted) &&
        /(function|class|import|export|const|let|var|def |<\w+>|return)/i.test(pasted);

      if (isCodePattern) {
        setIsCodeMode(true);
      }

      const lines = pasted.split(/\r?\n/).filter((l) => l.trim().length > 0);
      const firstLine = lines[0]?.trim() || '';
      setText(firstLine.slice(0, 55));
    }
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const activeText = pastedMultilineContent || text.trim();
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
      } else if (isPureUrl && !pastedMultilineContent) {
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
        file: attachedFile || undefined,
        fileName: attachedFile?.name,
        fileSize: attachedFile?.size,
        mimeType: attachedFile?.type,
        tags: [finalType.toUpperCase(), 'Synced'],
      });

      setText('');
      clearAttachment();
    } catch (err) {
      console.error('Failed to send item:', err);
    } finally {
      setIsSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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

      {/* Attachment Popover Sheet */}
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

      {/* Active Snippet / Attachment Floating Chip */}
      {(attachedFile || isCodeMode || pastedMultilineContent) && (
        <div className="mb-2 px-3 py-1.5 rounded-xl bg-surface border border-border/80 shadow-md flex items-center justify-between gap-2 text-xs animate-fade-in max-w-md mx-auto">
          <div className="flex items-center gap-2 min-w-0">
            {attachedFileType === 'media' && <ImageIcon className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
            {attachedFileType === 'html' && <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
            {isCodeMode && !attachedFile && <FileCode className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
            {pastedMultilineContent && !isCodeMode && !attachedFile && (
              <FileText className="w-3.5 h-3.5 text-[#2481CC] dark:text-[#50A7EA] shrink-0" />
            )}
            <span className="font-medium text-text-main truncate text-[11px] sm:text-xs">
              {attachedFile
                ? attachedFile.name
                : pastedMultilineContent
                ? `Pasted (${pastedMultilineContent.split('\n').length} lines)`
                : 'Code Mode'}
            </span>
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

      {/* Telegram Floating Message Bar: Pill on left + Circular Blue Button on right */}
      <form onSubmit={handleSend} className="flex items-center gap-2 max-w-3xl mx-auto">
        {/* Telegram Input Capsule */}
        <div className="flex-1 min-w-0 h-11 rounded-full bg-surface shadow-md border border-border/60 px-3 flex items-center gap-2 transition-all focus-within:ring-2 focus-within:ring-[#2481CC]/25">
          {/* Smiley Icon */}
          <button
            type="button"
            onClick={() => setText((t) => t + '📌 ')}
            className="text-text-faint hover:text-text-main transition-colors shrink-0"
            title="Insert pin marker"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (!e.target.value) setPastedMultilineContent(null);
            }}
            onPaste={handlePaste}
            onKeyDown={handleKeyDown}
            placeholder="Message (paste text, links, notes)..."
            className="flex-1 min-w-0 bg-transparent border-0 text-xs sm:text-sm text-text-main placeholder-text-faint focus:outline-none font-normal"
          />

          {/* Clear Button if text exists */}
          {text && (
            <button
              type="button"
              onClick={() => {
                setText('');
                setPastedMultilineContent(null);
              }}
              className="p-1 text-text-faint hover:text-text-main transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Paperclip Attachment Button */}
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            title="Attach file, media, or code"
            className={`p-1.5 rounded-full transition-all shrink-0 ${
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
          disabled={isSending || (!text.trim() && !attachedFile && !pastedMultilineContent)}
          title="Send message (Enter)"
          className="w-11 h-11 rounded-full bg-[#2481CC] hover:bg-[#1E70B0] text-white flex items-center justify-center shadow-md active:scale-95 disabled:opacity-40 disabled:scale-100 transition-all shrink-0"
        >
          <Send className="w-4 h-4 translate-x-px" />
        </button>
      </form>
    </div>
  );
};
