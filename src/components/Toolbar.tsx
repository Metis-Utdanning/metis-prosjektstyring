import { useState, useCallback, useEffect, useRef } from 'react';
import './Dialogs.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ZoomLevel = 'compact' | 'narrow' | 'normal' | 'wide' | 'detail';

export interface ToolbarProps {
  unsavedCount: number;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isPresentationMode: boolean;
  error: string | null;
  zoomLevel?: ZoomLevel;
  isEditorMode?: boolean;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onNewBlock: () => void;
  onNewMilestone: () => void;
  onNewUnavailable: () => void;
  onTogglePresentation: () => void;
  onGoToToday: () => void;
  onZoomChange?: (level: ZoomLevel) => void;
}

const ZOOM_LEVELS: ZoomLevel[] = ['compact', 'narrow', 'normal', 'wide', 'detail'];
const ZOOM_INDEX: Record<ZoomLevel, number> = { compact: 0, narrow: 1, normal: 2, wide: 3, detail: 4 };
const ZOOM_LABELS: Record<ZoomLevel, string> = {
  compact: 'Kompakt',
  narrow: 'Smal',
  normal: 'Normal',
  wide: 'Bred',
  detail: 'Detalj',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function Toolbar({
  unsavedCount,
  isSaving,
  canUndo,
  canRedo,
  isPresentationMode,
  error,
  onSave,
  onUndo,
  onRedo,
  onNewBlock,
  onNewMilestone,
  onNewUnavailable,
  onTogglePresentation,
  onGoToToday,
  zoomLevel = 'normal',
  isEditorMode = false,
  onZoomChange,
}: ToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number } | null>(null);
  const [showError, setShowError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownBtnRef = useRef<HTMLButtonElement>(null);

  // --- Sync error visibility ---
  useEffect(() => {
    if (error) {
      setShowError(true);
    }
  }, [error]);

  // --- Close dropdown on click outside ---
  useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('pointerdown', handleClick);
    return () => document.removeEventListener('pointerdown', handleClick);
  }, [dropdownOpen]);

  // Keyboard shortcuts are handled globally by useKeyboard in App.tsx

  const handleDropdownAction = useCallback(
    (action: () => void) => {
      setDropdownOpen(false);
      action();
    },
    [],
  );

  const dismissError = useCallback(() => {
    setShowError(false);
  }, []);

  // In presentation mode, hide editing controls
  if (isPresentationMode) {
    return (
      <div className="toolbar">
        <span style={{ fontWeight: 600, fontSize: 14 }}>Metis Kapasitetskalender</span>
        <div className="toolbar__group--right">
          <button
            type="button"
            className="toolbar__btn toolbar__btn--active"
            onClick={onTogglePresentation}
          >
            Avslutt presentasjon
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="toolbar">
      {/* App title */}
      <span className="toolbar__title">Kapasitetskalender</span>

      <div className="toolbar__separator" />

      {/* Left group: Save + Add */}
      <div className="toolbar__group">
        <button
          type="button"
          className="toolbar__btn toolbar__btn--save"
          onClick={onSave}
          disabled={isSaving || (isEditorMode && unsavedCount === 0)}
        >
          {isSaving ? (
            <>
              <span className="toolbar__spinner" />
              Lagrer...
            </>
          ) : !isEditorMode ? (
            'Logg inn med GitHub'
          ) : (
            <>
              Lagre til GitHub
              {unsavedCount > 0 && (
                <span className="toolbar__badge">
                  {unsavedCount}
                </span>
              )}
            </>
          )}
        </button>
      </div>

      <div className="toolbar__separator" />

      {/* Add dropdown */}
      <div className="toolbar__group">
        <div className="toolbar__dropdown-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className="toolbar__btn"
            ref={dropdownBtnRef}
            onClick={() => {
              if (!dropdownOpen && dropdownBtnRef.current) {
                const rect = dropdownBtnRef.current.getBoundingClientRect();
                setDropdownPos({ top: rect.bottom + 6, left: rect.left });
              }
              setDropdownOpen((prev) => !prev);
            }}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            + Ny
          </button>
          {dropdownOpen && dropdownPos && (
            <div className="toolbar__dropdown" style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left }}>
              <button
                type="button"
                className="toolbar__dropdown-item"
                onClick={() => handleDropdownAction(onNewBlock)}
              >
                Ny blokk
              </button>
              <button
                type="button"
                className="toolbar__dropdown-item"
                onClick={() => handleDropdownAction(onNewMilestone)}
              >
                Ny milepæl
              </button>
              <button
                type="button"
                className="toolbar__dropdown-item"
                onClick={() => handleDropdownAction(onNewUnavailable)}
              >
                Nytt fravær
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="toolbar__separator" />

      {/* Navigation */}
      <div className="toolbar__group">
        <button
          type="button"
          className="toolbar__btn"
          onClick={onGoToToday}
        >
          I dag
        </button>
      </div>

      <div className="toolbar__separator" />

      {/* Zoom */}
      <div className="toolbar__group" style={{ gap: 6, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: '#a8a29e', whiteSpace: 'nowrap' }}>Zoom</span>
        <input
          type="range"
          min={0}
          max={4}
          step={1}
          value={ZOOM_INDEX[zoomLevel]}
          onChange={(e) => onZoomChange?.(ZOOM_LEVELS[Number(e.target.value)])}
          className="toolbar__zoom-slider"
          aria-label="Zoom-nivå"
          title={ZOOM_LABELS[zoomLevel]}
        />
        <span style={{ fontSize: 10, color: '#d6d3d1', minWidth: 32, textAlign: 'center' }}>
          {ZOOM_LABELS[zoomLevel]}
        </span>
      </div>

      <div className="toolbar__separator" />

      {/* Undo / Redo */}
      <div className="toolbar__group">
        <button
          type="button"
          className="toolbar__btn toolbar__btn--icon"
          onClick={onUndo}
          disabled={!canUndo}
          aria-label="Angre"
          title="Angre (Ctrl+Z)"
        >
          &#8630;
        </button>
        <button
          type="button"
          className="toolbar__btn toolbar__btn--icon"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Gjenta"
          title="Gjenta (Ctrl+Shift+Z)"
        >
          &#8631;
        </button>
      </div>

      {/* Right group: Presentation + Error */}
      <div className="toolbar__group toolbar__group--right">
        {showError && error && (
          <div className="toolbar__error">
            <span>{error}</span>
            <button
              type="button"
              className="toolbar__error-dismiss"
              onClick={dismissError}
              aria-label="Lukk feilmelding"
            >
              &times;
            </button>
          </div>
        )}

        <button
          type="button"
          className={`toolbar__btn${isPresentationMode ? ' toolbar__btn--active' : ''}`}
          onClick={onTogglePresentation}
        >
          Presentasjon
        </button>
      </div>
    </div>
  );
}
