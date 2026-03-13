import { useMemo } from 'react';
import type { Milestone } from '../types/index.ts';
import { dateToPixelOffset, parseISO } from '../utils/dates.ts';
import './Timeline.css';

interface MilestoneRowProps {
  milestones: Milestone[];
  dayWidth: number;
  timelineStart: Date;
}

export default function MilestoneRow({
  milestones,
  dayWidth,
  timelineStart,
}: MilestoneRowProps) {
  const positioned = useMemo(
    () =>
      milestones.map((ms) => ({
        ...ms,
        offset: dateToPixelOffset(parseISO(ms.date), timelineStart, dayWidth),
      })),
    [milestones, dayWidth, timelineStart],
  );

  return (
    <div className="milestone-row">
      <div className="milestone-row__label">Milepæler</div>
      {positioned.map((ms) => (
        <div
          key={ms.id}
          className="milestone-row__marker"
          style={{ left: ms.offset }}
          title={ms.description ?? ms.title}
        >
          <span className="milestone-row__diamond" aria-hidden="true">
            ◆
          </span>
          <span className="milestone-row__title">{ms.title}</span>
        </div>
      ))}
    </div>
  );
}
