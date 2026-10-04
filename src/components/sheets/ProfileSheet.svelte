<script lang="ts">
  import { onMount } from 'svelte';
  import { addProfile, animate, app, dropPeerCache, hasPlan, jumpToRelevant, newId, nextCi, prof, updateProfile } from '../../lib/app.svelte';
  import { fetchIcs, msgOf } from '../../lib/net';
  import * as planStore from '../../lib/planStore';
  import { deleteProfile, loadProfile, recordChanges, storeIcs } from '../../lib/plans';
  import { apiLabel, statusOf } from '../../lib/profileLabels';
  import { settings } from '../../lib/settings.svelte';
  import { closeSheet, openSheet } from '../../lib/ui.svelte';
  import { session } from '../../lib/usos/session.svelte';
  import Avatar from '../Avatar.svelte';
  import CalendarLink from '../CalendarLink.svelte';
  import ConfirmButton from '../ConfirmButton.svelte';
  import Icon from '../Icon.svelte';
  import Sheet from '../Sheet.svelte';

  let { id, mode }: { id: string | null; mode?: 'link' | 'file' } = $props();

  // svelte-ignore state_referenced_locally
  const p = prof(id);
  const fromApi = !!p?.api;

  let name = $state(p?.name ?? '');
  let url = $state(p?.url ?? '');
  let ics = $state('');
  let msg = $state<{ text: string; ok?: boolean } | null>(null);
  let nameEl = $state<HTMLInputElement>(), urlEl = $state<HTMLInputElement>(), icsEl = $state<HTMLTextAreaElement>();

  onMount(() => {
    if (!p) setTimeout(() => nameEl?.focus(), 50);
    if (mode === 'file') setTimeout(() => icsEl?.scrollIntoView({ block: 'center' }), 80);
    if (p && !p.url && !hasPlan(p.id) && mode) setTimeout(() => (mode === 'file' ? icsEl : urlEl)?.focus(), 60);
  });

  function readFile(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = () => (ics = String(r.result));
    r.readAsText(f);
  }

  function remove() {
    deleteProfile(p!.id);
    closeSheet();
  }

  async function save() {
    const n = name.trim(), u = url.trim(), pasted = ics.trim();
    const fail = (text: string) => void (msg = { text });
    if (!n) return fail('Podaj nazwę planu.');
    if (pasted && !pasted.includes('BEGIN:VEVENT')) return fail('Wklejony tekst nie zawiera żadnych zajęć.');
    if (!p && !u && !pasted) return fail('Podaj link do kalendarza albo wklej zawartość pliku.');
    if (p && fromApi) {
      updateProfile(p.id, { name: n });
      return closeSheet();
    }
    const pid = p?.id ?? newId();
    const stored = planStore.getIcs(pid);
    let text: string | null = pasted || null;
    if (!text && u && (!p || u !== p.url || !stored)) {
      msg = { text: 'Pobieram plan…', ok: true };
      try {
        text = await fetchIcs(u, settings.proxy);
      } catch (e) {
        return fail(msgOf(e));
      }
    }
    if (p) updateProfile(pid, { name: n, url: u });
    else addProfile({ id: pid, name: n, url: u, ci: nextCi() });
    if (text) {
      recordChanges(pid, stored, text);
      storeIcs(pid, text);
      updateProfile(pid, { synced: pasted ? null : Date.now() });
    }
    dropPeerCache(pid);
    if (pid === app.pid || (!p && !hasPlan(app.pid))) {
      loadProfile(pid);
      jumpToRelevant();
    }
    closeSheet();
    animate();
  }
</script>

<Sheet title={p ? 'Edytuj plan' : 'Nowy plan'}>
  {#snippet sub()}
    {#if p}<Avatar {p} size="xs" />{statusOf(p)}{:else}Np. plan znajomego albo dziewczyny{/if}
  {/snippet}

  <div class="fld"><label for="f-name">Nazwa</label><input id="f-name" type="text" maxlength="30" placeholder="np. Ola" bind:value={name} bind:this={nameEl} /></div>
  {#if p && fromApi}
    <p class="hint">Ten plan pobiera się prosto z USOS ({apiLabel(p)}). Odświeża się przy otwarciu aplikacji (najwyżej co 6 godzin) albo przyciskiem „Odśwież”, gdy jest wyświetlany lub porównywany.</p>
  {:else}
    <div class="fld">
      <label for="f-url">Link do kalendarza z USOS</label>
      <input id="f-url" type="url" inputmode="url" placeholder="webcal://usosapi.zut.edu.pl/…upcoming_ical…" bind:value={url} bind:this={urlEl} />
    </div>
    <p class="hint">Znajdziesz go w USOSweb przy eksporcie planu do kalendarza. Zawiera <code>upcoming_ical</code>. Link do cudzego planu musi Ci podesłać właściciel.</p>
    {#if msg}<div class="msg" class:ok={msg.ok}>{msg.text}</div>{/if}
    <div class="div"></div>
    <div class="fld"><label for="f-ics">Albo wklej zawartość pliku .ics</label><textarea id="f-ics" spellcheck="false" placeholder="BEGIN:VCALENDAR…" bind:value={ics} bind:this={icsEl}></textarea></div>
    <div class="fld"><label for="f-file">Albo wczytaj plik</label><input id="f-file" type="file" accept=".ics,text/calendar" style="height:auto;padding:10px" onchange={readFile} /></div>
  {/if}
  {#if p?.api?.kind === 'account' && session.auth}<CalendarLink />{/if}
  {#if msg && fromApi}<div class="msg" class:ok={msg.ok}>{msg.text}</div>{/if}

  {#snippet footer()}
    {#if p}<ConfirmButton class="btn danger sp" confirm="Usunąć ten plan?" onconfirm={remove}>Usuń plan</ConfirmButton>{/if}
    {#if p && hasPlan(p.id)}<button class="btn" type="button" onclick={() => openSheet({ name: 'history', id: p.id })}><Icon name="history" />Historia</button>{/if}
    <button class="btn" type="button" onclick={closeSheet}>Anuluj</button>
    <button class="btn fill" type="button" onclick={save}>{p ? 'Zapisz' : 'Dodaj'}</button>
  {/snippet}
</Sheet>
