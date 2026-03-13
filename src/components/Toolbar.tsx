import { useState, useCallback, useEffect, useRef } from 'react';
import './Dialogs.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

type ZoomLevel = 'narrow' | 'normal' | 'wide';

export interface ToolbarProps {
  unsavedCount: number;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isPresentationMode: boolean;
  error: string | null;
  zoomLevel?: ZoomLevel;
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
  onZoomChange,
}: ToolbarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showError, setShowError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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
          disabled={isSaving || unsavedCount === 0}
        >
          {isSaving ? (
            <>
              <span className="toolbar__spinner" />
              Lagrer...
            </>
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
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
          >
            + Ny
          </button>
          {dropdownOpen && (
            <div className="toolbar__dropdown">
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
      <div className="toolbar__group">
        <button
          type="button"
          className={`toolbar__btn toolbar__btn--icon${zoomLevel === 'narrow' ? ' toolbar__btn--active' : ''}`}
          onClick={() => onZoomChange?.('narrow')}
          aria-label="Smal visning"
          title="Smal"
        >
          &#8722;
        </button>
        <button
          type="button"
          className={`toolbar__btn toolbar__btn--icon${zoomLevel === 'normal' ? ' toolbar__btn--active' : ''}`}
          onClick={() => onZoomChange?.('normal')}
          aria-label="Normal visning"
          title="Normal"
        >
          &#9633;
        </button>
        <button
          type="button"
          className={`toolbar__btn toolbar__btn--icon${zoomLevel === 'wide' ? ' toolbar__btn--active' : ''}`}
          onClick={() => onZoomChange?.('wide')}
          aria-label="Bred visning"
          title="Bred"
        >
          &#43;
        </button>
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
