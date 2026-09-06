import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useItems } from '../../context/ItemContext';
import { ItemCard } from '../ItemCard';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Move,
  Compass,
  Hand,
  MousePointer2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface CanvasViewProps {
  onOpenMedia: (url: string, title: string) => void;
}

type InteractionMode = 'pan' | 'move';

export const CanvasView: React.FC<CanvasViewProps> = ({ onOpenMedia }) => {
  const { items, updateCanvasPosition } = useItems();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<InteractionMode>('pan');
  const [isPanning, setIsPanning] = useState(false);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [activeNodeIdx, setActiveNodeIdx] = useState<number>(0);
  const [showGestureHint, setShowGestureHint] = useState(true);

  // Drag offsets
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });
  const cardDragOffsetRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-hide gesture hint after 4.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowGestureHint(false), 4500);
    return () => clearTimeout(timer);
  }, []);

  // Center canvas or reset
  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  // Fit All Nodes into screen viewport (Auto-framing)
  const fitAllNodes = useCallback(() => {
    if (!containerRef.current || items.length === 0) {
      resetView();
      return;
    }
    const rect = containerRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 640;
    const nodeW = isMobile ? 260 : 320;
    const nodeH = 220;

    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    items.forEach((item, idx) => {
      const x = item.canvas_x ?? (Math.cos((idx * 2 * Math.PI) / items.length) * 340);
      const y = item.canvas_y ?? (Math.sin((idx * 2 * Math.PI) / items.length) * 240);
      minX = Math.min(minX, x - nodeW / 2);
      maxX = Math.max(maxX, x + nodeW / 2);
      minY = Math.min(minY, y - nodeH / 2);
      maxY = Math.max(maxY, y + nodeH / 2);
    });

    const spanX = Math.max(160, maxX - minX);
    const spanY = Math.max(160, maxY - minY);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    const pad = isMobile ? 32 : 64;
    const scaleX = (rect.width - pad * 2) / spanX;
    const scaleY = (rect.height - pad * 2) / spanY;
    const optimalZoom = Math.min(1.1, Math.max(0.35, Math.min(scaleX, scaleY)));

    setZoom(Number(optimalZoom.toFixed(2)));
    setPan({
      x: Math.round(-centerX * optimalZoom),
      y: Math.round(-centerY * optimalZoom),
    });
  }, [items, resetView]);

  // Navigate directly to a node (Quick-Jump Carousel)
  const navigateToNode = useCallback((index: number) => {
    if (items.length === 0) return;
    const newIdx = (index + items.length) % items.length;
    setActiveNodeIdx(newIdx);
    const target = items[newIdx];
    const x = target.canvas_x ?? (Math.cos((newIdx * 2 * Math.PI) / items.length) * 340);
    const y = target.canvas_y ?? (Math.sin((newIdx * 2 * Math.PI) / items.length) * 240);

    setPan({
      x: Math.round(-x * zoom),
      y: Math.round(-y * zoom),
    });
    setHighlightedNodeId(target.id);
    setTimeout(() => setHighlightedNodeId(null), 2500);
  }, [items, zoom]);

  // Helper to convert screen clientX/Y to canvas coords
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const cx = (clientX - rect.left - pan.x - rect.width / 2) / zoom;
    const cy = (clientY - rect.top - pan.y - rect.height / 2) / zoom;
    return { x: cx, y: cy };
  };

  // --- MOUSE HANDLERS ---
  const handleMouseDown = (e: React.MouseEvent) => {
    const targetEl = e.target as HTMLElement;
    const handleEl = targetEl.closest('.drag-handle');

    if (handleEl) {
      const itemId = handleEl.getAttribute('data-item-id');
      if (itemId) {
        e.stopPropagation();
        const item = items.find((i) => i.id === itemId);
        if (item) {
          const coords = getCanvasCoords(e.clientX, e.clientY);
          cardDragOffsetRef.current = {
            x: coords.x - (item.canvas_x || 0),
            y: coords.y - (item.canvas_y || 0),
          };
          setDragItem(itemId);
          return;
        }
      }
    }

    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOriginRef.current = { ...pan };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: panOriginRef.current.x + dx,
        y: panOriginRef.current.y + dy,
      });
    } else if (dragItem) {
      const coords = getCanvasCoords(e.clientX, e.clientY);
      const newX = Math.round(coords.x - cardDragOffsetRef.current.x);
      const newY = Math.round(coords.y - cardDragOffsetRef.current.y);
      updateCanvasPosition(dragItem, newX, newY);
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDragItem(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(2.5, Math.max(0.35, Number((z * zoomFactor).toFixed(2)))));
  };

  // --- TOUCH HANDLERS (Mobile / Tablet Gestures) ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartDistRef.current = dist;
      pinchStartZoomRef.current = zoom;
      setIsPanning(false);
      setDragItem(null);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const targetEl = touch.target as HTMLElement;
      const handleEl = targetEl.closest('.drag-handle');

      if (mode === 'move' && handleEl) {
        const itemId = handleEl.getAttribute('data-item-id');
        if (itemId) {
          const item = items.find((i) => i.id === itemId);
          if (item) {
            const coords = getCanvasCoords(touch.clientX, touch.clientY);
            cardDragOffsetRef.current = {
              x: coords.x - (item.canvas_x || 0),
              y: coords.y - (item.canvas_y || 0),
            };
            setDragItem(itemId);
            return;
          }
        }
      }

      setIsPanning(true);
      panStartRef.current = { x: touch.clientX, y: touch.clientY };
      panOriginRef.current = { ...pan };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDistRef.current) {
      e.preventDefault();
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const scale = dist / pinchStartDistRef.current;
      const newZoom = Math.min(2.5, Math.max(0.35, pinchStartZoomRef.current * scale));
      setZoom(Number(newZoom.toFixed(2)));
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      if (isPanning) {
        e.preventDefault();
        const dx = touch.clientX - panStartRef.current.x;
        const dy = touch.clientY - panStartRef.current.y;
        setPan({
          x: panOriginRef.current.x + dx,
          y: panOriginRef.current.y + dy,
        });
      } else if (dragItem) {
        e.preventDefault();
        const coords = getCanvasCoords(touch.clientX, touch.clientY);
        const newX = Math.round(coords.x - cardDragOffsetRef.current.x);
        const newY = Math.round(coords.y - cardDragOffsetRef.current.y);
        updateCanvasPosition(dragItem, newX, newY);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length === 0) {
      setIsPanning(false);
      setDragItem(null);
      pinchStartDistRef.current = null;
    } else if (e.touches.length === 1) {
      pinchStartDistRef.current = null;
      const touch = e.touches[0];
      setIsPanning(true);
      panStartRef.current = { x: touch.clientX, y: touch.clientY };
      panOriginRef.current = { ...pan };
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-8.5rem)] rounded-2xl overflow-hidden border border-border bg-background select-none touch-none shadow-sm">
      {/* Top Floating Controls Bar */}
      <div className="absolute top-3 left-3 right-3 sm:right-auto z-20 flex items-center justify-between sm:justify-start gap-1.5 p-1 rounded-2xl bg-surface/90 backdrop-blur-md border border-border shadow-md">
        {/* Interaction Mode Switcher (Hand Pan vs Node Move) */}
        <div className="flex items-center bg-surface-elevated/80 rounded-xl p-0.5 border border-border/60">
          <button
            onClick={() => setMode('pan')}
            title="Hand Mode: Drag anywhere to pan canvas"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'pan'
                ? 'bg-primary text-primary-text shadow-xs'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="text-[11px]">Pan</span>
          </button>
          <button
            onClick={() => setMode('move')}
            title="Move Mode: Drag cards to reposition them"
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'move'
                ? 'bg-primary text-primary-text shadow-xs'
                : 'text-text-muted hover:text-text-main'
            }`}
          >
            <MousePointer2 className="w-3.5 h-3.5" />
            <span className="text-[11px]">Move</span>
          </button>
        </div>

        <div className="w-[1px] h-4 bg-border mx-0.5 hidden sm:block" />

        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => setZoom((z) => Math.max(0.35, Number((z * 0.85).toFixed(2))))}
            title="Zoom Out"
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-elevated active:scale-95 transition-all"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            onClick={resetView}
            title="Tap to Reset 100%"
            className="font-mono text-xs font-semibold text-text-main hover:text-primary px-1.5 py-1 rounded-lg hover:bg-surface-elevated transition-colors min-w-[44px] text-center"
          >
            {Math.round(zoom * 100)}%
          </button>

          <button
            onClick={() => setZoom((z) => Math.min(2.5, Number((z * 1.15).toFixed(2))))}
            title="Zoom In"
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-elevated active:scale-95 transition-all"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
        </div>

        <div className="w-[1px] h-4 bg-border mx-0.5" />

        {/* Framing Actions: Fit All & Center */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={fitAllNodes}
            title="Fit All Nodes into Screen"
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-accent/10 hover:bg-accent/20 text-accent text-xs font-semibold border border-accent/25 active:scale-95 transition-all"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Fit All</span>
          </button>

          <button
            onClick={resetView}
            title="Center Canvas (0, 0)"
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-elevated active:scale-95 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Floating Gesture Hint Banner (Fades out automatically) */}
      {showGestureHint && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-surface/90 backdrop-blur-md border border-border shadow-lg text-[11px] text-text-muted flex items-center gap-2 animate-fade-in pointer-events-none">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Pinch with 2 fingers to zoom • Pan with 1 finger</span>
        </div>
      )}

      {/* Bottom Floating Node Quick-Jump Navigator Dock */}
      {items.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 w-[92%] sm:w-auto max-w-md flex items-center justify-between gap-2 px-3 py-2 rounded-2xl bg-surface/95 backdrop-blur-md border border-border shadow-xl">
          <button
            onClick={() => navigateToNode(activeNodeIdx - 1)}
            title="Previous Node"
            className="p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-elevated active:scale-90 transition-all shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <div
            onClick={() => navigateToNode(activeNodeIdx)}
            className="flex-1 min-w-0 text-center cursor-pointer px-2 py-0.5 rounded-lg hover:bg-surface-elevated transition-colors"
            title="Tap to center on this card"
          >
            <p className="text-[10px] font-mono text-text-faint uppercase tracking-wider">
              Node {activeNodeIdx + 1} of {items.length}
            </p>
            <p className="text-xs font-semibold text-text-main truncate">
              {items[activeNodeIdx]?.title || 'Note'}
            </p>
          </div>

          <button
            onClick={() => navigateToNode(activeNodeIdx + 1)}
            title="Next Node"
            className="p-1.5 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-elevated active:scale-90 transition-all shrink-0"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`w-full h-full relative overflow-hidden canvas-bg ${
          mode === 'pan' ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'
        }`}
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--border-strong) 1px, transparent 0)`,
          backgroundSize: `${28 * zoom}px ${28 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Transform Layer */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'center center',
            transition: isPanning ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Center Compass Origin Marker */}
            <div className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-2xl bg-surface/90 backdrop-blur-md border border-border flex items-center justify-center text-text-muted shadow-sm hover:scale-110 transition-transform">
              <Compass className="w-5 h-5 text-primary" />
            </div>

            {/* Nodes */}
            {items.map((item, idx) => {
              const x = item.canvas_x ?? (Math.cos((idx * 2 * Math.PI) / items.length) * 340);
              const y = item.canvas_y ?? (Math.sin((idx * 2 * Math.PI) / items.length) * 240);
              const isHighlighted = highlightedNodeId === item.id;

              return (
                <div
                  key={item.id}
                  className={`absolute pointer-events-auto transition-shadow duration-300 ${
                    isHighlighted ? 'ring-4 ring-primary rounded-2xl shadow-glow-lg z-30 scale-[1.02]' : 'z-10'
                  }`}
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    width: 'clamp(260px, 80vw, 320px)',
                  }}
                >
                  {/* Drag Handle Bar */}
                  <div
                    data-item-id={item.id}
                    className="drag-handle cursor-move py-1.5 px-3 rounded-t-2xl bg-surface-elevated border border-border border-b-0 text-[10px] font-mono text-text-muted flex items-center justify-between select-none hover:text-text-main transition-colors"
                  >
                    <span className="flex items-center gap-1.5 font-bold">
                      <Move className="w-3 h-3 text-primary" />
                      <span>#{idx + 1}</span>
                    </span>
                    <span className="text-text-faint text-[9px]">
                      {Math.round(x)}, {Math.round(y)}
                    </span>
                  </div>

                  {/* Card Body */}
                  <div className="rounded-b-2xl overflow-hidden">
                    <ItemCard item={item} onOpenMedia={onOpenMedia} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
