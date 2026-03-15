import { useMemo, type PointerEvent as ReactPointerEvent } from 'react';
import type { Person, Block, Unavailable, WeekInfo } from '../types/index.ts';
import { dateToPixelOffset, parseISO, addDays } from '../utils/dates.ts';
import { SWIMLANE_HEIGHT, PALETTE } from '../utils/constants.ts';
import BlockElement from './BlockElement.tsx';
import CapacityBar from './CapacityBar.tsx';
import './Timeline.css';

interface SwimlaneProps {
  person: Person;
  blocks: Block[];
  unavailable: Unavailable[];
  weeks: WeekInfo[];
  dayWidth: number;
  timelineStart: Date;
  index?: number;
  selectedBlockId?: string | null;
  onEditBlock?: (block: Block) => void;
  onDragStart?: (e: ReactPointerEvent<HTMLDivElement>, block: Block) => void;
  onResizeStart?: (
    e: ReactPointerEvent<HTMLDivElement>,
    block: Block,
    edge: 'start' | 'end',
  ) => void;
  onDoubleClick?: (personId: string, date: Date) => void;
  onBlockContextMenu?: (e: React.MouseEvent, block: Block) => void;
  onEditUnavailable?: (unavailable: Unavailable) => void;
  onPercentChange?: (block: Block, newPercent: number) => void;
}

/** Lay out blocks vertically to avoid overlapping. Returns row index per block. */
function layoutBlocks(
  blocks: Block[],
): { block: Block; row: number }[] {
  /* Sort by startDate, then by longest duration first */
  const sorted = [...blocks].sort((a, b) => {
    const d = a.startDate.localeCompare(b.startDate);
    if (d !== 0) return d;
    return b.endDate.localeCompare(a.endDate);
  });

  const rowMaxEnd: string[] = []; // tracks the latest endDate per row

  return sorted.map((block) => {
    const blockStart = block.startDate;

    /* Find first row where this block fits (no overlap) */
    let placed = -1;
    for (let r = 0; r < rowMaxEnd.length; r++) {
      if (rowMaxEnd[r] < blockStart) {
        placed = r;
        break;
      }
    }

    if (placed === -1) {
      placed = rowMaxEnd.length;
      rowMaxEnd.push('');
    }

    // Track the maximum endDate for this row
    if (block.endDate > rowMaxEnd[placed]) {
      rowMaxEnd[placed] = block.endDate;
    }
    return { block, row: placed };
  });
}

const MIN_BLOCK_HEIGHT = 22;

function blockHeight(percent: number): number {
  return Math.max(Math.round((percent / 100) * SWIMLANE_HEIGHT), MIN_BLOCK_HEIGHT);
}

export default function Swimlane({
  person,
  blocks,
  unavailable,
  weeks,
  dayWidth,
  timelineStart,
  index,
  selectedBlockId,
  onEditBlock,
  onDragStart,
  onResizeStart,
  onDoubleClick,
  onBlockContextMenu,
  onEditUnavailable,
  onPercentChange,
}: SwimlaneProps) {
  const weekWidth = dayWidth * 7;
  const totalWidth = weeks.length * weekWidth;

  /* Filter blocks for this person */
  const personBlocks = useMemo(
    () => blocks.filter((b) => b.person === person.id),
    [blocks, person.id],
  );

  const avatarColor = personBlocks[0]?.color ?? PALETTE[(index ?? 0) % PALETTE.length];

  /* Filter unavailable for this person */
  const personUnavailable = useMemo(
    () => unavailable.filter((u) => u.person === person.id),
    [unavailable, person.id],
  );

  /* Layout: assign vertical rows to non-overlapping blocks */
  const layoutItems = useMemo(
    () => layoutBlocks(personBlocks),
    [personBlocks],
  );

  /* Height is proportional to percent: 100% = full unit height */
  // layout constants
  const blockGap = 4;
  const paddingVert = 8;

  /* Calculate stacked content height (sum of rows considering proportional heights) */
  const contentHeight = useMemo(() => {
    if (layoutItems.length === 0) return SWIMLANE_HEIGHT * 0.4;

    /* For each row, find the tallest block */
    const rowHeights: number[] = [];
    for (const { block, row } of layoutItems) {
      const h = blockHeight(block.percent);
      if (!rowHeights[row] || h > rowHeights[row]) {
        rowHeights[row] = h;
      }
    }
    const totalHeight = rowHeights.reduce((sum, h) => sum + h + blockGap, 0);
    return Math.max(paddingVert * 2 + totalHeight, SWIMLANE_HEIGHT * 0.4);
  }, [layoutItems]);

  /* Check for overbooking (any week > 100%) */
  const isOverbooked = useMemo(() => {
    return weeks.some((week) => {
      let total = 0;
      for (const block of personBlocks) {
        const bStart = parseISO(block.startDate);
        const bEnd = parseISO(block.endDate);
        if (bStart <= week.endDate && bEnd >= week.startDate) {
          total += block.percent;
        }
      }
      return total > 100;
    });
  }, [weeks, personBlocks]);

  /* Today marker offset */
  const todayOffset = dateToPixelOffset(new Date(), timelineStart, dayWidth);
  const showToday = todayOffset >= 0 && todayOffset <= totalWidth;

  /* Double-click handler: determine date from click position */
  const handleDoubleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onDoubleClick) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const daysFromStart = Math.floor(x / dayWidth);
    const clickDate = addDays(timelineStart, daysFromStart);
    onDoubleClick(person.id, clickDate);
  };

  /* Right-click on empty area → "New block here" */
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>) => {
    // Only handle if target is the content area itself (not a block)
    if ((e.target as HTMLElement).closest('.block')) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const daysFromStart = Math.floor(x / dayWidth);
    const clickDate = addDays(timelineStart, daysFromStart);
    // Dispatch to parent via custom event or prop — we emit a DOM event
    const event = new CustomEvent('swimlane-context', {
      bubbles: true,
      detail: { personId: person.id, x: e.clientX, y: e.clientY, date: clickDate },
    });
    e.currentTarget.dispatchEvent(event);
  };

  return (
    <div>
      <div
        className={`swimlane${index !== undefined && index % 2 === 1 ? ' swimlane--alt' : ''}${isOverbooked ? ' swimlane--overbooked' : ''}`}
      >
        {/* Person label */}
        <div className="swimlane__label">
          <div
            className="swimlane__avatar"
            style={{ backgroundColor: avatarColor }}
          >
            {person.name.charAt(0)}
          </div>
          <span>{person.name}</span>
        </div>

        {/* Content area */}
        <div
          className="swimlane__content"
          style={{ height: contentHeight, width: totalWidth }}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleContextMenu}
        >
          {/* Week grid lines */}
          {weeks.map((week, i) => (
            <div
              key={`grid-${week.year}-${week.weekNumber}`}
              className="swimlane__week-grid-line"
              style={{ left: i * weekWidth }}
            />
          ))}

          {/* Unavailable periods */}
          {personUnavailable.map((u) => {
            const uLeft = dateToPixelOffset(
              parseISO(u.startDate),
              timelineStart,
              dayWidth,
            );
            const uRight = dateToPixelOffset(
              parseISO(u.endDate),
              timelineStart,
              dayWidth,
            );
            const uWidth = uRight - uLeft + dayWidth; // include end day
            return (
              <div
                key={u.id}
                className="swimlane__unavailable"
                style={{ left: uLeft, width: Math.max(uWidth, dayWidth) }}
                onClick={(e) => {
                  e.stopPropagation();
                  onEditUnavailable?.(u);
                }}
              >
                <span className="swimlane__unavailable-label">{u.label}</span>
              </div>
            );
          })}

          {/* Blocks — height proportional to percent */}
          <div className="swimlane__blocks">
            {(() => {
              /* Precompute cumulative top offset per row */
              const rowTops: number[] = [];
              const rowMaxHeights: number[] = [];
              for (const { block, row } of layoutItems) {
                const h = blockHeight(block.percent);
                if (rowMaxHeights[row] === undefined || h > rowMaxHeights[row]) {
                  rowMaxHeights[row] = h;
                }
              }
              let cumTop = paddingVert;
              for (let r = 0; r <= (rowMaxHeights.length - 1); r++) {
                rowTops[r] = cumTop;
                cumTop += (rowMaxHeights[r] || 0) + blockGap;
              }

              return layoutItems.map(({ block, row }, blockIndex) => {
                const bLeft = dateToPixelOffset(
                  parseISO(block.startDate),
                  timelineStart,
                  dayWidth,
                );
                const bRight = dateToPixelOffset(
                  parseISO(block.endDate),
                  timelineStart,
                  dayWidth,
                );
                const bWidth = bRight - bLeft + dayWidth;
                const bTop = rowTops[row] || paddingVert;
                const bHeight = blockHeight(block.percent);

                return (
                  <div
                    key={block.id}
                    style={{ position: 'absolute', top: bTop, left: 0 }}
                  >
                    <BlockElement
                      block={block}
                      left={bLeft}
                      width={Math.max(bWidth, 8)}
                      height={bHeight}
                      animationIndex={(index ?? 0) * 4 + blockIndex}
                      selected={selectedBlockId === block.id}
                      onEdit={onEditBlock}
                      onDragStart={onDragStart}
                      onResizeStart={onResizeStart}
                      onContextMenu={onBlockContextMenu}
                      onPercentChange={onPercentChange}
                    />
                  </div>
                );
              });
            })()}
          </div>

          {/* Today marker in swimlane */}
          {showToday && (
            <div className="swimlane__today-marker" style={{ left: todayOffset }} />
          )}
        </div>
      </div>

      {/* Capacity bar below the swimlane */}
      <CapacityBar
        personId={person.id}
        blocks={blocks}
        weeks={weeks}
        dayWidth={dayWidth}
        timelineStart={timelineStart}
      />
    </div>
  );
}
