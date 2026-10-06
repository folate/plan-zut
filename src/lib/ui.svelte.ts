import { store } from './storage';

export type SheetSpec =
  | { name: 'plans' }
  | { name: 'profile'; id: string | null; mode?: 'link' | 'file' }
  | { name: 'class'; uid: string }
  | { name: 'event'; id: string | null }
  | { name: 'changes' }
  | { name: 'absences' }
  | { name: 'detail'; uid: string }
  | { name: 'history'; id: string }
  | { name: 'welcome' }
  | { name: 'source'; target: string | null }
  | { name: 'account'; target: string | null }
  | { name: 'settings' }
  | { name: 'news' }
  | { name: 'search' }
  | { name: 'searchOverlay' }
  | { name: 'export' }
  | { name: 'import'; code: string | null };

interface Toast {
  text: string;
  action?: string;
  fn?: () => void;
}

class Ui {
  sheet = $state.raw<SheetSpec | null>(null);
  stack = $state.raw<SheetSpec[]>([]);
  toast = $state.raw<Toast | null>(null);
  toastShown = $state(false);
  conflictsOpen = $state(false);
  tour = $state(false);
}
export const ui = new Ui();

export const tourSeen = () => store.get('tourDone', false);
export function startTour() {
  ui.sheet = null;
  ui.tour = true;
}
export function endTour() {
  ui.tour = false;
  store.set('tourDone', true);
}

export function openSheet(s: SheetSpec) {
  ui.sheet = s;
  ui.stack = [];
  ui.toastShown = false;
}
export function pushSheet(s: SheetSpec) {
  const from = ui.sheet;
  ui.stack = from ? [...ui.stack, from] : ui.stack;
  ui.sheet = s;
}
export function backSheet() {
  ui.sheet = ui.stack.at(-1) ?? null;
  ui.stack = ui.stack.slice(0, -1);
}
export function closeSheet() {
  ui.sheet = null;
  ui.stack = [];
}

let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(text: string, action?: string, fn?: () => void) {
  ui.toast = { text, action, fn };
  ui.toastShown = true;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (ui.toastShown = false), 7000);
}
