import { typeOf } from './constants';
import { monday } from './dates';
import { applyOv, customForWeek } from './events';
import { store } from './storage';
import type { CustomEvent, Overrides, UsosEvent } from './types';
import { gmKey, loadGroupMeta, metaFor } from './usos/meta.svelte';
import { groupDates, pool, unitGroups, usosTime } from './usos/plans';
import { pl } from './usos/util';

export interface MakeupSubject {
  key: string;
  skey: string;
  unit: string;
  group: string;
  code: string;
  name: string;
}
export interface Slot {
  start: Date;
  end: Date;
  room: string;
  building: string;
}
export interface MakeupGroup {
  group: string;
  slots: Slot[];
}
export interface MakeupData {
  mine: Slot[];
  others: MakeupGroup[];
}

export const canMakeup = (e: UsosEvent) => !!(e.unit && e.group && typeOf(e.code).k !== 'wk');

export function makeupSubjects(usos: UsosEvent[]): MakeupSubject[] {
  const map = new Map<string, MakeupSubject>();
  for (const e of usos) {
    if (!canMakeup(e)) continue;
    const key = gmKey(e.unit, e.group);
    if (!map.has(key)) map.set(key, { key, skey: e.skey, unit: e.unit, group: e.group, code: e.code, name: e.name });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pl'));
}

function toSlots(acts: any[]): Slot[] {
  const seen = new Set<number>();
  return acts
    .map((a) => ({ start: usosTime(a.start_time), end: usosTime(a.end_time), room: a.room_number || '', building: pl(a.building_name) }))
    .sort((a, b) => +a.start - +b.start)
    .filter((s) => !seen.has(+s.start) && seen.add(+s.start));
}

export async function loadMakeup(unit: string, group: string): Promise<MakeupData> {
  const nums = new Set((await unitGroups(unit)).map(String));
  nums.add(String(+group));
  const all = new Map<string, Slot[]>();
  await pool([...nums], 3, async (n) => void all.set(n, toSlots(await groupDates(unit, n))));
  const noMeta = [...nums].filter((n) => !metaFor(unit, n));
  for (let i = 0; i < noMeta.length; i += 20)
    await loadGroupMeta(noMeta.slice(i, i + 20).map((n) => ({ unit_id: unit, group_number: n }))).catch(() => {});
  const mine = all.get(String(+group)) || [];
  all.delete(String(+group));
  return { mine, others: [...all].map(([g, slots]) => ({ group: g, slots })).filter((g) => g.slots.length).sort((a, b) => +a.group - +b.group) };
}

export const cancelledStarts = (usos: UsosEvent[], ov: Overrides, s: MakeupSubject) =>
  new Set(usos.filter((e) => gmKey(e.unit, e.group) === s.key && applyOv(e, ov).cancelled).map((e) => +e.start));

export function lessonNo(usos: UsosEvent[], ov: Overrides, e: UsosEvent) {
  const key = gmKey(e.unit, e.group);
  const live = usos.filter((x) => gmKey(x.unit, x.group) === key && !applyOv(x, ov).cancelled).sort((a, b) => +a.start - +b.start);
  return { n: live.findIndex((x) => x.uid === e.uid) + 1, total: live.length };
}

export function clashName(slot: Slot, usos: UsosEvent[], ov: Overrides, custom: CustomEvent[]): string {
  const hit = (a: { start: Date; end: Date }) => a.start < slot.end && slot.start < a.end;
  for (const e of usos) {
    const v = applyOv(e, ov);
    if (!v.cancelled && hit(v)) return v.name;
  }
  return customForWeek(monday(slot.start), custom).find(hit)?.name ?? '';
}

const SHIFT_KEY = 'makeupShift';
export const getShifts = () => store.get<Record<string, number>>(SHIFT_KEY, {});
export function saveShift(key: string, n: number) {
  const all = getShifts();
  if (n) all[key] = n;
  else delete all[key];
  store.set(SHIFT_KEY, all);
  return all;
}
