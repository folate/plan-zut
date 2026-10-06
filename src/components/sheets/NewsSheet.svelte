<script lang="ts">
  import { onMount } from 'svelte';
  import { CHANGELOG, markNewsSeen, type NewsEntry } from '../../lib/changelog.svelte';
  import { download, release } from '../../lib/release.svelte';
  import { closeSheet } from '../../lib/ui.svelte';
  import Icon from '../Icon.svelte';
  import Sheet from '../Sheet.svelte';

  onMount(markNewsSeen);
</script>

{#snippet entry(e: NewsEntry, coming: boolean)}
  <section class="det-sec">
    <h3>{coming ? 'Po aktualizacji: wersja' : 'Wersja'} {e.v}{e.when ? ` · ${e.when}` : ''}</h3>
    <div class="feats">
      {#each e.items as f (f.title)}
        <div class="feat">
          <span class="src-ic"><Icon name={f.icon} /></span>
          <span><b>{f.title}</b><small>{f.desc}</small></span>
        </div>
      {/each}
    </div>
  </section>
{/snippet}

<Sheet title="Co nowego">
  {#if release.latest}
    <div class="att">
      <span><span>Jest nowa wersja apki: <b>{release.latest}</b></span><small>Aktualizacja nie rusza zapisanych planów.</small></span>
      <button type="button" class="tbtn on" onclick={download}>Pobierz</button>
    </div>
  {/if}
  {#each release.notes as e (e.v)}{@render entry(e, true)}{/each}
  {#each CHANGELOG as e (e.v)}{@render entry(e, false)}{/each}

  {#snippet footer()}
    <button class="btn fill" type="button" onclick={closeSheet}>Gotowe</button>
  {/snippet}
</Sheet>
