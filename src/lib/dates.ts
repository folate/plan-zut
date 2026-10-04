export const DAY = 864e5;

export const pad = (n: number) => String(n).padStart(2, '0');
export const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
export const mins = (d: Date) => d.getHours() * 60 + d.getMinutes();
export const ymd = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromYmd = (s: string) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const atTime = (d: Date, t: string) => {
  const [h, m] = t.split(':').map(Number);
  const x = new Date(d);
  x.setHours(h, m, 0, 0);
  return x;
};
export function monday(d: Date) {
  const x = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};
export const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
export const dowOf = (d: Date) => (d.getDay() + 6) % 7;
export function isoWeek(d: Date) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const n = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - n);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((+t - +y) / DAY + 1) / 7);
}
export const minsBetween = (a: Date, b: Date) => Math.round((+b - +a) / 6e4);

export const dur = (m: number) => {
  const h = Math.floor(m / 60), r = m % 60;
  return [h ? h + ' h' : '', r ? r + ' min' : ''].filter(Boolean).join(' ') || '0 min';
};
export const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const plural = (n: number, one: string, few: string, many: string) =>
  n === 1 ? one : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? few : many;

const PL = 'pl-PL';
export const fmtDay = (d: Date) => d.toLocaleDateString(PL, { weekday: 'short', day: 'numeric', month: 'short' });
export const fmtShort = (d: Date) => d.toLocaleDateString(PL, { day: 'numeric', month: 'short' });
export const fmtLong = (d: Date) => d.toLocaleDateString(PL, { day: 'numeric', month: 'long' });
export const fmtFull = (d: Date) => d.toLocaleDateString(PL, { weekday: 'long', day: 'numeric', month: 'long' });
export const weekdayLong = (d: Date) => d.toLocaleDateString(PL, { weekday: 'long' });
export const weekdayShort = (d: Date) => d.toLocaleDateString(PL, { weekday: 'short' }).replace('.', '');
export const dayLabel = (d: Date) => `${cap(weekdayShort(d))} ${d.getDate()}.${pad(d.getMonth() + 1)}`;
export const fmtD = (iso: string | Date) =>
  cap(new Date(iso).toLocaleDateString(PL, { weekday: 'short', day: 'numeric', month: 'short' }).replace('.', ''));
export const fmtAt = (t: number) => {
  const d = new Date(t);
  const year = d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined;
  return `${d.toLocaleDateString(PL, { day: 'numeric', month: 'short', year })}, ${hm(d)}`;
};
