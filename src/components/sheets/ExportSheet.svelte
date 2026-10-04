<script lang="ts">
  import { app } from '../../lib/app.svelte';
  import { msgOf } from '../../lib/net';
  import { shareBase } from '../../lib/platform';
  import { statusOf } from '../../lib/profileLabels';
  import { collectSync, generateSecret, normalizeSecret, packSync, qrSvg } from '../../lib/transfer';
  import { closeSheet, toast } from '../../lib/ui.svelte';
  import { session } from '../../lib/usos/session.svelte';
  import Avatar from '../Avatar.svelte';
  import Sheet from '../Sheet.svelte';
  import Switch from '../Switch.svelte';

  const hasAuth = !!(session.auth || session.key.key);

  let picked = $state(app.profiles.map((p) => p.id));
  let withAuth = $state(false);
  let showSecret = $state(false);
  let msg = $state('');
  let busy = $state(false);
  let out = $state.raw<{ text: string; secret: string; isLink: boolean; svg: string; qrError: string; withAuth: boolean } | null>(null);
  let codeEl = $state<HTMLTextAreaElement>();

  async function create() {
    const plans = app.profiles.filter((p) => picked.includes(p.id));
    if (!plans.length) return void (msg = 'Zaznacz co najmniej jeden plan.');
    msg = '';
    busy = true;
    showSecret = false;
    try {
      const secret = generateSecret();
      const credentials = hasAuth && withAuth ? { ...(session.key.key ? { apiKey: session.key } : {}), ...(session.auth ? { usosAuth: session.auth } : {}) } : null;
      const code = await packSync(collectSync(plans, credentials), normalizeSecret(secret));
      const base = shareBase(), text = base ? base + '#sync=' + code : code;
      let svg = '', qrError = '';
      try {
        svg = await qrSvg(text);
      } catch (e) {
        qrError = /overflow|length/i.test(msgOf(e)) ? 'Danych jest za dużo na jeden kod QR. Użyj linku poniżej.' : msgOf(e);
      }
      out = { text, secret, isLink: !!base, svg, qrError, withAuth: !!credentials };
    } catch (e) {
      msg = msgOf(e);
    }
    busy = false;
  }

  async function copy(text: string, what: string, fallback?: HTMLTextAreaElement) {
    try {
      await navigator.clipboard.writeText(text);
      toast(`Skopiowano ${what}`);
    } catch {
      fallback?.select();
    }
  }
</script>

<Sheet title="Przenieś na inne urządzenie" subtitle="Plany z własnymi wydarzeniami, zmianami i nieobecnościami w zaszyfrowanym kodzie QR">
  <div class="fld">
    <span class="lbl">Które plany</span>
    <div class="groups">
      {#each app.profiles as p (p.id)}
        <label class="grp-row pick">
          <input type="checkbox" value={p.id} bind:group={picked} />
          <Avatar {p} size="sm" />
          <span><b>{p.name}</b><small>{statusOf(p)}</small></span>
        </label>
      {/each}
    </div>
  </div>
  {#if hasAuth}
    <Switch
      label="Dołącz logowanie USOS i klucz API" bind:checked={withAuth}
      sub={withAuth ? 'Kod da dostęp do Twojego konta USOS. Pokaż go tylko na własnym urządzeniu.' : 'Na drugim urządzeniu zalogujesz się ponownie.'}
    />
  {/if}
  <p class="hint">W kodzie są źródła planów, nie same plany, więc pobiorą się na nowo. Plany wczytane z pliku .ics trzeba będzie dodać ponownie.</p>
  {#if msg}<div class="msg">{msg}</div>{/if}
  {#if out}
    <div class="qr-box">
      {#if out.svg}{@html out.svg}{:else}<p class="hint">{out.qrError}</p>{/if}
    </div>
    <div class="secret">
      <span class="secret-l">Sekret</span>
      <code class:hid={!showSecret}>{showSecret ? out.secret : '••••-••••-••••'}</code>
      <button type="button" class="tbtn" onclick={() => (showSecret = !showSecret)}>{showSecret ? 'Ukryj' : 'Pokaż'}</button>
      <button type="button" class="tbtn" onclick={() => copy(out!.secret, 'sekret')}>Kopiuj</button>
    </div>
    <p class="hint">
      {out.isLink ? 'Zeskanuj kod drugim urządzeniem (aparatem albo w aplikacji: Ustawienia → Wczytaj z innego urządzenia), a potem przepisz sekret.' : 'Na drugim urządzeniu otwórz Ustawienia → Wczytaj z innego urządzenia, wklej kod i przepisz sekret.'}
      Nie wysyłaj sekretu w tej samej wiadomości co link.{out.withAuth ? ' Kod z sekretem daje dostęp do Twojego konta USOS.' : ''}
    </p>
    <div class="fld"><label for="x-code">{out.isLink ? 'Link' : 'Kod'}</label><textarea id="x-code" readonly value={out.text} bind:this={codeEl}></textarea></div>
    <div class="row-btns"><button type="button" class="tbtn" onclick={() => copy(out!.text, out!.isLink ? 'link' : 'kod', codeEl)}>Kopiuj {out.isLink ? 'link' : 'kod'}</button></div>
  {/if}

  {#snippet footer()}
    <button class="btn" type="button" onclick={closeSheet}>Zamknij</button>
    <button class="btn fill" type="button" disabled={busy} onclick={create}>{busy ? 'Szyfruję…' : out ? 'Utwórz nowy kod' : 'Utwórz kod'}</button>
  {/snippet}
</Sheet>
