import { addDays, daysInMonth, pad, toKey } from './dates';
import type { Priority, Repeat } from './types';

// Turkish quick add: "cuma akşam annemi ara !!" → "annemi ara", Friday 19:00, medium.
// The text is split into words and read left to right; every phrase that is recognised is
// cut out of the title. When in doubt a word stays in the title: a wrong date is worse than
// none. A bare number is never a date or time ("3 kitap oku", "1.5 litre").

export type QuickAdd = {
  title: string;
  date: string;
  time: string | null;
  priority: Priority;
  repeat: Repeat;
  // [start, end) ranges of `text` that were read as date, time, priority or repeat.
  matched: [number, number][];
};

type Token = { raw: string; word: string; start: number; end: number };

// Day parts, in the order the requirements list them.
const PERIODS: Record<string, string> = { sabah: '09:00', öğle: '12:00', öğlen: '12:00', akşam: '19:00', gece: '22:00' };
const WEEKDAYS: [string, number][] = [
  ['pazartesi', 1],
  ['salı', 2],
  ['çarşamba', 3],
  ['perşembe', 4],
  ['cumartesi', 6],
  ['cuma', 5],
  ['pazar', 0],
];
const MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
const NUMBERS: Record<string, number> = { bir: 1, iki: 2, üç: 3, dört: 4, beş: 5, altı: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10 };
// After a number these make it an amount, not a time or date ("3.10 TL", "2/3 kg").
const UNITS = ['tl', 'lira', '₺', '$', '€', '%', 'kg', 'kilo', 'g', 'gr', 'gram', 'l', 'lt', 'litre', 'ml', 'km', 'm', 'cm', 'mm', 'adet', 'tane', 'dolar', 'euro', 'avro'];
// Case endings a day, month or day part may carry: "cumaya", "kasımda", "akşamları".
const SUFFIXES = ['', 'a', 'e', 'ya', 'ye', 'da', 'de', 'ta', 'te', 'dan', 'den', 'tan', 'ten', 'ki', 'yı', 'yi', 'ı', 'i', 'leri', 'ları', 'in', 'ın', 'nin', 'nın', 'ne', 'na'];

function lowerTr(s: string): string {
  return s.replace(/I/g, 'ı').replace(/İ/g, 'i').toLowerCase();
}

function tokenize(text: string): Token[] {
  const out: Token[] = [];
  for (const m of text.matchAll(/\S+/g)) {
    // Phone keyboards and dictation type ’ for the apostrophe.
    const word = lowerTr(m[0]).replace(/[’‘`´]/g, "'").replace(/[,;.?]+$/, '');
    out.push({ raw: m[0], word, start: m.index!, end: m.index! + m[0].length });
  }
  return out;
}

// `word` is `base` with one of the case endings, with or without an apostrophe.
function hasStem(word: string, base: string, suffixes = SUFFIXES): boolean {
  if (!word.startsWith(base)) return false;
  const rest = word.slice(base.length).replace(/^'/, '');
  return suffixes.includes(rest);
}

function stemOf(word: string, bases: Iterable<string>): string | null {
  for (const b of bases) if (hasStem(word, b)) return b;
  return null;
}

function weekdayOf(word: string): number | null {
  for (const [name, n] of WEEKDAYS) {
    // "pazara", "pazardan" usually mean the market; only the plain form or "pazar'a" is a day.
    const ok = name === 'pazar' ? word === 'pazar' || /^pazar'/.test(word) : hasStem(word, name);
    if (ok) return n;
  }
  return null;
}

function numberOf(word: string): number | null {
  if (/^\d{1,3}$/.test(word)) return Number(word);
  return NUMBERS[word] ?? null;
}

function hm(h: number, m: number): string | null {
  return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? `${pad(h)}:${pad(m)}` : null;
}

// "18:00", "18:00'de", "18.05" (with a dot: hours and two-digit minutes).
function clockOf(word: string): string | null {
  const m = word.match(/^(\d{1,2})[:.](\d{2})(?:'?[a-zçğıöşü]{1,3})?$/);
  return m ? hm(Number(m[1]), Number(m[2])) : null;
}

// "18'de", "9'da", "9’a", and without the apostrophe that dictation drops: "18de", "7te".
function hourWithSuffix(word: string): string | null {
  const m = word.match(/^(\d{1,2})(?:'(?:de|da|te|ta|e|a|ye|ya|den|dan|ten|tan)|de|da|te|ta)$/);
  return m ? hm(Number(m[1]), 0) : null;
}

// Whether `day` exists in `month` (29 February counts unless the year says otherwise).
function validDay(day: number, month: number, year?: number): boolean {
  return month >= 0 && month <= 11 && day >= 1 && day <= daysInMonth(year ?? 2028, month);
}

// "15/11", "15/11/2027", "15.11.2027"; "15.11" alone is not read, it may be a time or amount.
function numericDateOf(word: string): { day: number; month: number; year?: number } | null {
  const m = word.match(/^(\d{1,2})(?:\/(\d{1,2})(?:\/(\d{4}))?|\.(\d{1,2})\.(\d{4}))(?:'?[a-zçğıöşü]{1,3})?$/);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2] ?? m[4]) - 1;
  const year = m[3] ?? m[5] ? Number(m[3] ?? m[5]) : undefined;
  return validDay(day, month, year) ? { day, month, year } : null;
}

// A word with a possessive ending, as in "akşam yemeği", "sabah sporu", "gece kremi".
function possessive(word: string): boolean {
  return /[ıiuü]$/.test(word) && !/^\d/.test(word);
}

type Day =
  | { kind: 'date'; key: string }
  | { kind: 'calendar'; day: number; month: number; year?: number }
  | { kind: 'weekday'; weekday: number; nextWeek: boolean };

type Found = {
  day: Day | null;
  time: string | null;
  period: string | null;
  at: number | null; // "1 saat sonra": an exact moment
  priority: Priority;
  repeat: Repeat;
  monthDay: number | null; // "her ayın 15'i"
};

// Tries to read a phrase starting at token `i`; returns how many tokens it used.
// `afterMatch`: the word before was read as a date or time.
function readAt(toks: Token[], i: number, f: Found, now: Date, today: string, afterMatch: boolean): number {
  const w = (k: number) => toks[i + k]?.word ?? '';
  const raw = toks[i].raw;

  if (/^!+$/.test(raw)) {
    f.priority = Math.min(raw.length, 3) as Priority;
    return 1;
  }

  // Repeats: "her gün", "her hafta", "her pazartesi", "her ay", "her ayın 15'i", "her yıl"
  if (w(0) === 'her' || w(0) === 'hergün') {
    if (w(0) === 'hergün' || hasStem(w(1), 'gün')) {
      f.repeat = { kind: 'daily', weekdays: [] };
      return w(0) === 'hergün' ? 1 : 2;
    }
    if (hasStem(w(1), 'hafta')) {
      f.repeat = { kind: 'weekly', weekdays: [] };
      return 2;
    }
    const wd = weekdayOf(w(1));
    if (wd != null) {
      f.repeat = { kind: 'weekly', weekdays: [wd] };
      f.day = { kind: 'weekday', weekday: wd, nextWeek: false };
      return 2;
    }
    if (w(1) === 'ayın') {
      const m = w(2).match(/^(\d{1,2})(?:'?(?:i|ı|inde|ında|si|sı|sinde|sında|nde|nda|ünde|unda))?$/);
      if (m && Number(m[1]) >= 1 && Number(m[1]) <= 31) {
        f.repeat = { kind: 'monthly', weekdays: [] };
        f.monthDay = Number(m[1]);
        return 3;
      }
    }
    if (hasStem(w(1), 'ay')) {
      f.repeat = { kind: 'monthly', weekdays: [] };
      return 2;
    }
    if (hasStem(w(1), 'yıl') || hasStem(w(1), 'sene')) {
      f.repeat = { kind: 'yearly', weekdays: [] };
      return 2;
    }
    const p = stemOf(w(1), Object.keys(PERIODS));
    if (p) {
      f.repeat = { kind: 'daily', weekdays: [] };
      f.period = PERIODS[p];
      return 2;
    }
    return 0;
  }

  // Relative days
  if (hasStem(w(0), 'bugün')) {
    f.day = { kind: 'date', key: today };
    return 1;
  }
  if ((w(0) === 'öbür' && hasStem(w(1), 'gün')) || hasStem(w(0), 'öbürgün')) {
    f.day = { kind: 'date', key: addDays(today, 2) };
    return w(0) === 'öbür' ? 2 : 1;
  }
  if (w(0) === 'yarından' && w(1) === 'sonra') {
    f.day = { kind: 'date', key: addDays(today, 2) };
    return 2;
  }
  if (hasStem(w(0), 'yarın')) {
    f.day = { kind: 'date', key: addDays(today, 1) };
    return 1;
  }

  // "haftaya cuma", "gelecek cuma", "önümüzdeki cuma", "bu cuma"
  if (['haftaya', 'gelecek', 'önümüzdeki', 'bu'].includes(w(0))) {
    const wd = weekdayOf(w(1));
    if (wd != null) {
      f.day = { kind: 'weekday', weekday: wd, nextWeek: w(0) !== 'bu' };
      return 2 + (isDayWord(w(2)) ? 1 : 0);
    }
    const p = w(0) === 'bu' ? stemOf(w(1), Object.keys(PERIODS)) : null;
    if (p) {
      f.day = { kind: 'date', key: today };
      f.period = PERIODS[p];
      return 2;
    }
  }

  const wd = weekdayOf(w(0));
  if (wd != null) {
    f.day = { kind: 'weekday', weekday: wd, nextWeek: false };
    return 1 + (isDayWord(w(1)) ? 1 : 0);
  }

  // "öğleden sonra"
  if (w(0) === 'öğleden' && w(1) === 'sonra') {
    f.period = '15:00';
    return 2;
  }
  const p = stemOf(w(0), Object.keys(PERIODS));
  if (p) {
    // "akşam 8": a bare hour right after a day part
    if (/^\d{1,2}$/.test(w(1)) && Number(w(1)) >= 1 && Number(w(1)) <= 12) {
      f.period = PERIODS[p];
      f.time = hm(Number(w(1)), 0);
      return 2;
    }
    // "akşam yemeği" is a meal, not a time; "cuma akşam annemi ara" is a time.
    if (!afterMatch && possessive(w(1))) return 0;
    f.period = PERIODS[p];
    return 1;
  }

  // "saat 18", "saat 18:30", "saat 9'da"
  if (w(0) === 'saat') {
    const t = clockOf(w(1)) ?? hourWithSuffix(w(1)) ?? (/^\d{1,2}$/.test(w(1)) ? hm(Number(w(1)), 0) : null);
    if (t) {
      f.time = t;
      return 2;
    }
  }

  if (UNITS.includes(w(1))) return 0;

  const clock = clockOf(w(0)) ?? hourWithSuffix(w(0));
  if (clock) {
    f.time = clock;
    return 1;
  }

  const numeric = numericDateOf(w(0));
  if (numeric) {
    f.day = { kind: 'calendar', ...numeric };
    return 1;
  }

  const n = numberOf(w(0));
  if (n != null) {
    // "15 kasım", "15 kasımda", "15 kasım 2027"
    const month = MONTHS.findIndex((m) => hasStem(w(1), m));
    const year = /^\d{4}$/.test(w(2)) ? Number(w(2)) : undefined;
    if (month >= 0 && /^\d/.test(w(0)) && validDay(n, month, year)) {
      f.day = { kind: 'calendar', day: n, month, year };
      return year ? 3 : 2;
    }
    // "3 gün sonra", "2 hafta sonra", "1 ay sonra", "1 saat sonra", "30 dk sonra"
    if (w(2) === 'sonra' && n > 0) {
      const unit = w(1);
      if (hasStem(unit, 'gün')) f.day = { kind: 'date', key: addDays(today, n) };
      else if (hasStem(unit, 'hafta')) f.day = { kind: 'date', key: addDays(today, 7 * n) };
      else if (hasStem(unit, 'ay')) f.day = { kind: 'date', key: toKey(addMonths(now, n)) };
      else if (hasStem(unit, 'saat')) f.at = now.getTime() + n * 3600000;
      else if (['dk', 'dakika', 'dakka', 'dak'].includes(unit)) f.at = now.getTime() + n * 60000;
      else return 0;
      return 3;
    }
  }

  return 0;
}

function isDayWord(word: string): boolean {
  return /^gün(ü|ü'?ne|ü'?nde|leri)$/.test(word);
}

function addMonths(now: Date, n: number): Date {
  const y = now.getFullYear();
  const m = now.getMonth() + n;
  const last = daysInMonth(new Date(y, m, 1).getFullYear(), new Date(y, m, 1).getMonth());
  return new Date(y, m, Math.min(now.getDate(), last));
}

function clockNow(now: Date): string {
  return `${pad(now.getHours())}:${pad(now.getMinutes())}`;
}

// Turns what was read into a date: a weekday or a bare time that has already passed today
// moves on (a week, or a day); a calendar date in the past moves to next year.
function resolve(f: Found, now: Date, today: string): { date: string; time: string | null } {
  let time = f.time;
  if (time && f.period) {
    // "akşam 8" is 20:00, "gece 10" 22:00, but "gece 1" is 01:00 and "gece 12" midnight
    // (23:59, so it stays on that day).
    const h = Number(time.slice(0, 2));
    const pm =
      (f.period === '19:00' || f.period === '15:00') ? h >= 1 && h <= 11 : f.period === '22:00' ? h >= 6 && h <= 11 : f.period === '12:00' ? h >= 1 && h <= 5 : false;
    if (pm) time = `${pad(h + 12)}${time.slice(2)}`;
    else if (f.period === '22:00' && h === 12) time = '23:59';
  }
  time = time ?? f.period;
  const passed = (t: string | null) => t != null && t <= clockNow(now);

  if (f.at != null && !f.day) {
    const d = new Date(f.at);
    return { date: toKey(d), time: f.time ? time : clockNow(d) };
  }

  const day = f.day;
  if (f.monthDay != null) {
    for (let k = 0; k < 24; k++) {
      const first = new Date(now.getFullYear(), now.getMonth() + k, 1);
      if (f.monthDay > daysInMonth(first.getFullYear(), first.getMonth())) continue;
      const key = toKey(new Date(first.getFullYear(), first.getMonth(), f.monthDay));
      if (key > today || (key === today && !passed(time))) return { date: key, time };
    }
  }
  if (!day) return { date: passed(time) ? addDays(today, 1) : today, time };
  if (day.kind === 'date') return { date: day.key, time };
  if (day.kind === 'calendar') {
    const year = day.year ?? now.getFullYear();
    let key = toKey(new Date(year, day.month, Math.min(day.day, daysInMonth(year, day.month))));
    if (!day.year && key < today) key = toKey(new Date(year + 1, day.month, Math.min(day.day, daysInMonth(year + 1, day.month))));
    return { date: key, time };
  }
  let ahead = (day.weekday - now.getDay() + 7) % 7;
  if (ahead === 0 && passed(time)) ahead = 7;
  if (day.nextWeek) ahead += 7;
  return { date: addDays(today, ahead), time };
}

const NONE: Repeat = { kind: 'none', weekdays: [] };

// Never throws: anything it cannot read stays in the title, and an error keeps the whole text.
export function parseQuickAdd(text: string, now: Date): QuickAdd {
  const today = toKey(now);
  try {
    const toks = tokenize(text);
    const f: Found = { day: null, time: null, period: null, at: null, priority: 0, repeat: NONE, monthDay: null };
    const matched: [number, number][] = [];
    let afterMatch = false;
    for (let i = 0; i < toks.length; ) {
      let used = readAt(toks, i, f, now, today, afterMatch);
      if (used > 0) {
        // "pazartesiye kadar", "yarına kadar"
        if (toks[i + used]?.word === 'kadar' && /[ae]$/.test(toks[i + used - 1].word)) used++;
        matched.push([toks[i].start, toks[i + used - 1].end]);
        i += used;
      } else i++;
      afterMatch = used > 0;
    }
    const { date, time } = resolve(f, now, today);
    let title = '';
    let from = 0;
    for (const [s, e] of matched) {
      title += `${text.slice(from, s)} `;
      from = e;
    }
    title += text.slice(from);
    title = title.replace(/\s+/g, ' ').replace(/^[\s,;:.-]+|[\s,;:-]+$/g, '');
    return { title, date, time, priority: f.priority, repeat: f.repeat, matched };
  } catch (e) {
    console.warn('Hızlı ekleme okunamadı', e);
    return { title: text.trim(), date: today, time: null, priority: 0, repeat: NONE, matched: [] };
  }
}
