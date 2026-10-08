import { shortB } from '../constants';
import { api } from './api';
import type { SearchItem } from './plans';
import { pl } from './util';

interface Building {
  id: string;
  name: string;
  key: string;
}
interface Room {
  id: string;
  number: string;
  type: string;
}

const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');

let index: Promise<Building[]> | undefined;
function buildings(): Promise<Building[]> {
  index ??= api('geo/building_index', { fields: 'id|name' }).then((r: any[]) =>
    r.map((b) => ({ id: String(b.id), name: pl(b.name), key: norm(b.id + ' ' + pl(b.name)) }))
  );
  index.catch(() => (index = undefined));
  return index;
}

const roomCache = new Map<string, Promise<Room[]>>();
function roomsOf(id: string): Promise<Room[]> {
  let p = roomCache.get(id);
  if (!p) {
    p = api('geo/building2', { building_id: id, fields: 'id|rooms[id|number|type]' }).then((r: any) =>
      (r.rooms || []).map((x: any) => ({ id: String(x.id), number: String(x.number ?? ''), type: x.type || '' }))
    );
    roomCache.set(id, p);
    p.catch(() => roomCache.delete(id));
  }
  return p;
}

export async function findRoom(building: string, number: string): Promise<string | null> {
  const b = (await buildings()).find((x) => norm(x.name) === norm(building));
  if (!b) return null;
  return (await roomsOf(b.id)).find((r) => norm(r.number) === norm(number))?.id ?? null;
}

const item = (b: Building, r: Room): SearchItem => ({ kind: 'room', id: r.id, name: `Sala ${r.number}`, sub: shortB(b.name), section: 'Sale' });
const byNumber = (a: Room, b: Room) => a.number.localeCompare(b.number, 'pl', { numeric: true });

export async function searchRooms(q: string): Promise<SearchItem[]> {
  const words = q.split(/\s+/).map(norm).filter(Boolean);
  if (!words.length) return [];
  const all = await buildings();
  const match = (ws: string[]) => all.filter((b) => ws.every((w) => b.key.includes(w)));
  const out: SearchItem[] = [];
  if (words.length > 1) {
    const num = words.at(-1)!;
    for (const b of match(words.slice(0, -1)).slice(0, 4))
      out.push(...(await roomsOf(b.id)).filter((r) => norm(r.number).includes(num)).sort(byNumber).map((r) => item(b, r)));
  }
  if (!out.length)
    for (const b of match(words).slice(0, 2))
      out.push(...(await roomsOf(b.id)).filter((r) => r.type === 'didactics_room').sort(byNumber).map((r) => item(b, r)));
  return out.slice(0, 40);
}
