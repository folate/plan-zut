<script lang="ts">
  import { app, hasPlan } from '../../lib/app.svelte';
  import { setCompare, switchProfile } from '../../lib/plans';
  import { statusOf } from '../../lib/profileLabels';
  import { closeSheet, openSheet, pushSheet } from '../../lib/ui.svelte';
  import Avatar from '../Avatar.svelte';
  import Icon from '../Icon.svelte';
  import Sheet from '../Sheet.svelte';

  function show(id: string) {
    switchProfile(id);
    closeSheet();
  }
  function compare(id: string) {
    setCompare(app.cmp === id ? null : id);
    closeSheet();
  }
</script>

<Sheet title="Plany" subtitle="Twój plan i plany znajomych">
  <div class="plans">
    {#each app.profiles as p (p.id)}
      {@const me = p.id === app.pid}
      {@const c = p.id === app.cmp}
      <div class="pl" class:active={me}>
        <button type="button" class="pl-main" aria-pressed={me} onclick={() => show(p.id)}>
          <Avatar {p} />
          <span class="pl-t"><b>{p.name}</b><small>{me ? 'wyświetlany · ' : ''}{p.id === app.def ? 'domyślny · ' : ''}{statusOf(p)}</small></span>
          {#if me}<span class="pl-ck"><Icon name="check" /></span>{/if}
        </button>
        {#if !me}<button type="button" class="tbtn" class:on={c} aria-pressed={c} onclick={() => compare(p.id)}>{c ? 'Porównujesz' : 'Porównaj'}</button>{/if}
        {#if hasPlan(p.id)}
          <button type="button" class="ib muted" aria-label="Historia planu {p.name}" title="Historia planu" onclick={() => openSheet({ name: 'history', id: p.id })}><Icon name="history" /></button>
        {/if}
        <button type="button" class="ib muted" aria-label="Edytuj {p.name}" onclick={() => openSheet({ name: 'profile', id: p.id })}><Icon name="edit" /></button>
      </div>
    {/each}
  </div>
  <p class="hint">„Porównaj” nakłada wybrany plan na Twój i pokazuje, kiedy oboje macie wolne.</p>

  {#snippet footer()}
    <button class="btn sp" type="button" onclick={() => openSheet({ name: 'search' })}><Icon name="search" />Szukaj w USOS</button>
    <button class="btn" type="button" onclick={closeSheet}>Zamknij</button>
    <button class="btn fill" type="button" onclick={() => pushSheet({ name: 'source', target: null })}>Dodaj plan</button>
  {/snippet}
</Sheet>
