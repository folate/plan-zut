<script lang="ts">
  import type { Snippet } from 'svelte';

  let { confirm, onconfirm, class: cls = 'btn danger', style, children }: { confirm: string; onconfirm: () => void; class?: string; style?: string; children: Snippet } = $props();
  let armed = $state(false);
</script>

<button type="button" class={cls} {style} onclick={() => (armed ? onconfirm() : (armed = true))}>
  {#if armed}{confirm}{:else}{@render children()}{/if}
</button>
