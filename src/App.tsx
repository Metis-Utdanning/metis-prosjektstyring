import { useState, useCallback, useMemo, useRef } from 'react';
import type { Block, Milestone, Unavailable, ViewMode, WeekInfo } from './types';
import { PALETTE, WEEK_COLUMN_WIDTH, DAY_COLUMN_WIDTH, DEFAULT_DATA } from './utils/constants';
import {
  getWeeksInRange,
  getWeekInfo,
  dateToPixelOffset,
  formatDateShort,
  getWeekdayDates,
  startOfISOWeek,
  addWeeks,
  addDays,
  parseISO,
  differenceInCalendarDays,
  format,
} from './utils/dates';
import type { CalendarData } from './types';

// --- Dedicated components ---
import { Toolbar } from './components/Toolbar';
import { ThisWeekSummary } from './components/ThisWeekSummary';
import TimelineHeader from './components/TimelineHeader';
import Swimlane from './components/Swimlane';
import MilestoneRow from './components/MilestoneRow';
import Legend from './components/Legend';
import { BlockDialog } from './components/BlockDialog';
import { MilestoneDialog } from './components/MilestoneDialog';
import { UnavailableDialog } from './components/UnavailableDialog';
import { TokenPrompt, getStoredToken } from './components/TokenPrompt';

// --- Hooks ---
import { useCalendarData } from './hooks/useCalendarData';
import { useKeyboard } from './hooks/useKeyboard';
import { useDrag } from './hooks/useDrag';

// ---------------------------------------------------------------------------
// Demo data — shown when GitHub API is unavailable or data is empty
// ---------------------------------------------------------------------------

const DEMO_DATA: CalendarData = {
  version: 1,
  people: [
    { id: 'fredrik', name: 'Fredrik' },
    { id: 'simen', name: 'Simen' },
  ],
  blocks: [
    {
      id: 'demo-1',
      title: 'Privatistportal',
      person: 'fredrik',
      startDate: '2026-03-16',
      endDate: '2026-04-24',
      percent: 80,
      color: '#3B82F6',
      status: 'active',
      description: 'Payload CMS kursmateriale-plattform',
      links: ['https://github.com/Metis-Utdanning/metis-privatistkurs'],
      updatedAt: '2026-03-13T10:00:00Z',
      updatedBy: 'fredrik',
    },
    {
      id: 'demo-2',
      title: 'Inntak 26/27',
      person: 'fredrik',
      startDate: '2026-03-09',
      endDate: '2026-05-01',
      percent: 20,
      color: '#F59E0B',
      status: 'active',
      description: 'Inntaksmodul og kontraktsending',
      links: [],
      updatedAt: '2026-03-13T10:00:00Z',
      updatedBy: 'fredrik',
    },
    {
      id: 'demo-3',
      title: 'Studentportal',
      person: 'fredrik',
      startDate: '2026-04-28',
      endDate: '2026-06-05',
      percent: 60,
      color: '#10B981',
      status: 'planned',
      description: 'Ny-features for studentportal',
      links: [],
      updatedAt: '2026-03-13T10:00:00Z',
      updatedBy: 'fredrik',
    },
    {
      id: 'demo-4',
      title: 'Security hardening',
      person: 'fredrik',
      startDate: '2026-05-04',
      endDate: '2026-05-22',
      percent: 40,
      color: '#EF4444',
      status: 'planned',
      description: 'P0 sikkerhetsfixer',
      links: [],
      updatedAt: '2026-03-13T10:00:00Z',
      updatedBy: 'fredrik',
    },
    {
      id: 'demo-5',
      title: 'MetisVerse',
      person: 'simen',
      startDate: '2026-03-09',
      endDate: '2026-05-15',
      percent: 60,
      color: '#8B5CF6',
      status: 'active',
      description: 'MetisVerse moduler og feilretting',
      links: [],
      updatedAt: '2026-03-13T10:00:00Z',
      updatedBy: 'simen',
    },
    {
      id: 'demo-6',
      title: 'IT-drift',
      person: 'simen',
      startDate: '2026-03-09',
      endDate: '2026-06-26',
      percent: 20,
      color: '#06B6D4',
      status: 'active',
      description: 'Løpende IT-drift og support',
      links: [],
      updatedAt: '2026-03-13T10:00:00Z',
      updatedBy: 'simen',
    },
    {
      id: 'demo-7',
      title: 'Teams Education',
      person: 'simen',
      startDate: '2026-04-14',
      endDate: '2026-05-08',
      percent: 40,
      color: '#EC4899',
      status: 'planned',
      description: 'Teams Education provisioning modul',
      links: [],
      updatedAt: '2026-03-13T10:00:00Z',
      updatedBy: 'simen',
    },
    {
      id: 'demo-8',
      title: 'HubSpot-integrasjon',
      person: 'simen',
      startDate: '2026-05-18',
      endDate: '2026-06-12',
      percent: 50,
      color: '#F97316',
      status: 'planned',
      description: 'HubSpot inndata-trakt',
      links: [],
      updatedAt: '2026-03-13T10:00:00Z',
      updatedBy: 'simen',
    },
  ],
  unavailable: [
    {
      id: 'demo-ferie-1',
      person: 'fredrik',
      startDate: '2026-06-29',
      endDate: '2026-07-24',
      label: 'Ferie',
    },
    {
      id: 'demo-ferie-2',
      person: 'simen',
      startDate: '2026-07-06',
      endDate: '2026-07-31',
      label: 'Ferie',
    },
  ],
  milestones: [
    {
      id: 'demo-ms-1',
      title: 'Privatistportal MVP',
      date: '2026-04-10',
      description: 'Første kursinnhold tilgjengelig',
    },
    {
      id: 'demo-ms-2',
      title: 'Inntak komplett',
      date: '2026-04-24',
      description: 'Alle kontrakter sendt',
    },
    {
      id: 'demo-ms-3',
      title: 'Sommerlansering',
      date: '2026-06-12',
      description: 'Alle hovedprosjekter i produksjon',
    },
  ],
};

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

export default function App() {
  // --- Auth ---
  const [token, setToken] = useState<string | null>(() => getStoredToken());
  const [showTokenPrompt, setShowTokenPrompt] = useState(false);

  // --- Calendar data (via hook) ---
  const {
    data: rawData,
    setData,
    undo,
    redo,
    canUndo,
    canRedo,
    save,
    reload,
    isLoading,
    isSaving,
    error,
    unsavedChanges,
  } = useCalendarData(token);

  // Use demo data if the loaded data has no blocks (e.g. GitHub unavailable)
  const data: CalendarData = useMemo(() => {
    if (rawData.blocks.length === 0 && rawData.milestones.length === 0) {
      return DEMO_DATA;
    }
    return rawData;
  }, [rawData]);

  // --- View state ---
  const [viewMode, setViewMode] = useState<ViewMode>('overview');
  const [selectedWeek, setSelectedWeek] = useState<WeekInfo | null>(null);
  const [isPresentationMode, setIsPresentationMode] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'present';
  });

  // --- Dialog state ---
  const [editingBlock, setEditingBlock] = useState<Block | null>(null);
  const [isNewBlock, setIsNewBlock] = useState(false);
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null);
  const [isNewMilestone, setIsNewMilestone] = useState(false);
  const [editingUnavailable, setEditingUnavailable] = useState<Unavailable | null>(null);
  const [isNewUnavailable, setIsNewUnavailable] = useState(false);
  const [defaultPerson, setDefaultPerson] = useState<string | undefined>(undefined);
  const [defaultDate, setDefaultDate] = useState<string | undefined>(undefined);

  // --- Timeline ref for scrolling ---
  const timelineRef = useRef<HTMLDivElement>(null);

  // --- Computed timeline range ---
  const today = useMemo(() => new Date(), []);
  const timelineStart = useMemo(() => startOfISOWeek(today), [today]);
  const timelineEnd = useMemo(() => {
    const defaultEnd = addWeeks(timelineStart, 26);
    if (data.blocks.length === 0 && data.unavailable.length === 0) return defaultEnd;

    let latest = defaultEnd;
    for (const b of data.blocks) {
      const end = parseISO(b.endDate);
      if (end > latest) latest = end;
    }
    for (const u of data.unavailable) {
      const end = parseISO(u.endDate);
      if (end > latest) latest = end;
    }
    return addWeeks(latest, 4);
  }, [timelineStart, data]);

  const weeks = useMemo(
    () => getWeeksInRange(timelineStart, timelineEnd),
    [timelineStart, timelineEnd],
  );

  const currentWeek = useMemo(() => getWeekInfo(today), [today]);

  const dayWidth = useMemo(() => {
    if (viewMode === 'week') return DAY_COLUMN_WIDTH;
    return WEEK_COLUMN_WIDTH / 7;
  }, [viewMode]);

  const activeTimelineStart = viewMode === 'week' && selectedWeek
    ? selectedWeek.startDate
    : timelineStart;

  const activeWeeks = viewMode === 'week' && selectedWeek ? [selectedWeek] : weeks;

  const totalWidth = useMemo(() => {
    const endDate = viewMode === 'week' && selectedWeek
      ? selectedWeek.endDate
      : timelineEnd;
    const days = differenceInCalendarDays(endDate, activeTimelineStart);
    return (days + 1) * dayWidth + 120; // +120 for label column
  }, [viewMode, selectedWeek, timelineEnd, activeTimelineStart, dayWidth]);

  // --- Is in editor mode? ---
  const isEditorMode = token !== null;

  // --- Block CRUD ---
  const handleSaveBlock = useCallback(
    (block: Block) => {
      if (isNewBlock) {
        setData({ ...data, blocks: [...data.blocks, block] });
      } else {
        setData({
          ...data,
          blocks: data.blocks.map((b) => (b.id === block.id ? block : b)),
        });
      }
      setEditingBlock(null);
      setIsNewBlock(false);
    },
    [data, setData, isNewBlock],
  );

  const handleDeleteBlock = useCallback(
    (id: string) => {
      setData({ ...data, blocks: data.blocks.filter((b) => b.id !== id) });
      setEditingBlock(null);
      setIsNewBlock(false);
    },
    [data, setData],
  );

  // --- Milestone CRUD ---
  const handleSaveMilestone = useCallback(
    (ms: Milestone) => {
      if (isNewMilestone) {
        setData({ ...data, milestones: [...data.milestones, ms] });
      } else {
        setData({
          ...data,
          milestones: data.milestones.map((m) => (m.id === ms.id ? ms : m)),
        });
      }
      setEditingMilestone(null);
      setIsNewMilestone(false);
    },
    [data, setData, isNewMilestone],
  );

  const handleDeleteMilestone = useCallback(
    (id: string) => {
      setData({ ...data, milestones: data.milestones.filter((m) => m.id !== id) });
      setEditingMilestone(null);
      setIsNewMilestone(false);
    },
    [data, setData],
  );

  // --- Unavailable CRUD ---
  const handleSaveUnavailable = useCallback(
    (entry: Unavailable) => {
      if (isNewUnavailable) {
        setData({ ...data, unavailable: [...data.unavailable, entry] });
      } else {
        setData({
          ...data,
          unavailable: data.unavailable.map((u) => (u.id === entry.id ? entry : u)),
        });
      }
      setEditingUnavailable(null);
      setIsNewUnavailable(false);
    },
    [data, setData, isNewUnavailable],
  );

  const handleDeleteUnavailable = useCallback(
    (id: string) => {
      setData({ ...data, unavailable: data.unavailable.filter((u) => u.id !== id) });
      setEditingUnavailable(null);
      setIsNewUnavailable(false);
    },
    [data, setData],
  );

  // --- Drag-and-drop ---
  const handleDragEnd = useCallback(
    (blockId: string, newStart: Date, newEnd: Date) => {
      const startStr = format(newStart, 'yyyy-MM-dd');
      const endStr = format(newEnd, 'yyyy-MM-dd');
      setData({
        ...data,
        blocks: data.blocks.map((b) =>
          b.id === blockId
            ? { ...b, startDate: startStr, endDate: endStr, updatedAt: new Date().toISOString() }
            : b,
        ),
      });
    },
    [data, setData],
  );

  const handleBlockClick = useCallback(
    (blockId: string) => {
      const block = data.blocks.find((b) => b.id === blockId);
      if (block) {
        setEditingBlock(block);
        setIsNewBlock(false);
      }
    },
    [data],
  );

  const { onPointerDown: dragPointerDown } = useDrag({
    onDragEnd: handleDragEnd,
    onClick: handleBlockClick,
    dayWidth,
    timelineStart: activeTimelineStart,
    snapToWeek: viewMode === 'overview',
  });

  // --- Swimlane event handlers ---
  const handleEditBlock = useCallback((block: Block) => {
    setEditingBlock(block);
    setIsNewBlock(false);
  }, []);

  const handleSwimlanePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, block: Block) => {
      dragPointerDown(e, block.id, 'move', parseISO(block.startDate), parseISO(block.endDate));
    },
    [dragPointerDown],
  );

  const handleSwimlaneResizeStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>, block: Block, edge: 'start' | 'end') => {
      const mode = edge === 'start' ? 'resize-start' : 'resize-end';
      dragPointerDown(e, block.id, mode, parseISO(block.startDate), parseISO(block.endDate));
    },
    [dragPointerDown],
  );

  const handleSwimlaneDoubleClick = useCallback(
    (personId: string, date: Date) => {
      if (!isEditorMode) return;
      setDefaultPerson(personId);
      setDefaultDate(date.toISOString().slice(0, 10));
      setEditingBlock(null);
      setIsNewBlock(true);
    },
    [isEditorMode],
  );

  // --- Toolbar actions ---
  const handleNewBlock = useCallback(() => {
    setDefaultPerson(data.people[0]?.id);
    setDefaultDate(new Date().toISOString().slice(0, 10));
    setEditingBlock(null);
    setIsNewBlock(true);
  }, [data.people]);

  const handleNewMilestone = useCallback(() => {
    setEditingMilestone(null);
    setIsNewMilestone(true);
  }, []);

  const handleNewUnavailable = useCallback(() => {
    setEditingUnavailable(null);
    setIsNewUnavailable(true);
  }, []);

  const handleGoToToday = useCallback(() => {
    if (!timelineRef.current) return;
    const offset = dateToPixelOffset(new Date(), activeTimelineStart, dayWidth);
    timelineRef.current.scrollTo({ left: Math.max(0, offset - 200), behavior: 'smooth' });
  }, [activeTimelineStart, dayWidth]);

  const handleSave = useCallback(async () => {
    if (!token) {
      setShowTokenPrompt(true);
      return;
    }
    await save();
  }, [token, save]);

  // --- Navigation ---
  const handleBackToOverview = useCallback(() => {
    setViewMode('overview');
    setSelectedWeek(null);
  }, []);

  // --- Token ---
  const handleTokenSave = useCallback((newToken: string) => {
    setToken(newToken);
    setShowTokenPrompt(false);
  }, []);

  // --- Close any open dialog ---
  const closeAllDialogs = useCallback(() => {
    setEditingBlock(null);
    setIsNewBlock(false);
    setEditingMilestone(null);
    setIsNewMilestone(false);
    setEditingUnavailable(null);
    setIsNewUnavailable(false);
    setShowTokenPrompt(false);
  }, []);

  // --- Keyboard shortcuts ---
  useKeyboard(
    useMemo(
      () => ({
        onUndo: undo,
        onRedo: redo,
        onSave: handleSave,
        onEscape: closeAllDialogs,
        onDelete: () => {
          // Could delete selected block if we had selection state
        },
      }),
      [undo, redo, handleSave, closeAllDialogs],
    ),
  );

  // --- Today marker ---
  const todayOffset = dateToPixelOffset(new Date(), activeTimelineStart, dayWidth);
  const showTodayMarker = todayOffset >= 0 && todayOffset <= totalWidth;

  // --- Milestone click ---
  const handleMilestoneClick = useCallback((ms: Milestone) => {
    setEditingMilestone(ms);
    setIsNewMilestone(false);
  }, []);

  // --- Loading state ---
  if (isLoading) {
    return (
      <div className="app" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <p>Laster kapasitetskalender...</p>
      </div>
    );
  }

  // --- Any dialog open? ---
  const blockDialogOpen = editingBlock !== null || isNewBlock;
  const milestoneDialogOpen = editingMilestone !== null || isNewMilestone;
  const unavailableDialogOpen = editingUnavailable !== null || isNewUnavailable;

  // --- Render ---
  return (
    <div className={`app${isPresentationMode ? ' app--presentation' : ''}`}>
      {/* Toolbar */}
      <Toolbar
        unsavedCount={unsavedChanges}
        isSaving={isSaving}
        canUndo={canUndo}
        canRedo={canRedo}
        isPresentationMode={isPresentationMode}
        error={error}
        onSave={handleSave}
        onUndo={undo}
        onRedo={redo}
        onNewBlock={handleNewBlock}
        onNewMilestone={handleNewMilestone}
        onNewUnavailable={handleNewUnavailable}
        onTogglePresentation={() => setIsPresentationMode((v) => !v)}
        onGoToToday={handleGoToToday}
      />

      {/* This-week summary */}
      <ThisWeekSummary data={data} />

      {/* Week detail header */}
      {viewMode === 'week' && selectedWeek && (
        <div className="week-detail-header">
          <strong>Uke {selectedWeek.weekNumber}</strong>{' '}
          ({formatDateShort(selectedWeek.startDate)} &ndash; {formatDateShort(addDays(selectedWeek.startDate, 4))})
          <button onClick={handleBackToOverview} className="toolbar__btn" style={{ marginLeft: 16 }}>
            &larr; Tilbake til oversikt
          </button>
        </div>
      )}

      {/* Timeline */}
      <div className="timeline-container" ref={timelineRef}>
        <div className="timeline" style={{ minWidth: totalWidth }}>
          {/* Timeline header */}
          {viewMode === 'overview' && (
            <TimelineHeader
              weeks={weeks}
              dayWidth={dayWidth}
              timelineStart={activeTimelineStart}
            />
          )}

          {/* Week-view day headers */}
          {viewMode === 'week' && selectedWeek && (
            <div className="timeline-header" style={{ width: totalWidth }}>
              <div className="timeline-header__weeks">
                {getWeekdayDates(selectedWeek).map((day) => (
                  <div
                    key={day.toISOString()}
                    className="timeline-header__week"
                    style={{ width: DAY_COLUMN_WIDTH }}
                  >
                    {formatDateShort(day)}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today marker (global) */}
          {showTodayMarker && (
            <div
              className="today-marker"
              style={{ left: todayOffset + 120 }}
            />
          )}

          {/* Swimlanes */}
          {data.people.map((person) => (
            <Swimlane
              key={person.id}
              person={person}
              blocks={data.blocks}
              unavailable={data.unavailable}
              weeks={activeWeeks}
              dayWidth={dayWidth}
              timelineStart={activeTimelineStart}
              onEditBlock={handleEditBlock}
              onDragStart={handleSwimlanePointerDown}
              onResizeStart={handleSwimlaneResizeStart}
              onDoubleClick={handleSwimlaneDoubleClick}
            />
          ))}

          {/* Milestones */}
          {data.milestones.length > 0 && (
            <MilestoneRow
              milestones={data.milestones}
              dayWidth={dayWidth}
              timelineStart={activeTimelineStart}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <Legend blocks={data.blocks} />

      {/* Presentation mode exit button */}
      {isPresentationMode && (
        <button
          onClick={() => setIsPresentationMode(false)}
          className="presentation-exit"
        >
          Avslutt presentasjon
        </button>
      )}

      {/* --- Dialogs --- */}

      {/* Block dialog */}
      <BlockDialog
        block={editingBlock}
        people={data.people}
        isOpen={blockDialogOpen}
        onClose={() => { setEditingBlock(null); setIsNewBlock(false); }}
        onSave={handleSaveBlock}
        onDelete={handleDeleteBlock}
        defaultPerson={defaultPerson}
        defaultStartDate={defaultDate}
      />

      {/* Milestone dialog */}
      <MilestoneDialog
        milestone={editingMilestone}
        isOpen={milestoneDialogOpen}
        onClose={() => { setEditingMilestone(null); setIsNewMilestone(false); }}
        onSave={handleSaveMilestone}
        onDelete={handleDeleteMilestone}
      />

      {/* Unavailable dialog */}
      <UnavailableDialog
        unavailable={editingUnavailable}
        people={data.people}
        isOpen={unavailableDialogOpen}
        onClose={() => { setEditingUnavailable(null); setIsNewUnavailable(false); }}
        onSave={handleSaveUnavailable}
        onDelete={handleDeleteUnavailable}
        defaultPerson={defaultPerson}
        defaultStartDate={defaultDate}
      />

      {/* Token prompt */}
      <TokenPrompt
        isOpen={showTokenPrompt}
        onClose={() => setShowTokenPrompt(false)}
        onSave={handleTokenSave}
      />
    </div>
  );
}
