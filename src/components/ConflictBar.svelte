<script lang="ts">
  import { app, flashDay, selectDay } from '../lib/app.svelte';
  import { shortB } from '../lib/constants';
  import { dayLabel, dur, hm, plural } from '../lib/dates';
  import { ui } from '../lib/ui.svelte';
  import Icon from './Icon.svelte';

  const conf = $derived(app.view.conflicts);
  const n = $derived(conf.length);
  const today = $derived(conf.filter((c) => c.day === app.selDay).length);

  function goTo(day: number) {
    if (app.mobile && day !== app.selDay) selectDay(day);
    else flashDay(day);
  }
</script>

{#if n}
  <div class="cbar" class:open={ui.conflictsOpen}>
    <button type="button" class="cb-head" aria-expanded={ui.conflictsOpen} onclick={() => (ui.conflictsOpen = !ui.conflictsOpen)}>
      <Icon name="warn" />
      <span><b>{n} {n === 1 ? 'kolizja' : plural(n, 'kolizja', 'kolizje', 'kolizji')}</b> w tym tygodniu{app.mobile && today !== n ? ` · ${today} dziś na liście` : ''}</span>
      <span class="cb-chev"><Icon name="chev" /></span>
    </button>
    <div class="cb-list">
      {#each conf as c}
        <button type="button" class="cb-row" onclick={() => goTo(c.day)}>
          <span class="cb-d">{dayLabel(c.d)}</span>
          {#if c.kind === 'overlap'}
            <span><b>{c.a.name}</b> {hm(c.a.start)}–{hm(c.a.end)} nachodzi na <b>{c.b.name}</b> {hm(c.b.start)}–{hm(c.b.end)}</span>
          {:else}
            <span>Tylko {dur(c.min ?? 0)} na przejście z <b>{shortB(c.a.building)}</b> do <b>{shortB(c.b.building)}</b> ({hm(c.a.end)}–{hm(c.b.start)})</span>
          {/if}
        </button>
      {/each}
    </div>
  </div>
{/if}
