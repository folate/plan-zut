import { parseNews, type NewsEntry } from './changelog.svelte';
import { isNative } from './platform';
import { store } from './storage';

const DAY = 24 * 3600 * 1000;
const repo = (import.meta.env.VITE_GITHUB_URL || '').match(/github\.com\/([^/]+\/[^/#?]+)/)?.[1]?.replace(/\.git$/, '') || '';

export const VERSION: string = import.meta.env.APP_VERSION || '';
export const apkUrl = repo ? `https://github.com/${repo}/releases/latest/download/plan-zut.apk` : '';
export const isAndroid = () => /Android/i.test(navigator.userAgent);

export const release = $state({ latest: '', notes: [] as NewsEntry[] });

const parts = (v: string) => v.replace(/^v/, '').split('.').map((x) => parseInt(x) || 0);
export function newer(a: string, b: string) {
  const x = parts(a), y = parts(b);
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    if ((x[i] || 0) !== (y[i] || 0)) return (x[i] || 0) > (y[i] || 0);
  }
  return false;
}

export async function checkUpdate(force = false) {
  if (!isNative() || !repo || !VERSION) return false;
  const seen = store.get<string>('latestVersion', '');
  let ok = true;
  if (force || Date.now() - store.get('updateCheck', 0) > DAY) {
    ok = false;
    try {
      const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`);
      if (r.ok) {
        store.set('latestVersion', String((await r.json()).tag_name || ''));
        ok = true;
        const n = await fetch(`https://raw.githubusercontent.com/${repo}/HEAD/changelog.json`);
        if (n.ok) {
          store.set('latestNotes', await n.json());
          store.set('updateCheck', Date.now());
        }
      }
    } catch {}
  }
  const latest = store.get<string>('latestVersion', seen);
  if (latest && newer(latest, VERSION)) {
    release.latest = latest.replace(/^v/, '');
    // na głównej gałęzi może już być wpis dla wersji, której jeszcze nie wydano
    release.notes = parseNews(store.get<unknown>('latestNotes', [])).filter((e) => newer(e.v, VERSION) && !newer(e.v, latest));
  }
  return ok;
}

export const download = () => (location.href = apkUrl);
