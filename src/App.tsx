import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import type { CalendarData, Block, Milestone, Unavailable, ViewMode, WeekInfo } from './types';
import { DEFAULT_DATA, PALETTE, WEEK_COLUMN_WIDTH, SWIMLANE_HEIGHT, GITHUB_OWNER, GITHUB_DATA_REPO, GITHUB_DATA_FILE } from './utils/constants';
import { getWeeksInRange, getWeekInfo, dateToPixelOffset, formatWeekLabel, getMonthName, formatDateShort, getWeekdayDates } from './utils/dates';
import { startOfISOWeek, addWeeks, addDays, parseISO, differenceInCalendarDays } from './utils/dates';

// ---------------------------------------------------------------------------
// GitHub API helpers
// ---------------------------------------------------------------------------

interface GitHubFileResponse {
  content: string;
  sha: string;
}

async function fetchCalendarData(token: string | null): Promise<{ data: CalendarData; sha: string }> {
  const headers: Record<string, string> = { Accept: 'application/vnd.github.v3+json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_DATA_REPO}/contents/${GITHUB_DATA_FILE}`,
    { headers },
  );

  if (!res.ok) {
    // Try localStorage fallback
    const cached = localStorage.getItem('kapasitet-cache');
    if (cached) {
      const parsed = JSON.parse(cached) as CalendarData;
      return { data: parsed, sha: '' };
    }
    throw new Error(`GitHub API ${res.status}: ${res.statusText}`);
  }

  const json = (await res.json()) as GitHubFileResponse;
  const decoded = atob(json.content);
  const data = JSON.parse(decoded) as CalendarData;

  // Cache for offline fallback
  localStorage.setItem('kapasitet-cache', JSON.stringify(data));

  return { data, sha: json.sha };
}

async function saveCalendarData(
  data: CalendarData,
  sha: string,
  token: string,
  message: string,
): Promise<string> {
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

  const body: Record<string, string> = { message, content };
  if (sha) body.sha = sha;

  const res = await fetch(
    `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_DATA_REPO}/contents/${GITHUB_DATA_FILE}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github.v3+json',
      },
      body: JSON.stringify(body),
    },
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Lagring feilet (${res.status}): ${err}`);
  }

  const result = await res.json();
  return result.content.sha as string;
}

// ---------------------------------------------------------------------------
// Capacity calculation
// ---------------------------------------------------------------------------

function getWeekCapacity(
  personId: string,
  week: WeekInfo,
  blocks: Block[],
): { total: number; breakdown: { title: string; percent: number; color: string }[] } {
  const breakdown: { title: string; percent: number; color: string }[] = [];
  let total = 0;

  for (const block of blocks) {
    if (block.person !== personId) continue;
    const blockStart = parseISO(block.startDate);
    const blockEnd = parseISO(block.endDate);

    // Check if block overlaps this week
    if (blockEnd < week.startDate || blockStart > week.endDate) continue;

    breakdown.push({ title: block.title, percent: block.percent, color: block.color });
    total += block.percent;
  }

  return { total, breakdown };
}

function capacityLevel(total: number): 'green' | 'yellow' | 'red' {
  if (total <= 80) return 'green';
  if (total <= 100) return 'yellow';
  return 'red';
}

// ---------------------------------------------------------------------------
// Placeholder components (to be replaced by actual component files)
// ---------------------------------------------------------------------------

function TokenPrompt({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <dialog open className="dialog">
      <h2>Rediger-modus</h2>
      <p>Lim inn en GitHub Personal Access Token med tilgang til {GITHUB_DATA_REPO}:</p>
      <div className="dialog__field">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="ghp_..."
          style={{ width: '100%', padding: '8px' }}
        />
      </div>
      <div className="dialog__actions">
        <button onClick={() => onSubmit(value)} disabled={!value.startsWith('ghp_') && !value.startsWith('github_pat_')}>
          Aktiver
        </button>
      </div>
    </dialog>
  );
}

function Toolbar({
  isEditorMode,
  isPresentationMode,
  unsavedCount,
  onTogglePresentation,
  onSave,
  onRequestEdit,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  viewMode,
  onBackToOverview,
}: {
  isEditorMode: boolean;
  isPresentationMode: boolean;
  unsavedCount: number;
  onTogglePresentation: () => void;
  onSave: () => void;
  onRequestEdit: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  viewMode: ViewMode;
  onBackToOverview: () => void;
}) {
  return (
    <div className="toolbar">
      <strong>Metis Kapasitetskalender</strong>

      {viewMode === 'week' && (
        <button onClick={onBackToOverview}>&larr; Oversikt</button>
      )}

      <div style={{ flex: 1 }} />

      {isEditorMode && (
        <>
          <button onClick={onUndo} disabled={!canUndo} title="Angre (Ctrl+Z)">
            Angre
          </button>
          <button onClick={onRedo} disabled={!canRedo} title="Gjenta (Ctrl+Shift+Z)">
            Gjenta
          </button>
        </>
      )}

      {isEditorMode && unsavedCount > 0 && (
        <button onClick={onSave} className="toolbar__save-btn">
          Lagre til GitHub
          <span className="toolbar__badge">{unsavedCount}</span>
        </button>
      )}

      {!isEditorMode && !isPresentationMode && (
        <button onClick={onRequestEdit}>Rediger</button>
      )}

      <button onClick={onTogglePresentation}>
        {isPresentationMode ? 'Avslutt presentasjon' : 'Presentasjon'}
      </button>
    </div>
  );
}

function ThisWeekSummary({
  data,
  currentWeek,
  onWeekClick,
}: {
  data: CalendarData;
  currentWeek: WeekInfo;
  onWeekClick: (week: WeekInfo) => void;
}) {
  return (
    <div className="this-week" onClick={() => onWeekClick(currentWeek)} style={{ cursor: 'pointer' }}>
      <strong>Denne uken (uke {currentWeek.weekNumber})</strong>
      <span style={{ marginLeft: 8, fontSize: 12, color: '#6B7280' }}>
        {formatDateShort(currentWeek.startDate)} &ndash; {formatDateShort(currentWeek.endDate)}
      </span>
      <div style={{ display: 'flex', gap: 24, marginTop: 8 }}>
        {data.people.map((person) => {
          const cap = getWeekCapacity(person.id, currentWeek, data.blocks);
          const level = capacityLevel(cap.total);
          const emoji = level === 'green' ? '\u{1F7E2}' : level === 'yellow' ? '\u{1F7E1}' : '\u{1F534}';
          return (
            <div key={person.id}>
              <strong>{person.name}:</strong>{' '}
              {cap.breakdown.length === 0
                ? 'Ingen oppgaver'
                : cap.breakdown.map((b) => `${b.title} ${b.percent}%`).join(' + ')}
              {' = '}
              {cap.total}% {emoji}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TimelineHeader({
  weeks,
  timelineStart,
  dayWidth,
}: {
  weeks: WeekInfo[];
  timelineStart: Date;
  dayWidth: number;
}) {
  // Group weeks by month
  const months: { name: string; startPx: number; widthPx: number }[] = [];
  let currentMonth = '';
  for (const week of weeks) {
    const monthName = getMonthName(week.startDate);
    if (monthName !== currentMonth) {
      currentMonth = monthName;
      const px = dateToPixelOffset(week.startDate, timelineStart, dayWidth);
      months.push({ name: monthName, startPx: px, widthPx: 0 });
    }
    const last = months[months.length - 1];
    last.widthPx = dateToPixelOffset(week.endDate, timelineStart, dayWidth) - last.startPx + dayWidth;
  }

  return (
    <div className="timeline-header">
      <div className="timeline-header__months" style={{ paddingLeft: 120 }}>
        {months.map((m) => (
          <div
            key={`${m.name}-${m.startPx}`}
            className="timeline-header__month"
            style={{ width: m.widthPx, minWidth: 0, flexShrink: 0 }}
          >
            {m.name}
          </div>
        ))}
      </div>
      <div className="timeline-header__weeks" style={{ paddingLeft: 120 }}>
        {weeks.map((w) => (
          <div
            key={`${w.year}-${w.weekNumber}`}
            className="timeline-header__week"
            style={{ width: dayWidth * 7, minWidth: 0, flexShrink: 0 }}
          >
            {formatWeekLabel(w)}
          </div>
        ))}
      </div>
    </div>
  );
}

function BlockElement({
  block,
  timelineStart,
  dayWidth,
  isEditorMode,
  onClick,
}: {
  block: Block;
  timelineStart: Date;
  dayWidth: number;
  isEditorMode: boolean;
  onClick: (block: Block) => void;
}) {
  const left = dateToPixelOffset(parseISO(block.startDate), timelineStart, dayWidth);
  const width = Math.max(
    (differenceInCalendarDays(parseISO(block.endDate), parseISO(block.startDate)) + 1) * dayWidth,
    dayWidth,
  );

  const statusClass =
    block.status === 'planned'
      ? 'block--planned'
      : block.status === 'done'
        ? 'block--done'
        : 'block--active';

  return (
    <div
      className={`block ${statusClass}`}
      style={{
        left,
        width,
        backgroundColor: block.color,
        height: Math.max((block.percent / 100) * SWIMLANE_HEIGHT - 4, 24),
      }}
      onClick={() => onClick(block)}
      title={`${block.title} (${block.percent}%) — ${block.status}`}
    >
      <div className="block__title">
        {block.title} {block.percent}%
      </div>
      {isEditorMode && <div className="block__resize-handle block__resize-handle--end" />}
    </div>
  );
}

function UnavailableElement({
  entry,
  timelineStart,
  dayWidth,
}: {
  entry: Unavailable;
  timelineStart: Date;
  dayWidth: number;
}) {
  const left = dateToPixelOffset(parseISO(entry.startDate), timelineStart, dayWidth);
  const width =
    (differenceInCalendarDays(parseISO(entry.endDate), parseISO(entry.startDate)) + 1) * dayWidth;

  return (
    <div className="unavailable" style={{ left, width }} title={entry.label}>
      <span className="unavailable__label">{entry.label}</span>
    </div>
  );
}

function Swimlane({
  person,
  blocks,
  unavailable,
  weeks,
  timelineStart,
  dayWidth,
  isEditorMode,
  onBlockClick,
  onDoubleClick,
}: {
  person: { id: string; name: string };
  blocks: Block[];
  unavailable: Unavailable[];
  weeks: WeekInfo[];
  timelineStart: Date;
  dayWidth: number;
  isEditorMode: boolean;
  onBlockClick: (block: Block) => void;
  onDoubleClick: (personId: string, date: Date) => void;
}) {
  const personBlocks = blocks.filter((b) => b.person === person.id);
  const personUnavailable = unavailable.filter((u) => u.person === person.id);

  // Stack blocks vertically to avoid overlap
  const sortedBlocks = [...personBlocks].sort(
    (a, b) => parseISO(a.startDate).getTime() - parseISO(b.startDate).getTime(),
  );

  // Capacity bar
  const capacityCells = weeks.map((week) => {
    const cap = getWeekCapacity(person.id, week, blocks);
    return { week, ...cap };
  });

  const isOverbooked = capacityCells.some((c) => c.total > 100);

  return (
    <div className={`swimlane ${isOverbooked ? 'swimlane--overbooked' : ''}`}>
      <div className="swimlane__label">{person.name}</div>
      <div
        className="swimlane__content"
        style={{ minHeight: SWIMLANE_HEIGHT }}
        onDoubleClick={(e) => {
          if (!isEditorMode) return;
          const rect = e.currentTarget.getBoundingClientRect();
          const offsetX = e.clientX - rect.left;
          const days = Math.floor(offsetX / dayWidth);
          const date = addDays(timelineStart, days);
          onDoubleClick(person.id, date);
        }}
      >
        {personUnavailable.map((u) => (
          <UnavailableElement key={u.id} entry={u} timelineStart={timelineStart} dayWidth={dayWidth} />
        ))}
        {sortedBlocks.map((block) => (
          <BlockElement
            key={block.id}
            block={block}
            timelineStart={timelineStart}
            dayWidth={dayWidth}
            isEditorMode={isEditorMode}
            onClick={onBlockClick}
          />
        ))}
      </div>
      <div className="capacity-bar">
        {capacityCells.map((cell) => (
          <div
            key={`${cell.week.year}-${cell.week.weekNumber}`}
            className={`capacity-bar__cell capacity-bar__cell--${capacityLevel(cell.total)}`}
            style={{ width: dayWidth * 7 }}
            title={cell.breakdown.map((b) => `${b.title} ${b.percent}%`).join(' + ') + ` = ${cell.total}%`}
          >
            {cell.total > 0 ? `${cell.total}%` : ''}
          </div>
        ))}
      </div>
    </div>
  );
}

function MilestoneRow({
  milestones,
  timelineStart,
  dayWidth,
  onMilestoneClick,
}: {
  milestones: Milestone[];
  timelineStart: Date;
  dayWidth: number;
  onMilestoneClick: (milestone: Milestone) => void;
}) {
  return (
    <div className="milestone-row" style={{ position: 'relative', height: 32, marginLeft: 120 }}>
      {milestones.map((ms) => {
        const left = dateToPixelOffset(parseISO(ms.date), timelineStart, dayWidth);
        return (
          <div
            key={ms.id}
            className="milestone"
            style={{ left }}
            title={`${ms.title} — ${formatDateShort(parseISO(ms.date))}`}
            onClick={() => onMilestoneClick(ms)}
          >
            <div className="milestone__marker" />
            <span className="milestone__label">{ms.title}</span>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ blocks }: { blocks: Block[] }) {
  // Deduplicate by color+title (active/planned first)
  const seen = new Map<string, { title: string; color: string; status: Block['status'] }>();
  for (const block of blocks) {
    const key = `${block.color}-${block.title}`;
    if (!seen.has(key)) {
      seen.set(key, { title: block.title, color: block.color, status: block.status });
    }
  }

  return (
    <div className="legend">
      {Array.from(seen.values()).map((item) => (
        <div key={`${item.color}-${item.title}`} className="legend__item">
          <span
            className="legend__swatch"
            style={{
              backgroundColor: item.color,
              opacity: item.status === 'planned' ? 0.7 : item.status === 'done' ? 0.8 : 1,
              borderStyle: item.status === 'planned' ? 'dashed' : 'solid',
            }}
          />
          <span>{item.title}</span>
          {item.status === 'planned' && <span style={{ fontSize: 11, color: '#6B7280' }}>(planlagt)</span>}
          {item.status === 'done' && <span style={{ fontSize: 11, color: '#6B7280' }}>(ferdig)</span>}
        </div>
      ))}
    </div>
  );
}

function TodayMarker({
  timelineStart,
  dayWidth,
}: {
  timelineStart: Date;
  dayWidth: number;
}) {
  const left = dateToPixelOffset(new Date(), timelineStart, dayWidth);
  if (left < 0) return null;

  return <div className="today-marker" style={{ left }} />;
}

function BlockDialog({
  block,
  people,
  isNew,
  onApply,
  onDelete,
  onClose,
}: {
  block: Block;
  people: { id: string; name: string }[];
  isNew: boolean;
  onApply: (block: Block) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Block>({ ...block });
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const update = (patch: Partial<Block>) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <dialog ref={dialogRef} className="dialog" onClose={onClose}>
      <h2>{isNew ? 'Ny blokk' : 'Rediger blokk'}</h2>

      <div className="dialog__field">
        <label>Tittel</label>
        <input value={form.title} onChange={(e) => update({ title: e.target.value })} />
      </div>

      <div className="dialog__field">
        <label>Person</label>
        <select value={form.person} onChange={(e) => update({ person: e.target.value })}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="dialog__field">
        <label>Status</label>
        <select value={form.status} onChange={(e) => update({ status: e.target.value as Block['status'] })}>
          <option value="planned">Planlagt</option>
          <option value="active">Aktiv</option>
          <option value="done">Ferdig</option>
        </select>
      </div>

      <div className="dialog__field" style={{ display: 'flex', gap: 12 }}>
        <div>
          <label>Fra</label>
          <input type="date" value={form.startDate} onChange={(e) => update({ startDate: e.target.value })} />
        </div>
        <div>
          <label>Til</label>
          <input type="date" value={form.endDate} onChange={(e) => update({ endDate: e.target.value })} />
        </div>
      </div>

      <div className="dialog__field">
        <label>Prosent</label>
        <input
          type="number"
          min={1}
          max={100}
          value={form.percent}
          onChange={(e) => update({ percent: Number(e.target.value) })}
        />
        <span> %</span>
      </div>

      <div className="dialog__field">
        <label>Farge</label>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {PALETTE.map((color) => (
            <button
              key={color}
              type="button"
              className={`dialog__color-swatch ${form.color === color ? 'dialog__color-swatch--selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => update({ color })}
            />
          ))}
        </div>
      </div>

      <div className="dialog__field">
        <label>Beskrivelse</label>
        <textarea
          value={form.description ?? ''}
          onChange={(e) => update({ description: e.target.value || undefined })}
          rows={3}
        />
      </div>

      <div className="dialog__field">
        <label>Lenker (en per linje)</label>
        <textarea
          value={(form.links ?? []).join('\n')}
          onChange={(e) => {
            const links = e.target.value.split('\n').filter((l) => l.trim());
            update({ links: links.length > 0 ? links : undefined });
          }}
          rows={2}
          placeholder="https://github.com/..."
        />
      </div>

      {!isNew && form.updatedAt && (
        <p style={{ fontSize: 12, color: '#6B7280' }}>
          Sist endret: {form.updatedBy}, {new Date(form.updatedAt).toLocaleString('nb-NO')}
        </p>
      )}

      <div className="dialog__actions">
        {!isNew && (
          <button
            className="dialog__btn dialog__btn--danger"
            onClick={() => {
              onDelete(form.id);
              dialogRef.current?.close();
            }}
          >
            Slett
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => dialogRef.current?.close()}>Avbryt</button>
        <button
          className="dialog__btn dialog__btn--primary"
          onClick={() => {
            onApply(form);
            dialogRef.current?.close();
          }}
        >
          Bruk
        </button>
      </div>
    </dialog>
  );
}

function MilestoneDialog({
  milestone,
  isNew,
  onApply,
  onDelete,
  onClose,
}: {
  milestone: Milestone;
  isNew: boolean;
  onApply: (ms: Milestone) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Milestone>({ ...milestone });
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const update = (patch: Partial<Milestone>) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <dialog ref={dialogRef} className="dialog" onClose={onClose}>
      <h2>{isNew ? 'Ny milepel' : 'Rediger milepel'}</h2>
      <div className="dialog__field">
        <label>Tittel</label>
        <input value={form.title} onChange={(e) => update({ title: e.target.value })} />
      </div>
      <div className="dialog__field">
        <label>Dato</label>
        <input type="date" value={form.date} onChange={(e) => update({ date: e.target.value })} />
      </div>
      <div className="dialog__field">
        <label>Beskrivelse</label>
        <textarea
          value={form.description ?? ''}
          onChange={(e) => update({ description: e.target.value || undefined })}
          rows={3}
        />
      </div>
      <div className="dialog__actions">
        {!isNew && (
          <button className="dialog__btn dialog__btn--danger" onClick={() => { onDelete(form.id); dialogRef.current?.close(); }}>
            Slett
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => dialogRef.current?.close()}>Avbryt</button>
        <button className="dialog__btn dialog__btn--primary" onClick={() => { onApply(form); dialogRef.current?.close(); }}>
          Bruk
        </button>
      </div>
    </dialog>
  );
}

function UnavailableDialog({
  entry,
  people,
  isNew,
  onApply,
  onDelete,
  onClose,
}: {
  entry: Unavailable;
  people: { id: string; name: string }[];
  isNew: boolean;
  onApply: (entry: Unavailable) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}) {
  const [form, setForm] = useState<Unavailable>({ ...entry });
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    dialogRef.current?.showModal();
  }, []);

  const update = (patch: Partial<Unavailable>) => setForm((prev) => ({ ...prev, ...patch }));

  return (
    <dialog ref={dialogRef} className="dialog" onClose={onClose}>
      <h2>{isNew ? 'Ny utilgjengelighet' : 'Rediger utilgjengelighet'}</h2>
      <div className="dialog__field">
        <label>Person</label>
        <select value={form.person} onChange={(e) => update({ person: e.target.value })}>
          {people.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div className="dialog__field">
        <label>Label</label>
        <input value={form.label} onChange={(e) => update({ label: e.target.value })} placeholder="Ferie, Kurs, Permisjon..." />
      </div>
      <div className="dialog__field" style={{ display: 'flex', gap: 12 }}>
        <div>
          <label>Fra</label>
          <input type="date" value={form.startDate} onChange={(e) => update({ startDate: e.target.value })} />
        </div>
        <div>
          <label>Til</label>
          <input type="date" value={form.endDate} onChange={(e) => update({ endDate: e.target.value })} />
        </div>
      </div>
      <div className="dialog__actions">
        {!isNew && (
          <button className="dialog__btn dialog__btn--danger" onClick={() => { onDelete(form.id); dialogRef.current?.close(); }}>
            Slett
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button onClick={() => dialogRef.current?.close()}>Avbryt</button>
        <button className="dialog__btn dialog__btn--primary" onClick={() => { onApply(form); dialogRef.current?.close(); }}>
          Bruk
        </button>
      </div>
    </dialog>
  );
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  // ---- Core state ----
  const [data, setData] = useState<CalendarData | null>(null);
  const [sha, setSha] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>(null);
  const [selectedUnavailableId, setSelectedUnavailableId] = useState<string | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(false);
  const [isEditorMode, setIsEditorMode] = useState(false);
  const [token, setToken] = useState<string | null>(() => sessionStorage.getItem('kapasitet-token'));
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // ---- Undo/redo ----
  const [history, setHistory] = useState<CalendarData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [unsavedCount, setUnsavedCount] = useState(0);

  // ---- New-block prefill state ----
  const [newBlockPrefill, setNewBlockPrefill] = useState<{ person: string; date: string } | null>(null);

  // ---- Computed: timeline range ----
  const today = useMemo(() => new Date(), []);
  const timelineStart = useMemo(() => startOfISOWeek(today), [today]);
  const timelineEnd = useMemo(() => {
    const defaultEnd = addWeeks(timelineStart, 26); // ~6 months
    if (!data || data.blocks.length === 0) return defaultEnd;

    const latestBlock = data.blocks.reduce((latest, b) => {
      const end = parseISO(b.endDate);
      return end > latest ? end : latest;
    }, defaultEnd);

    return addWeeks(latestBlock, 4);
  }, [timelineStart, data]);

  const weeks = useMemo(
    () => getWeeksInRange(timelineStart, timelineEnd),
    [timelineStart, timelineEnd],
  );

  const currentWeek = useMemo(() => getWeekInfo(today), [today]);

  const dayWidth = useMemo(() => {
    if (viewMode === 'week') return 120; // DAY_COLUMN_WIDTH
    return WEEK_COLUMN_WIDTH / 7;
  }, [viewMode]);

  // ---- Presentation mode from URL ----
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('mode') === 'present') {
      setIsPresentationMode(true);
    }
  }, []);

  // ---- Load data ----
  useEffect(() => {
    fetchCalendarData(token)
      .then(({ data: loaded, sha: loadedSha }) => {
        setData(loaded);
        setSha(loadedSha);
        setHistory([loaded]);
        setHistoryIndex(0);
        setLoadError(null);

        if (token) setIsEditorMode(true);
      })
      .catch((err) => {
        setLoadError(err.message);
        // Attempt to use default data
        setData(DEFAULT_DATA as CalendarData);
        setHistory([DEFAULT_DATA as CalendarData]);
        setHistoryIndex(0);
      });
  }, [token]);

  // ---- Warn on unload if unsaved ----
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (unsavedCount > 0) {
        e.preventDefault();
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsavedCount]);

  // ---- Keyboard shortcuts ----
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        handleRedo();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  // ---- State mutation helpers ----
  const pushState = useCallback(
    (newData: CalendarData) => {
      setHistory((prev) => {
        const truncated = prev.slice(0, historyIndex + 1);
        const next = [...truncated, newData].slice(-50); // MAX_UNDO_STEPS
        return next;
      });
      setHistoryIndex((prev) => Math.min(prev + 1, 49));
      setData(newData);
      setUnsavedCount((c) => c + 1);
    },
    [historyIndex],
  );

  const handleUndo = useCallback(() => {
    if (historyIndex <= 0) return;
    const newIndex = historyIndex - 1;
    setHistoryIndex(newIndex);
    setData(history[newIndex]);
    setUnsavedCount((c) => c + 1);
  }, [historyIndex, history]);

  const handleRedo = useCallback(() => {
    if (historyIndex >= history.length - 1) return;
    const newIndex = historyIndex + 1;
    setHistoryIndex(newIndex);
    setData(history[newIndex]);
    setUnsavedCount((c) => c + 1);
  }, [historyIndex, history]);

  // ---- Block CRUD ----
  const handleAddBlock = useCallback(
    (block: Block) => {
      if (!data) return;
      const newBlock: Block = {
        ...block,
        id: crypto.randomUUID(),
        updatedAt: new Date().toISOString(),
        updatedBy: block.person,
      };
      pushState({ ...data, blocks: [...data.blocks, newBlock] });
    },
    [data, pushState],
  );

  const handleUpdateBlock = useCallback(
    (block: Block) => {
      if (!data) return;
      const updated: Block = {
        ...block,
        updatedAt: new Date().toISOString(),
      };
      pushState({
        ...data,
        blocks: data.blocks.map((b) => (b.id === block.id ? updated : b)),
      });
    },
    [data, pushState],
  );

  const handleDeleteBlock = useCallback(
    (id: string) => {
      if (!data) return;
      pushState({ ...data, blocks: data.blocks.filter((b) => b.id !== id) });
    },
    [data, pushState],
  );

  const _handleMoveBlock = useCallback(
    (id: string, newStart: string, newEnd: string) => {
      if (!data) return;
      pushState({
        ...data,
        blocks: data.blocks.map((b) =>
          b.id === id
            ? { ...b, startDate: newStart, endDate: newEnd, updatedAt: new Date().toISOString() }
            : b,
        ),
      });
    },
    [data, pushState],
  );

  // ---- Milestone CRUD ----
  const handleAddMilestone = useCallback(
    (ms: Milestone) => {
      if (!data) return;
      const newMs: Milestone = { ...ms, id: crypto.randomUUID() };
      pushState({ ...data, milestones: [...data.milestones, newMs] });
    },
    [data, pushState],
  );

  const handleUpdateMilestone = useCallback(
    (ms: Milestone) => {
      if (!data) return;
      pushState({
        ...data,
        milestones: data.milestones.map((m) => (m.id === ms.id ? ms : m)),
      });
    },
    [data, pushState],
  );

  const handleDeleteMilestone = useCallback(
    (id: string) => {
      if (!data) return;
      pushState({ ...data, milestones: data.milestones.filter((m) => m.id !== id) });
    },
    [data, pushState],
  );

  // ---- Unavailable CRUD ----
  const handleAddUnavailable = useCallback(
    (entry: Unavailable) => {
      if (!data) return;
      const newEntry: Unavailable = { ...entry, id: crypto.randomUUID() };
      pushState({ ...data, unavailable: [...data.unavailable, newEntry] });
    },
    [data, pushState],
  );

  const handleUpdateUnavailable = useCallback(
    (entry: Unavailable) => {
      if (!data) return;
      pushState({
        ...data,
        unavailable: data.unavailable.map((u) => (u.id === entry.id ? entry : u)),
      });
    },
    [data, pushState],
  );

  const handleDeleteUnavailable = useCallback(
    (id: string) => {
      if (!data) return;
      pushState({ ...data, unavailable: data.unavailable.filter((u) => u.id !== id) });
    },
    [data, pushState],
  );

  // ---- Save to GitHub ----
  const handleSave = useCallback(async () => {
    if (!data || !token) return;
    setIsSaving(true);
    setSaveError(null);

    try {
      const newSha = await saveCalendarData(
        data,
        sha,
        token,
        `Oppdater kapasitetskalender (${unsavedCount} endring${unsavedCount !== 1 ? 'er' : ''})`,
      );
      setSha(newSha);
      setUnsavedCount(0);
      localStorage.setItem('kapasitet-cache', JSON.stringify(data));
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Ukjent feil');
    } finally {
      setIsSaving(false);
    }
  }, [data, sha, token, unsavedCount]);

  // ---- Navigation ----
  const handleWeekClick = useCallback((week: WeekInfo) => {
    setSelectedWeek(week);
    setViewMode('week');
  }, []);

  const handleBackToOverview = useCallback(() => {
    setViewMode('overview');
    setSelectedWeek(null);
  }, []);

  // ---- Token submission ----
  const handleTokenSubmit = useCallback((newToken: string) => {
    sessionStorage.setItem('kapasitet-token', newToken);
    setToken(newToken);
    setShowTokenPrompt(false);
    setIsEditorMode(true);
  }, []);

  // ---- Double-click to create block ----
  const handleSwimlaneDoubleClick = useCallback(
    (personId: string, date: Date) => {
      if (!isEditorMode) return;
      const dateStr = date.toISOString().slice(0, 10);
      setNewBlockPrefill({ person: personId, date: dateStr });
    },
    [isEditorMode],
  );

  // ---- Resolve selected items for dialogs ----
  const selectedBlock = useMemo(
    () => (selectedBlockId && data ? data.blocks.find((b) => b.id === selectedBlockId) : null),
    [selectedBlockId, data],
  );

  const selectedMilestone = useMemo(
    () => (selectedMilestoneId && data ? data.milestones.find((m) => m.id === selectedMilestoneId) : null),
    [selectedMilestoneId, data],
  );

  const selectedUnavailable = useMemo(
    () => (selectedUnavailableId && data ? data.unavailable.find((u) => u.id === selectedUnavailableId) : null),
    [selectedUnavailableId, data],
  );

  // ---- Active week range for week view ----
  const _activeWeekStart = useMemo(
    () => (viewMode === 'week' && selectedWeek ? selectedWeek.startDate : timelineStart),
    [viewMode, selectedWeek, timelineStart],
  );
  const _activeWeekEnd = useMemo(
    () => (viewMode === 'week' && selectedWeek ? selectedWeek.endDate : timelineEnd),
    [viewMode, selectedWeek, timelineEnd],
  );
  const activeDayWidth = viewMode === 'week' ? 120 : dayWidth;
  const activeTimelineStart = viewMode === 'week' && selectedWeek ? selectedWeek.startDate : timelineStart;

  // ---- Total timeline width ----
  const totalWidth = useMemo(() => {
    const days = differenceInCalendarDays(
      viewMode === 'week' && selectedWeek ? selectedWeek.endDate : timelineEnd,
      activeTimelineStart,
    );
    return (days + 1) * activeDayWidth + 120; // +120 for label column
  }, [viewMode, selectedWeek, timelineEnd, activeTimelineStart, activeDayWidth]);

  // ---- Loading state ----
  if (!data) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        {loadError ? (
          <div>
            <h2>Kunne ikke laste data</h2>
            <p>{loadError}</p>
            <button onClick={() => window.location.reload()}>Prov igjen</button>
          </div>
        ) : (
          <p>Laster kapasitetskalender...</p>
        )}
      </div>
    );
  }

  // ---- Render ----
  return (
    <div className={`app ${isPresentationMode ? 'app--presentation' : ''}`}>
      {/* Token prompt */}
      {showTokenPrompt && (
        <TokenPrompt onSubmit={handleTokenSubmit} />
      )}

      {/* Toolbar */}
      {!isPresentationMode && (
        <Toolbar
          isEditorMode={isEditorMode}
          isPresentationMode={isPresentationMode}
          unsavedCount={unsavedCount}
          onTogglePresentation={() => setIsPresentationMode((v) => !v)}
          onSave={handleSave}
          onRequestEdit={() => setShowTokenPrompt(true)}
          onUndo={handleUndo}
          onRedo={handleRedo}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
          viewMode={viewMode}
          onBackToOverview={handleBackToOverview}
        />
      )}

      {/* Save error banner */}
      {saveError && (
        <div style={{ padding: '8px 16px', background: '#FEE2E2', color: '#991B1B', borderBottom: '1px solid #FECACA' }}>
          Lagring feilet: {saveError}
          <button onClick={() => setSaveError(null)} style={{ marginLeft: 8 }}>Lukk</button>
        </div>
      )}

      {/* Saving indicator */}
      {isSaving && (
        <div style={{ padding: '4px 16px', background: '#DBEAFE', borderBottom: '1px solid #BFDBFE', fontSize: 13 }}>
          Lagrer til GitHub...
        </div>
      )}

      {/* This-week summary */}
      <ThisWeekSummary data={data} currentWeek={currentWeek} onWeekClick={handleWeekClick} />

      {/* Editor toolbar: add block, milestone, unavailable */}
      {isEditorMode && !isPresentationMode && (
        <div style={{ display: 'flex', gap: 8, padding: '4px 16px', borderBottom: '1px solid #E5E7EB' }}>
          <button
            onClick={() => {
              setNewBlockPrefill({
                person: data.people[0].id,
                date: new Date().toISOString().slice(0, 10),
              });
            }}
          >
            + Ny blokk
          </button>
          <button
            onClick={() => {
              setSelectedMilestoneId('__new__');
            }}
          >
            &#9670;+ Milepel
          </button>
          <button
            onClick={() => {
              setSelectedUnavailableId('__new__');
            }}
          >
            Ferie+
          </button>
        </div>
      )}

      {/* Week detail header */}
      {viewMode === 'week' && selectedWeek && (
        <div style={{ padding: '8px 16px', background: '#F3F4F6', borderBottom: '1px solid #E5E7EB' }}>
          <strong>Uke {selectedWeek.weekNumber}</strong>{' '}
          ({formatDateShort(selectedWeek.startDate)} &ndash; {formatDateShort(addDays(selectedWeek.startDate, 4))})
          <button onClick={handleBackToOverview} style={{ marginLeft: 16 }}>
            &larr; Tilbake til oversikt
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="timeline-container">
        <div className="timeline" style={{ minWidth: totalWidth }}>
          {/* Timeline header */}
          {viewMode === 'overview' && (
            <TimelineHeader weeks={weeks} timelineStart={activeTimelineStart} dayWidth={activeDayWidth} />
          )}

          {/* Week-view day headers */}
          {viewMode === 'week' && selectedWeek && (
            <div className="timeline-header">
              <div className="timeline-header__weeks" style={{ paddingLeft: 120 }}>
                {getWeekdayDates(selectedWeek).map((day) => (
                  <div
                    key={day.toISOString()}
                    className="timeline-header__week"
                    style={{ width: 120, minWidth: 0, flexShrink: 0 }}
                  >
                    {formatDateShort(day)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today marker */}
          <TodayMarker timelineStart={activeTimelineStart} dayWidth={activeDayWidth} />

          {/* Swimlanes */}
          {data.people.map((person) => (
            <Swimlane
              key={person.id}
              person={person}
              blocks={data.blocks}
              unavailable={data.unavailable}
              weeks={viewMode === 'week' && selectedWeek ? [selectedWeek] : weeks}
              timelineStart={activeTimelineStart}
              dayWidth={activeDayWidth}
              isEditorMode={isEditorMode}
              onBlockClick={(block) => setSelectedBlockId(block.id)}
              onDoubleClick={handleSwimlaneDoubleClick}
            />
          ))}

          {/* Milestones */}
          <MilestoneRow
            milestones={data.milestones}
            timelineStart={activeTimelineStart}
            dayWidth={activeDayWidth}
            onMilestoneClick={(ms) => setSelectedMilestoneId(ms.id)}
          />
        </div>
      </div>

      {/* Legend */}
      <Legend blocks={data.blocks} />

      {/* Presentation mode toggle overlay */}
      {isPresentationMode && (
        <button
          onClick={() => setIsPresentationMode(false)}
          style={{
            position: 'fixed',
            top: 8,
            right: 8,
            zIndex: 100,
            opacity: 0.3,
            fontSize: 11,
          }}
        >
          Avslutt presentasjon
        </button>
      )}

      {/* Block dialog (edit existing) */}
      {selectedBlock && (
        <BlockDialog
          block={selectedBlock}
          people={data.people}
          isNew={false}
          onApply={(block) => {
            handleUpdateBlock(block);
            setSelectedBlockId(null);
          }}
          onDelete={(id) => {
            handleDeleteBlock(id);
            setSelectedBlockId(null);
          }}
          onClose={() => setSelectedBlockId(null)}
        />
      )}

      {/* Block dialog (new with prefill) */}
      {newBlockPrefill && (
        <BlockDialog
          block={{
            id: '',
            title: '',
            person: newBlockPrefill.person,
            startDate: newBlockPrefill.date,
            endDate: addDays(parseISO(newBlockPrefill.date), 14).toISOString().slice(0, 10),
            percent: 40,
            color: PALETTE[0],
            status: 'planned',
            description: '',
            links: [],
            updatedAt: '',
            updatedBy: newBlockPrefill.person,
          }}
          people={data.people}
          isNew
          onApply={(block) => {
            handleAddBlock(block);
            setNewBlockPrefill(null);
          }}
          onDelete={() => setNewBlockPrefill(null)}
          onClose={() => setNewBlockPrefill(null)}
        />
      )}

      {/* Milestone dialog (edit) */}
      {selectedMilestone && (
        <MilestoneDialog
          milestone={selectedMilestone}
          isNew={false}
          onApply={(ms) => {
            handleUpdateMilestone(ms);
            setSelectedMilestoneId(null);
          }}
          onDelete={(id) => {
            handleDeleteMilestone(id);
            setSelectedMilestoneId(null);
          }}
          onClose={() => setSelectedMilestoneId(null)}
        />
      )}

      {/* Milestone dialog (new) */}
      {selectedMilestoneId === '__new__' && (
        <MilestoneDialog
          milestone={{
            id: '',
            title: '',
            date: new Date().toISOString().slice(0, 10),
            description: '',
          }}
          isNew
          onApply={(ms) => {
            handleAddMilestone(ms);
            setSelectedMilestoneId(null);
          }}
          onDelete={() => setSelectedMilestoneId(null)}
          onClose={() => setSelectedMilestoneId(null)}
        />
      )}

      {/* Unavailable dialog (edit) */}
      {selectedUnavailable && (
        <UnavailableDialog
          entry={selectedUnavailable}
          people={data.people}
          isNew={false}
          onApply={(entry) => {
            handleUpdateUnavailable(entry);
            setSelectedUnavailableId(null);
          }}
          onDelete={(id) => {
            handleDeleteUnavailable(id);
            setSelectedUnavailableId(null);
          }}
          onClose={() => setSelectedUnavailableId(null)}
        />
      )}

      {/* Unavailable dialog (new) */}
      {selectedUnavailableId === '__new__' && (
        <UnavailableDialog
          entry={{
            id: '',
            person: data.people[0].id,
            startDate: new Date().toISOString().slice(0, 10),
            endDate: addDays(new Date(), 7).toISOString().slice(0, 10),
            label: 'Ferie',
          }}
          people={data.people}
          isNew
          onApply={(entry) => {
            handleAddUnavailable(entry);
            setSelectedUnavailableId(null);
          }}
          onDelete={() => setSelectedUnavailableId(null)}
          onClose={() => setSelectedUnavailableId(null)}
        />
      )}
    </div>
  );
}
