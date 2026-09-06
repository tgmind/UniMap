import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
  Plus,
} from 'lucide-react';

interface CanvasViewProps {
  onOpenMedia: (url: string, title: string) => void;
  onOpenAddModal?: () => void;
  isNavVisible?: boolean;
  isHeaderVisible?: boolean;
}

type InteractionMode = 'pan' | 'move';

export const CanvasView: React.FC<CanvasViewProps> = ({
  onOpenMedia,
  onOpenAddModal,
  isNavVisible = false,
  isHeaderVisible = true,
}) => {
  const { items, updateCanvasPosition } = useItems();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [mode, setMode] = useState<InteractionMode>('pan');
  const [isPanning, setIsPanning] = useState(false);
  const [liftedCardId, setLiftedCardId] = useState<string | null>(null);
  const [liveDragPos, setLiveDragPos] = useState<{ id: string; x: number; y: number } | null>(null);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);
  const [activeNodeIdx, setActiveNodeIdx] = useState<number>(0);
  const [showGestureHint, setShowGestureHint] = useState(true);

  // Synchronous tracking refs to eliminate stale closure & frame lag
  const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef(pan);
  panRef.current = pan;
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const liveDragPosRef = useRef(liveDragPos);
  liveDragPosRef.current = liveDragPos;

  // Active interaction tracking
  const activeDragIdRef = useRef<string | null>(null);
  const isPanningRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const panStartRef = useRef({ x: 0, y: 0 });
  const panOriginRef = useRef({ x: 0, y: 0 });
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  // Long-press (touch-and-hold to lift) refs
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef({ x: 0, y: 0 });
  const touchCurrentPosRef = useRef({ x: 0, y: 0 });

  // Auto-hide gesture hint after 4.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowGestureHint(false), 5000);
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
      const defaultX = Math.cos((idx * 2 * Math.PI) / Math.max(1, items.length)) * 340;
      const defaultY = Math.sin((idx * 2 * Math.PI) / Math.max(1, items.length)) * 240;
      const x = item.canvas_x ?? Math.round(defaultX);
      const y = item.canvas_y ?? Math.round(defaultY);
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
    const defaultX = Math.cos((newIdx * 2 * Math.PI) / Math.max(1, items.length)) * 340;
    const defaultY = Math.sin((newIdx * 2 * Math.PI) / Math.max(1, items.length)) * 240;
    const x = target.canvas_x ?? Math.round(defaultX);
    const y = target.canvas_y ?? Math.round(defaultY);

    setPan({
      x: Math.round(-x * zoom),
      y: Math.round(-y * zoom),
    });
    setHighlightedNodeId(target.id);
    setTimeout(() => setHighlightedNodeId(null), 2500);
  }, [items, zoom]);

  // Synchronously track card dimensions for ray-box collision math
  const cardDimensionsRef = useRef<Record<string, { w: number; h: number }>>({});
  const [, setDimensionsVersion] = useState(0);

  const registerCardRef = useCallback((id: string, el: HTMLDivElement | null) => {
    if (el) {
      const rectW = el.offsetWidth;
      const rectH = el.offsetHeight;
      const prev = cardDimensionsRef.current[id];
      if (!prev || Math.abs(prev.w - rectW) > 2 || Math.abs(prev.h - rectH) > 2) {
        cardDimensionsRef.current[id] = { w: rectW, h: rectH };
        setDimensionsVersion((v) => v + 1);
      }
    }
  }, []);

  // Helper to compute live/persisted position of any item by index
  const getNodePosition = useCallback(
    (item: (typeof items)[0], idx: number) => {
      const defaultX = Math.cos((idx * 2 * Math.PI) / Math.max(1, items.length)) * 340;
      const defaultY = Math.sin((idx * 2 * Math.PI) / Math.max(1, items.length)) * 240;
      const posX = item.canvas_x ?? Math.round(defaultX);
      const posY = item.canvas_y ?? Math.round(defaultY);
      const x = liveDragPos && liveDragPos.id === item.id ? liveDragPos.x : posX;
      const y = liveDragPos && liveDragPos.id === item.id ? liveDragPos.y : posY;
      return { x, y };
    },
    [items, liveDragPos]
  );

  // Modern dotted arrow connectors showing chronological progression between cards
  const connectors = useMemo(() => {
    if (items.length < 2) return [];

    const list: Array<{
      id: string;
      pathD: string;
      midX: number;
      midY: number;
      fromNum: number;
      toNum: number;
    }> = [];

    for (let i = 0; i < items.length - 1; i++) {
      const source = items[i];
      const target = items[i + 1];

      const p1 = getNodePosition(source, i);
      const p2 = getNodePosition(target, i + 1);

      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const dist = Math.hypot(dx, dy);

      // Card bounding box dimensions (measured dynamically, fallback to standard card size)
      const dims1 = cardDimensionsRef.current[source.id];
      const dims2 = cardDimensionsRef.current[target.id];

      const hw1 = (dims1?.w ?? 280) / 2;
      const hh1 = (dims1?.h ?? 260) / 2;

      const hw2 = (dims2?.w ?? 280) / 2;
      const hh2 = (dims2?.h ?? 260) / 2;

      const theta = Math.atan2(dy, dx);
      const cosT = Math.cos(theta);
      const sinT = Math.sin(theta);

      // Exit point directly on source card perimeter
      const tX1 = Math.abs(cosT) > 0.0001 ? Math.abs(hw1 / cosT) : Infinity;
      const tY1 = Math.abs(sinT) > 0.0001 ? Math.abs(hh1 / sinT) : Infinity;
      const r1 = Math.min(tX1, tY1);

      // Entry point directly touching target card perimeter
      const tX2 = Math.abs(cosT) > 0.0001 ? Math.abs(hw2 / cosT) : Infinity;
      const tY2 = Math.abs(sinT) > 0.0001 ? Math.abs(hh2 / sinT) : Infinity;
      const r2 = Math.min(tX2, tY2);

      if (dist <= r1 + r2) {
        // Cards overlap; don't render arrow underneath
        continue;
      }

      // Exact perimeter points
      const sx = p1.x + cosT * r1;
      const sy = p1.y + sinT * r1;

      // For target, arrow tip directly touches outer card border
      const ex = p2.x - cosT * r2;
      const ey = p2.y - sinT * r2;

      // Gentle organic curve with subtle perpendicular offset
      const lineLen = Math.hypot(ex - sx, ey - sy);
      const curvature = Math.min(20, lineLen * 0.08);
      const perpX = -sinT * curvature;
      const perpY = cosT * curvature;

      const cx1 = sx + (ex - sx) * 0.35 + perpX;
      const cy1 = sy + (ey - sy) * 0.35 + perpY;
      const cx2 = sx + (ex - sx) * 0.65 + perpX;
      const cy2 = sy + (ey - sy) * 0.65 + perpY;

      const pathD = `M ${sx.toFixed(1)} ${sy.toFixed(1)} C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${ex.toFixed(1)} ${ey.toFixed(1)}`;
      const midX = (sx + ex) / 2 + perpX * 0.6;
      const midY = (sy + ey) / 2 + perpY * 0.6;

      list.push({
        id: `${source.id}->${target.id}`,
        pathD,
        midX,
        midY,
        fromNum: i + 1,
        toNum: i + 2,
      });
    }

    return list;
  }, [items, getNodePosition]);

  // Exact screen clientX/Y to canvas (x, y) mapping
  const getCanvasCoords = (clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const currentPan = panRef.current;
    const currentZoom = zoomRef.current;
    const cx = (clientX - (rect.left + rect.width / 2) - currentPan.x) / currentZoom;
    const cy = (clientY - (rect.top + rect.height / 2) - currentPan.y) / currentZoom;
    return { x: cx, y: cy };
  };

  // Immediate card lift & drag trigger
  const triggerCardDrag = (cardId: string, clientX: number, clientY: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    isPanningRef.current = false;
    setIsPanning(false);
    activeDragIdRef.current = cardId;
    setLiftedCardId(cardId);

    const currentItems = itemsRef.current;
    const item = currentItems.find((i) => i.id === cardId);
    if (!item) return;
    const idx = currentItems.indexOf(item);
    const defaultX = Math.cos((idx * 2 * Math.PI) / Math.max(1, currentItems.length)) * 340;
    const defaultY = Math.sin((idx * 2 * Math.PI) / Math.max(1, currentItems.length)) * 240;
    const posX = item.canvas_x ?? Math.round(defaultX);
    const posY = item.canvas_y ?? Math.round(defaultY);

    const fingerCanvas = getCanvasCoords(clientX, clientY);
    dragOffsetRef.current = {
      x: fingerCanvas.x - posX,
      y: fingerCanvas.y - posY,
    };
    const initialPos = { id: cardId, x: posX, y: posY };
    setLiveDragPos(initialPos);
    liveDragPosRef.current = initialPos;

    if ('vibrate' in navigator) {
      try {
        navigator.vibrate([40]);
      } catch {}
    }
  };

  // Drag End & Save to storage / cloud
  const handleDragEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const draggedId = activeDragIdRef.current;
    if (draggedId && liveDragPosRef.current && liveDragPosRef.current.id === draggedId) {
      const { x: finalX, y: finalY } = liveDragPosRef.current;
      updateCanvasPosition(draggedId, finalX, finalY);
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([20]);
        } catch {}
      }
    }

    activeDragIdRef.current = null;
    setLiftedCardId(null);
    setLiveDragPos(null);
    liveDragPosRef.current = null;
    isPanningRef.current = false;
    setIsPanning(false);
    pinchStartDistRef.current = null;
  };

  // --- MOUSE HANDLERS (Desktop) ---
  const handleMouseDown = (e: React.MouseEvent) => {
    const targetEl = e.target as HTMLElement;
    const handleEl = targetEl.closest('.drag-handle');
    const cardEl = targetEl.closest('[data-card-id]');

    if (handleEl || (mode === 'move' && cardEl)) {
      const itemId = handleEl?.getAttribute('data-item-id') || cardEl?.getAttribute('data-card-id');
      if (itemId) {
        e.stopPropagation();
        triggerCardDrag(itemId, e.clientX, e.clientY);
        return;
      }
    }

    isPanningRef.current = true;
    setIsPanning(true);
    panStartRef.current = { x: e.clientX, y: e.clientY };
    panOriginRef.current = { ...panRef.current };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (activeDragIdRef.current) {
      const fingerCanvas = getCanvasCoords(e.clientX, e.clientY);
      const newX = Math.round(fingerCanvas.x - dragOffsetRef.current.x);
      const newY = Math.round(fingerCanvas.y - dragOffsetRef.current.y);
      const nextPos = { id: activeDragIdRef.current, x: newX, y: newY };
      setLiveDragPos(nextPos);
      liveDragPosRef.current = nextPos;
    } else if (isPanningRef.current) {
      const dx = e.clientX - panStartRef.current.x;
      const dy = e.clientY - panStartRef.current.y;
      setPan({
        x: Math.round(panOriginRef.current.x + dx),
        y: Math.round(panOriginRef.current.y + dy),
      });
    }
  };

  const handleMouseUp = () => {
    handleDragEnd();
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(2.5, Math.max(0.35, Number((z * zoomFactor).toFixed(2)))));
  };

  // --- TOUCH HANDLERS (Mobile / Tablet Gestures) ---
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      pinchStartDistRef.current = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartZoomRef.current = zoomRef.current;
      isPanningRef.current = false;
      setIsPanning(false);
      activeDragIdRef.current = null;
      setLiftedCardId(null);
      return;
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0];
      const targetEl = touch.target as HTMLElement;
      const cardEl = targetEl.closest('[data-card-id]');
      const handleEl = targetEl.closest('.drag-handle');

      touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };
      touchCurrentPosRef.current = { x: touch.clientX, y: touch.clientY };

      // Direct drag if touching handle or in 'move' mode
      if (handleEl || (mode === 'move' && cardEl)) {
        const itemId = handleEl?.getAttribute('data-item-id') || cardEl?.getAttribute('data-card-id');
        if (itemId) {
          e.stopPropagation();
          triggerCardDrag(itemId, touch.clientX, touch.clientY);
          return;
        }
      }

      // If touching card in 'pan' mode, start 280ms touch-and-hold to lift
      if (cardEl) {
        const cardId = cardEl.getAttribute('data-card-id');
        if (cardId) {
          longPressTimerRef.current = setTimeout(() => {
            triggerCardDrag(cardId, touchCurrentPosRef.current.x, touchCurrentPosRef.current.y);
          }, 280);
          return;
        }
      }

      // Blank canvas touch: immediate pan
      isPanningRef.current = true;
      setIsPanning(true);
      panStartRef.current = { x: touch.clientX, y: touch.clientY };
      panOriginRef.current = { ...panRef.current };
    }
  };

  // Native non-passive touchmove listener to avoid passive event warnings
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onNativeTouchMove = (e: TouchEvent) => {
      // 2-finger pinch
      if (e.touches.length === 2 && pinchStartDistRef.current) {
        if (e.cancelable) e.preventDefault();
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
        touchCurrentPosRef.current = { x: touch.clientX, y: touch.clientY };

        // Case A: Card is actively dragging (1:1 lockstep tracking without delay)
        if (activeDragIdRef.current) {
          if (e.cancelable) e.preventDefault();
          const fingerCanvas = getCanvasCoords(touch.clientX, touch.clientY);
          const newX = Math.round(fingerCanvas.x - dragOffsetRef.current.x);
          const newY = Math.round(fingerCanvas.y - dragOffsetRef.current.y);
          const nextPos = { id: activeDragIdRef.current, x: newX, y: newY };
          setLiveDragPos(nextPos);
          liveDragPosRef.current = nextPos;
          return;
        }

        // Case B: User touched card, but swiped > 10px before long-press -> switch to pan
        if (longPressTimerRef.current) {
          const dx = touch.clientX - touchStartPosRef.current.x;
          const dy = touch.clientY - touchStartPosRef.current.y;
          if (Math.hypot(dx, dy) > 10) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
            isPanningRef.current = true;
            setIsPanning(true);
            panStartRef.current = { x: touch.clientX, y: touch.clientY };
            panOriginRef.current = { ...panRef.current };
          }
        }

        // Case C: Canvas is panning
        if (isPanningRef.current) {
          if (e.cancelable) e.preventDefault();
          const dx = touch.clientX - panStartRef.current.x;
          const dy = touch.clientY - panStartRef.current.y;
          setPan({
            x: Math.round(panOriginRef.current.x + dx),
            y: Math.round(panOriginRef.current.y + dy),
          });
        }
      }
    };

    container.addEventListener('touchmove', onNativeTouchMove, { passive: false });
    return () => {
      container.removeEventListener('touchmove', onNativeTouchMove);
    };
  }, []);

  const handleTouchEnd = () => {
    handleDragEnd();
  };

  return (
    <div className="relative w-full h-full overflow-hidden select-none touch-none bg-background">
      {/* Top Floating Controls Bar (Slides down under header when header is shown, up to edge when hidden) */}
      <div
        className={`absolute left-3 right-3 sm:right-auto z-20 flex items-center justify-between sm:justify-start gap-1.5 p-1 rounded-2xl bg-surface/95 border border-border shadow-md transition-all duration-300 ${
          isHeaderVisible ? 'top-16 sm:top-18' : 'top-3 sm:top-4'
        }`}
      >
        {/* Interaction Mode Switcher (Hand Pan vs Node Move) */}
        <div className="flex items-center bg-surface-elevated/80 rounded-xl p-0.5 border border-border/60">
          <button
            onClick={() => setMode('pan')}
            title="Hand Mode: Drag anywhere to pan canvas. Hold card to lift & move."
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
            title="Move Mode: Tap and drag cards directly"
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
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-20 px-3.5 py-1.5 rounded-full bg-surface/95 border border-border shadow-lg text-[11px] text-text-muted flex items-center gap-2 animate-fade-in pointer-events-none whitespace-nowrap transition-all duration-300 ${
            isHeaderVisible ? 'top-28 sm:top-30' : 'top-16'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span>Touch & hold card to lift • Pinch to zoom • Drag to pan</span>
        </div>
      )}

      {/* Ultra-Compact & Thin Floating Node Switcher with Integrated Add Button */}
      {items.length > 0 && (
        <div
          className={`absolute left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 sm:gap-1.5 px-2 py-1 rounded-full bg-surface/95 dark:bg-[#18222D]/95 border border-border shadow-xl backdrop-blur-md transition-all duration-300 max-w-[92vw] sm:max-w-md select-none ${
            isNavVisible ? 'bottom-[84px] sm:bottom-5' : 'bottom-9 sm:bottom-5'
          }`}
        >
          {/* Previous Node Button */}
          <button
            onClick={() => navigateToNode(activeNodeIdx - 1)}
            title="Previous Card"
            className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface-elevated active:scale-90 transition-all shrink-0"
          >
            <ChevronLeft className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Active Card Quick-Jump Capsule */}
          <div
            onClick={() => navigateToNode(activeNodeIdx)}
            className="flex items-center gap-1.5 px-2 py-0.5 min-w-0 cursor-pointer hover:bg-surface-elevated rounded-full transition-colors"
            title="Tap to focus and center on this card"
          >
            <span className="text-[10px] font-mono font-bold text-[#2481CC] dark:text-[#50A7EA] bg-[#2481CC]/10 dark:bg-[#50A7EA]/15 px-1.5 py-0.5 rounded-full shrink-0">
              {Math.min(activeNodeIdx, items.length - 1) + 1}/{items.length}
            </span>
            <span className="text-xs font-medium text-text-main truncate max-w-[120px] sm:max-w-[180px]">
              {items[Math.min(activeNodeIdx, items.length - 1)]?.title || 'Note'}
            </span>
          </div>

          {/* Next Node Button */}
          <button
            onClick={() => navigateToNode(activeNodeIdx + 1)}
            title="Next Card"
            className="w-7 h-7 rounded-full flex items-center justify-center text-text-muted hover:text-text-main hover:bg-surface-elevated active:scale-90 transition-all shrink-0"
          >
            <ChevronRight className="w-4 h-4 stroke-[2.2]" />
          </button>

          {/* Sleek Vertical Divider */}
          <div className="w-[1px] h-4 bg-border/80 mx-0.5 shrink-0" />

          {/* Integrated Modern Compact Add Button */}
          <button
            onClick={onOpenAddModal}
            title="Add New Card to Canvas"
            className="flex items-center gap-1 h-7 px-2.5 rounded-full bg-[#2481CC] hover:bg-[#1E70B0] text-white text-xs font-semibold shadow-xs hover:shadow-md active:scale-95 transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span className="text-[11px] font-medium hidden xs:inline sm:inline">Add</span>
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
            transition: isPanning || activeDragIdRef.current ? 'none' : 'transform 0.15s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          <div className="relative w-full h-full">
            {/* Center Compass Origin Marker */}
            <div
              className="absolute pointer-events-auto w-10 h-10 rounded-2xl bg-surface/90 backdrop-blur-md border border-border flex items-center justify-center text-text-muted shadow-sm hover:scale-110 transition-transform"
              style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
            >
              <Compass className="w-5 h-5 text-primary" />
            </div>

            {/* Chronological Dotted Arrows Layer */}
            <div
              className="absolute w-0 h-0 overflow-visible pointer-events-none z-0"
              style={{ left: '50%', top: '50%' }}
            >
              <svg className="overflow-visible pointer-events-none" style={{ width: 1, height: 1 }}>
                <defs>
                  <marker
                    id="canvas-dotted-arrow"
                    viewBox="0 0 10 10"
                    refX="8"
                    refY="5"
                    markerWidth="8"
                    markerHeight="8"
                    orient="auto"
                  >
                    <path d="M 0 1.5 L 8 5 L 0 8.5 L 2 5 Z" fill="#2481CC" />
                  </marker>
                </defs>

                {connectors.map((c) => (
                  <g key={c.id}>
                    {/* Contrast backdrop stroke */}
                    <path
                      d={c.pathD}
                      fill="none"
                      stroke="var(--bg-main)"
                      strokeWidth="5"
                      strokeLinecap="round"
                      className="opacity-75"
                    />
                    {/* Modern Dotted Line */}
                    <path
                      d={c.pathD}
                      fill="none"
                      stroke="#2481CC"
                      strokeWidth="2.5"
                      strokeDasharray="6 6"
                      strokeLinecap="round"
                      markerEnd="url(#canvas-dotted-arrow)"
                      className="opacity-85"
                    />
                    {/* Modern Chronology Sequence Badge Pill */}
                    <g transform={`translate(${c.midX}, ${c.midY})`}>
                      <rect
                        x="-16"
                        y="-7.5"
                        width="32"
                        height="15"
                        rx="7.5"
                        fill="var(--bg-surface)"
                        stroke="#2481CC"
                        strokeWidth="1"
                        className="shadow-xs opacity-95"
                      />
                      <text
                        x="0"
                        y="3.5"
                        textAnchor="middle"
                        fill="#2481CC"
                        fontSize="9"
                        fontWeight="bold"
                        fontFamily="monospace"
                        className="select-none pointer-events-none"
                      >
                        {c.fromNum}➔{c.toNum}
                      </text>
                    </g>
                  </g>
                ))}
              </svg>
            </div>

            {/* Nodes */}
            {items.map((item, idx) => {
              const defaultX = Math.cos((idx * 2 * Math.PI) / Math.max(1, items.length)) * 340;
              const defaultY = Math.sin((idx * 2 * Math.PI) / Math.max(1, items.length)) * 240;
              const posX = item.canvas_x ?? Math.round(defaultX);
              const posY = item.canvas_y ?? Math.round(defaultY);

              const isBeingDragged = activeDragIdRef.current === item.id;
              const x = (liveDragPos && liveDragPos.id === item.id) ? liveDragPos.x : posX;
              const y = (liveDragPos && liveDragPos.id === item.id) ? liveDragPos.y : posY;

              const isHighlighted = highlightedNodeId === item.id;
              const isLifted = liftedCardId === item.id;

              return (
                <div
                  key={item.id}
                  data-card-id={item.id}
                  ref={(el) => registerCardRef(item.id, el)}
                  className={`absolute pointer-events-auto rounded-2xl select-none ${
                    isLifted
                      ? 'shadow-2xl ring-4 ring-[#2481CC] z-50 cursor-grabbing'
                      : isHighlighted
                      ? 'ring-4 ring-[#2481CC] shadow-glow-lg z-30'
                      : 'z-10'
                  }`}
                  style={{
                    left: '50%',
                    top: '50%',
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${isLifted ? 1.05 : 1})`,
                    transition: isBeingDragged || isLifted ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.18s ease',
                    width: 'clamp(260px, 80vw, 320px)',
                    touchAction: 'none',
                  }}
                >
                  {/* Floating Lift Aura Pill when card is lifted */}
                  {isLifted && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-primary-text text-[10px] font-bold shadow-xl flex items-center gap-1.5 animate-pulse whitespace-nowrap pointer-events-none z-50">
                      <Sparkles className="w-3 h-3 text-amber-300" />
                      <span>Lifted • Drag to move</span>
                    </div>
                  )}

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
