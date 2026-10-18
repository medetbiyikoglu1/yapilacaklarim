import { describe, expect, it } from '@jest/globals';

import { at } from '../dates';
import { planNotifications } from '../plan';
import { blankTask, canUndo, completeTask, moveToTomorrow, nextOccurrence, occursOn, uncompleteTask } from '../tasks';
import { DEFAULT_SETTINGS, type Task } from '../types';

function task(over: Partial<Task>): Task {
  const t = { ...blankTask('2026-10-17'), ...over };
  if (!over.startDate) t.startDate = t.date;
  return t;
}

describe('nextOccurrence', () => {
  it('steps daily, weekly and yearly repeats', () => {
    expect(nextOccurrence(task({ repeat: { kind: 'daily', weekdays: [] } }), '2026-10-17')).toBe('2026-10-18');
    expect(nextOccurrence(task({ repeat: { kind: 'weekly', weekdays: [] } }), '2026-10-17')).toBe('2026-10-24');
    expect(nextOccurrence(task({ repeat: { kind: 'yearly', weekdays: [] } }), '2026-10-17')).toBe('2027-10-17');
  });

  it('uses the chosen weekdays', () => {
    // 2026-10-17 is a Saturday; Monday and Wednesday chosen
    const t = task({ repeat: { kind: 'weekly', weekdays: [1, 3] } });
    expect(nextOccurrence(t, '2026-10-17')).toBe('2026-10-19');
    expect(nextOccurrence(t, '2026-10-19')).toBe('2026-10-21');
    expect(nextOccurrence(t, '2026-10-21')).toBe('2026-10-26');
  });

  it('moves a missing day of month to the last day and back again', () => {
    const t = task({ date: '2027-01-31', repeat: { kind: 'monthly', weekdays: [] } });
    expect(nextOccurrence(t, '2027-01-31')).toBe('2027-02-28');
    expect(nextOccurrence(t, '2027-02-28')).toBe('2027-03-31');
    expect(nextOccurrence(t, '2027-03-31')).toBe('2027-04-30');
  });

  it('handles 29 February in yearly repeats', () => {
    const t = task({ date: '2028-02-29', repeat: { kind: 'yearly', weekdays: [] } });
    expect(nextOccurrence(t, '2028-02-29')).toBe('2029-02-28');
    expect(nextOccurrence(t, '2031-02-28')).toBe('2032-02-29');
  });
});

describe('occursOn', () => {
  it('shows a repeating task on its later occurrences only', () => {
    const t = task({ repeat: { kind: 'weekly', weekdays: [] } });
    expect(occursOn(t, '2026-10-17')).toBe(true);
    expect(occursOn(t, '2026-10-24')).toBe(true);
    expect(occursOn(t, '2026-10-18')).toBe(false);
    expect(occursOn(t, '2026-10-10')).toBe(false);
  });
});

describe('completeTask', () => {
  const now = at('2026-10-17', '12:00');

  it('marks a one-off task done and records the completion', () => {
    const { task: done, completion } = completeTask(task({}), now);
    expect(done.done).toBe(true);
    expect(completion.date).toBe('2026-10-17');
    expect(uncompleteTask(done, completion).done).toBe(false);
  });

  it('does not pile up missed repeats', () => {
    const t = task({ date: '2026-10-12', repeat: { kind: 'daily', weekdays: [] } });
    const { task: next, completion } = completeTask(t, now);
    expect(next.date).toBe('2026-10-18');
    expect(next.done).toBe(false);
    expect(completion.date).toBe('2026-10-12');
    expect(uncompleteTask(next, completion).date).toBe('2026-10-12');
  });

  it('finishing a future repeat early moves past it', () => {
    const t = task({ date: '2026-10-19', startDate: '2026-10-12', repeat: { kind: 'weekly', weekdays: [] } });
    expect(completeTask(t, now).task.date).toBe('2026-10-26');
  });

  it('undoes any one-off completion but only the latest repeat', () => {
    const one = completeTask(task({ id: 'one' }), now);
    expect(canUndo(one.completion, [one.task], [one.completion])).toBe(true);
    const daily = task({ id: 'd', repeat: { kind: 'daily', weekdays: [] } });
    const first = completeTask(daily, now);
    const second = completeTask(first.task, now + 1000);
    const all = [first.completion, second.completion];
    expect(canUndo(first.completion, [second.task], all)).toBe(false);
    expect(canUndo(second.completion, [second.task], all)).toBe(true);
    expect(canUndo(one.completion, [], [one.completion])).toBe(false);
  });

  it('clears a snooze', () => {
    const t = task({ snoozeUntil: now + 1000 });
    expect(completeTask(t, now).task.snoozeUntil).toBeNull();
    expect(moveToTomorrow(t, now)).toMatchObject({ date: '2026-10-18', snoozeUntil: null });
  });
});

describe('planNotifications', () => {
  const now = at('2026-10-17', '08:00');

  it('reminds at the default time for all-day tasks', () => {
    const plan = planNotifications([task({})], DEFAULT_SETTINGS, now);
    expect(plan).toHaveLength(1);
    expect(plan[0].at).toBe(at('2026-10-17', '09:00'));
  });

  it('supports several reminders per task', () => {
    const plan = planNotifications([task({ time: '10:00', reminders: [0, 30, 60] })], DEFAULT_SETTINGS, now);
    expect(plan.map((p) => p.at)).toEqual([at('2026-10-17', '09:00'), at('2026-10-17', '09:30'), at('2026-10-17', '10:00')]);
  });

  it('repeats a persistent reminder every interval, at most persistMax times', () => {
    const plan = planNotifications([task({ time: '10:00', persistent: true, persistInterval: 5 })], DEFAULT_SETTINGS, now);
    expect(plan).toHaveLength(6);
    expect(plan[5].at).toBe(at('2026-10-17', '10:25'));
    expect(plan[5].persistent).toBe(true);
  });

  it('keeps the persistent chain going after the task time has passed', () => {
    const later = at('2026-10-17', '10:07');
    const plan = planNotifications([task({ time: '10:00', persistent: true, persistInterval: 5 })], DEFAULT_SETTINGS, later);
    expect(plan.map((p) => p.at)).toEqual([10, 15, 20, 25].map((m) => at('2026-10-17', `10:${m}`)));
  });

  it('restarts the chain from a snooze', () => {
    const snoozeUntil = at('2026-10-17', '11:00');
    const plan = planNotifications([task({ time: '10:00', persistent: true, persistInterval: 10, snoozeUntil })], DEFAULT_SETTINGS, now);
    expect(plan[0]).toMatchObject({ at: snoozeUntil, body: 'Ertelenen hatırlatma' });
    expect(plan[1].at).toBe(at('2026-10-17', '11:10'));
  });

  it('plans upcoming repeats and skips done or silent tasks', () => {
    const plan = planNotifications(
      [
        task({ title: 'ilaç', time: '21:00', repeat: { kind: 'daily', weekdays: [] } }),
        task({ title: 'bitmiş', done: true }),
        task({ title: 'sessiz', reminders: [] }),
      ],
      DEFAULT_SETTINGS,
      now,
    );
    expect(plan.every((p) => p.title === 'ilaç')).toBe(true);
    expect(plan[0].at).toBe(at('2026-10-17', '21:00'));
    expect(plan[1].at).toBe(at('2026-10-18', '21:00'));
    expect(plan.length).toBe(15);
  });

  it('never exceeds the iOS limit', () => {
    const many = Array.from({ length: 20 }, (_, i) => task({ id: `t${i}`, time: '10:00', persistent: true, repeat: { kind: 'daily', weekdays: [] } }));
    const plan = planNotifications(many, DEFAULT_SETTINGS, now);
    expect(plan.length).toBe(60);
    expect(plan[0].at).toBeLessThanOrEqual(plan[59].at);
  });
});
