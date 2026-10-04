<script lang="ts">
  import { app, hasPlan } from '../../lib/app.svelte';
  import type { IconName } from '../../lib/icons';
  import { store } from '../../lib/storage';
  import { closeSheet, pushSheet } from '../../lib/ui.svelte';
  import { hasKey, session } from '../../lib/usos/session.svelte';
  import Icon from '../Icon.svelte';
  import IosHint from '../IosHint.svelte';
  import Sheet from '../Sheet.svelte';

  let { target }: { target: string | null } = $props();

  type Source = 'link' | 'account' | 'search' | 'file' | 'import';
  const first = !app.profiles.some((p) => hasPlan(p.id));
  const sources: { id: Source; icon: IconName; title: string; desc: string }[] = [
    { id: 'link', icon: 'link', title: 'Link do kalendarza z USOSweb', desc: 'Najprościej. Bez klucza. Plan na najbliższe tygodnie, odświeża się sam przy otwarciu apki.' },
    { id: 'account', icon: 'person', title: 'Konto USOS', desc: `Cały semestr, prowadzący i uczestnicy grup. Wymaga klucza API${hasKey() ? '' : ' (pokażę jak go zdobyć)'} i logowania.` },
    { id: 'search', icon: 'search', title: 'Przedmiot albo prowadzący', desc: 'Bez klucza. Wyszukaj przedmiot i wybierz jego grupy albo podaj numer prowadzącego.' },
    { id: 'file', icon: 'book', title: 'Plik .ics', desc: 'Wklejony albo wczytany z dysku. Nie odświeża się sam.' },
    ...(first ? [{ id: 'import' as const, icon: 'swap' as const, title: 'Mam już plan na innym urządzeniu', desc: 'Zeskanuj kod QR z Ustawień na tamtym urządzeniu. Przeniosą się plany, nieobecności i ustawienia.' }] : [])
  ];

  function pick(s: Source) {
    store.set('onboarded', true);
    const empty = target && !hasPlan(target) ? target : null;
    if (s === 'link' || s === 'file') pushSheet({ name: 'profile', id: empty, mode: s });
    else if (s === 'account') pushSheet({ name: 'account', target: empty ?? 'new' });
    else if (s === 'import') pushSheet({ name: 'import', code: null });
    else pushSheet({ name: 'search' });
  }
</script>

<Sheet title="Skąd wziąć plan?" subtitle="Wybierz, jak chcesz pobierać plan.">
  <IosHint />
  <div class="src-list">
    {#each sources as s (s.id)}
      <button type="button" class="src" onclick={() => pick(s.id)}>
        <span class="src-ic"><Icon name={s.icon} /></span>
        <span><b>{s.title}</b><small>{s.desc}</small></span>
        {#if s.id === 'account' && session.auth}<span class="tag ok">zalogowano</span>{/if}
        <Icon name="chevr" />
      </button>
    {/each}
  </div>

  {#snippet footer()}
    <button class="btn" type="button" onclick={closeSheet}>Anuluj</button>
  {/snippet}
</Sheet>
