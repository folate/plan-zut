import type { UsosEvent } from './types';

const unesc = (v: string) => v.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1');

function parseDate(v: string): Date | null {
  const m = v.match(/(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})?(Z)?)?/);
  if (!m) return null;
  const a = [+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0), +(m[6] || 0)] as const;
  return m[7] ? new Date(Date.UTC(...a)) : new Date(...a);
}

export function parseICS(text: string): UsosEvent[] {
  const lines = text.replace(/\r\n?/g, '\n').replace(/\n[ \t]/g, '').split('\n');
  const raw: Record<string, string>[] = [];
  let cur: Record<string, string> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') { cur = {}; continue; }
    if (line === 'END:VEVENT') { if (cur) raw.push(cur); cur = null; continue; }
    if (!cur) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    cur[line.slice(0, i).split(';')[0].toUpperCase()] = line.slice(i + 1);
  }
  const out: UsosEvent[] = [];
  for (const e of raw) {
    const sum = unesc(e.SUMMARY || '');
    const m = sum.match(/^\s*([A-ZŁŚŻŹĆŃÓĘĄ]{1,4})\s*-\s*(.+)$/);
    const desc = unesc(e.DESCRIPTION || '');
    const url = (desc.match(/https?:\/\/\S+/) || [])[0] || '';
    const code = m ? m[1] : '', name = m ? m[2] : sum;
    const group = (url.match(/[?&]gr_nr=(\d+)/) || [])[1] || '';
    const um = String(e.UID || '').match(/^api-(\d+)-(\d+)-/);
    const unit = (url.match(/zaj_cyk_id=(\d+)/) || [])[1] || (um ? um[1] : '');
    const start = parseDate(e.DTSTART || ''), end = parseDate(e.DTEND || '');
    if (!start || !end) continue;
    out.push({
      src: 'usos', uid: e.UID || e.DTSTART + '|' + sum, skey: `${code}|${name}|${group}`, code, name, group, url, unit, start, end,
      room: ((desc.match(/Sala:\s*([^\n]+)/) || [])[1] || '').trim(),
      building: desc.split('\n').map((s) => s.trim()).filter((s) => s && !s.startsWith('Sala:') && !s.startsWith('http'))[0] || ''
    });
  }
  return out;
}

export const icsEsc = (t: unknown) => String(t || '').replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
export const icsDate = (s: string) => s.replace(/[-:]/g, '').replace(' ', 'T');
