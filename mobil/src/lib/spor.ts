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

// Example moves per body area, with a usual set x rep. Picking one adds it to the list
// as written, so the user can still edit sets by deleting and typing their own.
export const REGIONS: { name: string; moves: string[] }[] = [
  { name: 'Göğüs', moves: ['Bench press 4x10', 'Incline dumbbell press 3x10', 'Dumbbell fly 3x12', 'Cable crossover 3x12', 'Şınav 3x15', 'Dips 3x10'] },
  { name: 'Sırt', moves: ['Lat pulldown 4x10', 'Barfiks 3x8', 'Barbell row 4x8', 'Seated cable row 3x12', 'Tek kol dumbbell row 3x10', 'Deadlift 3x6'] },
  { name: 'Omuz', moves: ['Overhead press 4x8', 'Dumbbell shoulder press 3x10', 'Lateral raise 3x15', 'Front raise 3x12', 'Face pull 3x15', 'Reverse fly 3x12'] },
  { name: 'Kol', moves: ['Barbell curl 3x10', 'Hammer curl 3x12', 'Preacher curl 3x10', 'Triceps pushdown 3x12', 'Overhead triceps extension 3x12', 'Skull crusher 3x10'] },
  { name: 'Bacak', moves: ['Squat 4x8', 'Leg press 4x10', 'Romanian deadlift 3x10', 'Lunge 3x12', 'Leg extension 3x12', 'Leg curl 3x12', 'Calf raise 4x15'] },
  { name: 'Karın', moves: ['Plank 3x45 sn', 'Crunch 3x20', 'Bacak kaldırma 3x15', 'Russian twist 3x20', 'Cable crunch 3x15', 'Mountain climber 3x30 sn'] },
  { name: 'Kardiyo', moves: ['Koşu bandı 20 dk', 'Bisiklet 20 dk', 'Eliptik 15 dk', 'Kürek makinesi 10 dk', 'İp atlama 5 dk', 'Merdiven 10 dk'] },
];
