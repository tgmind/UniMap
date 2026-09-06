import React, { useState, useRef, useEffect } from 'react';
import {
  Paperclip,
  Image as ImageIcon,
  FileCode,
  Globe,
  ArrowUp,
  X,
  Link2,
  Sparkles,
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

  // Auto-resize textarea height
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
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

  // Detect URL inside text
  const urlRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;
  const isPureUrl = urlRegex.test(text.trim());

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = text.trim();
    if (!content && !attachedFile) return;

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
        title = content.slice(0, 40).split('\n')[0] || 'Code Snippet';
      } else if (isPureUrl) {
        finalType = 'link';
        try {
          const urlObj = new URL(content.startsWith('http') ? content : `https://${content}`);
          title = urlObj.hostname.replace('www.', '');
        } catch {
          title = 'Web Link';
        }
      } else {
        // Study Note
        finalType = 'text';
        title = content.split('\n')[0].slice(0, 50) || 'Study Note';
      }

      await addItem({
        type: finalType,
        title: title || (content ? content.slice(0, 40) : 'New Entry'),
        content: content || (attachedFile ? attachedFile.name : ''),
        file: attachedFile || undefined,
        fileName: attachedFile?.name,
        fileSize: attachedFile?.size,
        mimeType: attachedFile?.type,
        tags: [finalType.toUpperCase(), 'Synced'],
      });

      // Clear composer state
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
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="w-full relative">
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
          className="absolute bottom-full mb-2 left-2 z-30 p-2 rounded-2xl bg-surface border border-border shadow-2xl animate-fade-in flex items-center gap-1.5 backdrop-blur-md"
          onClick={() => setShowAttachMenu(false)}
        >
          <button
            type="button"
            onClick={() => mediaInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-colors"
          >
            <ImageIcon className="w-4 h-4" />
            <span>Media</span>
          </button>

          <button
            type="button"
            onClick={() => htmlInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-sky-500 hover:bg-sky-500/10 transition-colors"
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
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-violet-500 hover:bg-violet-500/10 transition-colors"
          >
            <FileCode className="w-4 h-4" />
            <span>Code</span>
          </button>
        </div>
      )}

      {/* Main Composer Box */}
      <div className="rounded-2xl bg-surface border border-border p-2 shadow-lg focus-within:border-primary/60 focus-within:ring-2 focus-within:ring-primary/15 transition-all">
        {/* Active Attachment or Mode Preview Chip */}
        {(attachedFile || isCodeMode) && (
          <div className="mb-2 px-2.5 py-1.5 rounded-xl bg-surface-elevated border border-border flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              {attachedFileType === 'media' && <ImageIcon className="w-4 h-4 text-rose-500 shrink-0" />}
              {attachedFileType === 'html' && <Globe className="w-4 h-4 text-sky-500 shrink-0" />}
              {isCodeMode && <FileCode className="w-4 h-4 text-violet-500 shrink-0" />}
              <span className="font-medium text-text-main truncate">
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
              className="p-1 rounded-lg text-text-muted hover:text-text-main hover:bg-surface transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Input Bar Row */}
        <form onSubmit={handleSend} className="flex items-end gap-2">
          {/* Attachment Toggle Button */}
          <button
            type="button"
            onClick={() => setShowAttachMenu(!showAttachMenu)}
            title="Attach Media, HTML app, or Code"
            className={`p-2.5 rounded-xl border transition-all active:scale-95 shrink-0 ${
              showAttachMenu || attachedFile || isCodeMode
                ? 'bg-primary/10 border-primary text-primary'
                : 'text-text-muted hover:text-text-main bg-surface-elevated border-border'
            }`}
          >
            <Paperclip className="w-4 h-4" />
          </button>

          {/* Multiline Growing Text Input */}
          <div className="flex-1 min-w-0 relative">
            <textarea
              ref={textareaRef}
              rows={1}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                isCodeMode
                  ? 'Paste code snippet here...'
                  : attachedFile
                  ? 'Add a caption / note for this file...'
                  : 'Type note, paste links, drop text or code...'
              }
              className={`w-full resize-none bg-transparent border-0 text-xs sm:text-sm text-text-main placeholder-text-faint focus:outline-none py-2 px-1 max-h-32 min-h-[38px] leading-relaxed ${
                isCodeMode ? 'font-mono' : ''
              }`}
            />

            {/* Pure URL indicator */}
            {isPureUrl && !attachedFile && (
              <span className="absolute right-2 top-2 text-[10px] font-semibold text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md flex items-center gap-1 pointer-events-none">
                <Link2 className="w-3 h-3" />
                <span>Link</span>
              </span>
            )}
          </div>

          {/* 1-Tap Circular Send Button */}
          <button
            type="submit"
            disabled={isSending || (!text.trim() && !attachedFile)}
            title="Send to UniMap Vault (Enter)"
            className="w-10 h-10 rounded-xl bg-primary hover:bg-primary-hover text-primary-text flex items-center justify-center shadow-sm disabled:opacity-30 disabled:scale-100 active:scale-95 transition-all shrink-0"
          >
            <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          </button>
        </form>
      </div>
    </div>
  );
};
