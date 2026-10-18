import { addDays, daysInMonth, fromKey, toKey, weekday } from './dates';
import type { Completion, Task } from './types';

export function isRepeating(task: Task): boolean {
  return task.repeat.kind !== 'none';
}

function weekdaysOf(task: Task): number[] {
  return task.repeat.weekdays.length ? task.repeat.weekdays : [weekday(task.startDate)];
}

// Day of month `day` in the month `offset` months after `key`, moved to the last day
// when the month is shorter (31 → 30 Nisan, 29 Şubat → 28 Şubat).
function clampedMonth(year: number, month: number, day: number): string {
  const d = new Date(year, month, 1);
  return toKey(new Date(d.getFullYear(), d.getMonth(), Math.min(day, daysInMonth(d.getFullYear(), d.getMonth()))));
}

// Whether a repeating task has an occurrence on `key` (ignores the current `date`).
export function matchesRepeat(task: Task, key: string): boolean {
  if (key < task.startDate) return false;
  const start = fromKey(task.startDate);
  const d = fromKey(key);
  switch (task.repeat.kind) {
    case 'none':
      return key === task.startDate;
    case 'daily':
      return true;
    case 'weekly':
      return weekdaysOf(task).includes(d.getDay());
    case 'monthly':
      return key === clampedMonth(d.getFullYear(), d.getMonth(), start.getDate());
    case 'yearly':
      return d.getMonth() === start.getMonth() && key === clampedMonth(d.getFullYear(), d.getMonth(), start.getDate());
  }
}

// First occurrence strictly after `key`.
export function nextOccurrence(task: Task, key: string): string | null {
  if (!isRepeating(task)) return null;
  const start = fromKey(task.startDate);
  const from = fromKey(key);
  switch (task.repeat.kind) {
    case 'daily':
      return addDays(key, 1);
    case 'weekly': {
      for (let i = 1; i <= 7; i++) {
        const k = addDays(key, i);
        if (matchesRepeat(task, k)) return k;
      }
      return null;
    }
    case 'monthly': {
      const same = clampedMonth(from.getFullYear(), from.getMonth(), start.getDate());
      if (same > key) return same;
      return clampedMonth(from.getFullYear(), from.getMonth() + 1, start.getDate());
    }
    case 'yearly': {
      const same = clampedMonth(from.getFullYear(), start.getMonth(), start.getDate());
      if (same > key) return same;
      return clampedMonth(from.getFullYear() + 1, start.getMonth(), start.getDate());
    }
  }
  return null;
}

// Whether an unfinished task shows on `key`: its current date, or a later repeat.
export function occursOn(task: Task, key: string): boolean {
  if (task.done) return false;
  if (key === task.date) return true;
  return isRepeating(task) && key > task.date && matchesRepeat(task, key);
}

// Marks the current occurrence done. A repeating task moves to its next occurrence
// after today, so missed repeats do not pile up.
export function completeTask(task: Task, now: number): { task: Task; completion: Completion } {
  const completion: Completion = {
    id: `${task.id}:${task.date}:${now}`,
    taskId: task.id,
    title: task.title,
    date: task.date,
    doneAt: now,
  };
  if (!isRepeating(task)) {
    return { task: { ...task, done: true, doneAt: now, snoozeUntil: null }, completion };
  }
  const today = toKey(new Date(now));
  const next = nextOccurrence(task, task.date > today ? task.date : today);
  return { task: { ...task, date: next ?? task.date, snoozeUntil: null }, completion };
}

// A finished one-off task can always be reopened. A repeating task has moved on, so only
// its latest completion can be undone; undoing an older one would send it back in time.
export function canUndo(completion: Completion, tasks: Task[], completions: Completion[]): boolean {
  const task = tasks.find((t) => t.id === completion.taskId);
  if (!task) return false;
  if (!isRepeating(task)) return task.done;
  const latest = completions.filter((c) => c.taskId === task.id).reduce((a, b) => (b.doneAt > a.doneAt ? b : a), completion);
  return latest.id === completion.id;
}

// Reverses `completeTask`.
export function uncompleteTask(task: Task, completion: Completion): Task {
  return { ...task, date: completion.date, done: false, doneAt: null };
}

// "Yarına at": moves the current occurrence to tomorrow.
export function moveToTomorrow(task: Task, now: number): Task {
  const tomorrow = addDays(toKey(new Date(now)), 1);
  const startDate = isRepeating(task) ? task.startDate : tomorrow;
  return { ...task, date: tomorrow, startDate, snoozeUntil: null };
}

export function newId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export function blankTask(date: string): Task {
  return {
    id: newId(),
    title: '',
    note: '',
    date,
    startDate: date,
    time: null,
    priority: 0,
    repeat: { kind: 'none', weekdays: [] },
    reminders: [0],
    persistent: false,
    persistInterval: 5,
    snoozeUntil: null,
    done: false,
    doneAt: null,
    createdAt: Date.now(),
  };
}

// Sort: timed tasks by time first, then all-day tasks by priority.
export function byTime(a: Task, b: Task): number {
  if (a.date !== b.date) return a.date < b.date ? -1 : 1;
  if (a.time && b.time) return a.time < b.time ? -1 : a.time > b.time ? 1 : b.priority - a.priority;
  if (a.time) return -1;
  if (b.time) return 1;
  return b.priority - a.priority || a.createdAt - b.createdAt;
}
