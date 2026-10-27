import * as SQLite from 'expo-sqlite';

import { DEFAULT_SETTINGS, type Completion, type Exercise, type Settings, type Task } from './types';

// Everything lives on the phone. Tasks are stored as JSON so new fields need no
// migration; the few columns next to it are what queries and cleanup filter on.
const db = SQLite.openDatabaseSync('yapilacaklarim.db');

db.execSync(`
  PRAGMA journal_mode = WAL;
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY NOT NULL,
    data TEXT NOT NULL,
    done INTEGER NOT NULL DEFAULT 0,
    done_at INTEGER
  );
  CREATE TABLE IF NOT EXISTS completions (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    title TEXT NOT NULL,
    date TEXT NOT NULL,
    done_at INTEGER NOT NULL
  );
  CREATE INDEX IF NOT EXISTS completions_done_at ON completions (done_at);
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
`);

export function loadAll(): { tasks: Task[]; completions: Completion[]; settings: Settings; exercises: Exercise[] } {
  const tasks = db.getAllSync<{ data: string }>('SELECT data FROM tasks').map((r) => JSON.parse(r.data) as Task);
  const completions = db
    .getAllSync<{ id: string; task_id: string; title: string; date: string; done_at: number }>('SELECT * FROM completions')
    .map((r) => ({ id: r.id, taskId: r.task_id, title: r.title, date: r.date, doneAt: r.done_at }));
  const row = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'settings'");
  const settings = { ...DEFAULT_SETTINGS, ...(row ? JSON.parse(row.value) : {}) };
  const ex = db.getFirstSync<{ value: string }>("SELECT value FROM settings WHERE key = 'exercises'");
  const exercises = ex ? (JSON.parse(ex.value) as Exercise[]) : [];
  return { tasks, completions, settings, exercises };
}

export function saveTask(task: Task): void {
  db.runSync(
    'INSERT OR REPLACE INTO tasks (id, data, done, done_at) VALUES (?, ?, ?, ?)',
    task.id,
    JSON.stringify(task),
    task.done ? 1 : 0,
    task.doneAt,
  );
}

export function deleteTask(id: string): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM tasks WHERE id = ?', id);
    db.runSync('DELETE FROM completions WHERE task_id = ?', id);
  });
}

export function saveCompletion(c: Completion): void {
  db.runSync('INSERT OR REPLACE INTO completions (id, task_id, title, date, done_at) VALUES (?, ?, ?, ?, ?)', c.id, c.taskId, c.title, c.date, c.doneAt);
}

export function deleteCompletion(id: string): void {
  db.runSync('DELETE FROM completions WHERE id = ?', id);
}

export function saveSettings(settings: Settings): void {
  db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('settings', ?)", JSON.stringify(settings));
}

// The Spor list is small and always saved whole, so it sits in the settings table.
export function saveExercises(list: Exercise[]): void {
  db.runSync("INSERT OR REPLACE INTO settings (key, value) VALUES ('exercises', ?)", JSON.stringify(list));
}

// Drops finished work older than the cutoff.
export function purgeBefore(cutoff: number): void {
  db.withTransactionSync(() => {
    db.runSync('DELETE FROM completions WHERE done_at < ?', cutoff);
    db.runSync('DELETE FROM tasks WHERE done = 1 AND done_at < ?', cutoff);
  });
}
