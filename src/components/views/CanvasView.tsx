import React, { useState, useRef, useEffect } from 'react';
import { useItems } from '../../context/ItemContext';
import { UniItem } from '../../types';
import { ItemCard } from '../ItemCard';
import { ZoomIn, ZoomOut, RotateCcw, Move, Compass, Sparkles } from 'lucide-react';

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
    // If clicked on canvas background, start panning
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
      // Reposition dragged card
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
    <div className="relative w-full h-[calc(100vh-8.5rem)] rounded-3xl overflow-hidden border border-border bg-background select-none">
      {/* Floating Canvas Controls */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 p-1.5 rounded-2xl bg-surface/90 backdrop-blur-xl border border-border shadow-xl">
        <button
          onClick={() => setZoom((z) => Math.min(2.5, z * 1.15))}
          title="Zoom In"
          className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(0.4, z * 0.85))}
          title="Zoom Out"
          className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="font-mono text-xs text-text-muted px-2 min-w-[50px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <div className="w-[1px] h-4 bg-border" />
        <button
          onClick={resetView}
          title="Center Canvas"
          className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-elevated transition-colors"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Mini Legend */}
      <div className="absolute top-4 right-4 z-20 hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface/90 backdrop-blur-xl border border-border shadow-xl text-xs text-text-muted">
        <Move className="w-3.5 h-3.5 text-accent" />
        <span>Click & drag background to Pan • Drag cards to organize</span>
      </div>

      {/* Main Canvas Viewport */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing relative overflow-hidden canvas-bg"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, var(--border-color) 1px, transparent 0)`,
          backgroundSize: `${32 * zoom}px ${32 * zoom}px`,
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
          {/* Constellation Canvas Nodes */}
          <div className="relative w-full h-full flex items-center justify-center">
            {/* Central Universal Hub Node */}
            <div className="absolute pointer-events-auto -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-lg flex items-center justify-center">
              <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center text-accent">
                <Compass className="w-6 h-6 animate-spin-slow" />
              </div>
            </div>

            {/* Render items as spatial cards */}
            {items.map((item, idx) => {
              // Calculate default spread if coordinates are 0
              const x = item.canvas_x || (Math.cos((idx * 2 * Math.PI) / items.length) * 320);
              const y = item.canvas_y || (Math.sin((idx * 2 * Math.PI) / items.length) * 220);

              return (
                <div
                  key={item.id}
                  className="absolute pointer-events-auto transition-transform"
                  style={{
                    transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
                    width: '320px',
                  }}
                  onMouseDown={(e) => {
                    // Start dragging if clicking card header bar
                    if ((e.target as HTMLElement).closest('.drag-handle')) {
                      e.stopPropagation();
                      setDragItem(item.id);
                    }
                  }}
                >
                  <div className="drag-handle cursor-move py-1 px-3 mb-1 rounded-t-xl bg-surface-elevated/80 border border-border border-b-0 text-[10px] font-mono text-text-muted flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Move className="w-2.5 h-2.5" /> Node #{idx + 1}
                    </span>
                    <span>({Math.round(x)}, {Math.round(y)})</span>
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
