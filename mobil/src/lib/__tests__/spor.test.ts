import { describe, expect, it } from '@jest/globals';

import { hasSpor, isSporTitle, resetExercises } from '../spor';
import { blankTask } from '../tasks';

describe('isSporTitle', () => {
  it('finds spor at the start of a word in any case', () => {
    for (const s of ['Spor', 'spora git', 'SPOR SALONU', 'akşam sporu', '18:00 spor', 'Sporcu yemeği']) expect(isSporTitle(s)).toBe(true);
  });

  it('ignores spor inside another word', () => {
    for (const s of ['Transport faturası', 'Market', 'Diyaspora']) expect(isSporTitle(s)).toBe(false);
  });
});

describe('hasSpor', () => {
  const today = '2026-10-27';
  const spor = { ...blankTask(today), title: 'Spor' };

  it('is on while a spor task is open', () => {
    expect(hasSpor([spor], [], today)).toBe(true);
    expect(hasSpor([{ ...spor, title: 'Market' }], [], today)).toBe(false);
  });

  it('stays on for the day a spor task was finished', () => {
    const done = { ...spor, done: true };
    const c = { id: 'c', taskId: spor.id, title: 'Spor', date: today, doneAt: new Date(2026, 9, 27, 19).getTime() };
    expect(hasSpor([done], [c], today)).toBe(true);
    expect(hasSpor([done], [c], '2026-10-28')).toBe(false);
  });
});

it('resetExercises unticks everything', () => {
  expect(resetExercises([{ id: 'a', name: 'Squat', done: true }])).toEqual([{ id: 'a', name: 'Squat', done: false }]);
});
