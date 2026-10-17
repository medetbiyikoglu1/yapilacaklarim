// Dates are local "YYYY-MM-DD" strings and times "HH:MM", so a task stays on the day
// and hour it was planned for even when the phone changes time zone.

export type RepeatKind = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';

export type Repeat = {
  kind: RepeatKind;
  // Weekly only: 0 = Sunday … 6 = Saturday. Empty means the start date's weekday.
  weekdays: number[];
};

// 0 none, 1 low (!), 2 medium (!!), 3 high (!!!)
export type Priority = 0 | 1 | 2 | 3;

export type Task = {
  id: string;
  title: string;
  note: string;
  date: string; // current occurrence
  startDate: string; // first occurrence; anchors monthly/yearly repeats
  time: string | null; // null = all day, reminders use the default time
  priority: Priority;
  repeat: Repeat;
  // Minutes before the task time, at most 3. Empty = no reminder.
  reminders: number[];
  persistent: boolean;
  persistInterval: number; // minutes
  // A "1 saat ertele" from a notification. Applies to the current occurrence only.
  snoozeUntil: number | null;
  done: boolean;
  doneAt: number | null;
  createdAt: number;
};

// One finished occurrence. Repeating tasks move on, so this is what the calendar shows.
export type Completion = {
  id: string;
  taskId: string;
  title: string;
  date: string; // the occurrence that was finished
  doneAt: number;
};

export type Settings = {
  defaultTime: string;
  persistInterval: number;
  persistMax: number;
};

export const DEFAULT_SETTINGS: Settings = {
  defaultTime: '09:00',
  persistInterval: 5,
  persistMax: 5,
};

export const PERSIST_INTERVALS = [5, 10, 30, 60];
export const MAX_REMINDERS = 3;
export const KEEP_DONE_DAYS = 90;
