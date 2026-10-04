<script lang="ts">
  import { app, updateProfile } from '../lib/app.svelte';
  import { fmtAt } from '../lib/dates';
  import { retryNow, sync } from '../lib/plans';
  import { openSheet } from '../lib/ui.svelte';
  import { session, setAuthLost } from '../lib/usos/session.svelte';
  import Icon from './Icon.svelte';

  type Action = 'retry' | 'login' | 'useurl' | 'settings' | 'source';

  const lost = $derived(session.authLost && !session.auth);
  const kind = $derived(lost && app.lastErr?.kind !== 'auth' ? 'auth' : app.lastErr?.kind);

  const bar = $derived.by((): [string, string, [Action, string][]] | null => {
    if (!kind) return null;
    const msg = app.lastErr?.msg || '';
    const since = app.synced ? ` Pokazuję zapisany plan z ${fmtAt(app.synced)}.` : '';
    const again = app.retryDelay ? ` Spróbuję ponownie za ${Math.round(app.retryDelay / 60e3)} min.` : '';
    switch (kind) {
      case 'offline': return ['Jesteś offline.', since + ' Odświeżę, gdy wróci internet.', [['retry', 'Spróbuj ponownie']]];
      case 'down': return ['USOS nie działa.', since + again, [['retry', 'Spróbuj teraz']]];
      case 'timeout': return ['USOS nie odpowiada.', since + again, [['retry', 'Spróbuj teraz']]];
      case 'auth': return ['Wylogowano z USOS.', ` Dostęp do konta wygasł albo został cofnięty.${since}`, [['login', 'Zaloguj ponownie'], ...(app.profile?.url ? ([['useurl', 'Pobieraj z linku']] as [Action, string][]) : [])]];
      case 'key': return ['Problem z kluczem API.', ` ${msg}`, [['settings', 'Ustawienia']]];
      case 'link': return ['Link do planu nie działa.', ` ${msg}`, [['source', 'Źródło planu']]];
      case 'blocked': return ['Nie mogę połączyć się z USOS.', ` ${msg}`, []];
      default: return ['Nie udało się pobrać planu.', ` ${msg}${since}`, [['retry', 'Spróbuj ponownie']]];
    }
  });

  function dismiss() {
    app.lastErr = null;
    setAuthLost(false);
  }
  function run(a: Action) {
    if (a === 'retry') retryNow();
    else if (a === 'login') openSheet({ name: 'account', target: app.pid });
    else if (a === 'settings') openSheet({ name: 'settings' });
    else if (a === 'source') openSheet({ name: 'profile', id: app.pid });
    else if (a === 'useurl' && app.pid) {
      updateProfile(app.pid, { api: undefined });
      dismiss();
      sync().catch(() => {});
    }
  }
</script>

{#if bar}
  <div class="errbar k-{kind}" role="alert">
    <Icon name="warn" />
    <span><b>{bar[0]}</b>{bar[1]}</span>
    <span class="eb-act">
      {#each bar[2] as [a, label] (a)}<button type="button" class="tbtn" onclick={() => run(a)}>{label}</button>{/each}
      <button type="button" class="ib muted" aria-label="Ukryj" onclick={dismiss}><Icon name="x" /></button>
    </span>
  </div>
{/if}
