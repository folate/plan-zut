<script lang="ts">
  import type { Snippet } from 'svelte';
  import { backSheet, closeSheet, ui } from '../lib/ui.svelte';
  import Icon from './Icon.svelte';

  interface Props {
    title: string;
    subtitle?: string;
    sub?: Snippet;
    children: Snippet;
    footer?: Snippet;
  }
  let { title, subtitle, sub, children, footer }: Props = $props();
</script>

<div class="scrim" role="presentation" onclick={closeSheet}></div>
<div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
  <header class:has-back={ui.stack.length > 0}>
    {#if ui.stack.length}
      <button class="ib muted" type="button" aria-label="Wstecz" title="Wstecz" onclick={backSheet}><Icon name="prev" /></button>
    {/if}
    <div>
      <h2>{title}</h2>
      {#if sub}<div class="subh">{@render sub()}</div>{:else if subtitle}<div class="subh">{subtitle}</div>{/if}
    </div>
    <button class="ib muted" type="button" aria-label="Zamknij" onclick={closeSheet}><Icon name="x" /></button>
  </header>
  <div class="body">{@render children()}</div>
  <footer>{@render footer?.()}</footer>
</div>
