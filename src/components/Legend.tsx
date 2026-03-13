import { useMemo } from 'react';
import type { Block } from '../types/index.ts';
import './Timeline.css';

interface LegendProps {
  blocks: Block[];
}

interface LegendEntry {
  key: string;
  title: string;
  color: string;
  status: Block['status'];
}

export default function Legend({ blocks }: LegendProps) {
  const entries = useMemo<LegendEntry[]>(() => {
    const seen = new Set<string>();
    const result: LegendEntry[] = [];

    for (const block of blocks) {
      const key = `${block.color}-${block.title}-${block.status}`;
      if (seen.has(key)) continue;
      seen.add(key);
      result.push({
        key,
        title: block.title,
        color: block.color,
        status: block.status,
      });
    }

    /* Sort: active first, then planned, then done */
    const statusOrder: Record<Block['status'], number> = {
      active: 0,
      planned: 1,
      done: 2,
    };
    result.sort((a, b) => statusOrder[a.status] - statusOrder[b.status]);

    return result;
  }, [blocks]);

  if (entries.length === 0) return null;

  return (
    <div className="legend">
      {entries.map((entry) => {
        const dotClass =
          entry.status === 'planned'
            ? ' legend__dot--planned'
            : entry.status === 'done'
              ? ' legend__dot--done'
              : ' legend__dot--active';

        const dotStyle =
          entry.status === 'planned'
            ? { borderColor: entry.color }
            : { backgroundColor: entry.color };

        return (
          <div key={entry.key} className="legend__item">
            <span
              className={`legend__dot${dotClass}`}
              style={dotStyle}
            />
            <span className="legend__label">{entry.title}</span>
            {entry.status !== 'active' && (
              <span className="legend__status">
                ({entry.status === 'planned' ? 'planlagt' : 'ferdig'})
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
