import { PCOLORS, PREVIEW_ID } from './constants';
import { addDays, dowOf, monday } from './dates';
import { emptyOv } from './events';
import { parseICS } from './ics';
import type { ErrKind } from './net';
import * as planStore from './planStore';
import { settings } from './settings.svelte';
import { pk, store } from './storage';
import type { Absence, Change, CustomEvent, Overrides, PeerData, Profile, UsosEvent, WeekView } from './types';
import { buildWeek } from './view';

export interface Preview {
  p: Profile;
  ics: string;
  data: PeerData;
}
export type AnimDir = '' | 'l' | 'r';

const MOBILE_QUERY = '(max-width:820px)';

function initProfiles(): Profile[] {
  let list = store.get<Profile[] | null>('profiles', null);
  if (!list) {
    list = [{ id: 'p1', name: 'Mój plan', url: store.get('url', ''), synced: store.get('synced', null), ci: 0 }];
    for (const k of ['ics', 'custom', 'overrides']) {
      const v = store.get<unknown>(k, null);
      if (v) store.set(pk(k, 'p1'), v);
    }
    store.set('profiles', list);
  }
  return list;
}

class AppState {
  profiles = $state.raw<Profile[]>(initProfiles());
  pid = $state<string | null>(null);
  cmp = $state<string | null>(null);
  usos = $state.raw<UsosEvent[]>([]);
  custom = $state.raw<CustomEvent[]>([]);
  ov = $state.raw<Overrides>(emptyOv());
  absences = $state.raw<Absence[]>([]);
  preview = $state.raw<Preview | null>(null);
  viewingPreview = $state(false);

  week = $state.raw(monday(new Date()));
  sel = $state(dowOf(new Date()));
  now = $state.raw(new Date());
  mobile = $state(matchMedia(MOBILE_QUERY).matches);

  busy = $state(false);
  lastErr = $state.raw<{ kind: ErrKind; msg: string } | null>(null);
  retryDelay = $state(0);

  rev = $state(0);
  anim = $state.raw({ key: 0, dir: '' as AnimDir, on: true });
  flash = $state.raw<{ day: number } | null>(null);

  profile = $derived(this.profiles.find((p) => p.id === this.pid));
  shownProfile = $derived(this.viewingPreview ? this.preview?.p : this.profile);
  hasSource = $derived(!!(this.profile && (this.profile.url || this.profile.api)));
  synced = $derived(this.profile?.synced ?? null);
  comparing = $derived(!!this.cmp);

  changes = $derived.by((): Change[] => {
    void this.rev;
    return this.pid ? planStore.getChanges(this.pid) : [];
  });
  peer = $derived.by(() => (this.cmp && prof(this.cmp) ? peerData(this.cmp) : null));
  bColors = $derived.by(() => {
    const names = [...this.usos, ...(this.peer?.usos ?? [])].map((e) => e.building).filter(Boolean);
    return new Map([...new Set(names)].map((b, i) => [b, `var(--b${(i % 6) + 1})`]));
  });
  view = $derived.by((): WeekView =>
    buildWeek({
      ws: this.week, usos: this.usos, ov: this.ov, custom: this.custom,
      changes: this.viewingPreview ? [] : this.changes,
      absent: new Set(this.viewingPreview ? [] : this.absences.map((a) => a.uid)),
      peer: this.peer, comparing: this.comparing,
      hidden: new Set(settings.hidden), hideOff: settings.fm === 'hide', cd: settings.cd
    })
  );
  selDay = $derived(Math.min(this.sel, this.view.nDays - 1));
}

export const app = new AppState();

matchMedia(MOBILE_QUERY).addEventListener('change', (e) => {
  app.mobile = e.matches;
  app.anim = { ...app.anim, on: false };
});
setInterval(() => (app.now = new Date()), 30000);

export const touch = () => void app.rev++;
export const gapOpts = () => ({ comparing: app.comparing, cd: settings.cd });

export const prof = (id: string | null | undefined): Profile | undefined =>
  id === PREVIEW_ID ? app.preview?.p : app.profiles.find((p) => p.id === id);
export const newId = () => 'p' + Date.now().toString(36);
export const nextCi = () => (Math.max(-1, ...app.profiles.map((x) => x.ci || 0)) + 1) % PCOLORS.length;

function saveProfiles(list: Profile[]) {
  app.profiles = list;
  store.set('profiles', list);
}
export const addProfile = (p: Profile) => saveProfiles([...app.profiles, p]);
export const updateProfile = (id: string, patch: Partial<Profile>) =>
  saveProfiles(app.profiles.map((p) => (p.id === id ? { ...p, ...patch } : p)));
export const removeProfile = (id: string) => saveProfiles(app.profiles.filter((p) => p.id !== id));

export function hasPlan(id: string | null | undefined) {
  void app.rev;
  const p = prof(id);
  return !!(p && (p.url || p.api || planStore.getIcs(p.id)));
}

const peerCache = new Map<string, PeerData>();
export const dropPeerCache = (id: string) => peerCache.delete(id);
export function peerData(id: string): PeerData {
  if (id === PREVIEW_ID) return app.preview?.data ?? { key: '', usos: [], custom: [], ov: emptyOv() };
  void app.rev;
  const ics = planStore.getIcs(id) || '';
  const key = `${id}|${ics.length}|${prof(id)?.synced || ''}`;
  const hit = peerCache.get(id);
  if (hit?.key === key) return hit;
  const d = { key, usos: parseICS(ics), custom: planStore.getCustom(id), ov: planStore.getOverrides(id) };
  peerCache.set(id, d);
  return d;
}

export function animate(dir: AnimDir = '') {
  app.anim = { key: app.anim.key + 1, dir, on: true };
}

export function step(dir: 1 | -1) {
  if (app.mobile) {
    const nDays = app.view.nDays;
    let s = app.selDay + dir;
    if (s < 0) { app.week = addDays(app.week, -7); s = nDays > 5 ? 6 : 4; }
    else if (s >= nDays) { app.week = addDays(app.week, 7); s = 0; }
    app.sel = s;
  } else app.week = addDays(app.week, dir * 7);
  animate(dir > 0 ? 'r' : 'l');
}

export function selectDay(d: number) {
  if (d === app.selDay) return;
  const dir = d > app.selDay ? 'r' : 'l';
  app.sel = d;
  animate(dir);
}

export function flashDay(day: number) {
  app.flash = { day };
}

export function goToDate(d: Date) {
  const w = monday(d);
  const dir = w < app.week ? 'l' : w > app.week ? 'r' : '';
  app.week = w;
  app.sel = dowOf(d);
  animate(dir);
  if (!app.mobile) setTimeout(() => flashDay(dowOf(d)), 50);
}

export function jumpToRelevant() {
  const now = new Date(), ws = monday(now);
  if (!app.usos.length || app.usos.some((e) => +monday(e.start) === +ws)) {
    app.week = ws;
    app.sel = dowOf(now);
    return;
  }
  const nx = [...app.usos].sort((a, b) => +a.start - +b.start).find((e) => e.end >= now) || app.usos[0];
  app.week = monday(nx.start);
  app.sel = dowOf(nx.start);
}
