<script lang="ts">
  import { onMount } from 'svelte';
  import { plural } from '../../lib/dates';
  import { msgOf } from '../../lib/net';
  import { applySync, mergeSync, unpackSync } from '../../lib/transfer';
  import { closeSheet, toast } from '../../lib/ui.svelte';
  import QrScanner from '../QrScanner.svelte';
  import Sheet from '../Sheet.svelte';

  let { code }: { code: string | null } = $props();

  let pasted = $state('');
  let secret = $state('');
  let mode = $state<'merge' | 'replace'>('merge');
  let scanning = $state(false);
  let msg = $state('');
  let busy = $state(false);
  let codeEl = $state<HTMLTextAreaElement>(), secretEl = $state<HTMLInputElement>();

  const canScan = !!navigator.mediaDevices?.getUserMedia;

  onMount(() => void setTimeout(() => (code ? secretEl : codeEl)?.focus(), 60));

  function scanned(text: string) {
    scanning = false;
    if (!/#sync=|^1[zj]/.test(text.trim())) return void (msg = 'To nie jest kod z tej aplikacji.');
    pasted = text;
    msg = '';
    setTimeout(() => secretEl?.focus(), 50);
  }

  async function load() {
    const c = code || pasted;
    if (!c.trim()) return void (msg = 'Zeskanuj kod albo wklej link.');
    if (!secret.trim()) return void (msg = 'Przepisz sekret z pierwszego urządzenia.');
    busy = true;
    try {
      const d = await unpackSync(c, secret.trim());
      const n = ((d.g.profiles as unknown[]) || []).length;
      if (mode === 'replace') applySync(d);
      else mergeSync(d);
      if (location.hash.startsWith('#sync=')) history.replaceState(null, '', location.pathname + location.search);
      toast(`${mode === 'replace' ? 'Wczytano' : 'Dodano'} ${n} ${plural(n, 'plan', 'plany', 'planów')}`);
      setTimeout(() => location.reload(), 600);
    } catch (e) {
      msg = msgOf(e);
      busy = false;
    }
  }
</script>

<Sheet title="Wczytaj z innego urządzenia" subtitle="Plany z kodu QR albo linku">
  {#if !code}
    {#if scanning}
      <QrScanner onresult={scanned} />
      <div class="row-btns"><button type="button" class="tbtn" onclick={() => (scanning = false)}>Anuluj skanowanie</button></div>
    {:else}
      {#if canScan}
        <div class="row-btns"><button type="button" class="tbtn on" onclick={() => (scanning = true)}>{pasted ? 'Skanuj ponownie' : 'Skanuj kod QR'}</button></div>
      {/if}
      <div class="fld"><label for="i-code">{canScan ? 'Albo wklej link lub kod' : 'Link albo kod'}</label><textarea id="i-code" spellcheck="false" placeholder="https://…#sync=1z…" bind:value={pasted} bind:this={codeEl}></textarea></div>
    {/if}
  {/if}
  <div class="fld">
    <label for="i-secret">Sekret</label>
    <input id="i-secret" type="text" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXX-XXXX-XXXX" bind:value={secret} bind:this={secretEl} onkeydown={(e) => e.key === 'Enter' && load()} />
  </div>
  <p class="hint">Sekret pokaże się na pierwszym urządzeniu pod kodem QR. Wielkość liter i myślniki nie mają znaczenia.</p>
  <div class="radios" role="radiogroup" aria-label="Sposób wczytania">
    <label><input type="radio" value="merge" bind:group={mode} /><span>Dodaj do moich planów<small>Plany i ustawienia na tym urządzeniu zostają</small></span></label>
    <label><input type="radio" value="replace" bind:group={mode} /><span>Zastąp wszystko<small>Plany, ustawienia i logowanie z tego urządzenia zostaną nadpisane</small></span></label>
  </div>
  {#if msg}<div class="msg">{msg}</div>{/if}

  {#snippet footer()}
    <button class="btn" type="button" onclick={closeSheet}>Anuluj</button>
    <button class="btn fill" type="button" disabled={busy} onclick={load}>{busy ? 'Odszyfrowuję…' : 'Wczytaj'}</button>
  {/snippet}
</Sheet>
