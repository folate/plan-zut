<script lang="ts">
  let { label, sub, checked = $bindable(false), onchange }: { label: string; sub?: string; checked?: boolean; onchange?: (v: boolean) => void } = $props();
</script>

<label class="switch alt">
  <span>{label}{#if sub}<small>{sub}</small>{/if}</span>
  <input type="checkbox" role="switch" bind:checked onchange={() => onchange?.(checked)} />
</label>
