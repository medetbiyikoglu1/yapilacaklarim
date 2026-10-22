import { describe, expect, it } from '@jest/globals';

import { parseQuickAdd } from '../nl';
import type { Priority, Repeat } from '../types';

// Thursday 22 October 2026, 20:00
const NOW = new Date(2026, 9, 22, 20, 0);

const none: Repeat = { kind: 'none', weekdays: [] };

// The example table from the requirements (K2.2).
const TABLE: [string, string, string, string | null, Priority, Repeat][] = [
  ['yarın 18:00 fatura öde', 'fatura öde', '2026-10-23', '18:00', 0, none],
  ['cuma akşam annemi ara !!', 'annemi ara', '2026-10-23', '19:00', 2, none],
  ['perşembe toplantı', 'toplantı', '2026-10-22', null, 0, none],
  ['perşembe 10:00 toplantı', 'toplantı', '2026-10-29', '10:00', 0, none],
  ['haftaya cuma rapor', 'rapor', '2026-10-30', null, 0, none],
  ["her ayın 15'i kira !!!", 'kira', '2026-11-15', null, 3, { kind: 'monthly', weekdays: [] }],
  ['her pazartesi spor sabah', 'spor', '2026-10-26', '09:00', 0, { kind: 'weekly', weekdays: [1] }],
  ['15 ekim doğum günü', 'doğum günü', '2027-10-15', null, 0, none],
  ['3 gün sonra veterinere git', 'veterinere git', '2026-10-25', null, 0, none],
  ['21:30 ilaç', 'ilaç', '2026-10-22', '21:30', 0, none],
  ["9'da ilaç", 'ilaç', '2026-10-23', '09:00', 0, none],
  ['3 kitap oku', '3 kitap oku', '2026-10-22', null, 0, none],
  ['süt al', 'süt al', '2026-10-22', null, 0, none],
];

describe('parseQuickAdd: requirements table', () => {
  it.each(TABLE)('%s', (text, title, date, time, priority, repeat) => {
    expect(parseQuickAdd(text, NOW)).toMatchObject({ title, date, time, priority, repeat });
  });
});

function parse(text: string) {
  const { title, date, time, priority, repeat } = parseQuickAdd(text, NOW);
  return { title, date, time, priority, repeat: repeat.kind };
}

describe('parseQuickAdd: days', () => {
  it('reads relative days', () => {
    expect(parse('bugün market')).toMatchObject({ title: 'market', date: '2026-10-22' });
    expect(parse('öbür gün market')).toMatchObject({ title: 'market', date: '2026-10-24' });
    expect(parse('yarından sonra market')).toMatchObject({ title: 'market', date: '2026-10-24' });
    expect(parse('Yarın sabah koşu')).toMatchObject({ title: 'koşu', date: '2026-10-23', time: '09:00' });
  });

  it('reads weekdays with case endings', () => {
    expect(parse('cumaya kadar bitir')).toMatchObject({ title: 'kadar bitir', date: '2026-10-23' });
    expect(parse('salı günü dişçi')).toMatchObject({ title: 'dişçi', date: '2026-10-27' });
    expect(parse('cumartesi piknik')).toMatchObject({ title: 'piknik', date: '2026-10-24' });
    expect(parse('pazartesi rapor')).toMatchObject({ title: 'rapor', date: '2026-10-26' });
    expect(parse('gelecek salı rapor')).toMatchObject({ title: 'rapor', date: '2026-11-03' });
  });

  it('does not read the market as Sunday', () => {
    expect(parse('pazara git')).toMatchObject({ title: 'pazara git', date: '2026-10-22' });
    expect(parse('pazar günü pazara git')).toMatchObject({ title: 'pazara git', date: '2026-10-25' });
  });

  it('reads relative durations', () => {
    expect(parse('2 hafta sonra kontrol')).toMatchObject({ title: 'kontrol', date: '2026-11-05' });
    expect(parse('1 saat sonra çamaşır')).toMatchObject({ title: 'çamaşır', date: '2026-10-22', time: '21:00' });
    expect(parse('30 dk sonra fırın')).toMatchObject({ title: 'fırın', date: '2026-10-22', time: '20:30' });
    expect(parse('5 saat sonra uyan')).toMatchObject({ date: '2026-10-23', time: '01:00' });
    expect(parse('iki gün sonra ara')).toMatchObject({ title: 'ara', date: '2026-10-24' });
  });

  it('reads calendar dates', () => {
    expect(parse('15 kasım sınav')).toMatchObject({ title: 'sınav', date: '2026-11-15' });
    expect(parse('15 kasımda sınav')).toMatchObject({ title: 'sınav', date: '2026-11-15' });
    expect(parse('15.11 sınav')).toMatchObject({ title: 'sınav', date: '2026-11-15' });
    expect(parse('15/11 sınav')).toMatchObject({ title: 'sınav', date: '2026-11-15' });
    expect(parse('1 ocak tatil')).toMatchObject({ date: '2027-01-01' });
  });
});

describe('parseQuickAdd: times', () => {
  it('reads the written forms of a time', () => {
    expect(parse('18.00 spor')).toMatchObject({ title: 'spor', time: '18:00' });
    expect(parse('saat 22 ilaç')).toMatchObject({ title: 'ilaç', time: '22:00', date: '2026-10-22' });
    expect(parse("toplantı 18'de")).toMatchObject({ title: 'toplantı', time: '18:00', date: '2026-10-23' });
    expect(parse('yarın 9’da dişçi')).toMatchObject({ title: 'dişçi', time: '09:00', date: '2026-10-23' });
    expect(parse("yarın saat 14:30'da sunum")).toMatchObject({ title: 'sunum', time: '14:30' });
  });

  it('reads day parts and evening hours', () => {
    expect(parse('yarın öğlen yemek')).toMatchObject({ title: 'yemek', time: '12:00' });
    expect(parse('cuma gece film')).toMatchObject({ title: 'film', time: '22:00' });
    expect(parse("yarın akşam 8'de sinema")).toMatchObject({ title: 'sinema', time: '20:00' });
    expect(parse('bu akşam ara')).toMatchObject({ title: 'ara', date: '2026-10-22', time: '19:00' });
  });

  it('keeps bare numbers in the title', () => {
    expect(parse('2 ekmek al')).toMatchObject({ title: '2 ekmek al', time: null, date: '2026-10-22' });
    expect(parse('10 sayfa oku 15 dakika')).toMatchObject({ title: '10 sayfa oku 15 dakika', time: null });
  });
});

describe('parseQuickAdd: repeat and priority', () => {
  it('reads repeats', () => {
    expect(parse('her gün vitamin')).toMatchObject({ title: 'vitamin', repeat: 'daily' });
    expect(parse('her hafta çöp')).toMatchObject({ title: 'çöp', repeat: 'weekly' });
    expect(parse('her ay fatura')).toMatchObject({ title: 'fatura', repeat: 'monthly' });
    expect(parse('her yıl sigorta')).toMatchObject({ title: 'sigorta', repeat: 'yearly' });
    expect(parse('her sabah vitamin')).toMatchObject({ title: 'vitamin', repeat: 'daily', time: '09:00', date: '2026-10-23' });
  });

  it('reads priority marks', () => {
    expect(parse('su iç !')).toMatchObject({ title: 'su iç', priority: 1 });
    expect(parse('!!! vergi')).toMatchObject({ title: 'vergi', priority: 3 });
  });
});

describe('parseQuickAdd: safety', () => {
  it('reports the ranges it read', () => {
    expect(parseQuickAdd('yarın 18:00 fatura öde', NOW).matched).toEqual([
      [0, 5],
      [6, 11],
    ]);
    expect(parseQuickAdd('süt al', NOW).matched).toEqual([]);
  });

  it('leaves an empty title when only a date was written', () => {
    expect(parse('yarın 18:00')).toMatchObject({ title: '', date: '2026-10-23' });
  });

  it('never throws', () => {
    for (const text of ['', '   ', '!!!!', 'her', 'saat', '99:99 x', '31.02 x', "her ayın 40'ı", 'İSTANBUL ışık']) {
      expect(() => parseQuickAdd(text, NOW)).not.toThrow();
    }
    expect(parse('İSTANBUL ışık')).toMatchObject({ title: 'İSTANBUL ışık' });
  });
});
