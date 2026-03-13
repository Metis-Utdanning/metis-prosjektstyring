export const PALETTE = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7',
];

export const GITHUB_OWNER = 'Metis-Utdanning';
export const GITHUB_DATA_REPO = 'metis-prosjektstyring';
export const GITHUB_DATA_FILE = 'data.json';

export const DEFAULT_DATA = {
  version: 1,
  people: [
    { id: 'fredrik', name: 'Fredrik' },
    { id: 'simen', name: 'Simen' },
  ],
  blocks: [],
  unavailable: [],
  milestones: [],
};

export const WEEK_COLUMN_WIDTH = 80; // px in overview
export const DAY_COLUMN_WIDTH = 120; // px in week detail
export const SWIMLANE_HEIGHT = 160; // px reference height for 100%
export const DRAG_THRESHOLD = 4; // px before drag activates
export const MAX_UNDO_STEPS = 50;
