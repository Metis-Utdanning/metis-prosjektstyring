import { useState, useCallback, useEffect, useRef } from 'react';
import './Dialogs.css';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ToolbarProps {
  unsavedCount: number;
  isSaving: boolean;
  canUndo: boolean;
  canRedo: boolean;
  isPresentationMode: boolean;
  error: string | null;
  onSave: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onNewBlock: () => void;
  onNewMilestone: () => void;
  onNewUnavailable: () => void;
  onTogglePresentation: () => void;
  onGoToToday: () => void;
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

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey;
      if (isMeta && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        onUndo();
      } else if (isMeta && e.key === 'z' && e.shiftKey) {
        e.preventDefault();
        onRedo();
      } else if (isMeta && e.key === 's') {
        e.preventDefault();
        onSave();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onUndo, onRedo, onSave]);

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
          ↩
        </button>
        <button
          type="button"
          className="toolbar__btn toolbar__btn--icon"
          onClick={onRedo}
          disabled={!canRedo}
          aria-label="Gjenta"
          title="Gjenta (Ctrl+Shift+Z)"
        >
          ↪
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
