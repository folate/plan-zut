import { TYPES } from '../constants';

export const pl = (o: any): string => (o && typeof o === 'object' ? o.pl || o.en || '' : o || '');

export function rankCourses<T extends { name: string }>(items: T[], query: string): T[] {
  const q = query.trim().toLowerCase().replace(/\s+/g, ' '), words = q.split(' ');
  const score = (name: string) => {
    const n = name.trim().toLowerCase().replace(/\s+/g, ' ');
    if (n === q) return 0;
    const have = new Set(n.split(/[^\p{L}\p{N}.]+/u));
    return words.every((w) => have.has(w)) ? 1 : 2;
  };
  return items.map((it, i) => ({ it, i, s: score(it.name) })).sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.it);
}

export type StudyMode = 'S' | 'N';
export const MODE_NAME: Record<StudyMode, string> = { S: 'stacjonarne', N: 'niestacjonarne' };
const LEVEL: Record<string, string> = { '1': 'I st.', '2': 'II st.', D: 'doktoranckie', P: 'podyplomowe' };
export function studyInfo(courseId: unknown): { mode: StudyMode | null; label: string } {
  const m = String(courseId).match(/^[^-]+-([SN])([A-Z0-9])-(\d+)?/);
  if (!m) return { mode: null, label: '' };
  return { mode: m[1] as StudyMode, label: [LEVEL[m[2]], m[3] ? `sem. ${m[3]}` : ''].filter(Boolean).join(' · ') };
}

export function groupBy<T>(items: T[], key: (it: T) => string): T[] {
  const groups = new Map<string, T[]>();
  for (const it of items) {
    const k = key(it);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(it);
  }
  return [...groups.values()].flat();
}

const CTYPE: [string, string][] = [
  ['wyk', 'WK'], ['labor', 'LB'], ['audyt', 'CW'], ['ćwicz', 'CW'], ['semin', 'SM'], ['projek', 'PR'], ['lektor', 'LK'],
  ['konwers', 'KON'], ['wychowanie fiz', 'WF'], ['egzamin', 'EGZ'], ['prakty', 'PRA']
];
export const codeFromCtype = (name: unknown) => {
  const n = String(name || '').toLowerCase();
  for (const [k, c] of CTYPE) if (n.includes(k)) return c;
  return 'ZP';
};
export const codeFromCourseId = (id: unknown) => {
  const m = String(id).match(/-([A-Z]{1,3})$/);
  return m && TYPES[m[1]] ? m[1] : null;
};
