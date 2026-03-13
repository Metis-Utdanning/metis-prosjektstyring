import { useReducer, useCallback, useMemo } from 'react';
import { MAX_UNDO_STEPS } from '../utils/constants.ts';

export interface UndoableActions<T> {
  state: T;
  setState: (next: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  /** Replace the entire history with a fresh initial value (e.g. after load). */
  reset: (value: T) => void;
}

// ── Reducer types ──────────────────────────────────────────────

interface UndoState<T> {
  history: T[];
  index: number;
}

type UndoAction<T> =
  | { type: 'SET'; next: T }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; value: T };

function undoReducer<T>(state: UndoState<T>, action: UndoAction<T>): UndoState<T> {
  switch (action.type) {
    case 'SET': {
      // Discard any redo-future beyond the current index, then push new value
      const base = state.history.slice(0, state.index + 1);
      const updated = [...base, action.next];
      // Cap length at MAX_UNDO_STEPS
      if (updated.length > MAX_UNDO_STEPS) {
        updated.splice(0, updated.length - MAX_UNDO_STEPS);
      }
      return {
        history: updated,
        index: updated.length - 1,
      };
    }
    case 'UNDO': {
      if (state.index <= 0) return state;
      return { ...state, index: state.index - 1 };
    }
    case 'REDO': {
      if (state.index >= state.history.length - 1) return state;
      return { ...state, index: state.index + 1 };
    }
    case 'RESET': {
      return { history: [action.value], index: 0 };
    }
  }
}

// ── Hook ───────────────────────────────────────────────────────

/**
 * useUndoableState — generic undo/redo hook.
 *
 * Keeps a history stack capped at MAX_UNDO_STEPS entries.
 * `setState` pushes a new snapshot, discarding any redo-future.
 * `reset` replaces the full history (useful after loading from GitHub).
 *
 * Uses a single `useReducer` so history and index are always updated
 * atomically — no stale-closure bugs under rapid edits.
 */
export function useUndoableState<T>(initial: T): UndoableActions<T> {
  const [{ history, index }, dispatch] = useReducer(undoReducer<T>, {
    history: [initial],
    index: 0,
  });

  const state = history[index] as T;

  // All callbacks are stable (dispatch identity never changes)
  const setState = useCallback(
    (next: T) => dispatch({ type: 'SET', next }),
    [],
  );

  const undo = useCallback(() => dispatch({ type: 'UNDO' }), []);

  const redo = useCallback(() => dispatch({ type: 'REDO' }), []);

  const reset = useCallback(
    (value: T) => dispatch({ type: 'RESET', value }),
    [],
  );

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  return useMemo(
    () => ({ state, setState, undo, redo, canUndo, canRedo, reset }),
    [state, setState, undo, redo, canUndo, canRedo, reset],
  );
}
