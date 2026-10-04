import { inFrame } from './platform';

export type ErrKind = 'timeout' | 'offline' | 'blocked' | 'down' | 'link' | 'auth' | 'key' | 'other';

export class NetError extends Error {
  constructor(public kind: ErrKind, message: string, public status?: number) {
    super(message);
  }
}
export const netErr = (kind: ErrKind, msg: string, status?: number) => new NetError(kind, msg, status);
export const kindOf = (e: unknown): ErrKind => (e instanceof NetError ? e.kind : 'other');
export const msgOf = (e: unknown) => (e instanceof Error ? e.message : String(e));

export async function fetchT(url: string, ms = 20000) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ms);
  try {
    return await fetch(url, { cache: 'no-store', signal: c.signal });
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw netErr('timeout', 'USOS nie odpowiada (minął czas oczekiwania).');
    if (navigator.onLine === false) throw netErr('offline', 'Brak połączenia z internetem.');
    if (inFrame()) throw netErr('blocked', 'Strona jest osadzona w ramce, która blokuje zapytania do USOS. Otwórz ją bezpośrednio.');
    throw netErr('down', 'Nie udało się połączyć z USOS. Serwer może chwilowo nie działać.');
  } finally {
    clearTimeout(t);
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (e) {
    const limited = e instanceof NetError && e.status === 429;
    if (!limited && (kindOf(e) === 'down' || kindOf(e) === 'timeout')) {
      await sleep(1500);
      return fn();
    }
    throw e;
  }
}

export const normUrl = (u: string) => u.trim().replace(/^webcals?:\/\//i, 'https://');

export async function fetchIcs(raw: string, proxy = ''): Promise<string> {
  const url = normUrl(raw);
  const tries = [url];
  if (proxy) tries.push(proxy.includes('{url}') ? proxy.replace('{url}', encodeURIComponent(url)) : proxy + encodeURIComponent(url));
  let last: NetError | undefined;
  for (const t of tries) {
    try {
      const r = await withRetry(() => fetchT(t));
      if (r.status >= 500) throw netErr('down', `USOS ma problemy (błąd ${r.status}). Spróbuj za chwilę.`, r.status);
      if (r.status === 404 || r.status === 403 || r.status === 401)
        throw netErr('link', `Link do kalendarza przestał działać (błąd ${r.status}). W USOSweb mógł zostać wygenerowany nowy link. Skopiuj go ponownie i wklej w „Źródło planu”.`, r.status);
      if (!r.ok) throw netErr('other', 'Serwer odpowiedział kodem ' + r.status + '.', r.status);
      const txt = await r.text();
      if (!txt.includes('BEGIN:VCALENDAR')) {
        const html = /<html/i.test(txt);
        throw netErr(html ? 'down' : 'link', html ? 'USOS zwrócił stronę błędu zamiast planu. Prawdopodobnie ma awarię.' : 'Pod tym adresem nie ma kalendarza iCal.');
      }
      return txt;
    } catch (e) {
      last = e instanceof NetError ? e : netErr('other', msgOf(e));
    }
  }
  if (last && (last.kind !== 'down' || last.status)) throw last;
  const hint = proxy ? '' : ' Jeśli to się powtarza, a USOS działa, przeglądarka może blokować pobieranie kalendarza z innej strony. Wtedy pomoże serwer pośredniczący (Ustawienia).';
  throw netErr('down', (last?.message || '') + hint);
}
