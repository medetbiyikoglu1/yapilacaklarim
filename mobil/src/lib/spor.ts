import { todayKey } from './dates';
import type { Completion, Exercise, Task } from './types';

// "Spor", "spora git", "SPOR SALONU", "akşam sporu" count; "transport" does not, so the
// word has to start with "spor". Turkish İ/I are lowered by hand before comparing.
const SPOR = /(^|[^a-zçğıöşü0-9])spor/;

export function lowerTr(s: string): string {
  return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
}

export function isSporTitle(title: string): boolean {
  return SPOR.test(lowerTr(title));
}

// The Spor tab shows while a spor task is still open, and for the rest of the day it was
// ticked off, so it does not vanish the moment the task is done at the gym.
export function hasSpor(tasks: Task[], completions: Completion[], today: string): boolean {
  return tasks.some((t) => !t.done && isSporTitle(t.title)) || completions.some((c) => todayKey(c.doneAt) === today && isSporTitle(c.title));
}

export function resetExercises(list: Exercise[]): Exercise[] {
  return list.map((e) => (e.done ? { ...e, done: false } : e));
}
