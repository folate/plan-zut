import { fetchT, kindOf, netErr, withRetry } from '../net';
import { markAuthLost, session, type Token } from './session.svelte';

export const API = 'https://usosapi.zut.edu.pl/services/';
export const authorizeUrl = (token: string) => API + 'oauth/authorize?oauth_token=' + encodeURIComponent(token);

export const apiStatus = { down: false };

type Params = Record<string, string | number>;

const oenc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());

async function signParams(url: string, params: Params, tok?: Token | null): Promise<Params> {
  const k = session.key;
  if (!k.key || !k.secret || !crypto?.subtle) return params;
  const all: Params = {
    ...params,
    ...(tok ? { oauth_token: tok.token } : {}),
    oauth_consumer_key: k.key,
    oauth_nonce: Math.random().toString(36).slice(2) + Date.now(),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: '1.0'
  };
  const norm = Object.keys(all)
    .map((x) => [oenc(x), oenc(String(all[x]))])
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1))
    .map(([a, b]) => a + '=' + b)
    .join('&');
  const base = 'GET&' + oenc(url) + '&' + oenc(norm);
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey('raw', enc.encode(oenc(k.secret) + '&' + (tok ? oenc(tok.secret) : '')), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(base));
  return { ...all, oauth_signature: btoa(String.fromCharCode(...new Uint8Array(sig))) };
}

export async function apiRaw(method: string, params: Params, tok?: Token | null): Promise<Response> {
  const signed = await signParams(API + method, params, tok);
  const q = new URLSearchParams(Object.entries(signed).map(([k, v]) => [k, String(v)])).toString();
  let r: Response;
  try {
    r = await withRetry(() => fetchT(API + method + '?' + q));
  } catch (e) {
    if (kindOf(e) === 'blocked') apiStatus.down = true;
    throw e;
  }
  if (!r.ok) {
    let m = '';
    try {
      m = (await r.json()).message || '';
    } catch {}
    const ml = m.toLowerCase();
    if (r.status >= 500) throw netErr('down', `USOS ma problemy (błąd ${r.status}). Spróbuj za chwilę.`, r.status);
    if (r.status === 429) throw netErr('down', 'USOS ogranicza liczbę zapytań. Spróbuj za kilka minut.', 429);
    if (/timestamp/.test(ml)) throw netErr('key', 'USOS odrzucił zapytanie z powodu złej godziny. Sprawdź datę i godzinę w urządzeniu.', r.status);
    if (tok && (r.status === 401 || /token|revoked|unauthori/.test(ml)))
      throw netErr('auth', 'Dostęp do konta USOS wygasł albo został cofnięty (np. na stronie usosapi.zut.edu.pl/apps). Zaloguj się ponownie.', r.status);
    if (/consumer|signature|nonce/.test(ml) || r.status === 401)
      throw netErr('key', 'USOS odrzucił klucz API. Sprawdź klucz i sekret w Ustawieniach albo wygeneruj nowe.', r.status);
    throw netErr('other', m || 'USOS API odpowiedziało kodem ' + r.status + '.', r.status);
  }
  return r;
}

export async function api<T = any>(method: string, params: Params, opt: { auth?: boolean } = {}): Promise<T> {
  const tok = opt.auth ? session.auth : null;
  if (opt.auth && !tok) throw netErr('auth', 'Ta funkcja wymaga zalogowania przez USOS (Ustawienia).');
  try {
    return await (await apiRaw(method, params, tok)).json();
  } catch (e) {
    if (kindOf(e) === 'auth' && tok) markAuthLost();
    throw e;
  }
}
