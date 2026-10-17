// Pure date and task helpers, shared by the app and the tests.
// Dates are local "YYYY-MM-DD" strings so a task stays on the day it was planned for.

export const DEFAULT_TIME = '09:00';

export function toKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fromKey(key) {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key, n) {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

function addMonths(key, n) {
  const d = fromKey(key);
  const day = d.getDate();
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  d.setDate(Math.min(day, last));
  return toKey(d);
}

// The occurrence after `key` for a repeating task.
export function stepRepeat(key, repeat) {
  if (repeat === 'daily') return addDays(key, 1);
  if (repeat === 'weekly') return addDays(key, 7);
  if (repeat === 'monthly') return addMonths(key, 1);
  return null;
}

// Whether a task shows up on a given day (repeating tasks show on every future occurrence).
export function occursOn(task, key) {
  if (key === task.date) return true;
  if (!task.repeat || task.repeat === 'none' || key < task.date) return false;
  const a = fromKey(task.date);
  const b = fromKey(key);
  if (task.repeat === 'daily') return true;
  if (task.repeat === 'weekly') return a.getDay() === b.getDay();
  if (task.repeat === 'monthly') {
    const lastOfMonth = new Date(b.getFullYear(), b.getMonth() + 1, 0).getDate();
    return b.getDate() === Math.min(a.getDate(), lastOfMonth);
  }
  return false;
}

// Marks a task done. A repeating task moves on to its next occurrence instead.
export function completeTask(task, todayKey) {
  if (!task.repeat || task.repeat === 'none') return { ...task, done: true, doneAt: Date.now() };
  let next = stepRepeat(task.date, task.repeat);
  while (next <= todayKey && task.date < todayKey) next = stepRepeat(next, task.repeat);
  return { ...task, date: next, done: false, lastDoneAt: Date.now() };
}

// Epoch ms for the task's reminder, or null when it should not notify.
// For repeating tasks whose date has passed, it moves to the next upcoming occurrence.
export function reminderAt(task, now = Date.now()) {
  if (task.done || Number(task.remindBefore) < 0) return null;
  const at = (key) => {
    const [h, m] = (task.time || DEFAULT_TIME).split(':').map(Number);
    const d = fromKey(key);
    d.setHours(h, m, 0, 0);
    return d.getTime() - Number(task.remindBefore || 0) * 60000;
  };
  let key = task.date;
  let t = at(key);
  if (task.repeat && task.repeat !== 'none') {
    while (t <= now) {
      key = stepRepeat(key, task.repeat);
      t = at(key);
    }
  }
  return t > now ? t : null;
}
