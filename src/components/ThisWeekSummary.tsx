import { useMemo } from 'react';
import type { CalendarData } from '../types/index.ts';
import { getWeekBreakdown, calculateWeeklyCapacity, getCapacityColor } from '../utils/capacity.ts';
import { getWeekInfo } from '../utils/dates.ts';
import './Dialogs.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ThisWeekSummaryProps {
  data: CalendarData;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ThisWeekSummary({ data }: ThisWeekSummaryProps) {
  const today = useMemo(() => new Date(), []);
  const weekInfo = useMemo(() => getWeekInfo(today), [today]);

  const personSummaries = useMemo(() => {
    return data.people.map((person) => {
      const breakdown = getWeekBreakdown(data.blocks, person.id, weekInfo.startDate);
      const total = calculateWeeklyCapacity(data.blocks, person.id, weekInfo.startDate);
      const capacityColor = getCapacityColor(total);

      return {
        person,
        breakdown,
        total,
        capacityColor,
      };
    });
  }, [data, weekInfo]);

  return (
    <div className="week-summary">
      <div className="week-summary__header">
        <h2 className="week-summary__title">
          Denne uken (uke {weekInfo.weekNumber})
        </h2>
      </div>

      <div className="week-summary__people">
        {personSummaries.map(({ person, breakdown, total, capacityColor }) => (
          <div key={person.id} className="week-summary__person">
            <span className="week-summary__person-name">{person.name}:</span>
            <span className="week-summary__person-blocks">
              {breakdown.length === 0 ? (
                <em>Ingen blokker</em>
              ) : (
                breakdown
                  .map((entry) => `${entry.block.title} ${entry.percent}%`)
                  .join(' + ')
              )}
            </span>
            <span className="week-summary__person-total">
              = {total}%
              <span
                className={`week-summary__indicator week-summary__indicator--${capacityColor}`}
                aria-label={
                  capacityColor === 'green'
                    ? 'Normal kapasitet'
                    : capacityColor === 'yellow'
                      ? 'Nesten full kapasitet'
                      : 'Overbooket'
                }
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
