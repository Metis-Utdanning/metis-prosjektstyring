import { useMemo, useState } from 'react';
import { parseISO } from '../utils/dates.ts';
import type { Block, WeekInfo } from '../types/index.ts';
import './Timeline.css';

interface CapacityBarProps {
  personId: string;
  blocks: Block[];
  weeks: WeekInfo[];
  dayWidth: number;
  timelineStart: Date;
}

interface WeekCapacity {
  total: number;
  breakdown: { title: string; percent: number; color: string }[];
}

/**
 * Determine whether a block overlaps a given week interval.
 * A block overlaps if its range [blockStart, blockEnd] intersects [weekStart, weekEnd].
 */
function blockOverlapsWeek(block: Block, week: WeekInfo): boolean {
  const blockStart = parseISO(block.startDate);
  const blockEnd = parseISO(block.endDate);
  return blockStart <= week.endDate && blockEnd >= week.startDate;
}

export default function CapacityBar({
  personId,
  blocks,
  weeks,
  dayWidth,
}: CapacityBarProps) {
  const weekWidth = dayWidth * 7;

  /* Filter blocks for this person */
  const personBlocks = useMemo(
    () => blocks.filter((b) => b.person === personId),
    [blocks, personId],
  );

  /* Compute capacity per week */
  const weekCapacities = useMemo<WeekCapacity[]>(() => {
    return weeks.map((week) => {
      let total = 0;
      const breakdown: WeekCapacity['breakdown'] = [];

      for (const block of personBlocks) {
        if (blockOverlapsWeek(block, week)) {
          total += block.percent;
          breakdown.push({
            title: block.title,
            percent: block.percent,
            color: block.color,
          });
        }
      }

      return { total, breakdown };
    });
  }, [weeks, personBlocks]);

  return (
    <div className="capacity-bar">
      {weekCapacities.map((cap, i) => (
        <CapacityCell
          key={`cap-${weeks[i].year}-${weeks[i].weekNumber}`}
          capacity={cap}
          width={weekWidth}
        />
      ))}
    </div>
  );
}

/* ---------- Individual cell ---------- */

interface CapacityCellProps {
  capacity: WeekCapacity;
  width: number;
}

function CapacityCell({ capacity, width }: CapacityCellProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const { total, breakdown } = capacity;

  let colorClass = ' capacity-bar__cell--empty';
  if (total > 0 && total <= 80) colorClass = ' capacity-bar__cell--green';
  else if (total > 80 && total <= 100) colorClass = ' capacity-bar__cell--yellow';
  else if (total > 100) colorClass = ' capacity-bar__cell--red';

  return (
    <div
      className={`capacity-bar__cell${colorClass}`}
      style={{ width }}
      onPointerEnter={() => setShowTooltip(true)}
      onPointerLeave={() => setShowTooltip(false)}
    >
      {total > 0 ? `${total}%` : ''}

      {showTooltip && breakdown.length > 0 && (
        <div className="capacity-bar__tooltip">
          {breakdown.map((item, idx) => (
            <div key={idx} className="capacity-bar__tooltip-line">
              <span
                className="capacity-bar__tooltip-dot"
                style={{ backgroundColor: item.color }}
              />
              <span>
                {item.title} {item.percent}%
              </span>
            </div>
          ))}
          <div className="capacity-bar__tooltip-total">
            = {total}%
          </div>
        </div>
      )}
    </div>
  );
}
