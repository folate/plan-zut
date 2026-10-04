import { fmtShort, hm, plural, sameDay } from './dates';
import { hasIcs } from './plans';
import type { Profile } from './types';

export function apiLabel(p: Profile) {
  if (!p.api) return '';
  if (p.api.kind === 'staff') return 'prowadzący';
  if (p.api.kind === 'account') return 'konto USOS';
  if (p.api.kind === 'common') return 'wspólne zajęcia';
  const n = (p.api.groups || []).length;
  return `${n} ${plural(n, 'grupa', 'grupy', 'grup')} z USOS`;
}

export function statusOf(p: Profile) {
  const pre = p.api ? apiLabel(p) + ' · ' : '';
  if (p.synced) {
    const d = new Date(p.synced);
    return pre + (sameDay(d, new Date()) ? 'pobrano ' + hm(d) : 'stan z ' + fmtShort(d));
  }
  return hasIcs(p.id) ? 'plan z pliku' : 'brak planu';
}

export const sourceLabel = (p: Profile) => (p.api ? apiLabel(p) : p.url ? 'link do kalendarza' : 'plik .ics');
