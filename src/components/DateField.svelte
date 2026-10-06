<script lang="ts">
  import { fromYmd } from '../lib/dates';
  import DatePicker from './DatePicker.svelte';
  import Icon from './Icon.svelte';

  let { id, value = $bindable(), clearable = false, placeholder = 'Wybierz', onchange }: { id: string; value: string; clearable?: boolean; placeholder?: string; onchange?: () => void } = $props();
  let open = $state(false);

  function pick(v: string) {
    open = false;
    if (v === value) return;
    value = v;
    onchange?.();
  }
</script>

<button type="button" class="dfield" class:empty={!value} {id} aria-haspopup="dialog" onclick={() => (open = true)}>
  <span>{value ? fromYmd(value).toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: 'numeric' }) : placeholder}</span><Icon name="cal" />
</button>
{#if open}<DatePicker {value} {clearable} onpick={pick} onclose={() => (open = false)} />{/if}
