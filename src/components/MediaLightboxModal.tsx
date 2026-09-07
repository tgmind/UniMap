import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Download,
  Check,
  Loader2,
  ArrowLeft,
  Maximize,
  Move,
  Smartphone,
} from 'lucide-react';
import { UniItem } from '../types';
import { downloadMediaUrl, downloadItem } from '../lib/downloadHelper';

interface MediaLightboxModalProps {
  url: string;
  title: string;
  item?: UniItem;
  onClose: () => void;
}

export const MediaLightboxModal: React.FC<MediaLightboxModalProps> = ({
  url,
  title,
  item,
  onClose,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageNaturalSize, setImageNaturalSize] = useState<{ width: number; height: number } | null>(null);

  // Refs for tracking gestures without stale closures
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const panRef = useRef(pan);
  panRef.current = pan;

  // Touch gesture state refs
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const touchStartPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTapTimeRef = useRef<number>(0);
  const lastTapPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const isMouseDownRef = useRef(false);

  // Reset zoom & pan to default fit
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Fit to screen width (ideal for tall vertical mobile screenshots)
  const fitToWidth = useCallback(() => {
    if (!containerRef.current || !imgRef.current) return;
    const containerWidth = containerRef.current.clientWidth;
    const imgWidth = imgRef.current.clientWidth;

    if (imgWidth > 0 && containerWidth > 0) {
      // Calculate scale to make image width fill available container width minus padding
      const targetWidth = containerWidth - 32;
      const targetZoom = Math.min(4, Math.max(1, Number((targetWidth / imgWidth).toFixed(2))));
      setZoom(targetZoom);
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(1.8);
      setPan({ x: 0, y: 0 });
    }
  }, []);

  // Zoom to 100% (1:1 pixel scale)
  const zoomToActual = useCallback(() => {
    if (!containerRef.current || !imgRef.current || !imageNaturalSize) {
      setZoom(2);
      setPan({ x: 0, y: 0 });
      return;
    }
    const renderedWidth = imgRef.current.clientWidth;
    if (renderedWidth > 0) {
      const scale = Number((imageNaturalSize.width / renderedWidth).toFixed(2));
      setZoom(Math.min(5, Math.max(1, scale)));
      setPan({ x: 0, y: 0 });
    } else {
      setZoom(2);
      setPan({ x: 0, y: 0 });
    }
  }, [imageNaturalSize]);

  // Step zoom in/out centered
  const handleZoomStep = (delta: number) => {
    setZoom((prev) => {
      const next = Math.min(6, Math.max(0.4, Number((prev + delta).toFixed(2))));
      if (next <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // Download handler
  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    try {
      let ok = false;
      if (item) {
        ok = await downloadItem(item);
      } else {
        ok = await downloadMediaUrl(url, title);
      }
      if (ok) {
        setDownloaded(true);
        setTimeout(() => setDownloaded(false), 2200);
      }
    } finally {
      setIsDownloading(false);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomStep(0.25);
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomStep(-0.25);
      } else if (e.key === '0') {
        e.preventDefault();
        resetView();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPan((p) => ({ ...p, y: p.y + 50 }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPan((p) => ({ ...p, y: p.y - 50 }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPan((p) => ({ ...p, x: p.x + 50 }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPan((p) => ({ ...p, x: p.x - 50 }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, resetView]);

  // Native Non-Passive Touch Event Listeners for Pinch-to-Zoom & Smooth Panning
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        // 2-finger pinch start
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        pinchStartDistRef.current = dist;
        pinchStartZoomRef.current = zoomRef.current;
        panStartRef.current = { ...panRef.current };
        setIsDragging(false);
        return;
      }

      if (e.touches.length === 1) {
        const touch = e.touches[0];
        const now = Date.now();
        const distFromLastTap = Math.hypot(
          touch.clientX - lastTapPosRef.current.x,
          touch.clientY - lastTapPosRef.current.y
        );

        // Double-tap detector (< 300ms and < 30px move)
        if (now - lastTapTimeRef.current < 300 && distFromLastTap < 30) {
          // Double-tap triggered!
          lastTapTimeRef.current = 0;
          if (zoomRef.current > 1.2) {
            resetView();
          } else {
            // Zoom into tap position
            const rect = container.getBoundingClientRect();
            const tapX = touch.clientX - rect.left - rect.width / 2;
            const tapY = touch.clientY - rect.top - rect.height / 2;
            const targetZoom = 2.4;
            setZoom(targetZoom);
            setPan({
              x: Math.round(-tapX * 0.8),
              y: Math.round(-tapY * 0.8),
            });
          }
          return;
        }

        lastTapTimeRef.current = now;
        lastTapPosRef.current = { x: touch.clientX, y: touch.clientY };

        // 1-finger drag start
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
        panStartRef.current = { ...panRef.current };
        setIsDragging(true);
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      // 2-finger pinch zooming
      if (e.touches.length === 2 && pinchStartDistRef.current) {
        if (e.cancelable) e.preventDefault();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        const scale = dist / pinchStartDistRef.current;
        const newZoom = Math.min(6, Math.max(0.4, Number((pinchStartZoomRef.current * scale).toFixed(2))));
        setZoom(newZoom);
        return;
      }

      // 1-finger pan / move up, down, left, right
      if (e.touches.length === 1) {
        if (e.cancelable) e.preventDefault();
        const touch = e.touches[0];
        const dx = touch.clientX - touchStartPosRef.current.x;
        const dy = touch.clientY - touchStartPosRef.current.y;

        setPan({
          x: Math.round(panStartRef.current.x + dx),
          y: Math.round(panStartRef.current.y + dy),
        });
      }
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (e.touches.length === 0) {
        pinchStartDistRef.current = null;
        setIsDragging(false);
      } else if (e.touches.length === 1) {
        // Returned to 1 finger from pinch
        const touch = e.touches[0];
        touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
        panStartRef.current = { ...panRef.current };
        pinchStartDistRef.current = null;
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: false });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('touchcancel', onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('touchcancel', onTouchEnd);
    };
  }, [resetView]);

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((prev) => {
      const next = Math.min(6, Math.max(0.4, Number((prev * zoomFactor).toFixed(2))));
      if (next <= 1) {
        setPan({ x: 0, y: 0 });
      }
      return next;
    });
  };

  // Mouse drag handlers (Desktop / Tablet with mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    isMouseDownRef.current = true;
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };
    panStartRef.current = { ...panRef.current };
    setIsDragging(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current) return;
    const dx = e.clientX - touchStartPosRef.current.x;
    const dy = e.clientY - touchStartPosRef.current.y;
    setPan({
      x: Math.round(panStartRef.current.x + dx),
      y: Math.round(panStartRef.current.y + dy),
    });
  };

  const handleMouseUp = () => {
    isMouseDownRef.current = false;
    setIsDragging(false);
  };

  // Double click for desktop
  const handleDoubleClick = (e: React.MouseEvent) => {
    if (zoom > 1.2) {
      resetView();
    } else {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const tapX = e.clientX - rect.left - rect.width / 2;
        const tapY = e.clientY - rect.top - rect.height / 2;
        setZoom(2.4);
        setPan({
          x: Math.round(-tapX * 0.8),
          y: Math.round(-tapY * 0.8),
        });
      } else {
        setZoom(2.4);
      }
    }
  };

  if (!url) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0B0E14] text-white select-none overflow-hidden animate-fade-in">
      {/* 
        1. DEDICATED TOP HEADER BAR
        Strictly separated above the image container (ZERO overlap with image content)
      */}
      <header className="shrink-0 w-full h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between bg-[#11161F] border-b border-white/10 z-30 shadow-md">
        {/* Left: Back / Close & Title Info */}
        <div className="flex items-center gap-2.5 min-w-0 max-w-[65%] sm:max-w-[70%]">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
            title="Close viewer (Esc)"
          >
            <ArrowLeft className="w-5 h-5 sm:w-5 sm:h-5" />
          </button>

          <div className="min-w-0">
            <h2 className="text-xs sm:text-sm font-semibold text-slate-100 truncate" title={title}>
              {title || item?.file_name || 'Study Media Asset'}
            </h2>
            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
              {item?.file_size && (
                <span>{(item.file_size / 1024).toFixed(0)} KB WebP</span>
              )}
              {imageNaturalSize && (
                <span>• {imageNaturalSize.width} × {imageNaturalSize.height}px</span>
              )}
              {item?.device_name && (
                <span className="hidden sm:inline">• from {item.device_name}</span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Direct Download & Close Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs font-semibold shadow-sm transition-all active:scale-95 cursor-pointer ${
              downloaded
                ? 'bg-emerald-600 text-white'
                : 'bg-[#2481CC] hover:bg-[#1E70B0] text-white'
            }`}
            title="Download media directly"
          >
            {isDownloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : downloaded ? (
              <>
                <Check className="w-4 h-4" />
                <span>Downloaded</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Download</span>
              </>
            )}
          </button>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
            title="Close viewer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 
        2. DEDICATED IMAGE VIEWPORT / CANVAS
        Occupies 100% of the middle area between header and bottom bar.
        The image is constrained within this box with object-contain.
        NO UI elements can ever overlap on top or bottom of this image.
      */}
      <main
        ref={containerRef}
        className={`flex-1 min-h-0 w-full relative overflow-hidden flex items-center justify-center touch-none select-none bg-black/40 ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDoubleClick={handleDoubleClick}
      >
        {/* Transformable Canvas Layer */}
        <div
          className="w-full h-full flex items-center justify-center p-3 sm:p-6 pointer-events-none"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0px) scale(${zoom})`,
            transition: isDragging ? 'none' : 'transform 0.12s cubic-bezier(0.2, 0, 0, 1)',
            willChange: 'transform',
          }}
        >
          <img
            ref={imgRef}
            src={url}
            alt={title}
            draggable={false}
            onLoad={(e) => {
              setImageLoaded(true);
              const img = e.currentTarget;
              setImageNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
            }}
            className="max-h-full max-w-full object-contain rounded-lg shadow-2xl pointer-events-auto"
            style={{
              maxHeight: 'calc(100% - 8px)',
              maxWidth: 'calc(100% - 8px)',
            }}
          />
        </div>

        {/* Loading Spinner while image decodes */}
        {!imageLoaded && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50 pointer-events-none">
            <Loader2 className="w-8 h-8 animate-spin text-[#2481CC]" />
          </div>
        )}
      </main>

      {/* 
        3. DEDICATED BOTTOM CONTROLS & GESTURE BAR
        Strictly separated below the image container (ZERO overlap with image content)
      */}
      <footer className="shrink-0 w-full py-2 px-3 sm:px-6 bg-[#11161F] border-t border-white/10 flex items-center justify-between z-30 shadow-lg text-xs">
        {/* Left: Zoom % and Preset buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <button
            onClick={resetView}
            className="px-2 sm:px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 font-mono font-medium text-[11px] sm:text-xs transition-colors cursor-pointer"
            title="Click to reset zoom to 100%"
          >
            {Math.round(zoom * 100)}%
          </button>

          {/* Quick Fit Mode: Fit to Screen */}
          <button
            onClick={resetView}
            className="hidden sm:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs font-medium cursor-pointer"
            title="Fit entire image in screen"
          >
            <Maximize className="w-3.5 h-3.5" />
            <span>Fit Screen</span>
          </button>

          {/* Quick Fit Mode: Fit to Width (Specially designed for tall vertical mobile screenshots) */}
          <button
            onClick={fitToWidth}
            className="inline-flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg bg-[#2481CC]/15 hover:bg-[#2481CC]/25 text-[#50A7EA] transition-colors text-xs font-medium cursor-pointer"
            title="Expand to screen width for easy vertical scrolling/panning"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Fit Width</span>
          </button>

          {/* Quick Fit Mode: 1:1 Actual Size */}
          <button
            onClick={zoomToActual}
            className="hidden md:inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors text-xs font-medium cursor-pointer"
            title="View in original 1:1 resolution"
          >
            <span>1:1 Actual</span>
          </button>
        </div>

        {/* Center: Mobile Gesture Hint */}
        <div className="hidden lg:flex items-center gap-1.5 text-[11px] text-slate-400 pointer-events-none select-none">
          <Move className="w-3.5 h-3.5 opacity-70" />
          <span>Drag to pan up/down • Pinch or double-tap to zoom</span>
        </div>

        {/* Right: Manual Zoom In, Zoom Out, Reset Controls */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => handleZoomStep(-0.25)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={() => handleZoomStep(0.25)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <button
            onClick={resetView}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors active:scale-95 cursor-pointer"
            title="Reset Zoom & Pan (0)"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </footer>
    </div>
  );
};
