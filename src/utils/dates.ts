import {
  startOfISOWeek,
  endOfISOWeek,
  getISOWeek,
  getISOWeekYear,
  addWeeks,
  addDays,
  differenceInCalendarDays,
  format,
  parseISO,
  isSameDay,
  isWithinInterval,
  eachWeekOfInterval,
  startOfDay,
} from 'date-fns';
import { nb } from 'date-fns/locale';
import type { WeekInfo } from '../types';

export function getWeekInfo(date: Date): WeekInfo {
  const start = startOfISOWeek(date);
  const end = endOfISOWeek(date);
  return {
    weekNumber: getISOWeek(date),
    year: getISOWeekYear(date),
    startDate: start,
    endDate: end,
  };
}

export function getWeeksInRange(start: Date, end: Date): WeekInfo[] {
  const weekStarts = eachWeekOfInterval(
    { start, end },
    { weekStartsOn: 1 }
  );
  return weekStarts.map((ws) => getWeekInfo(ws));
}

export function dateToPixelOffset(
  date: Date,
  timelineStart: Date,
  dayWidth: number
): number {
  const days = differenceInCalendarDays(date, timelineStart);
  return days * dayWidth;
}

export function pixelOffsetToDate(
  px: number,
  timelineStart: Date,
  dayWidth: number
): Date {
  const days = Math.round(px / dayWidth);
  return addDays(timelineStart, days);
}

export function snapToDay(date: Date): Date {
  return startOfDay(date);
}

export function snapToWeek(date: Date): Date {
  return startOfISOWeek(date);
}

export function formatDateShort(date: Date): string {
  return format(date, 'd. MMM', { locale: nb });
}

export function formatWeekLabel(week: WeekInfo): string {
  return `Uke ${week.weekNumber}`;
}

export function formatMonthYear(date: Date): string {
  return format(date, 'MMMM yyyy', { locale: nb });
}

export function getMonthName(date: Date): string {
  return format(date, 'MMMM', { locale: nb });
}

export function isDateInRange(date: Date, start: string, end: string): boolean {
  return isWithinInterval(date, {
    start: parseISO(start),
    end: parseISO(end),
  });
}

export function getWeekdayDates(week: WeekInfo): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 5; i++) {
    days.push(addDays(week.startDate, i));
  }
  return days;
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export { parseISO, addWeeks, addDays, differenceInCalendarDays, format, startOfISOWeek };
