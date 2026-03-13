import { useState, useCallback, type PointerEvent as ReactPointerEvent } from 'react';
import type { Block } from '../types/index.ts';
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

  const handleClick = useCallback(() => {
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
        animationDelay: animationIndex !== undefined ? `${animationIndex * 0.06}s` : undefined,
      }}
      tabIndex={0}
      role="button"
      aria-label={`${block.title}, ${block.percent}%, ${block.status}`}
      onClick={handleClick}
      onPointerDown={handlePointerDown}
      onPointerEnter={() => setShowTooltip(true)}
      onPointerLeave={() => setShowTooltip(false)}
      onContextMenu={(e) => { e.preventDefault(); onContextMenu?.(e, block); }}
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

      {/* Tooltip */}
      {showTooltip && (
        <div className="block__tooltip">
          <strong>{block.title}</strong>
          <br />
          {block.startDate} — {block.endDate}
          <br />
          Allokering: {block.percent}%
          <br />
          Status: {block.status}
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
