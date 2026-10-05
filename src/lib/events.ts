import { OWN_KEY, REPEAT, DSHORT } from './constants';
import { DAY, addDays, atTime, dowOf, dur, fromYmd, hm, minsBetween, monday, sameDay, ymd } from './dates';
import type { Collisions, Conflict, CustomEvent, Gap, Override, Overrides, UsosEvent, ViewEvent } from './types';

export const emptyOv = (): Overrides => ({ single: {}, series: {} });

const viewDefaults = () => ({ who: 'a' as const, off: false, mod: new Set<never>(), lane: 0, lanes: 1, clash: false, skip: '' });

export function applyOv(e: UsosEvent, ovs: Overrides): ViewEvent {
  const x: ViewEvent = { ...e, ...viewDefaults(), orig: e, mod: new Set() };
  const s = ovs.series[e.skey], o = ovs.single[e.uid];
  const moveTo = (d: Date) => {
    const f = hm(x.start), t = hm(x.end);
    x.start = atTime(d, f);
    x.end = atTime(d, t);
  };
  for (const v of [s, o]) {
    if (!v) continue;
    if (v === s && v.dow != null && v.dow !== '') { moveTo(addDays(monday(x.start), +v.dow)); x.mod.add('day'); }
    if (v === o && v.date) { moveTo(fromYmd(v.date)); x.mod.add('day'); }
    if (v.from && v.to) { x.start = atTime(x.start, v.from); x.end = atTime(x.start, v.to); x.mod.add('time'); }
    if (v.room) { x.room = v.room; x.mod.add('room'); }
    if (v.building) { x.building = v.building; x.mod.add('room'); }
    if (v.note) x.note = v.note;
    if (v === o && v.cancelled) x.cancelled = true;
    if (v === s && v.cancelled && inCancel(e, v)) x.cancelled = true;
  }
  return x;
}

function inCancel(e: UsosEvent, v: Override) {
  const d = ymd(e.start);
  if (v.cDow != null && v.cDow !== dowOf(e.start)) return false;
  return !(v.cFrom && d < v.cFrom) && !(v.cTo && d > v.cTo);
}

export const daysOf = (c: Pick<CustomEvent, 'days' | 'date'>) => (c.days && c.days.length ? c.days : [dowOf(fromYmd(c.date))]);

export function repLabel(c: Pick<CustomEvent, 'repeat' | 'days' | 'date'>) {
  if (c.repeat !== 'weekly' && c.repeat !== 'biweekly') return REPEAT[c.repeat] || '';
  const ds = daysOf(c).slice().sort((a, b) => a - b);
  return ds.map((d) => DSHORT[d]).join(', ') + ' · ' + (c.repeat === 'weekly' ? 'co tydzień' : 'co 2 tyg.');
}

export function occurs(c: CustomEvent, d: Date) {
  const s = fromYmd(c.date);
  if (d < s) return false;
  if (c.until && d > fromYmd(c.until)) return false;
  const dw = dowOf(d);
  switch (c.repeat) {
    case 'none': return sameDay(d, s);
    case 'daily': return true;
    case 'weekdays': return dw < 5;
    case 'weekly': return daysOf(c).includes(dw);
    case 'biweekly': return daysOf(c).includes(dw) && Math.round((+monday(d) - +monday(s)) / (7 * DAY)) % 2 === 0;
  }
  return false;
}

export function customForWeek(ws: Date, list: CustomEvent[]): ViewEvent[] {
  const out: ViewEvent[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    for (const c of list)
      if (occurs(c, d))
        out.push({
          ...viewDefaults(), mod: new Set(), src: 'own', id: c.id, name: c.title, code: OWN_KEY, color: c.color,
          start: atTime(d, c.from), end: atTime(d, c.to), place: c.place, repeat: c.repeat, rep: repLabel(c)
        });
  }
  return out;
}

export const keyOf = (e: ViewEvent) => (e.src === 'own' ? OWN_KEY : e.code);
export const act = (e: ViewEvent) => !(e.cancelled || e.off);
export const shown = (e: ViewEvent) => !e.cancelled;

export function clashes(e: ViewEvent, o: ViewEvent, cd: Collisions) {
  if (!cd.on || o === e || o.who !== e.who || !act(e) || !act(o)) return false;
  if (!cd.own && (e.src === 'own' || o.src === 'own')) return false;
  return o.start < e.end && o.end > e.start;
}

export function weekConflicts(wk: ViewEvent[], ws: Date, nDays: number, cd: Collisions): Conflict[] {
  const out: Conflict[] = [];
  if (!cd.on) return out;
  for (let i = 0; i < nDays; i++) {
    const d = addDays(ws, i);
    const L = wk.filter((e) => sameDay(e.start, d) && e.who === 'a' && act(e)).sort((a, b) => +a.start - +b.start);
    for (let x = 0; x < L.length; x++)
      for (let y = x + 1; y < L.length; y++)
        if (clashes(L[x], L[y], cd)) out.push({ day: i, d, kind: 'overlap', a: L[x], b: L[y] });
    if (cd.transfer > 0) {
      const U = L.filter((e) => e.building);
      for (let x = 1; x < U.length; x++) {
        const a = U[x - 1], b = U[x], g = minsBetween(a.end, b.start);
        const between = L.some((o) => o.start < b.start && o.end > a.end && o !== a && o !== b);
        if (g >= 0 && g < cd.transfer && a.building !== b.building && !between) out.push({ day: i, d, kind: 'move', a, b, min: g });
      }
    }
  }
  return out;
}

export function skipInfo(e: ViewEvent, list: ViewEvent[], comparing: boolean) {
  if (!e.off || e.cancelled || comparing) return '';
  const other = list.filter((o) => o.who === e.who && act(o));
  const prev = other.filter((o) => o.end <= e.start).reduce<Date | null>((m, o) => (!m || o.end > m ? o.end : m), null);
  const next = other.filter((o) => o.start >= e.end).reduce<Date | null>((m, o) => (!m || o.start < m ? o.start : m), null);
  if (other.some((o) => o.start < e.end && o.end > e.start)) return '';
  if (prev && next) {
    const g = minsBetween(prev, next);
    return `Bez tego: ${g >= 90 ? 'okienko' : 'przerwa'} ${dur(g)} (${hm(prev)}–${hm(next)})`;
  }
  if (next) return `Bez tego zaczynasz o ${hm(next)}`;
  if (prev) return `Bez tego kończysz o ${hm(prev)}`;
  return 'Bez tego masz wolny dzień';
}

export interface GapOpts {
  comparing: boolean;
  cd: Collisions;
}
export function freeGaps(list: ViewEvent[], pred: (e: ViewEvent) => boolean, { comparing, cd }: GapOpts): Gap[] {
  const sorted = list.filter(pred).sort((x, y) => +x.start - +y.start);
  const blocks: { start: Date; end: Date; firstB: string; lastB: string }[] = [];
  for (const e of sorted) {
    const b = blocks[blocks.length - 1];
    const bld = (e.who !== 'b' && e.building) || '';
    if (b && e.start <= b.end) {
      if (e.end > b.end) b.end = e.end;
      if (bld) { b.lastB = bld; b.firstB = b.firstB || bld; }
    } else blocks.push({ start: e.start, end: e.end, firstB: bld, lastB: bld });
  }
  const gaps: Gap[] = [];
  for (let i = 1; i < blocks.length; i++) {
    const prev = blocks[i - 1], next = blocks[i], min = minsBetween(prev.end, next.start);
    if (min <= 0) continue;
    const move = !comparing && prev.lastB && next.firstB && prev.lastB !== next.firstB ? next.firstB : '';
    gaps.push({ from: prev.end, to: next.start, min, move, tight: !!(move && cd.on && cd.transfer > 0 && min < cd.transfer) });
  }
  return gaps;
}

export function lanes(list: ViewEvent[], cd: Collisions) {
  for (const who of ['a', 'b'] as const) {
    const L = list.filter((e) => e.who === who), ends: Date[] = [];
    for (const e of L) {
      let i = ends.findIndex((t) => t <= e.start);
      if (i < 0) i = ends.length;
      ends[i] = e.end;
      e.lane = i;
    }
    for (const e of L) {
      const g = L.filter((o) => o.start < e.end && o.end > e.start);
      e.lanes = Math.max(...g.map((o) => o.lane)) + 1;
      e.clash = g.some((o) => clashes(e, o, cd));
    }
  }
}
