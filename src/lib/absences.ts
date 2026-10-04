import type { Absence, UsosEvent } from './types';

export const isAbsent = (list: Absence[], uid: string) => list.some((a) => a.uid === uid);

export function toggleAbsence(list: Absence[], e: UsosEvent): Absence[] {
  if (isAbsent(list, e.uid)) return list.filter((a) => a.uid !== e.uid);
  return [...list, { uid: e.uid, skey: e.skey, code: e.code, name: e.name, group: e.group, at: e.start.toISOString() }];
}

export interface SubjectAbsences {
  skey: string;
  code: string;
  name: string;
  group: string;
  items: Absence[];
}

export function absencesBySubject(list: Absence[]): SubjectAbsences[] {
  const map = new Map<string, SubjectAbsences>();
  for (const a of list) {
    if (!map.has(a.skey)) map.set(a.skey, { skey: a.skey, code: a.code, name: a.name, group: a.group, items: [] });
    map.get(a.skey)!.items.push(a);
  }
  const out = [...map.values()];
  for (const s of out) s.items.sort((x, y) => x.at.localeCompare(y.at));
  return out.sort((x, y) => y.items.length - x.items.length || x.name.localeCompare(y.name, 'pl'));
}
