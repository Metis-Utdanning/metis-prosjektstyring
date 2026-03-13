export const PALETTE = [
  '#6B8ADB', '#5BA88C', '#D4A853', '#C96B6B', '#8B7BC7',
  '#C4789A', '#6B9EC7', '#8FB85A', '#D4885A', '#7B7BD5',
  '#5BA8A0', '#9B7BC7',
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
