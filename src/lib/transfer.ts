import * as planStore from './planStore';
import { store } from './storage';
import type { Absence, CustomEvent, Overrides, Profile } from './types';

const GLOBAL_KEYS = ['profiles', 'activeProfile', 'hidden', 'filterMode', 'theme', 'hue', 'gridRange', 'collisions', 'proxy', 'onboarded', 'tourDone'];

export interface SyncData {
  v: 1;
  g: Record<string, unknown>;
  p: Record<string, { custom: CustomEvent[]; overrides: Partial<Overrides>; absences?: Absence[] }>;
}

const b64u = {
  enc: (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''),
  dec: (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0))
};

async function deflate(bytes: Uint8Array, compress: boolean): Promise<Uint8Array | null> {
  if (typeof CompressionStream === 'undefined') return null;
  const st = new Blob([bytes as BlobPart]).stream().pipeThrough(compress ? new CompressionStream('deflate-raw') : new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(st).arrayBuffer());
}

async function pwKey(pw: string, salt: Uint8Array) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: salt as BufferSource, iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}

export function collectSync(profiles: Profile[], credentials: Record<string, unknown> | null): SyncData {
  const d: SyncData = { v: 1, g: {}, p: {} };
  for (const k of GLOBAL_KEYS) {
    const v = store.get<unknown>(k, undefined);
    if (v !== undefined) d.g[k] = v;
  }
  d.g.profiles = profiles.map(({ synced, ...x }) => x);
  if (!profiles.some((p) => p.id === d.g.activeProfile)) delete d.g.activeProfile;
  for (const p of profiles) d.p[p.id] = { custom: planStore.getCustom(p.id), overrides: planStore.getOverrides(p.id), absences: planStore.getAbsences(p.id) };
  Object.assign(d.g, credentials);
  return d;
}

export async function packSync(data: SyncData, pw: string) {
  const raw = new TextEncoder().encode(JSON.stringify(data)), z = await deflate(raw, true);
  const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await pwKey(pw, salt), (z || raw) as BufferSource));
  const all = new Uint8Array(28 + ct.length);
  all.set(salt);
  all.set(iv, 16);
  all.set(ct, 28);
  return '1' + (z ? 'z' : 'j') + b64u.enc(all);
}

const SECRET_ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function generateSecret() {
  const chars = [...crypto.getRandomValues(new Uint8Array(12))].map((b) => SECRET_ABC[b % 32]).join('');
  return chars.match(/.{4}/g)!.join('-');
}
export const normalizeSecret = (s: string) => s.toUpperCase().replace(/[\s-]/g, '');

export async function unpackSync(code: string, secret: string): Promise<SyncData> {
  code = code.trim().replace(/^.*#sync=/, '');
  if (!/^1[zj]/.test(code)) throw new Error('To nie jest kod synchronizacji planu.');
  const all = b64u.dec(code.slice(2));
  const decrypt = async (key: string) =>
    new Uint8Array(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: all.slice(16, 28) }, await pwKey(key, all.slice(0, 16)), all.slice(28)));
  let pt: Uint8Array | null = null;
  for (const key of new Set([normalizeSecret(secret), secret])) {
    try {
      pt = await decrypt(key);
      break;
    } catch {}
  }
  if (!pt) throw new Error('Zły sekret albo uszkodzony kod.');
  if (code[1] === 'z') {
    pt = await deflate(pt, false);
    if (!pt) throw new Error('Ta przeglądarka nie potrafi rozpakować kodu. Zaktualizuj ją.');
  }
  return JSON.parse(new TextDecoder().decode(pt));
}

function savePlanData(d: SyncData) {
  for (const [id, x] of Object.entries(d.p || {})) {
    planStore.setCustom(id, x.custom || []);
    store.set(`p.${id}.overrides`, x.overrides || {});
    planStore.setAbsences(id, x.absences || []);
  }
  store.set('onboarded', true);
}

export function applySync(d: SyncData) {
  for (const [k, v] of Object.entries(d.g || {})) store.set(k, v);
  savePlanData(d);
}

export function mergeSync(d: SyncData) {
  const plans = new Map(store.get<Profile[]>('profiles', []).map((p) => [p.id, p]));
  for (const p of (d.g.profiles as Profile[]) || []) plans.set(p.id, { ...plans.get(p.id), ...p });
  store.set('profiles', [...plans.values()]);
  if (d.g.apiKey && !store.get<{ key?: string } | null>('apiKey', null)?.key) store.set('apiKey', d.g.apiKey);
  if (d.g.usosAuth && !store.get('usosAuth', null)) store.set('usosAuth', d.g.usosAuth);
  savePlanData(d);
}

export async function qrSvg(text: string): Promise<string> {
  const { default: qrcode } = await import('qrcode-generator');
  const qr = qrcode(0, 'L');
  qr.addData(text, 'Byte');
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: 4, scalable: true });
}
