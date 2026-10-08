import { ghostsOf, srvChangeMap } from './changes';
import { addDays, dowOf, sameDay } from './dates';
import { applyOv, customForWeek, keyOf, lanes, skipInfo, weekConflicts } from './events';
import type { Change, Collisions, CustomEvent, Overrides, PeerData, UsosEvent, ViewEvent, WeekView } from './types';

export interface WeekInput {
  ws: Date;
  usos: UsosEvent[];
  extra: UsosEvent[];
  ov: Overrides;
  custom: CustomEvent[];
  changes: Change[];
  absent: Set<string>;
  peer: PeerData | null;
  comparing: boolean;
  hidden: Set<string>;
  hideOff: boolean;
  cd: Collisions;
}

export function buildWeek(o: WeekInput): WeekView {
  const { ws, cd } = o, we = addDays(ws, 7);
  const inWeek = (e: ViewEvent) => e.start >= ws && e.start < we;
  const srv = srvChangeMap(o.changes);

  const mine = [
    ...o.usos.map((e) => applyOv(e, o.ov)).filter(inWeek).map((e) => ((e.srv = srv.get(e.uid!)), (e.absent = o.absent.has(e.uid!)), e)),
    ...o.extra.map((e) => applyOv(e, o.ov)).filter(inWeek),
    ...ghostsOf(o.changes, o.usos).filter(inWeek),
    ...customForWeek(ws, o.custom)
  ];
  const peer = o.peer
    ? [...o.peer.usos.map((e) => applyOv(e, o.peer!.ov)).filter(inWeek), ...customForWeek(ws, o.peer.custom)]
    : [];
  for (const e of peer) e.who = 'b';

  const all = [...mine, ...peer].sort((a, b) => +a.start - +b.start || +a.end - +b.end);
  for (const e of all) e.off = o.hidden.has(keyOf(e));

  const wk = o.hideOff ? all.filter((e) => !e.off) : all;
  const nDays = wk.some((e) => dowOf(e.start) >= 5) ? 7 : 5;
  const days = Array.from({ length: nDays }, (_, i) => {
    const date = addDays(ws, i), list = wk.filter((e) => sameDay(e.start, date));
    lanes(list, cd);
    for (const e of list) e.skip = skipInfo(e, list, o.comparing);
    return { date, list };
  });
  return { all, mine, wk, nDays, days, conflicts: weekConflicts(wk, ws, nDays, cd) };
}
