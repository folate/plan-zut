<script lang="ts">
  import { msgOf } from '../lib/net';
  import { calendarLink } from '../lib/plans';
  import { toast } from '../lib/ui.svelte';

  let link = $state('');
  let busy = $state(false);
  let input = $state<HTMLInputElement>();

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      toast('Skopiowano link do kalendarza');
    } catch {
      input?.select();
    }
  }

  async function get() {
    busy = true;
    try {
      link = await calendarLink();
      await copy();
    } catch (e) {
      toast(msgOf(e));
    }
    busy = false;
  }
</script>

<div class="cal-link">
  {#if link}
    <div class="fld"><label for="cal-link">Link do kalendarza (iCal)</label><input id="cal-link" type="text" readonly value={link} bind:this={input} onfocus={(e) => e.currentTarget.select()} /></div>
    <button type="button" class="tbtn" onclick={copy}>Kopiuj</button>
  {:else}
    <button type="button" class="tbtn" disabled={busy} onclick={get}>{busy ? 'Pobieram link…' : 'Kopiuj link do kalendarza (iCal)'}</button>
  {/if}
  <p class="hint">Wklej go w Kalendarzu Google albo Apple, albo wyślij komuś, żeby dodał Twój plan u siebie. Kto ma link, widzi Twoje nadchodzące zajęcia.</p>
</div>
