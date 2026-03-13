import { useEffect } from 'react';

export interface KeyboardHandlers {
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onEscape: () => void;
  onDelete: () => void;
}

/**
 * useKeyboard — global keyboard shortcuts.
 *
 * - Ctrl+Z / Cmd+Z          → undo
 * - Ctrl+Shift+Z / Cmd+Shift+Z / Ctrl+Y / Cmd+Y  → redo
 * - Ctrl+S / Cmd+S          → save (prevents browser save dialog)
 * - Escape                   → cancel / close
 * - Delete / Backspace       → delete selected block
 *
 * Handlers are suppressed when the active element is an input, textarea,
 * select, or contenteditable — so typing in forms works normally.
 */
export function useKeyboard(handlers: KeyboardHandlers): void {
  useEffect(() => {
    function isEditableTarget(e: KeyboardEvent): boolean {
      const el = e.target;
      if (!(el instanceof HTMLElement)) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    }

    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;

      // Ctrl+S / Cmd+S — always intercept (even in inputs)
      if (mod && e.key === 's') {
        e.preventDefault();
        handlers.onSave();
        return;
      }

      // Escape — always intercept
      if (e.key === 'Escape') {
        handlers.onEscape();
        return;
      }

      // The remaining shortcuts should not fire when editing text
      if (isEditableTarget(e)) return;

      // Ctrl+Shift+Z / Cmd+Shift+Z → redo
      if (mod && e.shiftKey && e.key === 'Z') {
        e.preventDefault();
        handlers.onRedo();
        return;
      }

      // Ctrl+Z / Cmd+Z → undo
      if (mod && e.key === 'z') {
        e.preventDefault();
        handlers.onUndo();
        return;
      }

      // Ctrl+Y / Cmd+Y → redo (alternative)
      if (mod && e.key === 'y') {
        e.preventDefault();
        handlers.onRedo();
        return;
      }

      // Delete / Backspace → delete
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        handlers.onDelete();
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
}
