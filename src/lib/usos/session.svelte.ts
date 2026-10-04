import { store } from '../storage';

export interface ApiKey {
  key: string;
  secret: string;
}
export interface Token {
  token: string;
  secret: string;
}
export interface Auth extends Token {
  user?: { id: string; name: string };
}
export interface LoginRequest extends Token {
  target: string | null;
}

export const session = $state({
  key: store.get<ApiKey>('apiKey', { key: '', secret: '' }),
  auth: store.get<Auth | null>('usosAuth', null),
  req: store.get<LoginRequest | null>('usosReq', null),
  authLost: store.get('authLost', false)
});

export const hasKey = () => !!(session.key.key && session.key.secret);

export function setKey(k: ApiKey) {
  session.key = k;
  store.set('apiKey', k);
}
export function setAuth(a: Auth | null) {
  session.auth = a;
  store.set('usosAuth', a);
}
export function setReq(r: LoginRequest | null) {
  session.req = r;
  store.set('usosReq', r);
}
export function setAuthLost(lost: boolean) {
  session.authLost = lost;
  store.set('authLost', lost);
}
export function markAuthLost() {
  if (!session.auth) return;
  setAuth(null);
  setAuthLost(true);
}
