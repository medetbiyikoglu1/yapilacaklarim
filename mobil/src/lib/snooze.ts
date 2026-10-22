import { addDays, at, toKey } from './dates';
import { moveToTomorrow } from './tasks';
import type { Settings, Task } from './types';

export type SnoozeOption = '15m' | '1h' | 'evening' | 'morning';

export const EVENING = '19:00';
// From this hour on "Bu akşam" would be less than an hour away, so it is not offered.
export const EVENING_HIDDEN_FROM = '18:00';

export const SNOOZE_LABELS: Record<SnoozeOption, string> = {
  '15m': '15 dk',
  '1h': '1 saat',
  evening: `Bu akşam ${EVENING}`,
  morning: 'Yarın sabah',
};

export function eveningOffered(now: number): boolean {
  return now < at(toKey(new Date(now)), EVENING_HIDDEN_FROM);
}

// The choices a picker shows at `now`, in display order.
export function snoozeOptions(now: number): SnoozeOption[] {
  return eveningOffered(now) ? ['15m', '1h', 'evening', 'morning'] : ['15m', '1h', 'morning'];
}

// When "Yarın sabah" reminds: the default time, or the task's own time if it is earlier.
function morningTime(task: Task, settings: Settings): string {
  return task.time && task.time < settings.defaultTime ? task.time : settings.defaultTime;
}

// Postpones the current occurrence. Short snoozes keep the date; "Yarın sabah" moves the
// task to tomorrow (an overdue repeat to today's occurrence, see moveToTomorrow). An
// evening snooze handled after 19:00 falls back to tomorrow morning.
export function snoozeTask(task: Task, option: SnoozeOption, settings: Settings, now: number): Task {
  const today = toKey(new Date(now));
  switch (option) {
    case '15m':
      return { ...task, snoozeUntil: now + 15 * 60000 };
    case '1h':
      return { ...task, snoozeUntil: now + 60 * 60000 };
    case 'evening': {
      const evening = at(today, EVENING);
      if (now < evening) return { ...task, snoozeUntil: evening };
      return snoozeTask(task, 'morning', settings, now);
    }
    case 'morning': {
      const moved = moveToTomorrow(task, now);
      // An overdue repeat that moved to today's occurrence keeps that day's reminders.
      if (moved.date === today) return moved;
      return { ...moved, snoozeUntil: at(addDays(today, 1), morningTime(task, settings)) };
    }
  }
}
