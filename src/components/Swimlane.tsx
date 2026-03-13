import { useMemo, type PointerEvent as ReactPointerEvent } from 'react';
import type { Person, Block, Unavailable, WeekInfo } from '../types/index.ts';
import { dateToPixelOffset, parseISO } from '../utils/dates.ts';
import { SWIMLANE_HEIGHT } from '../utils/constants.ts';
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
  onEditBlock?: (block: Block) => void;
  onDragStart?: (e: ReactPointerEvent<HTMLDivElement>, block: Block) => void;
  onResizeStart?: (
    e: ReactPointerEvent<HTMLDivElement>,
    block: Block,
    edge: 'start' | 'end',
  ) => void;
  onDoubleClick?: (personId: string, date: Date) => void;
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

  const rows: string[][] = []; // each row tracks endDates of placed blocks

  return sorted.map((block) => {
    const blockStart = block.startDate;

    /* Find first row where this block fits (no overlap) */
    let placed = -1;
    for (let r = 0; r < rows.length; r++) {
      const lastEnd = rows[r][rows[r].length - 1];
      if (lastEnd < blockStart) {
        placed = r;
        break;
      }
    }

    if (placed === -1) {
      placed = rows.length;
      rows.push([]);
    }

    rows[placed].push(block.endDate);
    return { block, row: placed };
  });
}

export default function Swimlane({
  person,
  blocks,
  unavailable,
  weeks,
  dayWidth,
  timelineStart,
  onEditBlock,
  onDragStart,
  onResizeStart,
  onDoubleClick,
}: SwimlaneProps) {
  const weekWidth = dayWidth * 7;
  const totalWidth = weeks.length * weekWidth;

  /* Filter blocks for this person */
  const personBlocks = useMemo(
    () => blocks.filter((b) => b.person === person.id),
    [blocks, person.id],
  );

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

  /* Compute max row count to size the swimlane */
  const maxRow = useMemo(
    () => (layoutItems.length > 0 ? Math.max(...layoutItems.map((l) => l.row)) : -1),
    [layoutItems],
  );

  const rowCount = maxRow + 1;
  const blockRowHeight = 28;
  const blockGap = 4;
  const paddingVert = 8;
  const contentHeight = Math.max(
    paddingVert * 2 + rowCount * (blockRowHeight + blockGap),
    SWIMLANE_HEIGHT * 0.4,
  );

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
    const clickDate = new Date(timelineStart);
    clickDate.setDate(clickDate.getDate() + daysFromStart);
    onDoubleClick(person.id, clickDate);
  };

  return (
    <div>
      <div
        className={`swimlane${isOverbooked ? ' swimlane--overbooked' : ''}`}
      >
        {/* Person label */}
        <div className="swimlane__label">{person.name}</div>

        {/* Content area */}
        <div
          className="swimlane__content"
          style={{ height: contentHeight, width: totalWidth }}
          onDoubleClick={handleDoubleClick}
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
              >
                <span className="swimlane__unavailable-label">{u.label}</span>
              </div>
            );
          })}

          {/* Blocks */}
          <div className="swimlane__blocks">
            {layoutItems.map(({ block, row }) => {
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
              const bWidth = bRight - bLeft + dayWidth; // include end day
              const bTop = paddingVert + row * (blockRowHeight + blockGap);

              return (
                <div
                  key={block.id}
                  style={{ position: 'absolute', top: bTop, left: 0, right: 0 }}
                >
                  <BlockElement
                    block={block}
                    left={bLeft}
                    width={Math.max(bWidth, 8)}
                    height={blockRowHeight}
                    onEdit={onEditBlock}
                    onDragStart={onDragStart}
                    onResizeStart={onResizeStart}
                  />
                </div>
              );
            })}
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
