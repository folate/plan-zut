import { addDays, monday, ymd } from '../dates';
import { icsDate, icsEsc } from '../ics';
import { store } from '../storage';
import type { ApiSource, GroupRef } from '../types';
import { api } from './api';
import { gmKey, putMeta } from './meta.svelte';
import { hasKey } from './session.svelte';
import { codeFromCourseId, codeFromCtype, groupBy, pl, rankCourses } from './util';

const TT_F = 'start_time|end_time|name|course_id|course_name|classtype_name|group_number|building_name|room_number|unit_id|classgroup_profile_url|lecturer_ids';
const GROUP_F = 'course_unit_id|group_number|lecturers|class_type|term_id';

export const usosTime = (s: string) => new Date(s.replace(' ', 'T'));

const memo = new Map<string, { t: number; v: Promise<any> }>();
function cached<T>(key: string, ttl: number, fn: () => Promise<T>): Promise<T> {
  const hit = memo.get(key);
  if (hit && Date.now() - hit.t < ttl) return hit.v;
  const v = fn();
  memo.set(key, { t: Date.now(), v });
  v.catch(() => memo.delete(key));
  return v;
}

async function pool<T>(items: T[], n: number, fn: (it: T) => Promise<void>) {
  const q = [...items];
  await Promise.all(Array.from({ length: Math.min(n, q.length) }, async () => {
    while (q.length) await fn(q.shift()!);
  }));
}

const MIN = 60e3;

export function currentTerms(): Promise<any[]> {
  const t = ymd(new Date());
  return cached('terms|' + t, 60 * MIN, () => api('terms/search', { min_finish_date: t, max_start_date: t }));
}

export function activitiesToIcs(acts: any[]) {
  const lines = ['BEGIN:VCALENDAR'];
  const seen = new Set<string>();
  for (const a of acts) {
    const uid = `api-${a.unit_id || a.course_id || 'x'}-${a.group_number || 0}-${a.start_time}`;
    if (seen.has(uid)) continue;
    seen.add(uid);
    let url: string = a.classgroup_profile_url || '';
    if (url && a.group_number && !/gr_nr=/.test(url)) url += (url.includes('?') ? '&' : '?') + 'gr_nr=' + a.group_number;
    const code = codeFromCourseId(a.course_id) || codeFromCtype(pl(a.classtype_name));
    lines.push(
      'BEGIN:VEVENT',
      `SUMMARY:${icsEsc(code + ' - ' + pl(a.course_name || a.name))}`,
      `DTSTART:${icsDate(a.start_time)}`,
      `DTEND:${icsDate(a.end_time)}`,
      `UID:${uid}`,
      `DESCRIPTION:${icsEsc(`Sala: ${a.room_number || ''}\n${pl(a.building_name)}\n\n${url}`)}`,
      'END:VEVENT'
    );
  }
  lines.push('END:VCALENDAR');
  return lines.join('\n');
}

const cgCache = new Map<string, { t: number; acts: any[] }>();
async function groupDates(unit: string | number, group: string | number): Promise<any[]> {
  const k = gmKey(unit, group), c = cgCache.get(k);
  if (c && Date.now() - c.t < 5 * 60e3) return c.acts;
  const acts = await api('tt/classgroup_dates2', { unit_id: unit, group_number: group, fields: TT_F });
  cgCache.set(k, { t: Date.now(), acts });
  return acts;
}

export interface DiscoveredGroup {
  unit_id: string;
  group_number: number;
  first?: any;
  ct?: string;
}

export const discoverGroups = (courseId: string) => cached('groups|' + courseId, 5 * MIN, () => findGroups(courseId));

async function findGroups(courseId: string): Promise<{ term: any; groups: DiscoveredGroup[] } | null> {
  const cur = await currentTerms(), curIds = new Set(cur.map((t) => t.id));
  const c = await api('courses/course', { course_id: courseId, fields: 'terms' });
  const terms = (c.terms || []).map((t: any) => t.id).filter((t: string) => curIds.has(t));
  if (!terms.length) return null;
  const term = cur.find((t) => t.id === terms[0]);
  const ed = await api('courses/course_edition', { course_id: courseId, term_id: term.id, fields: 'course_units_ids' });
  const groups: DiscoveredGroup[] = [];
  for (const u of ed.course_units_ids || []) {
    const cu = await api('courses/course_unit', { course_unit_id: u, fields: 'id|class_groups' });
    for (const g of cu.class_groups || []) groups.push({ unit_id: String(g.course_unit_id || u), group_number: Math.round(+g.number) });
  }
  if (!groups.length) return null;
  await pool(groups.slice(0, 24), 3, async (g) => {
    try {
      const acts = await groupDates(g.unit_id, g.group_number), now = new Date();
      g.first = acts.find((a) => usosTime(a.start_time) >= now) || acts[0];
      g.ct = g.first ? pl(g.first.classtype_name) : '';
    } catch {}
  });
  return { term, groups: groups.sort((x, y) => x.group_number - y.group_number) };
}

const refs = (gs: any[]): GroupRef[] => gs.map((g) => ({ unit_id: g.course_unit_id, group_number: g.group_number }));

export async function fetchApiPlan(src: ApiSource, info: { staffName?: string } = {}): Promise<string> {
  if (src.kind === 'groups') {
    const all: any[] = [];
    await pool(src.groups, 3, async (g) => void all.push(...(await groupDates(g.unit_id, g.group_number))));
    return activitiesToIcs(all);
  }
  if (src.kind === 'staff') {
    try {
      const r = await api('groups/lecturer', { user_id: src.user_id, active_terms: 'true', fields: GROUP_F });
      const gs = Object.values(r.groups || {}).flat() as any[];
      for (const g of gs) {
        const me = (g.lecturers || []).find((x: any) => String(x.id) === String(src.user_id));
        if (me) info.staffName = `${me.first_name} ${me.last_name}`;
      }
      putMeta(gs);
      if (gs.length) return fetchApiPlan({ kind: 'groups', groups: refs(gs) });
    } catch (e: any) {
      if (e.status && e.status !== 400) throw e;
    }
    const all: any[] = [], ws = monday(new Date());
    for (let w = -1; w < 10; w++) all.push(...(await api('tt/staff', { user_id: src.user_id, start: ymd(addDays(ws, w * 7)), days: 7, fields: TT_F })));
    return activitiesToIcs(all);
  }
  if (src.kind === 'account') {
    const r = await api('groups/participant', { active_terms: 'true', fields: GROUP_F }, { auth: true });
    const gs = Object.values(r.groups || {}).flat() as any[];
    putMeta(gs);
    if (!gs.length) throw new Error('USOS nie zwrócił żadnych Twoich grup w bieżącym semestrze.');
    return fetchApiPlan({ kind: 'groups', groups: refs(gs) });
  }
  if (src.kind === 'common') {
    const terms = new Set((await currentTerms()).map((t) => t.id));
    const r = await api('groups/common_groups', { user_id: src.user_id, fields: 'group[course_unit_id|group_number|term_id]|his_role' }, { auth: true });
    const gs = (r || []).map((x: any) => x.group).filter((g: any) => g && (!g.term_id || terms.has(g.term_id)));
    if (!gs.length) throw new Error('W tym semestrze nie macie wspólnych zajęć.');
    return fetchApiPlan({ kind: 'groups', groups: refs(gs) });
  }
  throw new Error('Nieznane źródło planu.');
}

export interface SearchItem {
  kind: 'course' | 'staff' | 'group' | 'common';
  id?: string;
  name: string;
  sub?: string;
  code?: string | null;
  recent?: boolean;
  section?: string;
  course?: string;
  all?: boolean;
  groups?: GroupRef[];
  unit?: string;
  group?: string;
}

export const recentSearches = () => store.get<SearchItem[]>('recentSearch', []);
export function pushRecent(it: SearchItem) {
  store.set('recentSearch', [it, ...recentSearches().filter((x) => !(x.kind === it.kind && x.id === it.id))].slice(0, 8));
}

const COURSE_PAGE = 20;
export interface CourseHit {
  id: string;
  name: string;
  faculty: string;
}
const courseCache = new Map<string, { raw: CourseHit[]; more: boolean; t: number }>();

export async function searchCourses(q: string, pages = 4): Promise<{ items: CourseHit[]; more: boolean }> {
  const key = q.trim().toLowerCase();
  let c = courseCache.get(key);
  if (!c || Date.now() - c.t > 10 * MIN) courseCache.set(key, (c = { raw: [], more: true, t: Date.now() }));
  while (c.more && c.raw.length < pages * COURSE_PAGE) {
    const r = await api('courses/search', { lang: 'pl', name: q, fields: 'course_id|name|fac_id', num: COURSE_PAGE, start: c.raw.length });
    const items = r.items || [];
    c.raw.push(...items.map((it: any) => ({ id: it.course_id, name: pl(it.name), faculty: it.fac_id || '' })));
    c.more = !!r.next_page && items.length > 0;
  }
  const names = await facultyNames(c.raw.map((x) => x.faculty));
  const named = c.raw.map((x) => ({ ...x, faculty: names.get(x.faculty) || x.faculty }));
  return { items: groupBy(rankCourses(named, q), (x) => x.faculty), more: c.more && c.raw.length < 4 * COURSE_PAGE };
}

const facCache = new Map<string, string>();
async function facultyNames(ids: string[]): Promise<Map<string, string>> {
  const missing = [...new Set(ids)].filter((id) => id && !facCache.has(id));
  if (missing.length)
    try {
      const r = await api('fac/faculties', { fac_ids: missing.join('|'), fields: 'id|name' });
      for (const f of Object.values(r || {}) as any[]) if (f) facCache.set(f.id, pl(f.name));
    } catch {}
  return facCache;
}

export const staffIdFrom = (q: string, minDigits = 1) =>
  (q.match(/(?:os_id|user_id|osoba_id)=(\d+)/) || q.match(new RegExp(`^(\\d{${minDigits},})$`)))?.[1] ?? null;

export async function suggest(q: string, pages = 4): Promise<{ items: SearchItem[]; err?: string; more?: boolean }> {
  q = q.trim();
  const out: SearchItem[] = [], ql = q.toLowerCase();
  const staffId = staffIdFrom(q, 2);
  if (staffId) out.push({ kind: 'staff', id: staffId, name: `Prowadzący nr ${staffId}`, sub: 'Plan prowadzącego' });
  for (const r of recentSearches()) if (!q || r.name.toLowerCase().includes(ql)) out.push({ ...r, recent: true });
  if (q.length < 3 || staffId) return { items: out };
  const errs: string[] = [];
  const fail = (e: Error): SearchItem[] => (errs.push(e.message), []);
  let more = false;
  const jobs: Promise<SearchItem[]>[] = [
    searchCourses(q, pages)
      .then((r) => {
        more = r.more;
        return r.items.map((c): SearchItem => ({ kind: 'course', id: c.id, name: c.name, sub: c.id, code: codeFromCourseId(c.id), section: c.faculty }));
      })
      .catch(fail)
  ];
  if (hasKey())
    jobs.push(
      cached('staff|' + ql, 10 * MIN, () => api('users/search2', { lang: 'pl', query: q, among: 'current_teachers', num: 8, fields: 'items[user[id|first_name|last_name|titles]]' }))
        .then((r) =>
          (r.items || []).map((it: any): SearchItem => {
            const u = it.user || it, tt = u.titles || {};
            return { kind: 'staff', id: String(u.id), name: [tt.before, u.first_name, u.last_name, tt.after].filter(Boolean).join(' '), sub: 'Prowadzący', section: 'Prowadzący' };
          })
        )
        .catch(fail)
    );
  const res = (await Promise.all(jobs)).flat();
  const seen = new Set(out.map((x) => x.kind + x.id));
  return { items: [...out, ...res.filter((x) => !seen.has(x.kind + x.id))], err: errs[0], more };
}
