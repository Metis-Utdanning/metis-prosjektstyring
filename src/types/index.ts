export interface Person {
  id: string;
  name: string;
}

export interface Block {
  id: string;
  title: string;
  person: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  percent: number;   // 1-100
  color: string;     // hex
  status: 'planned' | 'active' | 'done';
  description?: string;
  links?: string[];
  updatedAt: string; // ISO 8601
  updatedBy: string; // person id
}

export interface Unavailable {
  id: string;
  person: string;
  startDate: string;
  endDate: string;
  label: string;
}

export interface Milestone {
  id: string;
  title: string;
  date: string;
  description?: string;
}

export interface CalendarData {
  version: number;
  people: Person[];
  blocks: Block[];
  unavailable: Unavailable[];
  milestones: Milestone[];
}

export type ViewMode = 'overview' | 'week';
export type DragMode = 'move' | 'resize-start' | 'resize-end';

export interface WeekInfo {
  weekNumber: number;
  year: number;
  startDate: Date;
  endDate: Date;
}
