import React, { useState, useRef } from 'react';
import {
  X,
  FileText,
  Globe,
  Code,
  Image as ImageIcon,
  Link2,
  UploadCloud,
  ZoomIn,
} from 'lucide-react';
import { ItemType } from '../types';
import { useItems } from '../context/ItemContext';
import { CompressionPreset, smartCompress } from '../lib/smartCompress';

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AddItemModal: React.FC<AddItemModalProps> = ({ isOpen, onClose }) => {
  const { addItem } = useItems();
  const [selectedType, setSelectedType] = useState<ItemType>('html');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagInput, setTagInput] = useState('Study');
  const [codeLanguage, setCodeLanguage] = useState('python');

  // Media state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>('study_doc');
  const [compressedFile, setCompressedFile] = useState<File | Blob | null>(null);
  const [compressedDataUrl, setCompressedDataUrl] = useState<string>('');
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [compressedSize, setCompressedSize] = useState<number>(0);
  const [savings, setSavings] = useState<number>(0);
  const [isCompressing, setIsCompressing] = useState(false);
  const [showLoupe, setShowLoupe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    if (!title) {
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    }

    if (file.name.endsWith('.html') || file.type === 'text/html') {
      const text = await file.text();
      setContent(text);
      setSelectedType('html');
      return;
    }

    if (file.type.startsWith('image/')) {
      setSelectedType('media');
      await runCompression(file, compressionPreset);
    }
  };

  const runCompression = async (file: File, preset: CompressionPreset) => {
    setIsCompressing(true);
    try {
      const result = await smartCompress(file, preset);
      setCompressedFile(result.file);
      setCompressedDataUrl(result.dataUrl);
      setPreviewUrl(result.previewUrl);
      setOriginalSize(result.originalSize);
      setCompressedSize(result.compressedSize);
      setSavings(result.savingsPercentage);
    } catch (err) {
      console.error('Compression error:', err);
    } finally {
      setIsCompressing(false);
    }
  };

  const handlePresetChange = async (preset: CompressionPreset) => {
    setCompressionPreset(preset);
    if (selectedFile) {
      await runCompression(selectedFile, preset);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title && !content && !selectedFile) return;

    setIsSubmitting(true);
    try {
      const tags = tagInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      let finalContent = content;
      let finalFile: File | Blob | undefined = compressedFile || selectedFile || undefined;
      let finalFileName = selectedFile?.name;

      if (selectedType === 'html' && !finalFileName) {
        finalFileName = `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.html`;
      }

      await addItem({
        type: selectedType,
        title: title || (finalFileName ? finalFileName : 'Study Item'),
        content: finalContent,
        file: finalFile,
        dataUrl: compressedDataUrl || undefined,
        fileName: finalFileName,
        fileSize: compressedSize || (finalFile ? finalFile.size : new Blob([finalContent]).size),
        mimeType: selectedType === 'html' ? 'text/html' : (finalFile ? (finalFile as any).type : undefined),
        tags: tags.length ? tags : ['Study'],
      });

      setTitle('');
      setContent('');
      setSelectedFile(null);
      setCompressedFile(null);
      setCompressedDataUrl('');
      setPreviewUrl('');
      onClose();
    } catch (err) {
      console.error('Failed to add item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl p-6 shadow-xl overflow-hidden max-h-[90vh] flex flex-col space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h2 className="text-base font-semibold text-text-main">New Study Item</h2>
            <p className="text-xs text-text-muted mt-0.5">Synchronizes across all connected devices</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-faint hover:text-text-main hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Minimal Type Switcher */}
        <div className="flex p-1 rounded-xl bg-surface-elevated border border-border overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedType('html')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              selectedType === 'html' ? 'bg-surface text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>HTML File</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('media')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              selectedType === 'media' ? 'bg-surface text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Media</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('text')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              selectedType === 'text' ? 'bg-surface text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Notes</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('code')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              selectedType === 'code' ? 'bg-surface text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            <span>Code</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedType('link')}
            className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 whitespace-nowrap transition-all ${
              selectedType === 'link' ? 'bg-surface text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            <span>Link</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto flex-1 space-y-4 pr-1">
          <div>
            <label className="block text-xs font-medium text-text-main mb-1">Title</label>
            <input
              type="text"
              placeholder="e.g. Physics Chapter 4, Fast Fourier Transform"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-elevated border border-border focus:border-border-strong rounded-xl px-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors text-break-word"
              required
            />
          </div>

          {/* HTML Mode */}
          {selectedType === 'html' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-text-main">HTML Source</label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-text-muted hover:text-text-main flex items-center gap-1 underline"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>Upload .html</span>
                </button>
              </div>

              <textarea
                rows={6}
                placeholder="<!DOCTYPE html><html><body><h1>Study Widget</h1></body></html>"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-surface-elevated border border-border focus:border-border-strong rounded-xl p-3 font-mono text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors leading-relaxed"
                required
              />
            </div>
          )}

          {/* Media Mode */}
          {selectedType === 'media' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-border hover:border-border-strong rounded-xl p-6 text-center cursor-pointer bg-surface-elevated/40 hover:bg-surface-elevated transition-colors"
              >
                <UploadCloud className="w-6 h-6 text-text-faint mx-auto mb-1.5" />
                <p className="text-xs font-medium text-text-main text-break-word">
                  {selectedFile ? selectedFile.name : 'Select or drop diagram, equation snap, or whiteboard photo'}
                </p>
                <p className="text-[11px] text-text-faint mt-0.5">PNG, JPG, WebP (2.5K clarity preserved)</p>
              </div>

              {selectedFile && selectedFile.type.startsWith('image/') && (
                <div className="p-3.5 rounded-xl bg-surface-elevated/60 border border-border space-y-2.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-text-main">SmartCompress Quality</span>
                    <button
                      type="button"
                      onClick={() => setShowLoupe(!showLoupe)}
                      className="text-text-muted hover:text-text-main flex items-center gap-1"
                    >
                      <ZoomIn className="w-3 h-3" />
                      <span>{showLoupe ? 'Hide' : 'Check text clarity'}</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handlePresetChange('study_doc')}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        compressionPreset === 'study_doc' ? 'border-primary bg-primary/10 text-text-main' : 'border-border text-text-muted'
                      }`}
                    >
                      <p className="font-semibold text-[11px]">Study Doc</p>
                      <p className="text-[10px] text-text-faint">2.5K equations</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetChange('diagram')}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        compressionPreset === 'diagram' ? 'border-primary bg-primary/10 text-text-main' : 'border-border text-text-muted'
                      }`}
                    >
                      <p className="font-semibold text-[11px]">Diagram</p>
                      <p className="text-[10px] text-text-faint">Color rich</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => handlePresetChange('original')}
                      className={`p-2 rounded-lg border text-left transition-all ${
                        compressionPreset === 'original' ? 'border-primary bg-primary/10 text-text-main' : 'border-border text-text-muted'
                      }`}
                    >
                      <p className="font-semibold text-[11px]">Original</p>
                      <p className="text-[10px] text-text-faint">Raw bytes</p>
                    </button>
                  </div>

                  <div className="flex items-center justify-between font-mono text-[11px] text-text-muted pt-1">
                    <span>Original: {formatBytes(originalSize)}</span>
                    <span>→</span>
                    <span className="text-emerald-400 font-medium">Optimized: {formatBytes(compressedSize)}</span>
                    {savings > 0 && <span className="text-text-faint font-normal">({savings}% saved)</span>}
                  </div>

                  {showLoupe && previewUrl && (
                    <div className="rounded-lg overflow-hidden border border-border max-h-48 bg-black/40 flex items-center justify-center">
                      <img src={previewUrl} alt="Preview" className="max-h-48 object-contain" />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes Mode */}
          {selectedType === 'text' && (
            <div>
              <label className="block text-xs font-medium text-text-main mb-1">Notes Content</label>
              <textarea
                rows={6}
                placeholder="Write your study notes, formulas, or bullet points..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-surface-elevated border border-border focus:border-border-strong rounded-xl p-3 text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors leading-relaxed"
                required
              />
            </div>
          )}

          {/* Code Mode */}
          {selectedType === 'code' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <label className="font-medium text-text-main">Code</label>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="bg-surface-elevated border border-border text-xs text-text-main px-2.5 py-0.5 rounded-lg focus:outline-none"
                >
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript</option>
                  <option value="sql">SQL</option>
                  <option value="rust">Rust</option>
                </select>
              </div>
              <textarea
                rows={6}
                placeholder="// Code snippet..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-surface-elevated border border-border focus:border-border-strong rounded-xl p-3 font-mono text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors leading-relaxed"
                required
              />
            </div>
          )}

          {/* Link Mode */}
          {selectedType === 'link' && (
            <div>
              <label className="block text-xs font-medium text-text-main mb-1">Resource URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-surface-elevated border border-border focus:border-border-strong rounded-xl px-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors text-break-word"
                required
              />
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,text/html,.html,audio/*"
          />

          <div>
            <label className="block text-xs font-medium text-text-main mb-1">Tags</label>
            <input
              type="text"
              placeholder="e.g. Physics, Exam 1, Algorithms"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="w-full bg-surface-elevated border border-border focus:border-border-strong rounded-xl px-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors text-break-word"
            />
          </div>

          <div className="pt-2 border-t border-border/60 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-text-muted hover:text-text-main transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save & Sync'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
