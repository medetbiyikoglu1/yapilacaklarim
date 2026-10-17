CREATE TABLE IF NOT EXISTS subscriptions (
  id TEXT PRIMARY KEY,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS reminders (
  sub_id TEXT NOT NULL,
  id TEXT NOT NULL,
  at INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  repeat TEXT NOT NULL DEFAULT 'none',
  tz_offset INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (sub_id, id)
);

CREATE INDEX IF NOT EXISTS reminders_at ON reminders (at);
