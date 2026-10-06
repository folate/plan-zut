import raw from '../../changelog.json';
import { ICONS, type IconName } from './icons';
import { store } from './storage';

export interface NewsEntry {
  v: string;
  when: string;
  items: { icon: IconName; title: string; desc: string }[];
}

// Ten sam plik czyta apka z GitHuba, więc starsze wersje muszą znieść wpisy z nowszych: nieznana ikona, brakujące pola.
export function parseNews(x: unknown): NewsEntry[] {
  if (!Array.isArray(x)) return [];
  return x
    .filter((e) => e && typeof e.v === 'string' && Array.isArray(e.items))
    .map((e) => ({
      v: e.v,
      when: typeof e.when === 'string' ? e.when : '',
      items: e.items
        .filter((i: any) => i && typeof i.title === 'string')
        .map((i: any) => ({ icon: (i.icon in ICONS ? i.icon : 'check') as IconName, title: i.title, desc: typeof i.desc === 'string' ? i.desc : '' }))
    }))
    .filter((e) => e.items.length);
}

// Lista siedzi w changelog.json w katalogu głównym repo, najnowsza wersja na górze.
export const CHANGELOG = parseNews(raw);

const latest = CHANGELOG[0]?.v ?? '';
export const news = $state({ unseen: false });

export function initNews(fresh: boolean) {
  if (fresh) return void store.set('newsSeen', latest);
  news.unseen = !!latest && store.get('newsSeen', '') !== latest;
}
// toast pokazujemy raz na wersję, potem przypomina już tylko kropka
export function newsToastDue() {
  if (!news.unseen || store.get('newsToasted', '') === latest) return false;
  store.set('newsToasted', latest);
  return true;
}
export function markNewsSeen() {
  news.unseen = false;
  store.set('newsSeen', latest);
}
