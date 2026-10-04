import type { FilterMode, Theme } from './constants';
import { setBars } from './platform';
import { store } from './storage';
import type { Collisions } from './types';

export const settings = $state({
  theme: store.get<Theme>('theme', 'system'),
  hue: +store.get('hue', 25),
  fm: store.get<FilterMode>('filterMode', 'dim'),
  gridRange: store.get('gridRange', { from: 8, to: 16 }),
  cd: { on: true, own: true, transfer: 10, ...store.get<Partial<Collisions>>('collisions', {}) } as Collisions,
  proxy: store.get('proxy', ''),
  hidden: store.get<string[]>('hidden', [])
});

function applyTheme() {
  if (settings.theme === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.dataset.theme = settings.theme;
  setBars(settings.theme);
}
const applyHue = () => document.documentElement.style.setProperty('--h', String(settings.hue));
const applyFm = () => (document.body.dataset.fm = settings.fm);

export function applyAppearance() {
  applyTheme();
  applyHue();
  applyFm();
}

export function setTheme(t: Theme) {
  settings.theme = t;
  store.set('theme', t);
  applyTheme();
}
export function setHue(h: number) {
  settings.hue = h;
  store.set('hue', h);
  applyHue();
}
export function setFm(m: FilterMode) {
  settings.fm = m;
  store.set('filterMode', m);
  applyFm();
}
export function setGridRange(from: number, to: number) {
  settings.gridRange = { from, to };
  store.set('gridRange', settings.gridRange);
}
export function setCollisions(patch: Partial<Collisions>) {
  Object.assign(settings.cd, patch);
  store.set('collisions', settings.cd);
}
export function setProxy(p: string) {
  settings.proxy = p;
  store.set('proxy', p);
}
export function setHidden(key: string, hidden: boolean) {
  settings.hidden = hidden ? [...new Set([...settings.hidden, key])] : settings.hidden.filter((k) => k !== key);
  store.set('hidden', settings.hidden);
}
