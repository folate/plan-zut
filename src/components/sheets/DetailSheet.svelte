<script lang="ts">
  import { app, goToDate, peerData } from '../../lib/app.svelte';
  import { changeLine, evFromJson, ghostsOf } from '../../lib/changes';
  import { KIND, shortB, typeOf, typeStyle } from '../../lib/constants';
  import { cap, fmtDay, fmtFull, fmtShort, hm, pad, plural } from '../../lib/dates';
  import { applyOv, cancelledByRule, cancelRules, ruleText } from '../../lib/events';
  import { msgOf, NetError } from '../../lib/net';
  import { patternOf } from '../../lib/pattern';
  import { store } from '../../lib/storage';
  import { isAbsent, toggleAbsence } from '../../lib/absences';
  import { openPreview, saveAbsences, saveMakeups, saveOverrides } from '../../lib/plans';
  import type { ViewEvent } from '../../lib/types';
  import { canMakeup, getShifts, lessonNo, saveShift } from '../../lib/makeup';
  import { closeSheet, openSheet, pushSheet, toast } from '../../lib/ui.svelte';
  import { api, apiStatus } from '../../lib/usos/api';
  import { gmKey, metaFailed, metaOf } from '../../lib/usos/meta.svelte';
  import { findRoom } from '../../lib/usos/rooms';
  import type { SearchItem } from '../../lib/usos/plans';
  import { session } from '../../lib/usos/session.svelte';
  import Icon from '../Icon.svelte';
  import Sheet from '../Sheet.svelte';
  import TypeTag from '../TypeTag.svelte';

  let { uid }: { uid: string } = $props();

  const mk = app.makeups.find((e) => e.uid === uid);
  const lz = app.lazyNow.find((e) => e.uid === uid);
  const live = app.usos.find((e) => e.uid === uid) ?? mk ?? lz;
  const removed = live ? undefined : app.changes.find((c) => c.ev.uid === uid);
  const ghost = removed ? evFromJson(removed.ev) : undefined;
  const base = live ?? ghost;
  const cur: ViewEvent | undefined = live ? applyOv(live, app.ov) : ghost && { ...applyOv(ghost, { single: {}, series: {} }), cancelled: true };
  const t = typeOf(base?.code);
  const now = new Date();
  const readOnly = app.viewingPreview || !!lz;
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
  const byRule = !!live && cancelledByRule(live, app.ov);
  const seriesOv = live && app.ov.series[live.skey];
  const rules = seriesOv?.cancelled ? cancelRules(seriesOv).map(ruleText) : [];
  const kept = live ? app.usos.filter((e) => e.skey === live.skey && app.ov.single[e.uid]?.cancelled === false && cancelledByRule(e, app.ov)).sort((x, y) => +x.start - +y.start) : [];
  if (cur?.cancelled) descs.push(ghost ? 'Zajęcia zniknęły z planu w USOS (prawdopodobnie odwołane).' : byRule ? 'Odwołane przez regułę ustawioną dla całej grupy.' : 'Oznaczone przez Ciebie jako odwołane.');
  else if (byRule) descs.push('Odbywają się mimo reguły odwołań (wyjątek ustawiony przez Ciebie).');
  if (cur?.orig) {
    const o = cur.orig;
    if (cur.mod.has('day')) descs.push(`Przeniesione przez Ciebie z ${fmtDay(o.start)}.`);
    if (cur.mod.has('time')) descs.push(`Godzina zmieniona przez Ciebie (w USOS ${hm(o.start)}–${hm(o.end)}).`);
    if (cur.mod.has('room')) descs.push(`Sala zmieniona przez Ciebie (w USOS ${[o.room, o.building && shortB(o.building)].filter(Boolean).join(', ')}).`);
  }
  if (cur?.note) descs.push('Notatka: ' + cur.note);
  if (lz && !app.viewingPreview) descs.push('Zajęcia z wcześniejszego semestru, dociągnięte z USOS tylko do podglądu. Nie są zapisane w Twoim planie.');
  if (mk) descs.push(`Odrabiane zajęcia w grupie ${mk.group}, dodane przez Ciebie z widoku „Odrabianie”.`);
  function removeMakeup() {
    saveMakeups(app.makeups.filter((e) => e.uid !== uid));
    closeSheet();
  }

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
  async function previewRoom() {
    if (!cur?.room || !cur.building) return;
    busyChip = 'room';
    try {
      const id = await findRoom(cur.building, cur.room);
      if (!id) throw new Error('Nie znalazłem tej sali w USOS.');
      await preview({ kind: 'room', id, name: `Sala ${cur.room}`, sub: shortB(cur.building) }, 'room');
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
  function setCancelled(v: boolean) {
    const single = { ...app.ov.single }, n = { ...single[uid] };
    if (v === byRule) delete n.cancelled;
    else n.cancelled = v;
    if (Object.keys(n).length) single[uid] = n;
    else delete single[uid];
    saveOverrides({ single, series: app.ov.series });
    openSheet({ name: 'detail', uid });
  }
  function jump(d: Date) {
    goToDate(d);
    closeSheet();
  }

  const num = live && !mk && canMakeup(live) ? lessonNo(app.usos, app.ov, live) : null;
  const numKey = live ? gmKey(live.unit, live.group) : '';
  let shifts = $state.raw(getShifts());
  const numShift = $derived(shifts[numKey] || 0);
  const shiftNum = (d: number) => (shifts = saveShift(numKey, numShift + d));

  const NOTE_OFF = 'icsNumNoteOff';
  let warn = $state(false);
  const goMakeup = () => pushSheet({ name: 'makeup', uid });
  function findMakeup() {
    if (viaIcs && !store.get(NOTE_OFF, false)) warn = true;
    else goMakeup();
  }
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
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
      {#if num?.n}<span class="det-n">Zajęcia nr {num.n + numShift}{numShift || viaIcs ? '' : ` z ${num.total}`}{viaIcs ? ' (może być zaniżony)' : ''}</span>{/if}
    </div>
    {#if descs.length}
      <div class="det-note">{#each descs as d, i}{#if i}<br />{/if}{d}{/each}</div>
    {/if}
    {#if live && !readOnly && (cur.cancelled || byRule)}
      <button type="button" class="tbtn" style="justify-self:start" onclick={() => setCancelled(!cur.cancelled)}>
        {cur.cancelled ? 'Te zajęcia jednak się odbywają' : 'Odwołaj ten termin z powrotem'}
      </button>
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
                <Icon name="person" /><span>{x.n}</span>
              </button>
            {/each}
          {:else}
            <span class="hint">{apiStatus.down ? 'Prowadzący będą widoczni w wersji otwartej u siebie.' : meta ? 'USOS nie podaje prowadzących tej grupy.' : metaFailed(base) ? 'Nie udało się wczytać prowadzących.' : 'Wczytuję prowadzących…'}</span>
          {/if}
          <button type="button" class="pchip grp" class:busy={busyChip === 'grp'} onclick={() => preview({ kind: 'group', unit: base.unit, group: base.group, name: `${base.name} · gr. ${base.group}` }, 'grp')}>
            <Icon name="compare" /><span>Plan grupy {base.group}</span>
          </button>
          {#if session.auth && cur.room && cur.building}
            <button type="button" class="pchip grp" class:busy={busyChip === 'room'} onclick={previewRoom}>
              <Icon name="cal" /><span>Plan sali {cur.room}</span>
            </button>
          {/if}
        </div>
        {#if !session.auth}
          <p class="hint">Po zalogowaniu przez USOS (Ustawienia) zobaczysz też uczestników grupy i plan sali.</p>
        {:else if inGroup && !people}
          <button type="button" class="tbtn" disabled={loadingPeople} onclick={loadParticipants}>{loadingPeople ? 'Wczytuję…' : 'Pokaż uczestników grupy'}{meta?.n ? ` · ${meta.n} ${plural(meta.n, 'osoba', 'osoby', 'osób')}` : ''}</button>
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

    {#if live && !readOnly && !mk}
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

    {#if live && !readOnly && !mk && canMakeup(live)}
      <section class="det-sec">
        <h3>Numer zajęć i odrabianie</h3>
        <button type="button" class="btn fill mk-go" onclick={findMakeup}><Icon name="swap" />Znajdź ten termin w innej grupie</button>
        {#if num?.n}
          <div class="ver mk-row">
            <span class="ver-t">
              <b>Zajęcia nr {num.n + numShift}</b>
              <small>Termin {num.n} z {num.total} {viaIcs ? 'pobranych' : 'w tej grupie'}{numShift ? `, przesunięcie ${numShift > 0 ? '+' : '−'}${Math.abs(numShift)}` : ''}</small>
            </span>
            <span class="mk-step">
              <span>
                <button type="button" class="ib muted" aria-label="Wcześniejszy numer zajęć" disabled={num.n + numShift <= 1} onclick={() => shiftNum(-1)}>−</button>
                <b>nr {num.n + numShift}</b>
                <button type="button" class="ib muted" aria-label="Późniejszy numer zajęć" onclick={() => shiftNum(1)}>+</button>
              </span>
            </span>
          </div>
          <p class="hint">Popraw numer, jeśli grupa zaczęła później albo coś jej przepadło. Ta sama poprawka działa w widoku „Odrabianie”.</p>
        {/if}
      </section>
    {/if}

    {#if rules.length}
      <section class="det-sec">
        <h3>Reguły odwołań</h3>
        {#each rules as r}<p class="det-pat">{r}</p>{/each}
        {#if kept.length}<p class="det-pat">Wyjątki, odbywają się mimo reguł: {kept.map((e) => fmtShort(e.start)).join(', ')}</p>{/if}
        <p class="hint">Dotyczą wszystkich zajęć tej grupy. Zmienisz je w „Edytuj”, a pojedynczy termin przywrócisz po kliknięciu go w planie.</p>
      </section>
    {/if}

    {#if !mk}
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
    {/if}

    {#snippet footer()}
      {#if base.url}<a class="btn sp" href={base.url} target="_blank" rel="noopener">USOSweb ↗</a>{/if}
      {#if mk}<button class="btn danger" type="button" onclick={removeMakeup}>Usuń z planu</button>{/if}
      {#if !readOnly && !ghost && !mk}<button class="btn" type="button" onclick={() => pushSheet({ name: 'class', uid })}><Icon name="edit" />Edytuj</button>{/if}
      <button class="btn fill" type="button" onclick={closeSheet}>Zamknij</button>
    {/snippet}
  </Sheet>
{/if}

{#if warn}
  <div use:portal>
    <div class="dp-scrim" role="presentation" onclick={() => (warn = false)}></div>
    <div class="dp" role="alertdialog" aria-modal="true" aria-label="Plan z linku">
      <div class="mk-warn">
        <b>Plan z linku do kalendarza</b>
        <p>USOS nie podaje w takim kalendarzu zajęć wstecz, więc apka zna tylko terminy, które zdążyła pobrać. Numer zajęć w szczegółach może przez to być błędny (zaniżony).</p>
        <p>W widoku „Odrabianie” terminy są pobierane z całego semestru. Sprawdź tam, czy numer się zgadza, i w razie czego popraw go przyciskami − i +.</p>
      </div>
      <div class="dp-act">
        <button class="btn sp" type="button" onclick={() => (store.set(NOTE_OFF, true), goMakeup())}>Nie pokazuj więcej</button>
        <button class="btn fill" type="button" onclick={goMakeup}>Rozumiem</button>
      </div>
    </div>
  </div>
{/if}
