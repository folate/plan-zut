<script lang="ts">
  import { jumpToRelevant } from '../../lib/app.svelte';
  import { msgOf } from '../../lib/net';
  import { finishLogin, sync, useAccountFor } from '../../lib/plans';
  import { canCallback } from '../../lib/platform';
  import { closeSheet, toast } from '../../lib/ui.svelte';
  import { authorizeUrl } from '../../lib/usos/api';
  import { loginStart } from '../../lib/usos/oauth';
  import { hasKey, session, setKey } from '../../lib/usos/session.svelte';
  import Avatar from '../Avatar.svelte';
  import Sheet from '../Sheet.svelte';

  let { target }: { target: string | null } = $props();

  let key = $state(''), secret = $state(''), pin = $state('');
  let msg = $state('');
  let busy = $state('');
  let askSaved = $state(false);

  function saveKey() {
    askSaved = false;
    setKey({ key: key.trim(), secret: secret.trim() });
  }

  const step = $derived(!hasKey() ? 'key' : !session.auth ? (session.req && !canCallback() ? 'pin' : 'login') : 'ready');
  const label = $derived({ key: 'Dalej', pin: 'Potwierdź PIN', login: 'Zaloguj przez USOS', ready: 'Pobierz plan z konta' }[step]);

  const syncQuiet = () => sync().catch((e) => toast(msgOf(e)));

  async function go() {
    msg = '';
    try {
      if (step === 'key') {
        if (!key.trim() || !secret.trim()) return void (msg = 'Wklej klucz i sekret.');
        askSaved = true;
      } else if (step === 'pin') {
        if (!pin.trim()) return void (msg = 'Wpisz kod PIN.');
        busy = label;
        if (!(await finishLogin(pin))) useAccountFor(target);
        closeSheet();
        await syncQuiet();
      } else if (step === 'login') {
        busy = 'Łączę z USOS…';
        await loginStart(target);
      } else {
        busy = 'Pobieram…';
        useAccountFor(target);
        closeSheet();
        jumpToRelevant();
        await syncQuiet();
        jumpToRelevant();
      }
    } catch (e) {
      msg = msgOf(e);
    }
    busy = '';
  }
</script>

<Sheet title="Konto USOS" subtitle={step === 'key' ? 'Krok 1 z 2: klucz API' : step === 'ready' ? 'Gotowe' : 'Krok 2 z 2: logowanie'}>
  {#if step === 'key'}
    <ol class="steps">
      <li>Wejdź na <code>usosapi.zut.edu.pl/developers</code> i zaloguj się kontem USOS.</li>
      <li>Zarejestruj aplikację: podaj dowolną nazwę (np. „Mój plan”), adres strony, na której otwierasz ten plan, i swój e‑mail.</li>
      <li>Skopiuj wygenerowany klucz i sekret poniżej i zapisz je sobie gdzieś na boku (np. w menedżerze haseł).</li>
    </ol>
    <a class="btn" href="https://usosapi.zut.edu.pl/developers/" target="_blank" rel="noopener">Otwórz panel developera USOS ↗</a>
    <div class="two">
      <div class="fld"><label for="a-key">Klucz</label><input id="a-key" type="text" autocomplete="off" spellcheck="false" bind:value={key} /></div>
      <div class="fld"><label for="a-sec">Sekret</label><input id="a-sec" type="password" autocomplete="off" bind:value={secret} /></div>
    </div>
    <p class="hint">Klucz zostaje tylko w tej przeglądarce. Możesz go później zmienić w Ustawieniach.</p>
  {:else if step === 'pin'}
    <p class="hint">Zaloguj się w nowej karcie i zezwól na dostęp. USOS pokaże kod PIN.</p>
    <a class="btn" href={authorizeUrl(session.req!.token)} target="_blank" rel="noopener">Otwórz logowanie USOS ↗</a>
    <div class="fld"><label for="a-pin">Kod PIN z USOS</label><input id="a-pin" type="text" inputmode="numeric" autocomplete="one-time-code" bind:value={pin} /></div>
  {:else if step === 'login'}
    <p class="hint">Za chwilę przejdziesz do strony logowania USOS. Po zalogowaniu i zgodzie wrócisz tutaj, a plan pobierze się sam.</p>
  {:else}
    <div class="acct">
      <Avatar p={{ name: session.auth?.user?.name || '?', ci: 0 }} size="sm" />
      <span><b>{session.auth?.user?.name || 'Zalogowano'}</b><small>Zalogowano przez USOS</small></span>
    </div>
    <p class="hint">Plan pobierze się z Twoich grup na cały semestr.</p>
  {/if}
  {#if msg}<div class="msg">{msg}</div>{/if}

  {#snippet footer()}
    <button class="btn" type="button" onclick={closeSheet}>Anuluj</button>
    <button class="btn fill" type="button" disabled={!!busy} onclick={go}>{busy || label}</button>
  {/snippet}
</Sheet>

{#if askSaved}
  <div class="confirm-scrim" role="presentation" onclick={() => (askSaved = false)}></div>
  <div class="confirm" role="alertdialog" aria-modal="true" aria-labelledby="ask-saved">
    <h3 id="ask-saved">Masz zapisany klucz i sekret?</h3>
    <p>USOS raczej nie pokaże ich drugi raz. Bez nich nie zalogujesz się na innym urządzeniu ani po wyczyszczeniu przeglądarki. Są też potrzebne, żeby anulować ten klucz w USOS API.</p>
    <div class="confirm-act">
      <button class="btn" type="button" onclick={() => (askSaved = false)}>Jeszcze nie</button>
      <button class="btn fill" type="button" onclick={saveKey}>Mam zapisane</button>
    </div>
  </div>
{/if}
