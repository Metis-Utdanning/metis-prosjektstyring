import { useEffect, useRef, useCallback } from 'react';
import type { Block } from '../types/index.ts';
import './Timeline.css';

interface ContextMenuProps {
  x: number;
  y: number;
  block?: Block | null;
  personId?: string;
  clickDate?: Date;
  onClose: () => void;
  onEdit?: (block: Block) => void;
  onDuplicate?: (block: Block) => void;
  onDelete?: (block: Block) => void;
  onNewBlock?: (personId: string, date: Date) => void;
}

export function ContextMenu({
  x,
  y,
  block,
  personId,
  clickDate,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
  onNewBlock,
}: ContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);

  /* Close on click outside or Escape */
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('pointerdown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('pointerdown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [onClose]);

  /* Clamp position to viewport */
  const style: React.CSSProperties = {
    left: Math.min(x, window.innerWidth - 180),
    top: Math.min(y, window.innerHeight - 200),
  };

  const action = useCallback(
    (fn: (() => void) | undefined) => {
      fn?.();
      onClose();
    },
    [onClose],
  );

  return (
    <div className="context-menu" ref={ref} style={style}>
      {block ? (
        <>
          <button
            className="context-menu__item"
            onClick={() => action(() => onEdit?.(block))}
          >
            Rediger
          </button>
          <button
            className="context-menu__item"
            onClick={() => action(() => onDuplicate?.(block))}
          >
            Dupliser
          </button>
          <div className="context-menu__separator" />
          <button
            className="context-menu__item context-menu__item--danger"
            onClick={() => action(() => onDelete?.(block))}
          >
            Slett
          </button>
        </>
      ) : personId && clickDate ? (
        <button
          className="context-menu__item"
          onClick={() => action(() => onNewBlock?.(personId, clickDate))}
        >
          Ny blokk her
        </button>
      ) : null}
    </div>
  );
}
