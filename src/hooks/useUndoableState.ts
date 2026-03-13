import { useState, useCallback, useMemo } from 'react';
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

/**
 * useUndoableState — generic undo/redo hook.
 *
 * Keeps a history stack capped at MAX_UNDO_STEPS entries.
 * `setState` pushes a new snapshot, discarding any redo-future.
 * `reset` replaces the full history (useful after loading from GitHub).
 */
export function useUndoableState<T>(initial: T): UndoableActions<T> {
  // history[0..index] = past + present, history[index+1..] = redo future
  const [history, setHistory] = useState<T[]>([initial]);
  const [index, setIndex] = useState(0);

  const state = history[index] as T;

  const setState = useCallback(
    (next: T) => {
      setHistory((prev) => {
        // Discard any redo-future beyond the current index
        const base = prev.slice(0, index + 1);
        const updated = [...base, next];
        // Cap length
        if (updated.length > MAX_UNDO_STEPS) {
          updated.splice(0, updated.length - MAX_UNDO_STEPS);
        }
        return updated;
      });
      setIndex((prev) => {
        const next = prev + 1;
        return next >= MAX_UNDO_STEPS ? MAX_UNDO_STEPS - 1 : next;
      });
    },
    [index],
  );

  const undo = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  const redo = useCallback(() => {
    setIndex((i) => Math.min(history.length - 1, i + 1));
  }, [history.length]);

  const canUndo = index > 0;
  const canRedo = index < history.length - 1;

  const reset = useCallback((value: T) => {
    setHistory([value]);
    setIndex(0);
  }, []);

  return useMemo(
    () => ({ state, setState, undo, redo, canUndo, canRedo, reset }),
    [state, setState, undo, redo, canUndo, canRedo, reset],
  );
}
