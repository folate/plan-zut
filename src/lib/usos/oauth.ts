import { callbackUrl } from '../platform';
import { apiRaw, authorizeUrl } from './api';
import { session, setAuth, setAuthLost, setReq } from './session.svelte';

const formParse = (t: string) => Object.fromEntries(new URLSearchParams(t));

export async function loginStart(target: string | null): Promise<string | null> {
  const cb = callbackUrl();
  const r = await apiRaw('oauth/request_token', { oauth_callback: cb, scopes: 'studies|offline_access' });
  const f = formParse(await r.text());
  if (!f.oauth_token) throw new Error('USOS nie zwrócił tokenu logowania. Sprawdź klucz i sekret.');
  setReq({ token: f.oauth_token, secret: f.oauth_token_secret, target });
  const url = authorizeUrl(f.oauth_token);
  if (cb !== 'oob') {
    location.href = url;
    return null;
  }
  return url;
}

export async function loginFinish(pin: string): Promise<string | null> {
  const req = session.req;
  if (!req) throw new Error('Zacznij logowanie od nowa.');
  const r = await apiRaw('oauth/access_token', { oauth_verifier: pin.trim() }, req);
  const f = formParse(await r.text());
  if (!f.oauth_token) throw new Error('Nieprawidłowy kod PIN.');
  const tok = { token: f.oauth_token, secret: f.oauth_token_secret };
  const u = await (await apiRaw('users/user', { fields: 'id|first_name|last_name' }, tok)).json();
  setAuth({ ...tok, user: { id: String(u.id), name: `${u.first_name} ${u.last_name}` } });
  setAuthLost(false);
  setReq(null);
  return req.target;
}
