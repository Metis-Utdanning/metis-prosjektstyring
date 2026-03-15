import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import type { Block, Milestone, Unavailable, ViewMode, WeekInfo } from './types';
import { WEEK_COLUMN_WIDTH, DAY_COLUMN_WIDTH } from './utils/constants';
import {
  getWeeksInRange,
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
import { ContextMenu } from './components/ContextMenu';
import { PresentationDashboard } from './components/PresentationDashboard';

// --- Hooks ---
import { useCalendarData } from './hooks/useCalendarData';
import { useKeyboard } from './hooks/useKeyboard';
import { useDrag } from './hooks/useDrag';

// --- Zoom levels ---
type ZoomLevel = 'compact' | 'narrow' | 'normal' | 'wide' | 'detail';
const ZOOM_FACTORS: Record<ZoomLevel, number> = { compact: 0.4, narrow: 0.6, normal: 1, wide: 1.5, detail: 3 };

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
      color: '#6B8ADB',
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
      color: '#D4A853',
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
      color: '#5BA88C',
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
      color: '#C96B6B',
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
      color: '#8B7BC7',
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
      color: '#6B9EC7',
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
      color: '#C4789A',
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
      color: '#D4885A',
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
    isLoading,
    isSaving,
    error,
    unsavedChanges,
    autoSaveStatus,
    isOnline,
  } = useCalendarData(token);

  // Use demo data if the loaded data has no blocks (e.g. GitHub unavailable)
  const isDemoMode = rawData.blocks.length === 0 && rawData.milestones.length === 0;
  const data: CalendarData = useMemo(() => {
    if (isDemoMode) {
      return DEMO_DATA;
    }
    return rawData;
  }, [rawData, isDemoMode]);

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

  // --- Block selection ---
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);

  // --- Dialog anchor Y (for positioning near click point) ---
  const [dialogAnchorY, setDialogAnchorY] = useState<number | undefined>(undefined);

  // --- Context menu ---
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    block?: Block | null;
    personId?: string;
    clickDate?: Date;
  } | null>(null);

  // --- Zoom ---
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>(() =>
    (localStorage.getItem('metis-zoom') as ZoomLevel) || 'normal',
  );
  const zoomFactor = ZOOM_FACTORS[zoomLevel];

  // --- Timeline ref for scrolling ---
  const timelineRef = useRef<HTMLDivElement>(null);
  const goToTodayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // --- Computed timeline range ---
  const today = useMemo(() => new Date(), []);
  const timelineStart = useMemo(() => {
    let earliest = addWeeks(startOfISOWeek(today), -12);
    for (const b of data.blocks) {
      const start = parseISO(b.startDate);
      if (start < earliest) earliest = startOfISOWeek(start);
    }
    for (const u of data.unavailable) {
      const start = parseISO(u.startDate);
      if (start < earliest) earliest = startOfISOWeek(start);
    }
    return earliest;
  }, [today, data]);
  const timelineEnd = useMemo(() => {
    const defaultEnd = addWeeks(timelineStart, 52);
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

  const dayWidth = useMemo(() => {
    if (viewMode === 'week') return DAY_COLUMN_WIDTH;
    return (WEEK_COLUMN_WIDTH * zoomFactor) / 7;
  }, [viewMode, zoomFactor]);

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
        setData({ ...rawData, blocks: [...rawData.blocks, block] });
      } else {
        setData({
          ...rawData,
          blocks: rawData.blocks.map((b) => (b.id === block.id ? block : b)),
        });
      }
      setEditingBlock(null);
      setIsNewBlock(false);
    },
    [rawData, setData, isNewBlock],
  );

  const handleDeleteBlock = useCallback(
    (id: string) => {
      setData({ ...rawData, blocks: rawData.blocks.filter((b) => b.id !== id) });
      setEditingBlock(null);
      setIsNewBlock(false);
    },
    [rawData, setData],
  );

  // --- Milestone CRUD ---
  const handleSaveMilestone = useCallback(
    (ms: Milestone) => {
      if (isNewMilestone) {
        setData({ ...rawData, milestones: [...rawData.milestones, ms] });
      } else {
        setData({
          ...rawData,
          milestones: rawData.milestones.map((m) => (m.id === ms.id ? ms : m)),
        });
      }
      setEditingMilestone(null);
      setIsNewMilestone(false);
    },
    [rawData, setData, isNewMilestone],
  );

  const handleDeleteMilestone = useCallback(
    (id: string) => {
      setData({ ...rawData, milestones: rawData.milestones.filter((m) => m.id !== id) });
      setEditingMilestone(null);
      setIsNewMilestone(false);
    },
    [rawData, setData],
  );

  // --- Unavailable CRUD ---
  const handleSaveUnavailable = useCallback(
    (entry: Unavailable) => {
      if (isNewUnavailable) {
        setData({ ...rawData, unavailable: [...rawData.unavailable, entry] });
      } else {
        setData({
          ...rawData,
          unavailable: rawData.unavailable.map((u) => (u.id === entry.id ? entry : u)),
        });
      }
      setEditingUnavailable(null);
      setIsNewUnavailable(false);
    },
    [rawData, setData, isNewUnavailable],
  );

  const handleDeleteUnavailable = useCallback(
    (id: string) => {
      setData({ ...rawData, unavailable: rawData.unavailable.filter((u) => u.id !== id) });
      setEditingUnavailable(null);
      setIsNewUnavailable(false);
    },
    [rawData, setData],
  );

  // --- Drag-and-drop ---
  const handleDragEnd = useCallback(
    (blockId: string, newStart: Date, newEnd: Date) => {
      // Don't allow dragging demo blocks into real data
      if (!rawData.blocks.find((b) => b.id === blockId)) return;
      const startStr = format(newStart, 'yyyy-MM-dd');
      const endStr = format(newEnd, 'yyyy-MM-dd');
      setData({
        ...rawData,
        blocks: rawData.blocks.map((b) =>
          b.id === blockId
            ? { ...b, startDate: startStr, endDate: endStr, updatedAt: new Date().toISOString() }
            : b,
        ),
      });
    },
    [rawData, setData],
  );

  const handleBlockClick = useCallback(
    (blockId: string) => {
      // Only select — dialog opening is handled by the native click via handleEditBlock
      setSelectedBlockId(blockId);
    },
    [],
  );

  // --- Context menu handlers ---
  const handleBlockContextMenu = useCallback((e: React.MouseEvent, block: Block) => {
    setContextMenu({ x: e.clientX, y: e.clientY, block });
    setSelectedBlockId(block.id);
  }, []);

  const handleSwimlaneContextMenu = useCallback(
    (personId: string, x: number, y: number, date: Date) => {
      if (!isEditorMode || isPresentationMode) return;
      setContextMenu({ x, y, personId, clickDate: date });
    },
    [isEditorMode, isPresentationMode],
  );

  const handleDuplicateBlock = useCallback(
    (block: Block) => {
      if (!rawData.blocks.find((b) => b.id === block.id)) return;
      const newBlock: Block = {
        ...block,
        id: crypto.randomUUID(),
        title: `${block.title} (kopi)`,
        updatedAt: new Date().toISOString(),
        updatedBy: 'user',
      };
      setData({ ...rawData, blocks: [...rawData.blocks, newBlock] });
    },
    [rawData, setData],
  );

  const handleContextDeleteBlock = useCallback(
    (block: Block) => {
      if (!rawData.blocks.find((b) => b.id === block.id)) return;
      if (window.confirm(`Slett "${block.title}"?`)) {
        setData({ ...rawData, blocks: rawData.blocks.filter((b) => b.id !== block.id) });
        if (selectedBlockId === block.id) setSelectedBlockId(null);
      }
    },
    [rawData, setData, selectedBlockId],
  );

  const handleContextNewBlock = useCallback(
    (personId: string, date: Date) => {
      setDefaultPerson(personId);
      setDefaultDate(format(date, 'yyyy-MM-dd'));
      setEditingBlock(null);
      setIsNewBlock(true);
    },
    [],
  );

  // --- Zoom handlers (preserve scroll position) ---
  const handleZoomChange = useCallback((level: ZoomLevel) => {
    const container = timelineRef.current;
    let centerDate: Date | null = null;
    if (container) {
      const centerX = container.scrollLeft + container.clientWidth / 2 - 120;
      const oldDayWidth = (WEEK_COLUMN_WIDTH * ZOOM_FACTORS[zoomLevel]) / 7;
      const daysFromStart = centerX / oldDayWidth;
      centerDate = addDays(activeTimelineStart, Math.round(daysFromStart));
    }

    setZoomLevel(level);
    localStorage.setItem('metis-zoom', level);

    if (container && centerDate) {
      const savedDate = centerDate;
      requestAnimationFrame(() => {
        const newDayWidth = (WEEK_COLUMN_WIDTH * ZOOM_FACTORS[level]) / 7;
        const newOffset = dateToPixelOffset(savedDate, activeTimelineStart, newDayWidth);
        container.scrollLeft = Math.max(0, newOffset - container.clientWidth / 2 + 120);
      });
    }
  }, [zoomLevel, activeTimelineStart]);

  const { onPointerDown: dragPointerDown } = useDrag({
    onDragEnd: handleDragEnd,
    onClick: handleBlockClick,
    dayWidth,
    timelineStart: activeTimelineStart,
    snapToWeek: false, // always snap to day for precise placement
  });

  // --- Track last click Y for dialog positioning ---
  const lastClickYRef = useRef<number | undefined>(undefined);
  useEffect(() => {
    const handler = (e: MouseEvent) => { lastClickYRef.current = e.clientY; };
    document.addEventListener('click', handler, true);
    return () => document.removeEventListener('click', handler, true);
  }, []);

  // --- Swimlane event handlers ---
  const handleEditBlock = useCallback((block: Block) => {
    setDialogAnchorY(lastClickYRef.current);
    setEditingBlock(block);
    setIsNewBlock(false);
  }, []);

  const handleEditUnavailableClick = useCallback((entry: Unavailable) => {
    setDialogAnchorY(lastClickYRef.current);
    setEditingUnavailable(entry);
    setIsNewUnavailable(false);
  }, []);

  const handlePercentChange = useCallback(
    (block: Block, newPercent: number) => {
      if (!rawData.blocks.find((b) => b.id === block.id)) return;
      setData({
        ...rawData,
        blocks: rawData.blocks.map((b) =>
          b.id === block.id
            ? { ...b, percent: newPercent, updatedAt: new Date().toISOString() }
            : b,
        ),
      });
    },
    [rawData, setData],
  );

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
      if (!isEditorMode || isPresentationMode) return;
      setDefaultPerson(personId);
      setDefaultDate(format(date, 'yyyy-MM-dd'));
      setEditingBlock(null);
      setIsNewBlock(true);
    },
    [isEditorMode, isPresentationMode],
  );

  // --- Toolbar actions ---
  const handleNewBlock = useCallback(() => {
    setDefaultPerson(data.people[0]?.id);
    setDefaultDate(format(new Date(), 'yyyy-MM-dd'));
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
    // Flash the today marker after scroll
    if (goToTodayTimerRef.current) clearTimeout(goToTodayTimerRef.current);
    goToTodayTimerRef.current = setTimeout(() => {
      const marker = timelineRef.current?.querySelector('.timeline-header__today-marker');
      if (marker) {
        marker.classList.remove('timeline-header__today-marker--flash');
        void (marker as HTMLElement).offsetWidth; // force reflow
        marker.classList.add('timeline-header__today-marker--flash');
      }
    }, 400);
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
    setDialogAnchorY(undefined);
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
          if (!selectedBlockId) return;
          const block = rawData.blocks.find((b) => b.id === selectedBlockId);
          if (block && window.confirm(`Slett "${block.title}"?`)) {
            setData({ ...rawData, blocks: rawData.blocks.filter((b) => b.id !== selectedBlockId) });
            setSelectedBlockId(null);
          }
        },
      }),
      [undo, redo, handleSave, closeAllDialogs, selectedBlockId, rawData, setData],
    ),
  );

  // --- Milestone click ---
  const handleMilestoneClick = useCallback((ms: Milestone) => {
    setEditingMilestone(ms);
    setIsNewMilestone(false);
  }, []);

  // --- Swimlane right-click custom event ---
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        handleSwimlaneContextMenu(detail.personId, detail.x, detail.y, detail.date);
      }
    };
    const el = timelineRef.current;
    el?.addEventListener('swimlane-context', handler);
    return () => el?.removeEventListener('swimlane-context', handler);
  }, [handleSwimlaneContextMenu]);

  // --- Click to deselect block ---
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.block') &&
          !(e.target as HTMLElement).closest('.context-menu')) {
        setSelectedBlockId(null);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, []);

  // --- Sync isPresentationMode when user exits fullscreen via Escape ---
  useEffect(() => {
    const handler = () => {
      if (!document.fullscreenElement) setIsPresentationMode(false);
    };
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // --- Scroll to today on initial load ---
  const hasScrolledToToday = useRef(false);
  useEffect(() => {
    if (isLoading || hasScrolledToToday.current || !timelineRef.current) return;
    hasScrolledToToday.current = true;
    const offset = dateToPixelOffset(new Date(), activeTimelineStart, dayWidth);
    // Place today ~200px from the left edge (instant, no animation)
    timelineRef.current.scrollLeft = Math.max(0, offset - 200);
  }, [isLoading, activeTimelineStart, dayWidth]);

  // --- Cleanup goToToday timer on unmount ---
  useEffect(() => () => {
    if (goToTodayTimerRef.current) clearTimeout(goToTodayTimerRef.current);
  }, []);

  // --- Loading skeleton ---
  if (isLoading) {
    return (
      <div className="app">
        <div className="skeleton-toolbar" />
        <div className="skeleton-summary" />
        <div className="skeleton-timeline">
          <div className="skeleton-header" />
          <div className="skeleton-row"><div className="skeleton-label" /><div className="skeleton-blocks"><div className="skeleton-block" style={{ width: '35%' }} /><div className="skeleton-block" style={{ width: '25%', animationDelay: '0.1s' }} /></div></div>
          <div className="skeleton-row"><div className="skeleton-label" /><div className="skeleton-blocks"><div className="skeleton-block" style={{ width: '45%', animationDelay: '0.15s' }} /><div className="skeleton-block" style={{ width: '20%', animationDelay: '0.2s' }} /></div></div>
        </div>
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
        zoomLevel={zoomLevel}
        isEditorMode={isEditorMode}
        onSave={handleSave}
        onUndo={undo}
        onRedo={redo}
        onNewBlock={handleNewBlock}
        onNewMilestone={handleNewMilestone}
        onNewUnavailable={handleNewUnavailable}
        onTogglePresentation={() => {
          const entering = !isPresentationMode;
          setIsPresentationMode(entering);
          if (entering) {
            document.documentElement.requestFullscreen?.().catch(() => {});
            // Scroll to today after layout shift
            setTimeout(() => handleGoToToday(), 150);
          } else {
            document.exitFullscreen?.().catch(() => {});
          }
        }}
        onGoToToday={handleGoToToday}
        onZoomChange={handleZoomChange}
      />

      {/* Offline banner */}
      {!isOnline && (
        <div className="offline-banner">
          Offline — endringer lagres lokalt
        </div>
      )}

      {/* Auto-save indicator */}
      {autoSaveStatus !== 'idle' && (
        <div className={`autosave-indicator autosave-indicator--${autoSaveStatus}`}>
          {autoSaveStatus === 'pending' && 'Ulagrede endringer...'}
          {autoSaveStatus === 'saving' && 'Lagrer...'}
          {autoSaveStatus === 'saved' && 'Lagret \u2713'}
        </div>
      )}

      {/* Capacity summary — dashboard in presentation, compact otherwise */}
      {isPresentationMode ? (
        <PresentationDashboard data={data} />
      ) : (
        <ThisWeekSummary data={data} />
      )}

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
              <div className="timeline-header__corner" />
              <div style={{ position: 'relative', flex: 1 }}>
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
            </div>
          )}

          {/* Swimlanes */}
          {data.people.map((person, personIndex) => (
            <Swimlane
              key={person.id}
              person={person}
              index={personIndex}
              blocks={data.blocks}
              unavailable={data.unavailable}
              weeks={activeWeeks}
              dayWidth={dayWidth}
              timelineStart={activeTimelineStart}
              selectedBlockId={selectedBlockId}
              onEditBlock={handleEditBlock}
              onDragStart={handleSwimlanePointerDown}
              onResizeStart={handleSwimlaneResizeStart}
              onDoubleClick={handleSwimlaneDoubleClick}
              onBlockContextMenu={handleBlockContextMenu}
              onEditUnavailable={handleEditUnavailableClick}
              onPercentChange={handlePercentChange}
            />
          ))}

          {/* Milestones */}
          {data.milestones.length > 0 && (
            <MilestoneRow
              milestones={data.milestones}
              dayWidth={dayWidth}
              timelineStart={activeTimelineStart}
              onMilestoneClick={handleMilestoneClick}
            />
          )}
        </div>
      </div>

      {/* Legend */}
      <Legend blocks={data.blocks} />

      {/* Presentation mode exit button */}
      {isPresentationMode && (
        <button
          onClick={() => {
            setIsPresentationMode(false);
            document.exitFullscreen?.().catch(() => {});
          }}
          className="presentation-exit"
        >
          Avslutt presentasjon
        </button>
      )}

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          block={contextMenu.block}
          personId={contextMenu.personId}
          clickDate={contextMenu.clickDate}
          onClose={() => setContextMenu(null)}
          onEdit={(block) => { setEditingBlock(block); setIsNewBlock(false); }}
          onDuplicate={handleDuplicateBlock}
          onDelete={handleContextDeleteBlock}
          onNewBlock={handleContextNewBlock}
          onNewMilestone={(date) => {
            setEditingMilestone(null);
            setIsNewMilestone(true);
            setDefaultDate(format(date, 'yyyy-MM-dd'));
          }}
        />
      )}

      {/* --- Dialogs --- */}

      {/* Block dialog */}
      <BlockDialog
        block={editingBlock}
        people={data.people}
        isOpen={blockDialogOpen}
        onClose={() => { setEditingBlock(null); setIsNewBlock(false); setDialogAnchorY(undefined); }}
        onSave={handleSaveBlock}
        onDelete={handleDeleteBlock}
        defaultPerson={defaultPerson}
        defaultStartDate={defaultDate}
        anchorY={dialogAnchorY}
      />

      {/* Milestone dialog */}
      <MilestoneDialog
        milestone={editingMilestone}
        isOpen={milestoneDialogOpen}
        onClose={() => { setEditingMilestone(null); setIsNewMilestone(false); }}
        onSave={handleSaveMilestone}
        onDelete={handleDeleteMilestone}
        defaultDate={defaultDate}
      />

      {/* Unavailable dialog */}
      <UnavailableDialog
        unavailable={editingUnavailable}
        people={data.people}
        isOpen={unavailableDialogOpen}
        onClose={() => { setEditingUnavailable(null); setIsNewUnavailable(false); setDialogAnchorY(undefined); }}
        onSave={handleSaveUnavailable}
        onDelete={handleDeleteUnavailable}
        defaultPerson={defaultPerson}
        defaultStartDate={defaultDate}
        anchorY={dialogAnchorY}
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
