import type { CalendarData } from '../types/index.ts';
import { GITHUB_OWNER, GITHUB_DATA_REPO, GITHUB_DATA_FILE, DEFAULT_DATA } from './constants.ts';

// ---------------------------------------------------------------------------
// Error types
// ---------------------------------------------------------------------------

export class GitHubConflictError extends Error {
  constructor(message = 'SHA mismatch — someone else saved since your last load') {
    super(message);
    this.name = 'GitHubConflictError';
  }
}

export class GitHubAuthError extends Error {
  constructor(message = 'Token is missing or invalid') {
    super(message);
    this.name = 'GitHubAuthError';
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const API_BASE = 'https://api.github.com';
const RAW_BASE = 'https://raw.githubusercontent.com';

function contentsUrl(): string {
  return `${API_BASE}/repos/${GITHUB_OWNER}/${GITHUB_DATA_REPO}/contents/${GITHUB_DATA_FILE}`;
}

function rawUrl(): string {
  return `${RAW_BASE}/${GITHUB_OWNER}/${GITHUB_DATA_REPO}/main/${GITHUB_DATA_FILE}`;
}

// ---------------------------------------------------------------------------
// fetchCalendarData
// ---------------------------------------------------------------------------
// If a token is provided, use the GitHub Contents API (returns base64 + sha).
// Otherwise, try the raw URL (public repos only, no SHA available).
// Returns DEFAULT_DATA when the file does not exist yet.
// ---------------------------------------------------------------------------

export interface FetchResult {
  data: CalendarData;
  sha: string | null;
}

export async function fetchCalendarData(token?: string): Promise<FetchResult> {
  if (token) {
    return fetchViaApi(token);
  }
  return fetchViaRaw();
}

async function fetchViaApi(token: string): Promise<FetchResult> {
  const res = await fetch(contentsUrl(), {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  });

  if (res.status === 404) {
    return { data: { ...DEFAULT_DATA } as CalendarData, sha: null };
  }

  if (res.status === 401 || res.status === 403) {
    throw new GitHubAuthError();
  }

  if (!res.ok) {
    throw new Error(`GitHub API error: ${res.status} ${res.statusText}`);
  }

  const json = (await res.json()) as { content: string; sha: string };
  const decoded = atob(json.content.replace(/\n/g, ''));
  const data = JSON.parse(decoded) as CalendarData;
  return { data, sha: json.sha };
}

async function fetchViaRaw(): Promise<FetchResult> {
  const res = await fetch(rawUrl());

  if (res.status === 404) {
    return { data: { ...DEFAULT_DATA } as CalendarData, sha: null };
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch data.json: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as CalendarData;
  // Raw URL does not provide a SHA — edits are impossible without a token
  return { data, sha: null };
}

// ---------------------------------------------------------------------------
// saveCalendarData
// ---------------------------------------------------------------------------
// PUT via the GitHub Contents API. Requires a token and the SHA of the
// currently known version for conflict detection.
// Returns the new SHA after a successful commit.
// ---------------------------------------------------------------------------

export async function saveCalendarData(
  data: CalendarData,
  sha: string | null,
  token: string,
): Promise<string> {
  const jsonStr = JSON.stringify(data, null, 2);
  const bytes = new TextEncoder().encode(jsonStr);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  const content = btoa(binary);

  const body: Record<string, unknown> = {
    message: `Oppdater kapasitetsdata (${new Date().toLocaleString('nb-NO')})`,
    content,
  };

  // Include sha for updates (conflict detection). Omit for initial creation.
  if (sha) {
    body.sha = sha;
  }

  const res = await fetch(contentsUrl(), {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 409 || res.status === 422) {
    throw new GitHubConflictError();
  }

  if (res.status === 401 || res.status === 403) {
    throw new GitHubAuthError();
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub save failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { content: { sha: string } };
  return json.content.sha;
}
