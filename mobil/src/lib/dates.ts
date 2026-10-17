export function toKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(now: number = Date.now()): string {
  return toKey(new Date(now));
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return toKey(d);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function weekday(key: string): number {
  return fromKey(key).getDay();
}

// Epoch ms of `key` at "HH:MM" local time.
export function at(key: string, time: string): number {
  const [h, m] = time.split(':').map(Number);
  const d = fromKey(key);
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

export function pad(n: number): string {
  return String(n).padStart(2, '0');
}

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
export const SHORT_DAYS = ['Pz', 'Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct'];

export function monthName(month: number): string {
  return MONTHS[month];
}

export function dayName(key: string): string {
  return DAYS[weekday(key)];
}

// "17 Ekim Cumartesi"
export function longDate(key: string): string {
  const d = fromKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${DAYS[d.getDay()]}`;
}

// "Bugün", "Yarın", "Dün", or "17 Ekim"
export function relativeDay(key: string, today: string): string {
  if (key === today) return 'Bugün';
  if (key === addDays(today, 1)) return 'Yarın';
  if (key === addDays(today, -1)) return 'Dün';
  const d = fromKey(key);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}`;
}
