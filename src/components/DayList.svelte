<script lang="ts">
  import { app, gapOpts } from '../lib/app.svelte';
  import { shortB } from '../lib/constants';
  import { dur, hm, sameDay } from '../lib/dates';
  import { act, freeGaps, shown } from '../lib/events';
  import type { Gap, ViewEvent } from '../lib/types';
  import ListItem from './ListItem.svelte';

  let { list }: { list: ViewEvent[] } = $props();

  type Row = { gap: Gap } | { e: ViewEvent; isNext: boolean };

  const cmp = $derived(app.comparing);
  const rows = $derived.by(() => {
    const counts = cmp ? act : shown;
    const gaps = freeGaps(list, counts, gapOpts());
    const next = list.find((e) => act(e) && e.who === 'a' && e.start > app.now);
    const out: Row[] = [], done = new Set<Gap>();
    for (const e of list) {
      for (const g of gaps)
        if (!done.has(g) && g.to <= e.start && counts(e)) {
          done.add(g);
          out.push({ gap: g });
        }
      out.push({ e, isNext: e === next && sameDay(e.start, app.now) });
    }
    return out;
  });

  function gapLabel(g: Gap) {
    if (cmp) return `Oboje wolni ${hm(g.from)}–${hm(g.to)} · ${dur(g.min)}`;
    if (g.tight) return `Tylko ${dur(g.min)} na przejście do ${shortB(g.move)}`;
    return (g.min >= 90 ? 'Okienko ' : 'Przerwa ') + dur(g.min) + (g.move ? ` · przejście do ${shortB(g.move)}` : '');
  }
</script>

{#each rows as row, i}
  {#if 'gap' in row}
    {@const g = row.gap}
    <div class="gap" class:long={g.min >= 90 || (cmp && g.min >= 30)} class:move={!!g.move} class:tight={g.tight} class:both={cmp} style="--i:{i}">{gapLabel(g)}</div>
  {:else}
    <ListItem e={row.e} isNext={row.isNext} {i} />
  {/if}
{:else}
  <div class="empty" style="--i:0">{cmp ? 'Oboje macie wolne' : 'Brak zajęć'}</div>
{/each}
