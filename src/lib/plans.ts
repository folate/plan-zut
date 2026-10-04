import {
  addProfile, animate, app, dropPeerCache, hasPlan, jumpToRelevant, newId, nextCi, prof, removeProfile, touch, updateProfile
} from './app.svelte';
import { diffPlans } from './changes';
import { PREVIEW_ID, TYPES } from './constants';
import { plural } from './dates';
import { emptyOv } from './events';
import { parseICS } from './ics';
import { fetchIcs, kindOf, msgOf, type ErrKind } from './net';
import * as planStore from './planStore';
import { checkUpdate, download, release } from './release.svelte';
import { settings } from './settings.svelte';
import { store } from './storage';
import type { Absence, ApiSource, Change, CustomEvent, Overrides, PlanVersion, Profile } from './types';
import { openSheet, toast } from './ui.svelte';
import { api, apiStatus } from './usos/api';
import { loginFinish } from './usos/oauth';
import { discoverGroups, fetchApiPlan, pushRecent, type SearchItem } from './usos/plans';
import { session, setAuth } from './usos/session.svelte';

export const changesOf = (id: string) => (void app.rev, planStore.getChanges(id));
export const versionsOf = (id: string) => (void app.rev, planStore.getVersions(id));
export const hasIcs = (id: string) => (void app.rev, !!planStore.getIcs(id));

export function setChanges(id: string, list: Change[]) {
  planStore.setChanges(id, list);
  touch();
}
export function setVersions(id: string, list: PlanVersion[]) {
  planStore.setVersions(id, list);
  touch();
}
export function storeIcs(id: string, text: string, at?: number) {
  planStore.storeIcs(id, text, at);
  touch();
}
export function recordChanges(id: string, oldT: string | null, newT: string) {
  if (!oldT || oldT === newT) return 0;
  const ch = diffPlans(oldT, newT);
  if (ch.length) setChanges(id, [...planStore.getChanges(id), ...ch]);
  return ch.length;
}

export function saveOverrides(ov: Overrides) {
  app.ov = ov;
  if (app.pid) planStore.setOverrides(app.pid, ov);
}
export function saveAbsences(list: Absence[]) {
  app.absences = list;
  if (app.pid) planStore.setAbsences(app.pid, list);
}
export function saveCustom(list: CustomEvent[]) {
  app.custom = list;
  if (app.pid) planStore.setCustom(app.pid, list);
}

export function loadProfile(id: string | null | undefined) {
  const p = app.profiles.find((x) => x.id === id) || app.profiles[0];
  app.viewingPreview = false;
  app.lastErr = null;
  if (!p) {
    app.pid = null;
    app.cmp = null;
    app.custom = [];
    app.ov = emptyOv();
    app.absences = [];
    app.usos = [];
    return;
  }
  app.pid = p.id;
  store.set('activeProfile', p.id);
  if (app.cmp === p.id) app.cmp = null;
  app.custom = planStore.getCustom(p.id);
  app.ov = planStore.getOverrides(p.id);
  app.absences = planStore.getAbsences(p.id);
  planStore.tidyVersions(p.id, p.synced);
  const ics = planStore.getIcs(p.id);
  app.usos = ics ? parseICS(ics) : [];
}

export function switchProfile(id: string) {
  if (id === app.pid) return;
  loadProfile(id);
  jumpToRelevant();
  animate();
  if (app.hasSource && due(app.profile)) sync().catch(() => {});
  checkUpdate().then(() => {
    if (release.latest) toast(`Jest nowa wersja apki (${release.latest})`, 'Pobierz', download);
  });
}

export function ensureProfile(): Profile {
  if (app.profile) return app.profile;
  const p: Profile = { id: newId(), name: 'Mój plan', url: '', ci: 0 };
  addProfile(p);
  loadProfile(p.id);
  return p;
}

export function deleteProfile(id: string) {
  planStore.removePlanData(id);
  removeProfile(id);
  dropPeerCache(id);
  touch();
  if (app.cmp === id) app.cmp = null;
  if (app.pid === id) {
    loadProfile(app.profiles[0]?.id);
    jumpToRelevant();
  }
  animate();
}

const API_TTL = 6 * 3600e3;
const LINK_TTL = 10 * 60e3;
const FRESH = 30e3;
export const due = (p: Profile | undefined) =>
  !!p && (!p.synced || Date.now() - p.synced > (p.api ? API_TTL : LINK_TTL) || !planStore.getIcs(p.id));

const fetchProfileIcs = (p: Profile) => (p.api ? fetchApiPlan(p.api) : fetchIcs(p.url || '', settings.proxy));

function applyFetched(id: string, text: string) {
  const at = Date.now();
  const changed = recordChanges(id, planStore.getIcs(id), text);
  storeIcs(id, text, at);
  updateProfile(id, { synced: at });
  if (app.pid === id && !app.viewingPreview) app.usos = parseICS(text);
  return changed;
}

let retryTimer: ReturnType<typeof setTimeout> | undefined;
function scheduleRetry(kind: ErrKind) {
  clearTimeout(retryTimer);
  if (kind !== 'down' && kind !== 'timeout') return;
  app.retryDelay = Math.min(app.retryDelay ? app.retryDelay * 2 : 5 * 60e3, 30 * 60e3);
  retryTimer = setTimeout(() => {
    if (document.visibilityState === 'visible') sync().catch(() => {});
    else app.retryDelay = 0;
  }, app.retryDelay);
}
export function retryNow() {
  app.retryDelay = 0;
  sync().catch(() => {});
}
export function retryAfterOutage(kinds: ErrKind[]) {
  if (app.lastErr && kinds.includes(app.lastErr.kind) && !app.busy) sync().catch(() => {});
}

export async function sync() {
  if (app.viewingPreview && app.preview) {
    const pv = app.preview;
    if (!pv.p.api) return toast('To zapisana wersja planu. Nie da się jej odświeżyć.');
    app.busy = true;
    try {
      const t = await fetchApiPlan(pv.p.api);
      const { week, sel } = app;
      enterPreview(pv.p.name, t, pv.p.api);
      app.week = week;
      app.sel = sel;
    } catch (e) {
      toast(msgOf(e));
    } finally {
      app.busy = false;
    }
    return;
  }
  const me = app.profile;
  if (!me) return openSheet({ name: 'source', target: null });
  if (!me.url && !me.api) return openSheet({ name: 'profile', id: me.id });
  if (!app.lastErr && me.synced && Date.now() - me.synced < FRESH) return toast('Plan jest świeży, pobrany przed chwilą.');
  app.busy = true;
  try {
    const n = applyFetched(me.id, await fetchProfileIcs(me));
    app.lastErr = null;
    apiStatus.down = false;
    app.retryDelay = 0;
    if (n) toast(`W planie ${n === 1 ? 'jest 1 zmiana' : `są ${n} ` + plural(n, 'zmiana', 'zmiany', 'zmian')}`, 'Pokaż', () => openSheet({ name: 'changes' }));
  } catch (e) {
    app.lastErr = { kind: kindOf(e), msg: msgOf(e) };
    scheduleRetry(app.lastErr.kind);
    throw e;
  } finally {
    app.busy = false;
  }
  if (app.cmp) syncPeer(app.cmp);
}

async function syncPeer(id: string) {
  const p = prof(id);
  if (id === PREVIEW_ID || !p || (!p.url && !p.api)) return;
  try {
    applyFetched(id, await fetchProfileIcs(p));
  } catch {}
}

export function setCompare(id: string | null) {
  app.cmp = id;
  animate();
  const p = prof(id);
  if (id && p && due(p)) syncPeer(id);
}

export function enterPreview(name: string, ics: string, src: ApiSource | null) {
  const usos = parseICS(ics);
  app.preview = { p: { id: PREVIEW_ID, name, ci: 3, api: src ?? undefined }, ics, data: { key: '', usos, custom: [], ov: emptyOv() } };
  app.viewingPreview = true;
  app.cmp = null;
  app.usos = usos;
  app.custom = [];
  app.ov = emptyOv();
  app.lastErr = null;
  jumpToRelevant();
  animate();
}

export function closePreview() {
  const wasView = app.viewingPreview;
  app.preview = null;
  if (app.cmp === PREVIEW_ID) app.cmp = null;
  if (wasView) loadProfile(app.pid);
  animate();
}

export function previewCompare() {
  loadProfile(app.pid);
  setCompare(PREVIEW_ID);
}

export function previewSave() {
  const pv = app.preview;
  if (!pv) return;
  const p: Profile = { id: newId(), name: pv.p.name.slice(0, 30), url: '', api: pv.p.api, synced: Date.now(), ci: nextCi() };
  addProfile(p);
  storeIcs(p.id, pv.ics);
  const view = app.viewingPreview;
  app.preview = null;
  app.viewingPreview = false;
  if (app.cmp === PREVIEW_ID) app.cmp = p.id;
  if (view) {
    loadProfile(p.id);
    jumpToRelevant();
  }
  animate();
  toast(`Zapisano plan „${p.name}”`);
}

export async function openPreview(it: SearchItem) {
  const label = it.course ?? it.name;
  let src: ApiSource, name = label;
  if (it.kind === 'course') {
    let groups = it.groups;
    if (!groups) {
      const d = await discoverGroups(it.id!);
      if (!d) throw new Error('Ten przedmiot nie ma zajęć w bieżącym semestrze.');
      groups = d.groups.map((g) => ({ unit_id: g.unit_id, group_number: g.group_number }));
    }
    src = { kind: 'groups', course_id: it.id, groups };
    const t = it.code && TYPES[it.code];
    if (t) name += ` (${t.n.toLowerCase()})`;
    if (it.groups && it.groups.length === 1) name += ` · gr. ${it.groups[0].group_number}`;
  } else if (it.kind === 'group') src = { kind: 'groups', groups: [{ unit_id: it.unit!, group_number: it.group! }] };
  else if (it.kind === 'common') src = { kind: 'common', user_id: it.id! };
  else src = { kind: 'staff', user_id: it.id! };
  const info: { staffName?: string } = {};
  const ics = await fetchApiPlan(src, info);
  if (it.kind === 'staff' && info.staffName && /^Prowadzący nr/.test(name)) name = info.staffName;
  if (it.kind === 'staff' || it.kind === 'course')
    pushRecent({ kind: it.kind, id: it.id, name: it.kind === 'staff' ? name : label, sub: it.kind === 'staff' ? it.sub : it.id, code: it.code });
  enterPreview(name, ics, src);
}

export async function addApiProfile(name: string, src: ApiSource) {
  const ics = await fetchApiPlan(src);
  const p: Profile = { id: newId(), name, url: '', api: src, synced: Date.now(), ci: nextCi() };
  addProfile(p);
  storeIcs(p.id, ics);
}

export function useAccountFor(target: string | null) {
  let p = target === 'new' ? undefined : prof(target);
  if (!p) {
    p = { id: newId(), name: session.auth?.user?.name.split(' ')[0] || 'Mój plan', url: '', ci: nextCi() };
    addProfile(p);
  }
  updateProfile(p.id, { api: { kind: 'account' } });
  loadProfile(p.id);
  store.set('onboarded', true);
}

export async function finishLogin(pin: string) {
  const target = await loginFinish(pin);
  if (target) useAccountFor(target);
  return target;
}

export async function calendarLink(): Promise<string> {
  const r = await api('tt/upcoming_share', { lang: 'pl' }, { auth: true });
  if (!r?.webcal_url) throw new Error('USOS nie zwrócił linku do kalendarza.');
  return r.webcal_url;
}

export function logout() {
  setAuth(null);
  const me = app.profile;
  if (me?.api?.kind === 'account') updateProfile(me.id, { api: undefined });
}

async function finishCallbackLogin() {
  const q = new URLSearchParams(location.search);
  const v = q.get('oauth_verifier'), t = q.get('oauth_token');
  if (!v || !t) return;
  history.replaceState(null, '', location.pathname + location.hash);
  if (session.req?.token !== t) return;
  try {
    await finishLogin(v);
    toast('Zalogowano przez USOS');
    await sync();
  } catch (e) {
    toast(msgOf(e));
  }
}

export function boot() {
  const returning = !!new URLSearchParams(location.search).get('oauth_verifier');
  const importing = location.hash.startsWith('#sync=');
  loadProfile(store.get('activeProfile', app.profiles[0]?.id));
  finishCallbackLogin();
  if (importing) setTimeout(() => openSheet({ name: 'import', code: location.hash.slice(6) }), 200);
  else if (!store.get('onboarded', false) && !app.profiles.some((p) => hasPlan(p.id)) && !returning)
    setTimeout(() => openSheet({ name: 'welcome' }), 300);
  jumpToRelevant();
  if (app.hasSource && due(app.profile)) sync().catch(() => {});
}
