import React, { useState, useRef } from 'react';
import {
  X,
  FileText,
  Globe,
  Code,
  Image as ImageIcon,
  Link2,
  UploadCloud,
  Check,
  Zap,
  ZoomIn,
  Sparkles,
  Sliders,
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
  const [tagInput, setTagInput] = useState('Exams');
  const [codeLanguage, setCodeLanguage] = useState('python');

  // Media & SmartCompress State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [compressionPreset, setCompressionPreset] = useState<CompressionPreset>('study_doc');
  const [compressedFile, setCompressedFile] = useState<File | Blob | null>(null);
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

    // If it's an HTML file
    if (file.name.endsWith('.html') || file.type === 'text/html') {
      const text = await file.text();
      setContent(text);
      setSelectedType('html');
      return;
    }

    // If it's an image, run SmartCompress
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

      if (selectedType === 'html') {
        if (!finalFileName) {
          finalFileName = `${title.toLowerCase().replace(/[^a-z0-9]/gi, '_')}.html`;
        }
      }

      await addItem({
        type: selectedType,
        title: title || (finalFileName ? finalFileName : 'Study Item'),
        content: finalContent,
        file: finalFile,
        fileName: finalFileName,
        fileSize: compressedSize || (finalFile ? finalFile.size : new Blob([finalContent]).size),
        mimeType: selectedType === 'html' ? 'text/html' : (finalFile ? (finalFile as any).type : undefined),
        tags: tags.length ? tags : ['Study'],
      });

      // Reset and close
      setTitle('');
      setContent('');
      setSelectedFile(null);
      setCompressedFile(null);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-surface border border-border rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-text-main flex items-center gap-2">
              Add to Universal Data Map
            </h2>
            <p className="text-xs text-text-muted">
              Instantly syncs across all your Windows, Linux, Android, and iPad devices
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Selector Tabs */}
        <div className="flex items-center gap-1.5 mt-4 p-1 rounded-xl bg-surface-elevated border border-border overflow-x-auto">
          <button
            type="button"
            onClick={() => setSelectedType('html')}
            className={`flex-1 min-w-[90px] py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              selectedType === 'html'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            HTML File
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('media')}
            className={`flex-1 min-w-[90px] py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              selectedType === 'media'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Media / Doc
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('text')}
            className={`flex-1 min-w-[90px] py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              selectedType === 'text'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            Notes
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('code')}
            className={`flex-1 min-w-[90px] py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              selectedType === 'code'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Code
          </button>

          <button
            type="button"
            onClick={() => setSelectedType('link')}
            className={`flex-1 min-w-[90px] py-1.5 px-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
              selectedType === 'link'
                ? 'bg-primary text-primary-text shadow-sm'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Link2 className="w-3.5 h-3.5" />
            Link
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto py-4 flex-1 space-y-4 pr-1">
          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-text-main mb-1">
              Title / Subject
            </label>
            <input
              type="text"
              placeholder="e.g. Physics Chapter 4 Formulas, Organic Chemistry Cheat Sheet"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors"
              required
            />
          </div>

          {/* HTML Mode Inputs */}
          {selectedType === 'html' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-main">
                  HTML Source Code or Upload .html File
                </label>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs text-accent hover:underline flex items-center gap-1"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  Upload .html File
                </button>
              </div>

              <textarea
                rows={7}
                placeholder="<!DOCTYPE html><html><body><h1>Exam Study Notes</h1><p>Interactive tables, formulas, or calculators...</p></body></html>"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-xl p-3 font-mono text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors leading-relaxed"
                required
              />

              <div className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-[11px] text-cyan-300 flex items-center gap-2">
                <Globe className="w-4 h-4 shrink-0" />
                <span>
                  Clicking this item in your feed launches it live in the browser with full script and CSS execution. 1-click downloadable anytime.
                </span>
              </div>
            </div>
          )}

          {/* Media / Image Mode with SmartCompress */}
          {selectedType === 'media' && (
            <div className="space-y-3">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border hover:border-primary/60 rounded-2xl p-5 text-center cursor-pointer bg-surface-elevated transition-colors"
              >
                <UploadCloud className="w-8 h-8 text-text-muted mx-auto mb-2" />
                <p className="text-xs font-semibold text-text-main">
                  {selectedFile ? selectedFile.name : 'Click or drop whiteboard photo, textbook page, diagram'}
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Supports PNG, JPG, WebP, SVG, Audio memo
                </p>
              </div>

              {selectedFile && selectedFile.type.startsWith('image/') && (
                <div className="p-3.5 rounded-2xl bg-surface-elevated border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-accent" />
                      SmartCompress Zero-Blur Engine
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowLoupe(!showLoupe)}
                      className="text-xs text-accent hover:underline flex items-center gap-1"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      {showLoupe ? 'Hide 100% Zoom' : 'Verify Text Clarity'}
                    </button>
                  </div>

                  {/* Preset Selector */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => handlePresetChange('study_doc')}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        compressionPreset === 'study_doc'
                          ? 'border-primary bg-primary/10 text-text-main'
                          : 'border-border text-text-muted hover:border-border-strong'
                      }`}
                    >
                      <p className="font-bold">📚 Study Doc</p>
                      <p className="text-[10px] text-text-muted">2.5K crisp equations</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePresetChange('diagram')}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        compressionPreset === 'diagram'
                          ? 'border-primary bg-primary/10 text-text-main'
                          : 'border-border text-text-muted hover:border-border-strong'
                      }`}
                    >
                      <p className="font-bold">🎨 Diagram</p>
                      <p className="text-[10px] text-text-muted">Color rich chart</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => handlePresetChange('original')}
                      className={`p-2 rounded-xl border text-left transition-all ${
                        compressionPreset === 'original'
                          ? 'border-primary bg-primary/10 text-text-main'
                          : 'border-border text-text-muted hover:border-border-strong'
                      }`}
                    >
                      <p className="font-bold">💎 Original</p>
                      <p className="text-[10px] text-text-muted">Untouched raw bytes</p>
                    </button>
                  </div>

                  {/* Compression Stats */}
                  <div className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <span className="text-text-muted">Original: {formatBytes(originalSize)}</span>
                      <span className="text-text-faint">→</span>
                      <span className="text-emerald-400 font-bold">{formatBytes(compressedSize)}</span>
                    </div>
                    {savings > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-bold">
                        {savings}% Saved
                      </span>
                    )}
                  </div>

                  {/* Zoom Loupe Preview */}
                  {showLoupe && previewUrl && (
                    <div className="relative rounded-xl overflow-hidden border border-border max-h-56 bg-black flex items-center justify-center">
                      <img
                        src={previewUrl}
                        alt="Zoom Preview"
                        className="w-full h-auto object-contain cursor-zoom-in hover:scale-150 transition-transform duration-200"
                        title="Hover to inspect equations and fine text"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Notes / Markdown Mode */}
          {selectedType === 'text' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-main">
                Markdown / Text Content
              </label>
              <textarea
                rows={6}
                placeholder="Write your study notes, formulas, or bullet points here..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-xl p-3 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors leading-relaxed"
                required
              />
            </div>
          )}

          {/* Code Mode */}
          {selectedType === 'code' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-text-main">Code Body</label>
                <select
                  value={codeLanguage}
                  onChange={(e) => setCodeLanguage(e.target.value)}
                  className="bg-surface border border-border rounded-lg text-xs text-text-main px-2 py-1 focus:outline-none focus:border-primary"
                >
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript</option>
                  <option value="sql">SQL</option>
                  <option value="rust">Rust</option>
                  <option value="c">C</option>
                  <option value="bash">Bash</option>
                </select>
              </div>
              <textarea
                rows={6}
                placeholder="// Paste algorithms, data structures, or code snippets..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-xl p-3 font-mono text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors leading-relaxed"
                required
              />
            </div>
          )}

          {/* Link Mode */}
          {selectedType === 'link' && (
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-text-main">
                Web URL / Resource Link
              </label>
              <input
                type="url"
                placeholder="https://en.wikipedia.org/wiki/Quantum_mechanics"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors"
                required
              />
            </div>
          )}

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            onChange={handleFileChange}
            className="hidden"
            accept="image/*,text/html,.html,audio/*"
          />

          {/* Tags */}
          <div>
            <label className="block text-xs font-semibold text-text-main mb-1">
              Category / Tags (comma separated)
            </label>
            <input
              type="text"
              placeholder="e.g. Physics, Semester 2, Important"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors"
            />
          </div>

          {/* Footer Submit */}
          <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isCompressing}
              className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-glow-sm transition-all disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Syncing...' : 'Save & Sync to Devices'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
