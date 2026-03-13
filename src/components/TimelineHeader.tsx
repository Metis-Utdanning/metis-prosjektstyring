import { useMemo } from 'react';
import type { WeekInfo } from '../types/index.ts';
import {
  dateToPixelOffset,
  getMonthName,
  formatWeekLabel,
  getWeekInfo,
} from '../utils/dates.ts';
// WEEK_COLUMN_WIDTH available from constants if needed
import './Timeline.css';

interface TimelineHeaderProps {
  weeks: WeekInfo[];
  dayWidth: number;
  timelineStart: Date;
}

interface MonthSpan {
  name: string;
  widthPx: number;
}

export default function TimelineHeader({
  weeks,
  dayWidth,
  timelineStart,
}: TimelineHeaderProps) {
  const weekWidth = dayWidth * 7;

  /* Group consecutive weeks by month name to produce month spans */
  const monthSpans = useMemo<MonthSpan[]>(() => {
    if (weeks.length === 0) return [];

    const spans: MonthSpan[] = [];
    let currentMonth = getMonthName(weeks[0].startDate);
    let currentCount = 1;

    for (let i = 1; i < weeks.length; i++) {
      const month = getMonthName(weeks[i].startDate);
      if (month === currentMonth) {
        currentCount++;
      } else {
        spans.push({ name: currentMonth, widthPx: currentCount * weekWidth });
        currentMonth = month;
        currentCount = 1;
      }
    }
    spans.push({ name: currentMonth, widthPx: currentCount * weekWidth });

    return spans;
  }, [weeks, weekWidth]);

  /* Current week number for highlighting */
  const currentWeekInfo = useMemo(() => getWeekInfo(new Date()), []);

  /* Today marker pixel offset */
  const todayOffset = useMemo(
    () => dateToPixelOffset(new Date(), timelineStart, dayWidth),
    [timelineStart, dayWidth],
  );

  const totalWidth = weeks.length * weekWidth;
  const showTodayMarker = todayOffset >= 0 && todayOffset <= totalWidth;

  return (
    <div className="timeline-header" style={{ width: totalWidth }}>
      {/* Month row */}
      <div className="timeline-header__months">
        {monthSpans.map((span, i) => (
          <div
            key={`${span.name}-${i}`}
            className="timeline-header__month"
            style={{ width: span.widthPx }}
          >
            {span.name}
          </div>
        ))}
      </div>

      {/* Week row */}
      <div className="timeline-header__weeks">
        {weeks.map((week) => {
          const isCurrent =
            week.weekNumber === currentWeekInfo.weekNumber &&
            week.year === currentWeekInfo.year;
          return (
            <div
              key={`w${week.year}-${week.weekNumber}`}
              className={
                'timeline-header__week' +
                (isCurrent ? ' timeline-header__week--current' : '')
              }
              style={{ width: weekWidth }}
            >
              {formatWeekLabel(week)}
            </div>
          );
        })}
      </div>

      {/* Today marker */}
      {showTodayMarker && (
        <div
          className="timeline-header__today-marker"
          style={{ left: todayOffset }}
        />
      )}
    </div>
  );
}
