import type { ChangeKind, RepeatKind } from './types';

export interface ClassType {
  n: string;
  k: string;
}
export const TYPES: Record<string, ClassType> = {
  WK: { n: 'Wykład', k: 'wk' }, W: { n: 'Wykład', k: 'wk' },
  LB: { n: 'Laboratorium', k: 'lb' }, L: { n: 'Laboratorium', k: 'lb' },
  CW: { n: 'Ćwiczenia', k: 'cw' }, C: { n: 'Ćwiczenia', k: 'cw' },
  SM: { n: 'Seminarium', k: 'sm' }, S: { n: 'Seminarium', k: 'sm' },
  PR: { n: 'Projekt', k: 'pr' }, P: { n: 'Projekt', k: 'pr' },
  LK: { n: 'Lektorat', k: 'lk' }, LEK: { n: 'Lektorat', k: 'lk' },
  KON: { n: 'Konwersatorium', k: 'ot' }, KN: { n: 'Konwersatorium', k: 'ot' },
  WF: { n: 'Wychowanie fizyczne', k: 'ot' },
  EGZ: { n: 'Egzamin', k: 'pr' }, PRA: { n: 'Praktyki', k: 'ot' }, ZP: { n: 'Zajęcia praktyczne', k: 'ot' }
};
export const typeOf = (code: string | null | undefined): ClassType =>
  (code && TYPES[code]) || { n: code || 'Zajęcia', k: 'ot' };
export const typeStyle = (k: string) => `--tbg:var(--${k}-bg);--tfg:var(--${k}-fg)`;
export const TYPE_ORDER = ['WK', 'W', 'CW', 'C', 'LB', 'L', 'PR', 'P', 'SM', 'S', 'LK', 'LEK'];
export const OWN_KEY = '__own';

export const REPEAT: Record<RepeatKind, string> = {
  none: 'Jednorazowo', weekly: 'Co tydzień', biweekly: 'Co dwa tygodnie', weekdays: 'W dni robocze', daily: 'Codziennie'
};
export const DSHORT = ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'];
export const DPLUR = ['poniedziałki', 'wtorki', 'środy', 'czwartki', 'piątki', 'soboty', 'niedziele'];
export const DOWS = ['poniedziałek', 'wtorek', 'środa', 'czwartek', 'piątek', 'sobota', 'niedziela'];
export const DOWS_ACC = ['każdy poniedziałek', 'każdy wtorek', 'każdą środę', 'każdy czwartek', 'każdy piątek', 'każdą sobotę', 'każdą niedzielę'];
export const OWN_COLORS = ['o1', 'o2', 'o3', 'o4'];

export const KIND: Record<ChangeKind, string> = {
  removed: 'Odwołane', added: 'Nowe zajęcia', room: 'Zmiana sali', time: 'Zmiana godziny', moved: 'Przeniesione'
};

export const PCOLORS = [0, 130, 250, 60, 190, 310];
export const pcolor = (p: { ci?: number } | null | undefined) =>
  `oklch(.55 .14 calc(var(--h) + ${PCOLORS[(p?.ci || 0) % PCOLORS.length]}))`;
const chars = (s: string) => (typeof Intl.Segmenter === 'function' ? [...new Intl.Segmenter().segment(s)].map((x) => x.segment) : [...s]);

export const initials = (name: string) => {
  const words = String(name).trim().split(/\s+/).filter(Boolean);
  const texty = words.filter((w) => /^[\p{L}\p{N}]/u.test(w));
  if (!texty.length) return chars(words[0] || '?')[0];
  const first = chars(texty[0]);
  return (first[0] + (texty[1] ? chars(texty[1])[0] : first[1] || '')).toUpperCase();
};

export const shortB = (b: string | undefined) => {
  const m = String(b).match(/^(\S+)\s.*?(\d+)?$/);
  return m ? m[1] + (m[2] ? ' ' + m[2] : '') : String(b ?? '');
};

export type FilterMode = 'dim' | 'outline' | 'hide';
export const FM: [FilterMode, string, string][] = [
  ['dim', 'Przygaś', 'Widać je słabiej, a na kafelku pokazuje się, ile czasu zwalnia ich pominięcie.'],
  ['outline', 'Kontur', 'Zostaje sam obrys, a na kafelku pokazuje się, ile czasu zwalnia ich pominięcie.'],
  ['hide', 'Ukryj', 'Znikają całkowicie, a przerwy liczą się tak, jakby ich nie było.']
];
export type Theme = 'system' | 'light' | 'dark';
export const THEMES: [Theme, string][] = [['system', 'Systemowy'], ['light', 'Jasny'], ['dark', 'Ciemny']];
export const TRANSFER: [string, string][] = [['0', 'Wył.'], ['5', '5 min'], ['10', '10 min'], ['15', '15 min'], ['20', '20 min']];
export const HUES: [string, number][] = [
  ['Czerwień', 25], ['Pomarańcz', 55], ['Oliwka', 110], ['Zieleń', 150], ['Morski', 200], ['Granat', 255], ['Fiolet', 305]
];

export const PREVIEW_ID = '__preview';
