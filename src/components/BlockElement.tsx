import { useState, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import type { Block } from '../types/index.ts';
import { SWIMLANE_HEIGHT } from '../utils/constants.ts';
import './Timeline.css';

interface BlockElementProps {
  block: Block;
  left: number;
  width: number;
  height: number;
  animationIndex?: number;
  selected?: boolean;
  onEdit?: (block: Block) => void;
  onDragStart?: (e: ReactPointerEvent<HTMLDivElement>, block: Block) => void;
  onResizeStart?: (
    e: ReactPointerEvent<HTMLDivElement>,
    block: Block,
    edge: 'start' | 'end',
  ) => void;
  onContextMenu?: (e: React.MouseEvent, block: Block) => void;
  onPercentChange?: (block: Block, newPercent: number) => void;
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Planlagt',
  active: 'Aktiv',
  done: 'Ferdig',
};

const MONTHS_NO = ['jan.', 'feb.', 'mars', 'apr.', 'mai', 'juni',
  'juli', 'aug.', 'sep.', 'okt.', 'nov.', 'des.'];

function formatDateNorwegian(isoDate: string): string {
  const [y, m, d] = isoDate.split('-');
  return `${parseInt(d)}. ${MONTHS_NO[parseInt(m) - 1]} ${y}`;
}

/**
 * Determine whether text on a given background should be dark or light.
 * Uses relative luminance to pick the best contrast.
 */
function getTextColor(bgHex: string): string {
  if (!bgHex || bgHex.length < 7) return '#ffffff';
  const r = parseInt(bgHex.slice(1, 3), 16);
  const g = parseInt(bgHex.slice(3, 5), 16);
  const b = parseInt(bgHex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.55 ? '#1c1917' : '#ffffff';
}

/**
 * Compute a darker border color from the block's hex color.
 * Multiplies each RGB channel by 0.7 to get a visible border.
 */
function darkenHex(hex: string, factor = 0.7): string {
  if (!hex || !/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) return hex;
  let cleaned = hex.replace('#', '');
  /* Expand shorthand hex (e.g. "f00" → "ff0000") */
  if (cleaned.length === 3) {
    cleaned = cleaned[0] + cleaned[0] + cleaned[1] + cleaned[1] + cleaned[2] + cleaned[2];
  }
  const r = Math.round(parseInt(cleaned.slice(0, 2), 16) * factor);
  const g = Math.round(parseInt(cleaned.slice(2, 4), 16) * factor);
  const b = Math.round(parseInt(cleaned.slice(4, 6), 16) * factor);
  return `rgb(${r}, ${g}, ${b})`;
}

export default function BlockElement({
  block,
  left,
  width,
  height,
  animationIndex,
  selected,
  onEdit,
  onDragStart,
  onResizeStart,
  onContextMenu,
  onPercentChange,
}: BlockElementProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const statusClass =
    block.status === 'planned'
      ? ' block--planned'
      : block.status === 'done'
        ? ' block--done'
        : ' block--active';

  const selectedClass = selected ? ' block--selected' : '';

  const borderColor = darkenHex(block.color);
  const textColor = getTextColor(block.color);

  // Single-click selects, double-click edits (standard behavior)
  const handleDoubleClick = useCallback(() => {
    onEdit?.(block);
  }, [onEdit, block]);

  const handlePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      /* Only left mouse button */
      if (e.button !== 0) return;
      onDragStart?.(e, block);
    },
    [onDragStart, block],
  );

  const handleResizePointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>, edge: 'start' | 'end') => {
      e.stopPropagation();
      if (e.button !== 0) return;
      onResizeStart?.(e, block, edge);
    },
    [onResizeStart, block],
  );

  const handlePercentPointerDown = useCallback(
    (e: ReactPointerEvent<HTMLDivElement>) => {
      e.stopPropagation();
      e.preventDefault();
      const handle = e.currentTarget;
      handle.setPointerCapture(e.pointerId);
      const startY = e.clientY;
      const startPercent = block.percent;
      const blockEl = handle.parentElement as HTMLElement;
      const percentEl = blockEl.querySelector('.block__percent') as HTMLElement | null;
      let finalPercent = startPercent;
      let didMove = false;

      const minBlockHeight = 22;
      const calcHeight = (pct: number) =>
        Math.max(Math.round((pct / 100) * SWIMLANE_HEIGHT), minBlockHeight);

      const onMove = (ev: globalThis.PointerEvent) => {
        didMove = true;
        const deltaY = ev.clientY - startY;
        const deltaSteps = Math.round(deltaY / 16);
        const raw = startPercent + deltaSteps * 10;
        const snapped = Math.round(raw / 10) * 10;
        finalPercent = Math.max(10, Math.min(100, snapped));
        blockEl.style.height = `${calcHeight(finalPercent)}px`;
        // Show real-time percent during drag
        if (percentEl) percentEl.textContent = `${finalPercent}%`;
      };

      const cleanup = () => {
        handle.removeEventListener('pointermove', onMove);
        handle.removeEventListener('pointerup', onUpHandler);
        handle.removeEventListener('pointercancel', cleanup);
        try { handle.releasePointerCapture(e.pointerId); } catch { /* already released */ }
        blockEl.style.height = '';
        // Restore original text (React will update it after state change)
        if (percentEl) percentEl.textContent = `${finalPercent}%`;

        // Always eat the click that follows pointerup to prevent dialog from opening
        const eatClick = (ev: MouseEvent) => {
          ev.stopPropagation();
          ev.stopImmediatePropagation();
          ev.preventDefault();
        };
        window.addEventListener('click', eatClick, { capture: true, once: true });
        setTimeout(() => window.removeEventListener('click', eatClick, true), 200);

        if (didMove && finalPercent !== startPercent) {
          onPercentChange?.(block, finalPercent);
        }
      };

      const onUpHandler = () => cleanup();

      handle.addEventListener('pointermove', onMove);
      handle.addEventListener('pointerup', onUpHandler, { once: true });
      handle.addEventListener('pointercancel', cleanup, { once: true });
    },
    [block, onPercentChange],
  );

  /* If width is very narrow, show only an initial */
  const isNarrow = width < 50;

  return (
    <div
      className={`block${statusClass}${selectedClass}`}
      style={{
        left,
        width: Math.max(width, 8),
        height,
        top: 0,
        backgroundColor: block.color,
        borderColor,
        color: textColor,
        animationDelay: animationIndex !== undefined ? `${animationIndex * 0.06}s` : undefined,
      }}
      tabIndex={0}
      role="button"
      aria-label={`${block.title}, ${block.percent}%, ${block.status}`}
      onDoubleClick={handleDoubleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setShowTooltip(true)}
      onPointerLeave={() => setShowTooltip(false)}
      onContextMenu={(e) => { e.preventDefault(); setShowTooltip(false); onContextMenu?.(e, block); }}
    >
      {/* Resize handle — left */}
      <div
        className="block__resize-handle block__resize-handle--left"
        onPointerDown={(e) => handleResizePointerDown(e, 'start')}
      />

      {/* Content */}
      {isNarrow ? (
        <span className="block__title">{block.title.charAt(0)}</span>
      ) : (
        <>
          <span className="block__title">{block.title}</span>
          <span className="block__percent">{block.percent}%</span>
          {block.status === 'done' && (
            <span className="block__checkmark" aria-label="Ferdig">
              ✓
            </span>
          )}
        </>
      )}

      {/* Resize handle — right */}
      <div
        className="block__resize-handle block__resize-handle--right"
        onPointerDown={(e) => handleResizePointerDown(e, 'end')}
      />

      {/* Resize handle — bottom (vertical percent) */}
      {onPercentChange && (
        <div
          className="block__resize-handle block__resize-handle--bottom"
          onPointerDown={(e) => handlePercentPointerDown(e)}
        />
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="block__tooltip">
          <strong>{block.title}</strong>
          <br />
          {formatDateNorwegian(block.startDate)} – {formatDateNorwegian(block.endDate)}
          <br />
          Allokering: {block.percent}%
          <br />
          Status: {STATUS_LABELS[block.status] ?? block.status}
          {block.description && (
            <>
              <br />
              {block.description}
            </>
          )}
        </div>
      )}
    </div>
  );
}
