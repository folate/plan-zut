<script lang="ts">
  import { app, goToDate } from '../../lib/app.svelte';
  import { changeLine, groupChanges } from '../../lib/changes';
  import { KIND } from '../../lib/constants';
  import { fmtD, plural } from '../../lib/dates';
  import { setChanges } from '../../lib/plans';
  import type { Change } from '../../lib/types';
  import { closeSheet } from '../../lib/ui.svelte';
  import Sheet from '../Sheet.svelte';
  import TypeTag from '../TypeTag.svelte';

  const open = $derived(app.changes.filter((c) => !c.ack));
  const done = $derived(app.changes.filter((c) => c.ack).slice(-30).reverse());
  const groups = $derived(groupChanges(open));
  let gone = $state<string[]>([]);

  function ack(ids: string[]) {
    const s = new Set(ids);
    if (app.pid) setChanges(app.pid, app.changes.map((c) => (s.has(c.id) ? { ...c, ack: true } : c)));
  }
  function ackGroup(items: Change[]) {
    gone = [...gone, items[0].id];
    setTimeout(() => ack(items.map((x) => x.id)), 220);
  }
  function show(c: Change) {
    goToDate(new Date(c.ev.start));
    closeSheet();
  }
</script>

<Sheet
  title="Zmiany w planie"
  subtitle={open.length ? `${open.length} ${plural(open.length, 'nowa zmiana', 'nowe zmiany', 'nowych zmian')} od ostatniego pobrania` : 'Brak nowych zmian'}
>
  {#if groups.length}
    <div class="chg-list">
      {#each groups as items (items[0].id)}
        {@const c = items[0]}
        {@const many = items.length > 1}
        {@const permanent = many && (c.kind === 'room' || c.kind === 'time')}
        <div class="chg-card k-{c.kind}" class:gone={gone.includes(c.id)}>
          <div class="chg-top"><span class="chg-k">{KIND[c.kind]}</span><TypeTag code={c.ev.code} /></div>
          <b>{c.ev.name}{c.ev.group ? ` · gr. ${c.ev.group}` : ''}</b>
          <span class="chg-l">{changeLine(c)}</span>
          {#if many}<span class="chg-l">Dotyczy {items.length} zajęć: {items.slice(0, 6).map((x) => fmtD(x.ev.start)).join(', ')}{items.length > 6 ? '…' : ''}</span>{/if}
          {#if permanent}<span class="hint">Zmiana powtarza się, więc wygląda na stałą.</span>{/if}
          <div class="chg-act">
            <button type="button" class="tbtn" onclick={() => show(c)}>Pokaż w planie</button>
            <button type="button" class="tbtn on" onclick={() => ackGroup(items)}>{permanent ? 'Zatwierdź jako stałą' : 'OK, rozumiem'}</button>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <p class="hint">Gdy USOS przesunie, odwoła albo przeniesie zajęcia do innej sali, zobaczysz to tutaj po odświeżeniu planu.</p>
  {/if}
  {#if done.length}
    <details class="adv">
      <summary>Historia ({done.length})</summary>
      <div class="chg-hist">
        {#each done as c (c.id)}<div><span>{fmtD(new Date(c.at))}</span> {KIND[c.kind]}: {c.ev.name} · {changeLine(c)}</div>{/each}
      </div>
    </details>
  {/if}

  {#snippet footer()}
    {#if open.length > 1}<button class="btn sp" type="button" onclick={() => { ack(open.map((c) => c.id)); closeSheet(); }}>Zatwierdź wszystkie</button>{/if}
    <button class="btn fill" type="button" onclick={closeSheet}>Zamknij</button>
  {/snippet}
</Sheet>
