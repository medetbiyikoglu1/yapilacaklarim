import { describe, expect, it } from '@jest/globals';

import { at } from '../dates';
import { CATEGORY_LATE, CATEGORY_TASK, categoryFor, planNotifications } from '../plan';
import { snoozeOptions, snoozeTask } from '../snooze';
import { blankTask, completeTask } from '../tasks';
import { DEFAULT_SETTINGS, type Task } from '../types';

function task(over: Partial<Task>): Task {
  const t = { ...blankTask('2026-10-22'), ...over };
  if (!over.startDate) t.startDate = t.date;
  return t;
}

describe('snoozeTask', () => {
  it('keeps the date for 15 minutes and an hour', () => {
    const now = at('2026-10-22', '14:00');
    expect(snoozeTask(task({}), '15m', DEFAULT_SETTINGS, now)).toMatchObject({ date: '2026-10-22', snoozeUntil: at('2026-10-22', '14:15') });
    expect(snoozeTask(task({}), '1h', DEFAULT_SETTINGS, now)).toMatchObject({ date: '2026-10-22', snoozeUntil: at('2026-10-22', '15:00') });
  });

  it('snoozes to 19:00 this evening', () => {
    const now = at('2026-10-22', '17:59');
    expect(snoozeTask(task({}), 'evening', DEFAULT_SETTINGS, now)).toMatchObject({ date: '2026-10-22', snoozeUntil: at('2026-10-22', '19:00') });
  });

  it('treats a late evening snooze as tomorrow morning', () => {
    const now = at('2026-10-22', '19:30');
    expect(snoozeTask(task({}), 'evening', DEFAULT_SETTINGS, now)).toMatchObject({ date: '2026-10-23', snoozeUntil: at('2026-10-23', '09:00') });
  });

  it('moves the task to tomorrow at the default time', () => {
    const now = at('2026-10-22', '14:00');
    const settings = { ...DEFAULT_SETTINGS, defaultTime: '08:30' };
    expect(snoozeTask(task({ time: '15:00' }), 'morning', settings, now)).toMatchObject({
      date: '2026-10-23',
      startDate: '2026-10-23',
      snoozeUntil: at('2026-10-23', '08:30'),
    });
  });

  it('uses the task time for tomorrow morning when it is earlier', () => {
    const now = at('2026-10-22', '14:00');
    expect(snoozeTask(task({ time: '07:15' }), 'morning', DEFAULT_SETTINGS, now).snoozeUntil).toBe(at('2026-10-23', '07:15'));
  });

  it('keeps the start of a repeating task', () => {
    const now = at('2026-10-22', '14:00');
    const t = task({ date: '2026-10-22', startDate: '2026-10-01', repeat: { kind: 'daily', weekdays: [] } });
    expect(snoozeTask(t, 'morning', DEFAULT_SETTINGS, now)).toMatchObject({ date: '2026-10-23', startDate: '2026-10-01' });
  });

  it('offers this evening only before 18:00', () => {
    expect(snoozeOptions(at('2026-10-22', '17:59'))).toEqual(['15m', '1h', 'evening', 'morning']);
    expect(snoozeOptions(at('2026-10-22', '18:00'))).toEqual(['15m', '1h', 'morning']);
  });
});

describe('notification categories', () => {
  it('drops the evening button from 18:00 on', () => {
    expect(categoryFor(at('2026-10-22', '17:59'))).toBe(CATEGORY_TASK);
    expect(categoryFor(at('2026-10-22', '18:00'))).toBe(CATEGORY_LATE);
    expect(categoryFor(at('2026-10-22', '23:59'))).toBe(CATEGORY_LATE);
    expect(categoryFor(at('2026-10-23', '00:00'))).toBe(CATEGORY_TASK);
  });

  it('picks a category for every planned notification', () => {
    const now = at('2026-10-22', '08:00');
    const plan = planNotifications([task({ time: '17:59' }), task({ id: 'b', time: '18:00' })], DEFAULT_SETTINGS, now);
    expect(plan.map((p) => p.category)).toEqual([CATEGORY_TASK, CATEGORY_LATE]);
  });
});

describe('planNotifications after a snooze', () => {
  const now = at('2026-10-22', '14:00');

  it('reminds again 15 minutes later', () => {
    const t = snoozeTask(task({ time: '14:00' }), '15m', DEFAULT_SETTINGS, now);
    const plan = planNotifications([t], DEFAULT_SETTINGS, now);
    expect(plan[0]).toMatchObject({ at: at('2026-10-22', '14:15'), date: '2026-10-22' });
  });

  it('reminds at 19:00 this evening', () => {
    const t = snoozeTask(task({ time: '14:00' }), 'evening', DEFAULT_SETTINGS, at('2026-10-22', '17:59'));
    expect(planNotifications([t], DEFAULT_SETTINGS, now)[0].at).toBe(at('2026-10-22', '19:00'));
  });

  it('reminds tomorrow morning and nothing today', () => {
    const t = snoozeTask(task({ time: '14:30' }), 'morning', DEFAULT_SETTINGS, now);
    const plan = planNotifications([t], DEFAULT_SETTINGS, now);
    expect(plan).toHaveLength(1);
    expect(plan[0]).toMatchObject({ at: at('2026-10-23', '09:00'), date: '2026-10-23' });
  });

  it('restarts the persistent chain from the snooze, at most persistMax times', () => {
    const t = snoozeTask(task({ time: '14:00', persistent: true, persistInterval: 5 }), '15m', DEFAULT_SETTINGS, now);
    const plan = planNotifications([t], DEFAULT_SETTINGS, now);
    expect(plan.map((p) => p.at)).toEqual([15, 20, 25, 30, 35, 40].map((m) => at('2026-10-22', `14:${m}`)));
    expect(plan.filter((p) => p.persistent)).toHaveLength(DEFAULT_SETTINGS.persistMax);
  });

  it('snoozes only the current occurrence of a repeating task', () => {
    const t = snoozeTask(task({ time: '14:00', repeat: { kind: 'daily', weekdays: [] } }), '1h', DEFAULT_SETTINGS, now);
    const plan = planNotifications([t], DEFAULT_SETTINGS, now);
    expect(plan[0]).toMatchObject({ at: at('2026-10-22', '15:00'), body: 'Ertelenen hatırlatma' });
    expect(plan[1]).toMatchObject({ at: at('2026-10-23', '14:00'), date: '2026-10-23' });
  });

  it('reminds a task without reminders once after an in-app snooze', () => {
    const t = snoozeTask(task({ reminders: [], repeat: { kind: 'daily', weekdays: [] } }), '1h', DEFAULT_SETTINGS, now);
    const plan = planNotifications([t], DEFAULT_SETTINGS, now);
    expect(plan.map((p) => p.at)).toEqual([at('2026-10-22', '15:00')]);
  });

  it('is cleared when the occurrence is done', () => {
    const t = snoozeTask(task({ time: '14:00', repeat: { kind: 'daily', weekdays: [] } }), '1h', DEFAULT_SETTINGS, now);
    const next = completeTask(t, now).task;
    expect(next).toMatchObject({ date: '2026-10-23', snoozeUntil: null });
  });

  it('stays within the 60 notification limit', () => {
    const many = Array.from({ length: 20 }, (_, i) =>
      snoozeTask(task({ id: `t${i}`, time: '10:00', persistent: true, repeat: { kind: 'daily', weekdays: [] } }), '15m', DEFAULT_SETTINGS, now),
    );
    expect(planNotifications(many, DEFAULT_SETTINGS, now)).toHaveLength(60);
  });
});
