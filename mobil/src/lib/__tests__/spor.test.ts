import { describe, expect, it } from '@jest/globals';

import { fromProgram, hasSpor, isSporTitle, READY_PROGRAMS, REGIONS, resetExercises } from '../spor';
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

it('example moves are unique within each region', () => {
  for (const r of REGIONS) expect(new Set(r.moves).size).toBe(r.moves.length);
});

it('keeps triceps moves under Arka kol, not Kol', () => {
  const kol = REGIONS.find((r) => r.name === 'Kol')!.moves;
  const arka = REGIONS.find((r) => r.name === 'Arka kol')!.moves;
  expect(kol.some((m) => /triceps|skull|pushdown/i.test(m))).toBe(false);
  expect(arka).toContain('Triceps pushdown 3x12');
});

describe('programs', () => {
  it('a picked program starts unticked with fresh ids', () => {
    let n = 0;
    const list = fromProgram(READY_PROGRAMS[0], () => `id${n++}`);
    expect(list.map((e) => e.name)).toEqual(READY_PROGRAMS[0].moves);
    expect(list.every((e) => !e.done)).toBe(true);
    expect(new Set(list.map((e) => e.id)).size).toBe(list.length);
  });

  it('ready-made moves are all offered under some region', () => {
    const all = new Set(REGIONS.flatMap((r) => r.moves));
    for (const p of READY_PROGRAMS) for (const m of p.moves) expect(all.has(m)).toBe(true);
  });
});
