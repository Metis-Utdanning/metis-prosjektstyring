import { useMemo } from 'react';
import type { CalendarData } from '../types/index.ts';
import { getWeekInfo, formatDateShort } from '../utils/dates.ts';
import { calculateWeeklyCapacity, getCapacityColor, getWeekBreakdown } from '../utils/capacity.ts';
import './Dialogs.css';

interface PresentationDashboardProps {
  data: CalendarData;
}

const COLOR_MAP = {
  green: '#16a34a',
  yellow: '#ca8a04',
  red: '#dc2626',
} as const;

export function PresentationDashboard({ data }: PresentationDashboardProps) {
  const today = useMemo(() => new Date(), []);
  const weekInfo = useMemo(() => getWeekInfo(today), [today]);

  const personStats = useMemo(() => {
    return data.people.map((person) => {
      const total = calculateWeeklyCapacity(data.blocks, person.id, weekInfo.startDate);
      const color = getCapacityColor(total);
      const breakdown = getWeekBreakdown(data.blocks, person.id, weekInfo.startDate);
      return { person, total, color, breakdown };
    });
  }, [data, weekInfo]);

  return (
    <div className="presentation-dashboard">
      <div className="presentation-dashboard__header">
        <span className="presentation-dashboard__title">Kapasitet uke {weekInfo.weekNumber}</span>
        <span className="presentation-dashboard__date">
          {formatDateShort(weekInfo.startDate)} – {formatDateShort(weekInfo.endDate)}
        </span>
      </div>
      <div className="presentation-dashboard__cards">
        {personStats.map(({ person, total, color, breakdown }) => (
          <div key={person.id} className="presentation-dashboard__card">
            <div className="presentation-dashboard__person">{person.name}</div>
            <div
              className="presentation-dashboard__percent"
              style={{ color: COLOR_MAP[color] }}
            >
              {total}%
            </div>
            <div className="presentation-dashboard__bar">
              <div
                className="presentation-dashboard__bar-fill"
                style={{
                  width: `${Math.min(total, 150)}%`,
                  maxWidth: '100%',
                  background: COLOR_MAP[color],
                }}
              />
            </div>
            <div className="presentation-dashboard__breakdown">
              {breakdown.map(({ block, percent }) => (
                <span key={block.id} className="presentation-dashboard__tag">
                  <span
                    className="presentation-dashboard__tag-dot"
                    style={{ background: block.color }}
                  />
                  {block.title} {percent}%
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
