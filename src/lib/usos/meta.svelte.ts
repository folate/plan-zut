import { store } from '../storage';
import type { GroupMeta, GroupRef } from '../types';
import { api, apiStatus } from './api';
import { pl } from './util';

let GM = $state.raw<Record<string, GroupMeta>>(store.get('groupMeta', {}));
const failed = new Set<string>();
let busy = false;

export const gmKey = (unit: string | number, group: string | number) => `${unit}|${group}`;
export const metaFor = (unit: string | number, group: string | number): GroupMeta | undefined => GM[gmKey(unit, group)];
export const metaOf = (e: { unit?: string; group?: string }) => (e.unit && e.group ? metaFor(e.unit, e.group) : undefined);
export const metaFailed = (e: { unit?: string; group?: string }) => !!(e.unit && e.group && failed.has(gmKey(e.unit, e.group)));

export function putMeta(groups: any[], ensureKeys: string[] = []) {
  const next = { ...GM };
  for (const g of groups) {
    if (!g) continue;
    const u = g.course_unit_id, n = g.group_number;
    if (!u || n == null) continue;
    next[gmKey(u, n)] = {
      l: (g.lecturers || []).map((x: any) => ({ id: String(x.id), n: `${x.first_name || ''} ${x.last_name || ''}`.trim() })),
      ct: pl(g.class_type),
      t: Date.now()
    };
  }
  for (const k of ensureKeys) if (!next[k]) next[k] = { l: [], t: Date.now() };
  GM = next;
  store.set('groupMeta', GM);
}

const GROUP_FIELDS = 'course_unit_id|group_number|lecturers|class_type';
const groupIds = (groups: GroupRef[]) => groups.map((g) => `(${g.unit_id},${g.group_number})`).join('|');

export async function loadGroupMeta(groups: GroupRef[], ensureKeys: string[] = []) {
  const r = await api('groups/groups', { group_ids: groupIds(groups), fields: GROUP_FIELDS });
  putMeta(Object.values(r || {}), ensureKeys);
}

export async function ensureMeta(evts: { unit?: string; group?: string }[]) {
  if (busy || apiStatus.down) return;
  const need = [...new Set(evts.filter((e) => e.unit && e.group).map((e) => gmKey(e.unit!, e.group!)))]
    .filter((k) => !GM[k] && !failed.has(k))
    .slice(0, 20);
  if (!need.length) return;
  busy = true;
  try {
    await loadGroupMeta(need.map((k) => { const [unit_id, group_number] = k.split('|'); return { unit_id, group_number }; }), need);
  } catch {
    need.forEach((k) => failed.add(k));
  } finally {
    busy = false;
  }
}

export const shortName = (n: string) => {
  const w = n.split(' ');
  return w.length > 1 ? w[0][0] + '. ' + w.slice(1).join(' ') : n;
};
export const lectLabel = (e: { unit?: string; group?: string }) => {
  const m = metaOf(e);
  if (!m || !m.l || !m.l.length) return '';
  return shortName(m.l[0].n) + (m.l.length > 1 ? ` +${m.l.length - 1}` : '');
};
