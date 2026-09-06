import React, { useState, useRef } from 'react';
import {
  Paperclip,
  Image as ImageIcon,
  FileCode,
  Globe,
  ArrowUp,
  X,
  Link2,
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

  // Active clipboard paste handler to capture multiline text, code snippets, and URLs seamlessly
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
      setText(firstLine.slice(0, 60));
    }
  };

  const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
  const isPureUrl = urlRegex.test(text.trim());

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const activeText = pastedMultilineContent || text.trim();
    if (!activeText && !attachedFile) return;

    setIsSending(true);

    try {
      let finalType: ItemType = 'text';
      let title = '';

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
        title: title || (activeText ? activeText.slice(0, 40) : 'New Entry'),
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

      {/* Attachment / Mode Popover Sheet */}
      {showAttachMenu && (
        <div
          className="absolute bottom-full mb-2 left-2 z-30 p-1.5 rounded-2xl bg-surface border border-border shadow-2xl animate-fade-in flex items-center gap-1.5 backdrop-blur-xl"
          onClick={() => setShowAttachMenu(false)}
        >
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Media</span>
          </button>

          <button
            type="button"
            onClick={() => htmlInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-sky-500 hover:bg-sky-500/10 transition-colors"
          >
            <Globe className="w-4 h-4" />
            <span>HTML App</span>
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

      {/* Floating Capsule Composer Box */}
      <div className="rounded-full bg-surface/90 backdrop-blur-xl border border-border/80 px-2 py-1.5 shadow-lg focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
        {/* Active Attachment or Pasted Multiline/Code Preview Chip */}
        {(attachedFile || isCodeMode || pastedMultilineContent) && (
          <div className="mb-1 mx-2 px-2.5 py-1 rounded-lg bg-surface-elevated border border-border/60 flex items-center justify-between gap-2 text-xs animate-fade-in">
            <div className="flex items-center gap-2 min-w-0">
              {attachedFileType === 'media' && <ImageIcon className="w-3.5 h-3.5 text-rose-500 shrink-0" />}
              {attachedFileType === 'html' && <Globe className="w-3.5 h-3.5 text-sky-500 shrink-0" />}
              {isCodeMode && !attachedFile && <FileCode className="w-3.5 h-3.5 text-violet-500 shrink-0" />}
              {pastedMultilineContent && !isCodeMode && !attachedFile && (
                <FileText className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              )}
              <span className="font-medium text-text-main truncate text-[11px]">
                {attachedFile
                  ? attachedFile.name
                  : pastedMultilineContent
                  ? `Pasted Snippet (${pastedMultilineContent.split('\n').length} lines • ${pastedMultilineContent.length} chars)`
                  : 'Code Mode'}
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
              title="Remove attachment or pasted snippet"
              className="p-1 rounded-md text-text-muted hover:text-text-main hover:bg-surface transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Input Bar Row */}
        <form onSubmit={handleSend} className="flex items-center gap-1.5 sm:gap-2">
          {/* Attachment Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            title="Attach Media, HTML app, or Code"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-95 shrink-0 ${
              showAttachMenu || attachedFile || isCodeMode
                ? 'bg-primary text-primary-text'
                : 'text-text-muted hover:text-text-main hover:bg-surface-elevated'
            }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Single-Line Text Input */}
          <div className="flex-1 min-w-0 relative flex items-center">
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
              placeholder={
                isCodeMode
                  ? 'Paste code or type snippet...'
                  : attachedFile
                  ? 'Add caption for file...'
                  : 'Type note, drop link, paste code...'
              }
              className={`w-full h-8 bg-transparent border-0 text-xs sm:text-sm text-text-main placeholder-text-faint focus:outline-none px-2 font-normal truncate ${
                isCodeMode ? 'font-mono text-xs' : ''
              }`}
            />

            {/* Clear Text Button */}
            {text && (
              <button
                type="button"
                onClick={() => {
                  setText('');
                  setPastedMultilineContent(null);
                }}
                className="p-1 text-text-faint hover:text-text-main transition-colors mr-1"
                title="Clear input"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Pure URL indicator */}
            {isPureUrl && !attachedFile && !pastedMultilineContent && (
              <span className="text-[10px] font-semibold text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded flex items-center gap-1 shrink-0 mr-1 pointer-events-none">
                <Link2 className="w-3 h-3" />
                <span>Link</span>
              </span>
            )}
          </div>

          {/* 1-Tap Circular Send Button */}
          <button
            type="submit"
            disabled={isSending || (!text.trim() && !attachedFile && !pastedMultilineContent)}
            title="Send to UniMap Vault (Enter)"
            className="w-8 h-8 rounded-full bg-primary hover:bg-primary-hover text-primary-text flex items-center justify-center shadow-xs disabled:opacity-30 disabled:scale-100 active:scale-95 transition-all shrink-0"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
};
