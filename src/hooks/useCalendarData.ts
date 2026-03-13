import { useState, useEffect, useCallback, useRef } from 'react';
import type { CalendarData, Block, Milestone, Unavailable } from '../types/index.ts';
import { DEFAULT_DATA } from '../utils/constants.ts';
import {
  fetchCalendarData,
  saveCalendarData,
  GitHubConflictError,
  GitHubAuthError,
  type FetchResult,
} from '../utils/github.ts';
import { useUndoableState } from './useUndoableState.ts';

// ---------------------------------------------------------------------------
// localStorage cache
// ---------------------------------------------------------------------------

const CACHE_KEY = 'metis-kapasitet-cache';

function readCache(): CalendarData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) return JSON.parse(raw) as CalendarData;
  } catch {
    // corrupt cache — ignore
  }
  return null;
}

function writeCache(data: CalendarData): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch {
    // storage full — ignore
  }
}

// ---------------------------------------------------------------------------
// Auto-merge helpers
// ---------------------------------------------------------------------------

/**
 * Attempt a UUID-based auto-merge between local changes and the remote version.
 * Returns the merged data if successful, or null if there are conflicts on the
 * same block (requiring manual resolution).
 */
function attemptAutoMerge(
  local: CalendarData,
  remote: CalendarData,
  base: CalendarData,
): CalendarData | null {
  const mergedBlocks = mergeById(base.blocks, local.blocks, remote.blocks);
  if (!mergedBlocks) return null;

  const mergedMilestones = mergeById(base.milestones, local.milestones, remote.milestones);
  if (!mergedMilestones) return null;

  const mergedUnavailable = mergeById(base.unavailable, local.unavailable, remote.unavailable);
  if (!mergedUnavailable) return null;

  return {
    ...remote,
    blocks: mergedBlocks as Block[],
    milestones: mergedMilestones as Milestone[],
    unavailable: mergedUnavailable as Unavailable[],
  };
}

type WithId = { id: string };

/**
 * Three-way merge of arrays keyed by `id`.
 * Returns null if the same item was modified in both local and remote relative to base.
 */
function mergeById<T extends WithId>(base: T[], local: T[], remote: T[]): T[] | null {
  const baseMap = new Map(base.map((item) => [item.id, item]));
  const localMap = new Map(local.map((item) => [item.id, item]));
  const remoteMap = new Map(remote.map((item) => [item.id, item]));

  const allIds = new Set([
    ...baseMap.keys(),
    ...localMap.keys(),
    ...remoteMap.keys(),
  ]);

  const result: T[] = [];

  for (const id of allIds) {
    const inBase = baseMap.get(id);
    const inLocal = localMap.get(id);
    const inRemote = remoteMap.get(id);

    const localChanged = JSON.stringify(inBase) !== JSON.stringify(inLocal);
    const remoteChanged = JSON.stringify(inBase) !== JSON.stringify(inRemote);

    if (localChanged && remoteChanged) {
      // Both sides touched the same item — conflict
      return null;
    }

    if (localChanged) {
      // Local wins (added or modified locally)
      if (inLocal) result.push(inLocal);
      // If inLocal is undefined the item was deleted locally
    } else if (remoteChanged) {
      // Remote wins
      if (inRemote) result.push(inRemote);
    } else {
      // No change — keep as-is (prefer remote as canonical)
      if (inRemote) result.push(inRemote);
      else if (inLocal) result.push(inLocal);
    }
  }

  return result;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseCalendarDataReturn {
  data: CalendarData;
  setData: (next: CalendarData) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  save: () => Promise<void>;
  reload: () => Promise<void>;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  unsavedChanges: number;
}

export function useCalendarData(token: string | null): UseCalendarDataReturn {
  const {
    state: data,
    setState: setData,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  } = useUndoableState<CalendarData>(DEFAULT_DATA as CalendarData);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unsavedChanges, setUnsavedChanges] = useState(0);

  // SHA of the last known remote version (for conflict detection)
  const shaRef = useRef<string | null>(null);
  // Snapshot of data at last save/load — used as merge base
  const baseDataRef = useRef<CalendarData>(DEFAULT_DATA as CalendarData);

  // Track unsaved changes by comparing current data to base
  useEffect(() => {
    const current = JSON.stringify(data);
    const base = JSON.stringify(baseDataRef.current);
    if (current === base) {
      setUnsavedChanges(0);
    } else {
      // Count discrete entity-level differences
      let count = 0;
      const baseBlocks = new Map(baseDataRef.current.blocks.map((b) => [b.id, b]));
      const baseMilestones = new Map(baseDataRef.current.milestones.map((m) => [m.id, m]));
      const baseUnavail = new Map(baseDataRef.current.unavailable.map((u) => [u.id, u]));

      for (const b of data.blocks) {
        if (JSON.stringify(baseBlocks.get(b.id)) !== JSON.stringify(b)) count++;
      }
      for (const id of baseBlocks.keys()) {
        if (!data.blocks.some((b) => b.id === id)) count++;
      }
      for (const m of data.milestones) {
        if (JSON.stringify(baseMilestones.get(m.id)) !== JSON.stringify(m)) count++;
      }
      for (const id of baseMilestones.keys()) {
        if (!data.milestones.some((m) => m.id === id)) count++;
      }
      for (const u of data.unavailable) {
        if (JSON.stringify(baseUnavail.get(u.id)) !== JSON.stringify(u)) count++;
      }
      for (const id of baseUnavail.keys()) {
        if (!data.unavailable.some((u) => u.id === id)) count++;
      }

      setUnsavedChanges(Math.max(count, current !== base ? 1 : 0));
    }
  }, [data]);

  // -----------------------------------------------------------------------
  // Load
  // -----------------------------------------------------------------------

  const load = useCallback(
    async () => {
      setIsLoading(true);
      setError(null);
      try {
        const result: FetchResult = await fetchCalendarData(token ?? undefined);
        shaRef.current = result.sha;
        baseDataRef.current = result.data;
        reset(result.data);
        writeCache(result.data);
        setUnsavedChanges(0);
      } catch (err) {
        // Fall back to cache
        const cached = readCache();
        if (cached) {
          reset(cached);
          baseDataRef.current = cached;
          setError('Kunne ikke laste fra GitHub. Viser cachet data.');
        } else {
          reset(DEFAULT_DATA as CalendarData);
          baseDataRef.current = DEFAULT_DATA as CalendarData;
          if (err instanceof GitHubAuthError) {
            setError('Ugyldig eller utl\u00F8pt token. Lim inn en ny.');
          } else {
            setError(err instanceof Error ? err.message : 'Ukjent feil ved lasting');
          }
        }
      } finally {
        setIsLoading(false);
      }
    },
    [token, reset],
  );

  useEffect(() => {
    void load();
  }, [load]);

  // -----------------------------------------------------------------------
  // Save
  // -----------------------------------------------------------------------

  const save = useCallback(async () => {
    if (!token) {
      setError('Du m\u00E5 lime inn en GitHub-token for \u00E5 lagre.');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const newSha = await saveCalendarData(data, shaRef.current, token);
      shaRef.current = newSha;
      baseDataRef.current = data;
      writeCache(data);
      setUnsavedChanges(0);
    } catch (err) {
      if (err instanceof GitHubConflictError) {
        // Attempt auto-merge
        try {
          const remote = await fetchCalendarData(token);
          const merged = attemptAutoMerge(baseDataRef.current, data, remote.data);
          if (merged) {
            // Auto-merge succeeded — save the merged result
            const newSha = await saveCalendarData(merged, remote.sha, token);
            shaRef.current = newSha;
            baseDataRef.current = merged;
            reset(merged);
            writeCache(merged);
            setUnsavedChanges(0);
          } else {
            setError(
              'Konflikt: noen andre har endret de samme blokkene. ' +
              'Last inn p\u00E5 nytt og pr\u00F8v igjen.',
            );
          }
        } catch {
          setError('Konflikt ved lagring, og auto-merge feilet. Last inn p\u00E5 nytt.');
        }
      } else if (err instanceof GitHubAuthError) {
        setError('Token er ugyldig eller utl\u00F8pt. Lim inn en ny.');
      } else {
        setError(err instanceof Error ? err.message : 'Ukjent feil ved lagring');
      }
    } finally {
      setIsSaving(false);
    }
  }, [data, token, reset]);

  // -----------------------------------------------------------------------
  // beforeunload warning
  // -----------------------------------------------------------------------

  useEffect(() => {
    if (unsavedChanges === 0) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [unsavedChanges]);

  return {
    data,
    setData,
    undo,
    redo,
    canUndo,
    canRedo,
    save,
    reload: load,
    isLoading,
    isSaving,
    error,
    unsavedChanges,
  };
}
