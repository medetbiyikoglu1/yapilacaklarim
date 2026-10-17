import { test } from 'node:test';
import assert from 'node:assert/strict';
import { occursOn, completeTask, reminderAt, stepRepeat, fromKey } from '../public/tasks.js';

test('repeating tasks appear on their occurrences only', () => {
  const weekly = { date: '2026-10-19', repeat: 'weekly' }; // Pazartesi
  assert.equal(occursOn(weekly, '2026-10-26'), true);
  assert.equal(occursOn(weekly, '2026-10-27'), false);
  assert.equal(occursOn(weekly, '2026-10-12'), false);

  const monthly = { date: '2026-01-31', repeat: 'monthly' };
  assert.equal(occursOn(monthly, '2026-02-28'), true);
  assert.equal(stepRepeat('2026-01-31', 'monthly'), '2026-02-28');
});

test('completing a repeating task moves it forward', () => {
  const t = { id: 'a', date: '2026-10-17', repeat: 'daily', done: false };
  assert.equal(completeTask(t, '2026-10-17').date, '2026-10-18');
  const late = { id: 'b', date: '2026-10-10', repeat: 'weekly', done: false };
  assert.equal(completeTask(late, '2026-10-17').date, '2026-10-24');
  assert.equal(completeTask({ date: '2026-10-17', repeat: 'none' }, '2026-10-17').done, true);
});

test('reminder time uses 09:00 when no time is set', () => {
  const now = fromKey('2026-10-17').getTime();
  const at = reminderAt({ date: '2026-10-18', time: '', remindBefore: '0' }, now);
  const d = new Date(at);
  assert.equal(d.getHours(), 9);
  assert.equal(d.getDate(), 18);
  assert.equal(reminderAt({ date: '2026-10-18', time: '10:00', remindBefore: '-1' }, now), null);
  assert.equal(reminderAt({ date: '2026-10-16', time: '10:00', remindBefore: '0' }, now), null);
  const rep = reminderAt({ date: '2026-10-10', time: '08:00', remindBefore: '0', repeat: 'daily' }, now);
  assert.equal(new Date(rep).getDate(), 17);
});
