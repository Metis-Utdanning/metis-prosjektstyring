import { useRef, useState, useCallback, useEffect } from 'react';
import type { DragMode } from '../types/index.ts';
import { DRAG_THRESHOLD } from '../utils/constants.ts';
import {
  addDays,
  differenceInCalendarDays,
  startOfISOWeek,
  startOfDay,
} from 'date-fns';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseDragOptions {
  onDragEnd: (blockId: string, newStartDate: Date, newEndDate: Date) => void;
  onClick: (blockId: string) => void;
  dayWidth: number;
  timelineStart: Date;
  /** Snap to whole ISO-weeks (overview) vs. individual days (week view). */
  snapToWeek?: boolean;
}

export interface DragHandlers {
  onPointerDown: (
    e: React.PointerEvent,
    blockId: string,
    mode: DragMode,
    currentStart: Date,
    currentEnd: Date,
  ) => void;
}

export interface UseDragReturn extends DragHandlers {
  isDragging: boolean;
  dragBlockId: string | null;
  dragPreviewStyle: React.CSSProperties | null;
}

// ---------------------------------------------------------------------------
// Internal ref-based state (never causes renders during drag)
// ---------------------------------------------------------------------------

interface DragRef {
  active: boolean;
  exceeded: boolean; // has the pointer moved past DRAG_THRESHOLD?
  blockId: string;
  mode: DragMode;
  originX: number; // pointerdown clientX
  originY: number; // pointerdown clientY
  currentStart: Date;
  currentEnd: Date;
  element: HTMLElement | null;
  /** Accumulated pixel delta along the x-axis. */
  deltaX: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function snapDate(date: Date, toWeek: boolean): Date {
  return toWeek ? startOfISOWeek(date) : startOfDay(date);
}

function pxToDays(px: number, dayWidth: number): number {
  return Math.round(px / dayWidth);
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useDrag(options: UseDragOptions): UseDragReturn {
  // Render-visible state (only set on drag start/end, never during move)
  const [isDragging, setIsDragging] = useState(false);
  const [dragBlockId, setDragBlockId] = useState<string | null>(null);
  const [dragPreviewStyle, setDragPreviewStyle] = useState<React.CSSProperties | null>(null);

  // Mutable ref that drives pointermove calculations without re-renders
  const dragRef = useRef<DragRef>({
    active: false,
    exceeded: false,
    blockId: '',
    mode: 'move',
    originX: 0,
    originY: 0,
    currentStart: new Date(),
    currentEnd: new Date(),
    element: null,
    deltaX: 0,
  });

  // Keep latest options in a ref so pointermove/pointerup closures see them
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // ------------------------------------------------------------------
  // Global pointermove / pointerup handlers (attached on drag start)
  // ------------------------------------------------------------------

  const handlePointerMove = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d.active) return;

    const dx = e.clientX - d.originX;
    const dy = e.clientY - d.originY;

    // Check threshold
    if (!d.exceeded) {
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < DRAG_THRESHOLD) return;
      d.exceeded = true;

      // First frame that exceeds threshold: enter visual drag mode
      setIsDragging(true);
      setDragBlockId(d.blockId);

      if (d.element) {
        d.element.style.opacity = '0.5';
        d.element.style.zIndex = '1000';
        d.element.style.pointerEvents = 'none';
      }
    }

    d.deltaX = dx;

    // Apply CSS transform on the element directly (no React state)
    if (d.element) {
      const { mode } = d;
      const { dayWidth: dw } = optionsRef.current;
      const deltaDays = pxToDays(dx, dw);

      if (mode === 'move') {
        // Translate the whole block
        d.element.style.transform = `translateX(${deltaDays * dw}px)`;
      } else if (mode === 'resize-end') {
        // Widen/shrink to the right by changing scaleX relative to current width
        const origDuration = differenceInCalendarDays(d.currentEnd, d.currentStart) + 1;
        const newDuration = Math.max(1, origDuration + deltaDays);
        const origWidthPx = origDuration * dw;
        const newWidthPx = newDuration * dw;
        d.element.style.width = `${newWidthPx}px`;
        // Keep transform at 0 so left edge stays put
        d.element.style.transform = '';
        // Show preview style for consumers that render a separate ghost
        setDragPreviewStyle({ width: newWidthPx, left: 0 } as React.CSSProperties);
        void origWidthPx; // suppress unused-local
      } else if (mode === 'resize-start') {
        // Move left edge: translate + change width
        const origDuration = differenceInCalendarDays(d.currentEnd, d.currentStart) + 1;
        const newDuration = Math.max(1, origDuration - deltaDays);
        const newWidthPx = newDuration * dw;
        const translatePx = (origDuration - newDuration) * dw;
        d.element.style.width = `${newWidthPx}px`;
        d.element.style.transform = `translateX(${translatePx}px)`;
        setDragPreviewStyle({ width: newWidthPx, transform: `translateX(${translatePx}px)` } as React.CSSProperties);
      }
    }
  }, []);

  const handlePointerUp = useCallback((e: PointerEvent) => {
    const d = dragRef.current;
    if (!d.active) return;

    const el = d.element;
    const wasExceeded = d.exceeded;
    const { blockId, mode, currentStart, currentEnd, deltaX } = d;

    // Reset ref state
    d.active = false;
    d.exceeded = false;

    // Release pointer capture
    if (el) {
      try { el.releasePointerCapture(e.pointerId); } catch { /* already released */ }
      // Restore element styles
      el.style.opacity = '';
      el.style.zIndex = '';
      el.style.pointerEvents = '';
      el.style.transform = '';
      el.style.width = '';
    }

    // Reset React state
    setIsDragging(false);
    setDragBlockId(null);
    setDragPreviewStyle(null);

    // Remove global listeners
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', handlePointerUp);

    if (!wasExceeded) {
      // Threshold was never exceeded — treat as click
      optionsRef.current.onClick(blockId);
      return;
    }

    // Calculate final dates
    const { dayWidth: dw, snapToWeek: doSnap = false } = optionsRef.current;
    const deltaDays = pxToDays(deltaX, dw);

    let newStart: Date;
    let newEnd: Date;

    if (mode === 'move') {
      newStart = snapDate(addDays(currentStart, deltaDays), doSnap);
      const duration = differenceInCalendarDays(currentEnd, currentStart);
      newEnd = addDays(newStart, duration);
    } else if (mode === 'resize-end') {
      newStart = currentStart;
      const rawEnd = addDays(currentEnd, deltaDays);
      newEnd = snapDate(rawEnd, doSnap);
      // Ensure minimum 1-day duration
      if (differenceInCalendarDays(newEnd, newStart) < 0) {
        newEnd = newStart;
      }
    } else {
      // resize-start
      const rawStart = addDays(currentStart, deltaDays);
      newStart = snapDate(rawStart, doSnap);
      newEnd = currentEnd;
      // Ensure minimum 1-day duration
      if (differenceInCalendarDays(newEnd, newStart) < 0) {
        newStart = newEnd;
      }
    }

    optionsRef.current.onDragEnd(blockId, newStart, newEnd);
  }, [handlePointerMove]);

  // ------------------------------------------------------------------
  // Cleanup on unmount
  // ------------------------------------------------------------------
  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  // ------------------------------------------------------------------
  // onPointerDown — the only handler exposed to components
  // ------------------------------------------------------------------

  const onPointerDown = useCallback(
    (
      e: React.PointerEvent,
      blockId: string,
      mode: DragMode,
      currentStart: Date,
      currentEnd: Date,
    ) => {
      // Only primary button
      if (e.button !== 0) return;

      const el = e.currentTarget as HTMLElement;
      el.setPointerCapture(e.pointerId);

      // Initialise drag ref
      const d = dragRef.current;
      d.active = true;
      d.exceeded = false;
      d.blockId = blockId;
      d.mode = mode;
      d.originX = e.clientX;
      d.originY = e.clientY;
      d.currentStart = currentStart;
      d.currentEnd = currentEnd;
      d.element = el;
      d.deltaX = 0;

      // Attach global listeners (window-level for robust capture)
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [handlePointerMove, handlePointerUp],
  );

  return { onPointerDown, isDragging, dragBlockId, dragPreviewStyle };
}
