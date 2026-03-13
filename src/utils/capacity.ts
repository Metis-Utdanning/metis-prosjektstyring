import { parseISO, startOfISOWeek, addDays } from 'date-fns';
import type { Block } from '../types/index.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CapacityColor = 'green' | 'yellow' | 'red';

export interface WeekBreakdownEntry {
  block: Block;
  percent: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check whether a block overlaps a given Mon-Sun week.
 * The week is defined by its Monday (weekStart). We consider the block
 * active during the week if there is any overlap between [blockStart, blockEnd]
 * and [weekStart, weekEnd] (inclusive).
 */
function blockOverlapsWeek(block: Block, weekStart: Date): boolean {
  const weekEnd = addDays(weekStart, 6); // Sunday
  const blockStart = parseISO(block.startDate);
  const blockEnd = parseISO(block.endDate);

  return blockStart <= weekEnd && blockEnd >= weekStart;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Return the list of blocks contributing capacity for a person in a given
 * ISO week, together with each block's percent allocation.
 */
export function getWeekBreakdown(
  blocks: Block[],
  personId: string,
  weekStart: Date,
): WeekBreakdownEntry[] {
  const monday = startOfISOWeek(weekStart);

  return blocks
    .filter((b) => b.person === personId && blockOverlapsWeek(b, monday))
    .map((b) => ({ block: b, percent: b.percent }));
}

/**
 * Sum up the total percent allocation for a person in a given ISO week.
 */
export function calculateWeeklyCapacity(
  blocks: Block[],
  personId: string,
  weekStart: Date,
): number {
  return getWeekBreakdown(blocks, personId, weekStart).reduce(
    (sum, entry) => sum + entry.percent,
    0,
  );
}

/**
 * Map a capacity percentage to a traffic-light color:
 * - green  : 0-80 %
 * - yellow : 81-100 %
 * - red    : > 100 %
 */
export function getCapacityColor(percent: number): CapacityColor {
  if (percent <= 80) return 'green';
  if (percent <= 100) return 'yellow';
  return 'red';
}

/**
 * Quick boolean check: is a person overbooked (>100 %) for a given week?
 */
export function isOverbooked(
  blocks: Block[],
  personId: string,
  weekStart: Date,
): boolean {
  return calculateWeeklyCapacity(blocks, personId, weekStart) > 100;
}
