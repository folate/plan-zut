<script lang="ts" generics="T extends string">
  import Icon from './Icon.svelte';

  let { items, value, onchange }: { items: readonly (readonly [T, string, ...unknown[]])[]; value: T; onchange: (v: T) => void } = $props();
</script>

<div class="seg" role="group" style="--n:{items.length}">
  {#each items as [k, label] (k)}
    <button type="button" aria-pressed={value === k} onclick={() => onchange(k)}><Icon name="check" />{label}</button>
  {/each}
</div>
