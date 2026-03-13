import { useMemo } from 'react';
import type { WeekInfo } from '../types/index.ts';
import {
  dateToPixelOffset,
  getMonthName,
  formatWeekLabel,
  getWeekInfo,
} from '../utils/dates.ts';
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

interface YearSpan {
  year: number;
  widthPx: number;
}

export default function TimelineHeader({
  weeks,
  dayWidth,
  timelineStart,
}: TimelineHeaderProps) {
  const weekWidth = dayWidth * 7;

  /* Group consecutive weeks by calendar year */
  const yearSpans = useMemo<YearSpan[]>(() => {
    if (weeks.length === 0) return [];
    const spans: YearSpan[] = [];
    let currentYear = weeks[0].startDate.getFullYear();
    let currentCount = 1;

    for (let i = 1; i < weeks.length; i++) {
      const year = weeks[i].startDate.getFullYear();
      if (year === currentYear) {
        currentCount++;
      } else {
        spans.push({ year: currentYear, widthPx: currentCount * weekWidth });
        currentYear = year;
        currentCount = 1;
      }
    }
    spans.push({ year: currentYear, widthPx: currentCount * weekWidth });
    return spans;
  }, [weeks, weekWidth]);

  const showYearRow = yearSpans.length > 1;

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
    <div className="timeline-header" style={{ width: totalWidth + 120 }}>
      {/* Sticky dark corner for the label column */}
      <div className="timeline-header__corner" />

      {/* Content wrapper — sits next to the corner in the flex row */}
      <div style={{ position: 'relative', flex: 1 }}>
        {/* Year row — only when timeline spans multiple years */}
        {showYearRow && (
          <div className="timeline-header__years">
            {yearSpans.map((span) => (
              <div
                key={`year-${span.year}`}
                className="timeline-header__year"
                style={{ width: span.widthPx }}
              >
                {span.year}
              </div>
            ))}
          </div>
        )}

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
    </div>
  );
}
