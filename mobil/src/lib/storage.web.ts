// Browser stand-in for storage.ts so the app can be previewed with `expo start --web`.
// The phone builds use SQLite.
import { DEFAULT_SETTINGS, type Completion, type Settings, type Task } from './types';

type Data = { tasks: Record<string, Task>; completions: Record<string, Completion>; settings: Settings };

const KEY = 'yapilacaklarim';

function read(): Data {
  try {
    const raw = globalThis.localStorage?.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { tasks: {}, completions: {}, settings: DEFAULT_SETTINGS };
}

function write(update: (d: Data) => void): void {
  const d = read();
  update(d);
  try {
    globalThis.localStorage?.setItem(KEY, JSON.stringify(d));
  } catch {}
}

export function loadAll(): { tasks: Task[]; completions: Completion[]; settings: Settings } {
  const d = read();
  return { tasks: Object.values(d.tasks), completions: Object.values(d.completions), settings: { ...DEFAULT_SETTINGS, ...d.settings } };
}

export function saveTask(task: Task): void {
  write((d) => void (d.tasks[task.id] = task));
}

export function deleteTask(id: string): void {
  write((d) => {
    delete d.tasks[id];
    for (const c of Object.values(d.completions)) if (c.taskId === id) delete d.completions[c.id];
  });
}

export function saveCompletion(c: Completion): void {
  write((d) => void (d.completions[c.id] = c));
}

export function deleteCompletion(id: string): void {
  write((d) => void delete d.completions[id]);
}

export function saveSettings(settings: Settings): void {
  write((d) => void (d.settings = settings));
}

export function purgeBefore(cutoff: number): void {
  write((d) => {
    for (const c of Object.values(d.completions)) if (c.doneAt < cutoff) delete d.completions[c.id];
    for (const t of Object.values(d.tasks)) if (t.done && (t.doneAt ?? 0) < cutoff) delete d.tasks[t.id];
  });
}
