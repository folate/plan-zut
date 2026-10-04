<script lang="ts">
  import { app, updateProfile } from '../../lib/app.svelte';
  import { msgOf } from '../../lib/net';
  import { ensureProfile, finishLogin, logout, sync } from '../../lib/plans';
  import { toast } from '../../lib/ui.svelte';
  import { authorizeUrl } from '../../lib/usos/api';
  import { loginStart } from '../../lib/usos/oauth';
  import { hasKey, session, setReq } from '../../lib/usos/session.svelte';
  import Avatar from '../Avatar.svelte';
  import CalendarLink from '../CalendarLink.svelte';

  let pin = $state('');
  let msg = $state('');
  let busy = $state(false);

  const me = $derived(app.profile);
  const usesAccount = $derived(me?.api?.kind === 'account');

  async function run(fn: () => unknown) {
    msg = '';
    busy = true;
    try {
      await fn();
    } catch (e) {
      msg = msgOf(e);
    }
    busy = false;
  }
  const confirmPin = () =>
    run(async () => {
      if (!pin.trim()) return void (msg = 'Wpisz kod PIN.');
      await finishLogin(pin);
      toast('Zalogowano przez USOS');
    });
  function signOut() {
    logout();
    toast('Wylogowano');
  }
  function useAccount() {
    updateProfile(ensureProfile().id, { api: { kind: 'account' } });
    sync().catch((e) => toast(msgOf(e)));
  }
</script>

<h3>Konto USOS</h3>
{#if !hasKey()}
  <p class="hint">Wpisz klucz i sekret API powyżej, żeby zalogować się przez USOS. Wtedy plan pobiera się z Twoich grup na cały semestr, z prowadzącymi i uczestnikami.</p>
{:else if session.auth}
  <div class="acct">
    <Avatar p={{ name: session.auth.user?.name || '?', ci: 0 }} size="sm" />
    <span><b>{session.auth.user?.name || 'Zalogowano'}</b><small>Zalogowano przez USOS</small></span>
    <button type="button" class="tbtn" onclick={signOut}>Wyloguj</button>
  </div>
  {#if usesAccount && me}
    <p class="hint">Plan „{me.name}” pobiera się z Twojego konta USOS: wszystkie grupy z bieżącego semestru.</p>
    <button type="button" class="tbtn" onclick={() => updateProfile(me.id, { api: undefined })}>Wróć do pobierania z linku</button>
  {:else}
    <button type="button" class="btn fill" onclick={useAccount}>Pobieraj plan „{me?.name || ''}” z konta USOS</button>
  {/if}
  <CalendarLink />
{:else if session.req}
  <p class="hint">Zaloguj się w USOS w nowej karcie i zezwól aplikacji na dostęp. Na końcu USOS pokaże kod PIN.</p>
  <a class="btn" href={authorizeUrl(session.req.token)} target="_blank" rel="noopener">Otwórz logowanie USOS ↗</a>
  <div class="two">
    <div class="fld"><label for="s-pin">Kod PIN z USOS</label><input id="s-pin" type="text" inputmode="numeric" autocomplete="one-time-code" bind:value={pin} /></div>
    <div class="fld" style="align-self:end"><button type="button" class="btn fill" disabled={busy} onclick={confirmPin}>Potwierdź</button></div>
  </div>
  <button type="button" class="linkbtn" onclick={() => setReq(null)}>Anuluj logowanie</button>
{:else}
  <p class="hint">Po zalogowaniu plan pobiera się z Twoich grup na cały semestr, a w szczegółach zajęć zobaczysz uczestników grupy.</p>
  <button type="button" class="btn fill" disabled={busy} onclick={() => run(() => loginStart(null))}>{busy ? 'Łączę z USOS…' : 'Zaloguj przez USOS'}</button>
{/if}
{#if msg}<div class="msg">{msg}</div>{/if}
