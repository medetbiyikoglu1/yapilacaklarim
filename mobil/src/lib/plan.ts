import { addDays, at, toKey } from './dates';
import { EVENING_HIDDEN_FROM } from './snooze';
import { isRepeating, matchesRepeat } from './tasks';
import type { Settings, Task } from './types';

export type PlannedNotification = {
  id: string;
  taskId: string;
  date: string; // occurrence
  at: number;
  title: string;
  body: string;
  persistent: boolean; // a repeat of an already fired reminder
  category: NotificationCategory;
};

// Notification button sets. A notification firing late in the day leaves out "Bu akşam".
export const CATEGORY_TASK = 'task';
export const CATEGORY_LATE = 'task_late';
export type NotificationCategory = typeof CATEGORY_TASK | typeof CATEGORY_LATE;

export function categoryFor(fireAt: number): NotificationCategory {
  return fireAt < at(toKey(new Date(fireAt)), EVENING_HIDDEN_FROM) ? CATEGORY_TASK : CATEGORY_LATE;
}

// iOS keeps at most 64 pending notifications per app; leave room for a few spares.
export const MAX_PLANNED = 60;
export const WINDOW_DAYS = 14;

function occurrencesBetween(task: Task, from: string, to: string): string[] {
  if (task.done) return [];
  const keys: string[] = [];
  if (task.date <= to) keys.push(task.date);
  if (isRepeating(task)) {
    for (let k = task.date > from ? task.date : from; k <= to; k = addDays(k, 1)) {
      if (k > task.date && matchesRepeat(task, k)) keys.push(k);
    }
  }
  return keys;
}

function timeLabel(task: Task, settings: Settings): string {
  return task.time ?? settings.defaultTime;
}

function bodyFor(task: Task, minutesBefore: number, nth: number): string {
  if (nth > 0) return `Hâlâ bekliyor (${nth}. hatırlatma)`;
  if (minutesBefore <= 0) return task.time ? `Saat ${task.time}` : 'Bugün yapılacak';
  if (minutesBefore < 60) return `${minutesBefore} dakika sonra`;
  if (minutesBefore < 1440) return `${minutesBefore / 60} saat sonra`;
  return `${minutesBefore / 1440} gün sonra`;
}

// Every notification the phone should hold right now, soonest first. The plan is
// recomputed from scratch after each change, so nothing about it is stored.
export function planNotifications(tasks: Task[], settings: Settings, now: number): PlannedNotification[] {
  const today = toKey(new Date(now));
  const until = addDays(today, WINDOW_DAYS);
  const out: Omit<PlannedNotification, 'category'>[] = [];

  for (const task of tasks) {
    // A task without reminders still gets the one its snooze asked for.
    if (task.done || (task.reminders.length === 0 && task.snoozeUntil == null)) continue;
    for (const date of occurrencesBetween(task, addDays(today, -1), until)) {
      const due = at(date, timeLabel(task, settings));
      const current = date === task.date;
      const snoozed = current && task.snoozeUntil != null;
      if (!snoozed && task.reminders.length === 0) continue;
      // The moment the persistent chain counts from: the task time, or the snooze.
      let anchor = due;

      if (snoozed) {
        anchor = task.snoozeUntil!;
        out.push({ id: `${task.id}|${date}|snooze`, taskId: task.id, date, at: anchor, title: task.title, body: 'Ertelenen hatırlatma', persistent: false });
      } else {
        for (const before of task.reminders) {
          const t = due - before * 60000;
          out.push({ id: `${task.id}|${date}|r${before}`, taskId: task.id, date, at: t, title: task.title, body: bodyFor(task, before, 0), persistent: false });
        }
      }

      if (task.persistent) {
        const every = (task.persistInterval || settings.persistInterval) * 60000;
        for (let n = 1; n <= settings.persistMax; n++) {
          out.push({ id: `${task.id}|${date}|p${n}`, taskId: task.id, date, at: anchor + n * every, title: task.title, body: bodyFor(task, 0, n), persistent: true });
        }
      }
    }
  }

  return out
    .filter((n) => n.at > now)
    .sort((a, b) => a.at - b.at)
    .slice(0, MAX_PLANNED)
    .map((n) => ({ ...n, category: categoryFor(n.at) }));
}
