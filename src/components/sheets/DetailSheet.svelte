<script lang="ts">
  import { app, goToDate, peerData } from '../../lib/app.svelte';
  import { changeLine, evFromJson, ghostsOf } from '../../lib/changes';
  import { KIND, shortB, typeOf, typeStyle } from '../../lib/constants';
  import { cap, fmtDay, fmtFull, hm, pad } from '../../lib/dates';
  import { applyOv } from '../../lib/events';
  import { msgOf, NetError } from '../../lib/net';
  import { patternOf } from '../../lib/pattern';
  import { isAbsent, toggleAbsence } from '../../lib/absences';
  import { openPreview, saveAbsences } from '../../lib/plans';
  import type { ViewEvent } from '../../lib/types';
  import { closeSheet, openSheet, toast } from '../../lib/ui.svelte';
  import { api, apiStatus } from '../../lib/usos/api';
  import { metaFailed, metaOf } from '../../lib/usos/meta.svelte';
  import type { SearchItem } from '../../lib/usos/plans';
  import { session } from '../../lib/usos/session.svelte';
  import Icon from '../Icon.svelte';
  import Sheet from '../Sheet.svelte';
  import TypeTag from '../TypeTag.svelte';

  let { uid }: { uid: string } = $props();

  const live = app.usos.find((e) => e.uid === uid);
  const removed = live ? undefined : app.changes.find((c) => c.ev.uid === uid);
  const ghost = removed ? evFromJson(removed.ev) : undefined;
  const base = live ?? ghost;
  const cur: ViewEvent | undefined = live ? applyOv(live, app.ov) : ghost && { ...applyOv(ghost, { single: {}, series: {} }), cancelled: true };
  const t = typeOf(base?.code);
  const now = new Date();
  const readOnly = app.viewingPreview;
  const viaIcs = !app.profile?.api && !app.preview;

  const occ = base
    ? [...app.usos.filter((e) => e.skey === base.skey).map((e) => applyOv(e, app.ov)), ...ghostsOf(app.changes, app.usos, (c) => c.ev.skey === base.skey)].sort((a, b) => +a.start - +b.start)
    : [];
  const patterns = patternOf(occ);
  const rooms = new Map<string, number>();
  for (const e of occ.filter((e) => !e.cancelled)) {
    const r = [e.room, e.building && shortB(e.building)].filter(Boolean).join(' · ');
    if (r) rooms.set(r, (rooms.get(r) || 0) + 1);
  }
  const srv = app.changes.filter((c) => c.ev.uid === uid).slice(-3);

  const descs: string[] = [];
  if (cur?.cancelled) descs.push(ghost ? 'Zajęcia zniknęły z planu w USOS (prawdopodobnie odwołane).' : 'Oznaczone przez Ciebie jako odwołane.');
  if (cur?.orig) {
    const o = cur.orig;
    if (cur.mod.has('day')) descs.push(`Przeniesione przez Ciebie z ${fmtDay(o.start)}.`);
    if (cur.mod.has('time')) descs.push(`Godzina zmieniona przez Ciebie (w USOS ${hm(o.start)}–${hm(o.end)}).`);
    if (cur.mod.has('room')) descs.push(`Sala zmieniona przez Ciebie (w USOS ${[o.room, o.building && shortB(o.building)].filter(Boolean).join(', ')}).`);
  }
  if (cur?.note) descs.push('Notatka: ' + cur.note);

  const meta = $derived(base ? metaOf(base) : undefined);
  let busyChip = $state('');
  let people = $state.raw<{ id: string; name: string }[] | null>(null);
  let loadingPeople = $state(false);
  const mine = app.profiles.find((p) => p.api?.kind === 'account');
  const inGroup = !mine || !base || peerData(mine.id).usos.some((e) => String(e.unit) === String(base.unit) && String(e.group) === String(base.group));

  async function preview(it: SearchItem, chip: string) {
    busyChip = chip;
    try {
      await openPreview(it);
      closeSheet();
    } catch (e) {
      busyChip = '';
      toast(msgOf(e));
    }
  }
  async function loadParticipants() {
    if (!base) return;
    loadingPeople = true;
    try {
      const r = await api('groups/group', { course_unit_id: base.unit, group_number: base.group, fields: 'participants' }, { auth: true });
      const me = session.auth?.user?.id;
      people = (r.participants || []).filter((x: any) => String(x.id) !== String(me)).sort((a: any, b: any) => a.last_name.localeCompare(b.last_name, 'pl')).map((x: any) => ({ id: String(x.id), name: `${x.first_name} ${x.last_name}` }));
    } catch (e) {
      toast(e instanceof NetError && e.status === 400 ? 'Uczestników widzą tylko osoby z tej grupy i prowadzący.' : msgOf(e));
    } finally {
      loadingPeople = false;
    }
  }
  function jump(d: Date) {
    goToDate(d);
    closeSheet();
  }

  const absent = $derived(isAbsent(app.absences, uid));
  const missed = $derived(base ? app.absences.filter((a) => a.skey === base.skey).sort((x, y) => x.at.localeCompare(y.at)) : []);
  const shortDate = (d: Date) => `${d.getDate()}.${pad(d.getMonth() + 1)}`;
</script>

{#if base && cur}
  <Sheet title={base.name}>
    {#snippet sub()}
      <TypeTag code={base.code} />{#if base.group}<span>grupa {base.group}</span>{/if}
    {/snippet}

    <div class="det-when" class:cancel={cur.cancelled} style={typeStyle(t.k)}>
      <span class="det-d">{cap(fmtFull(cur.start))}</span>
      <span class="det-t">{hm(cur.start)}–{hm(cur.end)}</span>
      <span class="det-r">{cur.room ? `Sala ${cur.room}` : 'Sala nieznana'}{cur.building ? ` · ${cur.building}` : ''}</span>
    </div>
    {#if descs.length}
      <div class="det-note">{#each descs as d, i}{#if i}<br />{/if}{d}{/each}</div>
    {/if}
    {#if srv.length}
      <div class="det-srv">
        <b>Zmiany w USOS</b>
        {#each srv as c (c.id)}<span>{KIND[c.kind]}: {changeLine(c)}{#if !c.ack} · <em>nowe</em>{/if}</span>{/each}
      </div>
    {/if}

    {#if base.unit}
      <section class="det-sec">
        <h3>Prowadzący i grupa</h3>
        <div class="pchips">
          {#if meta?.l.length}
            {#each meta.l as x (x.id)}
              <button type="button" class="pchip" class:busy={busyChip === x.id} onclick={() => preview({ kind: 'staff', id: x.id, name: x.n, sub: 'Prowadzący' }, x.id)}>
                <Icon name="person" /><span>{x.n}</span><Icon name="chevr" />
              </button>
            {/each}
          {:else}
            <span class="hint">{apiStatus.down ? 'Prowadzący będą widoczni w wersji otwartej u siebie.' : meta ? 'USOS nie podaje prowadzących tej grupy.' : metaFailed(base) ? 'Nie udało się wczytać prowadzących.' : 'Wczytuję prowadzących…'}</span>
          {/if}
          <button type="button" class="pchip grp" class:busy={busyChip === 'grp'} onclick={() => preview({ kind: 'group', unit: base.unit, group: base.group, name: `${base.name} · gr. ${base.group}` }, 'grp')}>
            <Icon name="compare" /><span>Plan grupy {base.group} z tego przedmiotu</span><Icon name="chevr" />
          </button>
        </div>
        {#if !session.auth}
          <p class="hint">Po zalogowaniu przez USOS (Ustawienia) zobaczysz też uczestników grupy.</p>
        {:else if inGroup && !people}
          <button type="button" class="tbtn" disabled={loadingPeople} onclick={loadParticipants}>{loadingPeople ? 'Wczytuję…' : 'Pokaż uczestników grupy'}</button>
        {:else if people}
          <div class="pchips">
            {#each people as x (x.id)}
              <button type="button" class="pchip sm" class:busy={busyChip === x.id} onclick={() => preview({ kind: 'common', id: x.id, name: `Wspólne z: ${x.name}` }, x.id)}><span>{x.name}</span></button>
            {:else}
              <span class="hint">Brak innych uczestników.</span>
            {/each}
            {#if people.length}<p class="hint">Kliknij osobę, żeby zobaczyć Wasze wspólne zajęcia. USOS nie udostępnia pełnego planu innego studenta.</p>{/if}
          </div>
        {/if}
      </section>
    {/if}

    {#if live && !readOnly}
      <section class="det-sec">
        <h3>Obecność</h3>
        <div class="att">
          <span><span>Nieobecności na tych zajęciach: <b>{missed.length}</b></span>{#if missed.length}<small>{missed.map((a) => shortDate(new Date(a.at))).join(', ')}</small>{/if}</span>
          <button type="button" class="tbtn" class:on={absent} aria-pressed={absent} onclick={() => saveAbsences(toggleAbsence(app.absences, live))}>
            {absent ? 'Cofnij nieobecność' : 'Nie było mnie'}
          </button>
        </div>
      </section>
    {/if}

    <section class="det-sec">
      <h3>Harmonogram</h3>
      {#each patterns as x}<p class="det-pat">{x.text}</p>{:else}<p class="hint">Brak danych.</p>{/each}
      {#if rooms.size > 1}<p class="hint">Sale: {[...rooms].map(([r, n]) => `${r} (${n}×)`).join(', ')}</p>{/if}
      <div class="occ">
        {#each occ as e}
          <button
            type="button" class="oc" class:past={e.end < now} class:cx={e.cancelled} class:me={e.uid === uid} class:ab={missed.some((a) => a.uid === e.uid)}
            title="{fmtDay(e.start)} {hm(e.start)}{e.room ? ', s. ' + e.room : ''}{missed.some((a) => a.uid === e.uid) ? ' · nieobecność' : ''}" onclick={() => jump(e.start)}
          >{shortDate(e.start)}</button>
        {/each}
      </div>
      {#if viaIcs}<p class="hint">Na podstawie zajęć z pobranego kalendarza. USOS udostępnia w nim tylko najbliższe tygodnie, więc wcześniejsze i dalsze terminy mogą nie być widoczne.</p>{/if}
    </section>

    {#snippet footer()}
      {#if base.url}<a class="btn sp" href={base.url} target="_blank" rel="noopener">USOSweb ↗</a>{/if}
      {#if !readOnly && !ghost}<button class="btn" type="button" onclick={() => openSheet({ name: 'class', uid })}><Icon name="edit" />Edytuj</button>{/if}
      <button class="btn fill" type="button" onclick={closeSheet}>Zamknij</button>
    {/snippet}
  </Sheet>
{/if}
