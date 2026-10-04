import { DOWS, DPLUR } from './constants';
import { DAY, addDays, dowOf, fmtShort, hm, monday, ymd } from './dates';
import type { ViewEvent } from './types';

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);

export interface Pattern {
  first: Date;
  text: string;
}

export function patternOf(list: ViewEvent[]): Pattern[] {
  const slots = new Map<string, ViewEvent[]>();
  for (const e of list) {
    const k = `${dowOf(e.start)}|${hm(e.start)}|${hm(e.end)}`;
    if (!slots.has(k)) slots.set(k, []);
    slots.get(k)!.push(e);
  }
  const out: Pattern[] = [];
  for (const [k, L] of slots) {
    const [dw, from, to] = k.split('|');
    const days = [...new Map(L.map((e) => [ymd(e.start), e])).values()].sort((a, b) => +a.start - +b.start);
    const active = days.filter((e) => !e.cancelled);
    if (!active.length) continue;
    const w0 = monday(days[0].start);
    const wi = (e: ViewEvent) => Math.round((+monday(e.start) - +w0) / (7 * DAY));
    let iv = 0;
    for (let i = 1; i < days.length; i++) iv = gcd(iv, wi(days[i]) - wi(days[i - 1]));
    const first = active[0].start, last = active[active.length - 1].start;
    const missing: Date[] = [];
    if (iv > 0) {
      const have = new Set(active.map(wi));
      for (let w = wi(active[0]); w <= wi(active[active.length - 1]); w += iv) if (!have.has(w)) missing.push(addDays(addDays(w0, w * 7), +dw));
    }
    const freq = active.length === 1 && !missing.length ? 'Jednorazowo' : iv <= 1 ? 'Co tydzień' : iv === 2 ? 'Co 2 tygodnie' : `Co ${iv} tygodnie`;
    const text =
      `${freq}${active.length > 1 || missing.length ? `, ${DPLUR[+dw]}` : ` (${DOWS[+dw]})`} ${from}–${to}` +
      (active.length > 1 ? ` · od ${fmtShort(first)} do ${fmtShort(last)}` : ` · ${fmtShort(first)}`) +
      (missing.length ? ` · bez ${missing.map(fmtShort).join(', ')}` : '');
    out.push({ first, text });
  }
  return out.sort((a, b) => +a.first - +b.first);
}
