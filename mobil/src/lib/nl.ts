import { addDays, daysInMonth, pad, toKey } from './dates';
import type { Priority, Repeat } from './types';

// Turkish quick add: "cuma akşam annemi ara !!" → "annemi ara", Friday 19:00, medium.
// The text is split into words and read left to right; every phrase that is recognised is
// cut out of the title. A bare number is never a date or time ("3 kitap oku").

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

// "18:00", "18:00'de", "18.00" (a dot is a time unless it reads as a day and month: "15.11").
function clockOf(word: string): string | null {
  const m = word.match(/^(\d{1,2})([:.])(\d{2})(?:'?[a-zçğıöşü]{1,3})?$/);
  if (!m) return null;
  const [h, min] = [Number(m[1]), Number(m[3])];
  if (m[2] === '.' && min >= 1 && min <= 12 && h >= 1 && h <= 31) return null;
  return hm(h, min);
}

// "18'de", "9'da", "9’a"; the apostrophe is what tells it from a count.
function hourWithSuffix(word: string): string | null {
  const m = word.match(/^(\d{1,2})'(?:de|da|te|ta|e|a|ye|ya|den|dan|ten|tan)$/);
  return m ? hm(Number(m[1]), 0) : null;
}

// "15.11", "15/11", "15/11/2027"
function numericDateOf(word: string): { day: number; month: number; year?: number } | null {
  const m = word.match(/^(\d{1,2})[./](\d{1,2})(?:[./](\d{4}))?(?:'?[a-zçğıöşü]{1,3})?$/);
  if (!m) return null;
  const [day, month] = [Number(m[1]), Number(m[2]) - 1];
  if (month < 0 || month > 11 || day < 1 || day > 31) return null;
  if (m[2].length === 2 && !m[3] && clockOf(word)) return null;
  return { day, month, year: m[3] ? Number(m[3]) : undefined };
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
function readAt(toks: Token[], i: number, f: Found, now: Date, today: string): number {
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
    if (month >= 0 && n >= 1 && n <= 31 && /^\d/.test(w(0))) {
      const year = /^\d{4}$/.test(w(2)) ? Number(w(2)) : undefined;
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
  if (time && f.period && (f.period === '19:00' || f.period === '22:00' || f.period === '15:00')) {
    // "akşam 8'de" is 20:00
    const h = Number(time.slice(0, 2));
    if (h >= 1 && h < 12) time = `${pad(h + 12)}${time.slice(2)}`;
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
    for (let i = 0; i < toks.length; ) {
      const used = readAt(toks, i, f, now, today);
      if (used > 0) {
        matched.push([toks[i].start, toks[i + used - 1].end]);
        i += used;
      } else i++;
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
