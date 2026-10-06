<script lang="ts">
  import Icon from './Icon.svelte';
  import TimePicker from './TimePicker.svelte';

  let { id, value = $bindable() }: { id: string; value: string } = $props();
  let open = $state(false);
</script>

<button type="button" class="dfield" class:empty={!value} {id} aria-haspopup="dialog" onclick={() => (open = true)}>
  <span>{value || '--:--'}</span><Icon name="own" />
</button>
{#if open}<TimePicker {value} onpick={(v) => { open = false; value = v; }} onclose={() => (open = false)} />{/if}
