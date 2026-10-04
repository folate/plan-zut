import { emptyOv } from './events';
import { parseICS } from './ics';
import { pk, store } from './storage';
import type { Absence, Change, CustomEvent, Overrides, PlanVersion } from './types';

export const MAX_VERSIONS = 2;

export const getIcs = (id: string) => store.get<string | null>(pk('ics', id), null);
export const getVersions = (id: string) => store.get<PlanVersion[]>(pk('versions', id), []);
export const setVersions = (id: string, v: PlanVersion[]) => store.set(pk('versions', id), v);
export const getChanges = (id: string) => store.get<Change[]>(pk('changes', id), []);
export const setChanges = (id: string, list: Change[]) => store.set(pk('changes', id), list.slice(-400));
export const getCustom = (id: string) => store.get<CustomEvent[]>(pk('custom', id), []);
export const setCustom = (id: string, list: CustomEvent[]) => store.set(pk('custom', id), list);
export const getOverrides = (id: string): Overrides => ({ ...emptyOv(), ...store.get<Partial<Overrides>>(pk('overrides', id), {}) });
export const setOverrides = (id: string, ov: Overrides) => store.set(pk('overrides', id), ov);
export const getAbsences = (id: string) => store.get<Absence[]>(pk('absences', id), []);
export const setAbsences = (id: string, list: Absence[]) => store.set(pk('absences', id), list);

export function storeIcs(id: string, text: string, at = Date.now()) {
  const old = getIcs(id);
  store.set(pk('ics', id), text);
  if (old === text || !text) return;
  let vs = getVersions(id);
  vs.push({ at, source: '', n: parseICS(text).length, ics: text });
  vs = vs.slice(-MAX_VERSIONS);
  while (vs.length && !setVersions(id, vs)) vs.shift();
}

export function tidyVersions(id: string, synced: number | null | undefined) {
  const v = getVersions(id);
  if (v.length > MAX_VERSIONS) setVersions(id, v.slice(-MAX_VERSIONS));
  const ics = getIcs(id);
  if (ics && !v.length) setVersions(id, [{ at: synced || Date.now(), n: parseICS(ics).length, ics }]);
}

export function removePlanData(id: string) {
  for (const k of ['ics', 'custom', 'overrides', 'versions', 'changes', 'absences']) store.remove(pk(k, id));
}
