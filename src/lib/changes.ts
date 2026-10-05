import { DAY, fmtD, hm, sameDay } from './dates';
import { parseICS } from './ics';
import type { Change, ChangeKind, ChangeSide, EventJson, UsosEvent, ViewEvent } from './types';

export const evToJson = (e: UsosEvent): EventJson => ({
  uid: e.uid, skey: e.skey, code: e.code, name: e.name, group: e.group, url: e.url, room: e.room, building: e.building,
  start: e.start.toISOString(), end: e.end.toISOString()
});
export const evFromJson = (j: EventJson): UsosEvent => ({ ...j, src: 'usos', unit: '', start: new Date(j.start), end: new Date(j.end) });

export function diffPlans(oldT: string, newT: string, now = new Date()): Change[] {
  const O = parseICS(oldT), N = parseICS(newT);
  if (!O.length || !N.length) return [];
  const om = new Map(O.map((e) => [e.uid, e])), nm = new Map(N.map((e) => [e.uid, e]));
  const nMin = Math.min(...N.map((e) => +e.start)), nMax = Math.max(...N.map((e) => +e.start)), oMax = Math.max(...O.map((e) => +e.start));
  const removed = O.filter((e) => e.start >= now && +e.start <= nMax && +e.start >= nMin && !nm.has(e.uid));
  const oEnd = new Date(oMax).setHours(23, 59, 59, 999);
  const added = N.filter((e) => e.start >= now && +e.start <= oEnd && !om.has(e.uid));
  const out: Change[] = [], at = Date.now();
  const mk = (kind: ChangeKind, e: UsosEvent, before: ChangeSide | null, after: ChangeSide | null): Change => ({
    id: 'c' + Math.random().toString(36).slice(2, 9), at, kind, ack: false, ev: evToJson(e), before, after
  });
  const span = (e: UsosEvent) => ({ start: e.start.toISOString(), end: e.end.toISOString() });
  for (const r of removed) {
    const i = added.findIndex((a) => a.skey === r.skey && Math.abs(+a.start - +r.start) < 14 * DAY);
    if (i >= 0) {
      const a = added.splice(i, 1)[0];
      out.push(mk('moved', a, { ...span(r), room: r.room }, { ...span(a), room: a.room }));
    } else out.push(mk('removed', r, { room: r.room }, null));
  }
  for (const a of added) out.push(mk('added', a, null, { room: a.room }));
  for (const n of N) {
    const o = om.get(n.uid);
    if (!o || n.start < now) continue;
    if (o.room !== n.room) out.push(mk('room', n, { room: o.room }, { room: n.room }));
    if (+o.start !== +n.start || +o.end !== +n.end) out.push(mk(sameDay(o.start, n.start) ? 'time' : 'moved', n, span(o), span(n)));
  }
  return out;
}

export function srvChangeMap(changes: Change[]) {
  const m = new Map<string, Change>();
  for (const c of changes) if (!c.ack && c.kind !== 'removed') m.set(c.ev.uid, c);
  return m;
}

export function ghostsOf(changes: Change[], usos: UsosEvent[], keep: (c: Change) => boolean = () => true): ViewEvent[] {
  const live = new Set(usos.map((e) => e.uid));
  return changes
    .filter((c) => c.kind === 'removed' && !live.has(c.ev.uid) && keep(c))
    .map((c) => {
      const ev = evFromJson(c.ev);
      return { ...ev, who: 'a', off: false, lane: 0, lanes: 1, clash: false, skip: '', cancelled: true, ghost: true, orig: ev, mod: new Set() };
    });
}

export function changeLine(c: Change) {
  const e = c.ev, b = c.before || {}, a = c.after || {};
  const t = (iso?: string) => hm(new Date(iso!));
  switch (c.kind) {
    case 'room': return `sala ${b.room || '?'} → ${a.room || '?'}`;
    case 'time': return `${t(b.start)}–${t(b.end)} → ${t(a.start)}–${t(a.end)}`;
    case 'moved': return `${fmtD(b.start!)} ${t(b.start)} → ${fmtD(a.start!)} ${t(a.start)}`;
    case 'removed': return `${fmtD(e.start)}, ${t(e.start)}–${t(e.end)} zniknęło z planu`;
    case 'added': return `${fmtD(e.start)}, ${t(e.start)}–${t(e.end)}${e.room ? ', s. ' + e.room : ''}`;
  }
}

export function groupChanges(list: Change[]): Change[][] {
  const g = new Map<string, Change[]>();
  const t = (iso?: string) => hm(new Date(iso!));
  for (const c of list) {
    const sig =
      c.kind === 'room' ? `${c.ev.skey}|room|${c.before?.room}|${c.after?.room}`
      : c.kind === 'time' ? `${c.ev.skey}|time|${t(c.before?.start)}|${t(c.after?.start)}|${t(c.after?.end)}`
      : c.id;
    if (!g.has(sig)) g.set(sig, []);
    g.get(sig)!.push(c);
  }
  return [...g.values()].map((items) => items.sort((a, b) => +new Date(a.ev.start) - +new Date(b.ev.start)));
}

export function quickDiff(a: string, b: string) {
  const A = new Map(parseICS(a).map((e) => [e.uid, e])), B = new Map(parseICS(b).map((e) => [e.uid, e]));
  let add = 0, rem = 0, chg = 0;
  for (const [k, e] of B) {
    const o = A.get(k);
    if (!o) add++;
    else if (o.room !== e.room || +o.start !== +e.start || +o.end !== +e.end) chg++;
  }
  for (const k of A.keys()) if (!B.has(k)) rem++;
  return { add, rem, chg };
}
