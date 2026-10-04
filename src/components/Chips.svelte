<script lang="ts">
  import { animate, app, prof } from '../lib/app.svelte';
  import { OWN_KEY, TYPE_ORDER, typeOf, typeStyle } from '../lib/constants';
  import { keyOf } from '../lib/events';
  import { setCompare } from '../lib/plans';
  import { setHidden, settings } from '../lib/settings.svelte';
  import { openSheet } from '../lib/ui.svelte';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

  const rank = (k: string) => TYPE_ORDER.indexOf(k) + 1 || 99;
  const keys = $derived(
    [...new Set([...app.usos.map((e) => e.code), ...(app.custom.length ? [OWN_KEY] : [])])].sort(
      (a, b) => +(a === OWN_KEY) - +(b === OWN_KEY) || rank(a) - rank(b)
    )
  );
  const count = (k: string) => app.view.mine.filter((e) => keyOf(e) === k && !e.cancelled).length;
  const peer = $derived(app.cmp ? prof(app.cmp) : undefined);

  function toggle(k: string) {
    setHidden(k, !settings.hidden.includes(k));
    animate();
  }
  function compare() {
    const others = app.profiles.filter((p) => p.id !== app.pid);
    if (others.length === 1) setCompare(others[0].id);
    else openSheet({ name: 'plans' });
  }
</script>

<div class="chips" data-tour="filters">
  {#if peer}
    <button type="button" class="chip cmpchip" aria-label="Zakończ porównanie z {peer.name}" onclick={() => setCompare(null)}>
      <Avatar p={peer} size="xs" />Porównanie: {peer.name}<span class="x"><Icon name="x" /></span>
    </button>
  {:else if app.profiles.length > 1}
    <button type="button" class="chip cmpchip off" onclick={compare}><Icon name="compare" />Porównaj plany</button>
  {/if}
  {#each keys as k (k)}
    {@const t = k === OWN_KEY ? { n: 'Własne', k: 'ot' } : typeOf(k)}
    <button type="button" class="chip" aria-pressed={!settings.hidden.includes(k)} style={typeStyle(t.k)} onclick={() => toggle(k)}>
      <span class="ck"><Icon name="check" /></span>{t.n}<span class="n">{count(k)}</span>
    </button>
  {/each}
  {#if app.absences.length && !app.viewingPreview}
    <button type="button" class="chip abschip" title="Podsumowanie nieobecności" onclick={() => openSheet({ name: 'absences' })}>
      Nieobecności<span class="n">{app.absences.length}</span>
    </button>
  {/if}
</div>
