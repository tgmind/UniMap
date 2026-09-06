import React, { useState } from 'react';
import { X, ZoomIn, ZoomOut, RotateCcw, Download } from 'lucide-react';

interface MediaLightboxModalProps {
  url: string;
  title: string;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({ url, title, onClose }) => {
  const [zoom, setZoom] = useState(1);

  if (!url) return null;

  const handleDownload = () => {
    const a = document.createElement('a');
    a.href = url;
    a.download = title || 'study_media';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-fade-in select-none"
      onClick={onClose}
    >
      {/* Minimal Top Floating Bar */}
      <div
        className="absolute top-4 inset-x-4 max-w-lg mx-auto flex items-center justify-between p-2 rounded-2xl bg-surface/90 backdrop-blur-md border border-border shadow-xl z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <span className="text-xs font-medium text-text-main px-2 truncate flex-1">
          {title}
        </span>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setZoom((z) => Math.min(3, z + 0.25))}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom((z) => Math.max(0.5, z - 0.25))}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
            title="Reset Zoom"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <div className="w-[1px] h-3.5 bg-border mx-1" />
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-medium shadow-sm transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div
        className="w-full h-full flex items-center justify-center p-6 overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={url}
          alt={title}
          style={{ transform: `scale(${zoom})`, transition: 'transform 0.15s ease-out' }}
          className="max-h-[85vh] max-w-[90vw] object-contain rounded-xl shadow-2xl"
        />
      </div>
    </div>
  );
};
