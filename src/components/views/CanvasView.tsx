import React, { useState, useRef } from 'react';
import { useItems } from '../../context/ItemContext';
import { ItemCard } from '../ItemCard';
import { ZoomIn, ZoomOut, RotateCcw, Move, Compass } from 'lucide-react';

interface CanvasViewProps {
  onOpenMedia: (url: string, title: string) => void;
}

export const CanvasView: React.FC<CanvasViewProps> = ({ onOpenMedia }) => {
  const { items, updateCanvasPosition } = useItems();
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragItem, setDragItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-bg')) {
      setIsPanning(true);
      setDragOffset({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPan({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y,
      });
    } else if (dragItem) {
      const item = items.find((i) => i.id === dragItem);
      if (item && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const mouseCanvasX = (e.clientX - rect.left - pan.x - rect.width / 2) / zoom;
        const mouseCanvasY = (e.clientY - rect.top - pan.y - rect.height / 2) / zoom;
        updateCanvasPosition(dragItem, Math.round(mouseCanvasX), Math.round(mouseCanvasY));
      }
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
    setDragItem(null);
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    setZoom((z) => Math.min(2.5, Math.max(0.4, z * zoomFactor)));
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative w-full h-[calc(100vh-8.5rem)] rounded-2xl overflow-hidden border border-border bg-background select-none">
      {/* Floating Canvas Controls (Minimal Linear Style) */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1 p-1 rounded-xl bg-surface/90 backdrop-blur-md border border-border shadow-sm">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.15))}
          title="Zoom In"
          className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z * 0.85))}
          title="Zoom Out"
          className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="font-mono text-xs text-text-muted px-2 min-w-[48px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <div className="w-[1px] h-3.5 bg-border mx-0.5" />
        <button
          onClick={resetView}
          title="Center Canvas"
          className="p-1.5 rounded-lg text-text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Floating Tip */}
      <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-xl bg-surface/90 backdrop-blur-md border border-border text-xs text-text-muted">
        <Move className="w-3.5 h-3.5 text-text-faint" />
        <span>Drag canvas to pan • Drag handle to move nodes</span>
      </div>

      {/* Main Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden canvas-bg"
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
          }}
        >
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Central Node */}
            <div className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-xl bg-surface border border-border flex items-center justify-center text-text-muted shadow-sm">
              <Compass className="w-5 h-5" />
            </div>

            {/* Nodes */}
            {items.map((item, idx) => {
              const x = item.canvas_x || (Math.cos((idx * 2 * Math.PI) / items.length) * 340);
              const y = item.canvas_y || (Math.sin((idx * 2 * Math.PI) / items.length) * 240);

              return (
                <div
                  key={item.id}
                  className="absolute pointer-events-auto"
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    width: '320px',
                  }}
                  onMouseDown={(e) => {
                    if ((e.target as HTMLElement).closest('.drag-handle')) {
                      e.stopPropagation();
                      setDragItem(item.id);
                    }
                  }}
                >
                  <div className="drag-handle cursor-move py-1 px-3 rounded-t-xl bg-surface-elevated border border-border border-b-0 text-[10px] font-mono text-text-faint flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Move className="w-2.5 h-2.5" /> #{idx + 1}
                    </span>
                    <span>{Math.round(x)}, {Math.round(y)}</span>
                  </div>
                  <ItemCard item={item} onOpenMedia={onOpenMedia} />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
