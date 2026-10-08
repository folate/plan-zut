<script lang="ts">
  import { app, goToDate } from '../../lib/app.svelte';
  import { shortB } from '../../lib/constants';
  import { fmtD, hm, pad } from '../../lib/dates';
  import { cancelledStarts, clashName, getShifts, loadMakeup, makeupSubjects, saveShift, type MakeupData, type Slot } from '../../lib/makeup';
  import { msgOf } from '../../lib/net';
  import { saveMakeups } from '../../lib/plans';
  import { setHidden, settings } from '../../lib/settings.svelte';
  import { store } from '../../lib/storage';
  import { closeSheet, toast } from '../../lib/ui.svelte';
  import { gmKey, metaFor } from '../../lib/usos/meta.svelte';
  import Icon from '../Icon.svelte';
  import Sheet from '../Sheet.svelte';
  import Switch from '../Switch.svelte';
  import TypeTag from '../TypeTag.svelte';

  let { uid }: { uid?: string } = $props();

  const subjects = makeupSubjects(app.usos);
  const from = app.usos.find((e) => e.uid === uid);
  const now = new Date();

  let key = $state(from ? gmKey(from.unit, from.group) : subjects.length === 1 ? subjects[0].key : '');
  let data = $state.raw<MakeupData | null>(null);
  let loading = $state(false);
  let err = $state('');
  let pick = $state(0);
  let shifts = $state.raw(getShifts());
  let onlyMine = $state(store.get('makeupOnlyMine', false));
  function setOnlyMine(v: boolean) {
    onlyMine = v;
    store.set('makeupOnlyMine', v);
  }

  const subject = $derived(subjects.find((s) => s.key === key));
  const off = $derived(subject ? cancelledStarts(app.usos, app.ov, subject) : new Set<number>());
  const mine = $derived.by(() => {
    let n = 0;
    return (data?.mine ?? []).map((s) => ({ s, n: off.has(+s.start) ? 0 : ++n }));
  });
  const total = $derived(mine.filter((m) => m.n).length);
  const cur = $derived(mine.find((m) => +m.s.start === pick && m.n));
  const myShift = $derived((subject && shifts[subject.key]) || 0);
  const no = $derived(cur ? cur.n + myShift : 0);

  let token = 0;
  async function load() {
    const s = subject, t = ++token;
    data = null;
    err = '';
    if (!s) return;
    loading = true;
    try {
      const d = await loadMakeup(s.unit, s.group);
      if (t !== token) return;
      data = d;
      const live = d.mine.filter((x) => !off.has(+x.start));
      const want = from && gmKey(from.unit, from.group) === s.key ? +from.start : 0;
      pick = +(live.find((x) => +x.start === want) ?? live.find((x) => x.end >= now) ?? live.at(-1))?.start! || 0;
    } catch (e) {
      if (t === token) err = msgOf(e);
    } finally {
      if (t === token) loading = false;
    }
  }
  load();

  const shortDate = (d: Date) => `${d.getDate()}.${pad(d.getMonth() + 1)}`;
  const place = (s: Slot) => [s.room && `s. ${s.room}`, s.building && shortB(s.building)].filter(Boolean).join(' · ');
  const lectIds = (g: string) => (subject ? (metaFor(subject.unit, g)?.l ?? []) : []);

  const myLect = $derived(subject ? lectIds(subject.group).map((x) => x.n).join(', ') : '');

  const rows = $derived.by(() => {
    const s = subject, c = cur;
    if (!s || !c || !data) return [];
    const myL = new Set(lectIds(s.group).map((x) => x.id));
    return data.others
      .map((g) => {
        const k = no + (shifts[gmKey(s.unit, g.group)] || 0), slot = g.slots[k - 1] as Slot | undefined;
        const l = lectIds(g.group);
        const past = !!slot && slot.start < now;
        const mk = slot ? `mk-${s.unit}-${g.group}-${+slot.start}` : '';
        const added = !!mk && app.makeups.some((x) => x.uid === mk);
        const clash = slot && !past ? clashName(slot, [...app.usos, ...app.makeups.filter((x) => x.uid !== mk)], app.ov, app.custom) : '';
        return { g, k, slot, past, clash, mk, added, lect: l.map((x) => x.n).join(', '), same: l.some((x) => myL.has(x.id)) };
      })
      .sort((a, b) => +(!a.slot || a.past) - +(!b.slot || b.past) || +b.same - +a.same || +!!a.clash - +!!b.clash || +(a.slot?.start ?? 0) - +(b.slot?.start ?? 0));
  });

  const mixed = $derived(rows.some((r) => r.same) && rows.some((r) => !r.same && r.lect));

  function shift(group: string, k: number, d: number, max: number) {
    if (!subject || !cur || (d < 0 ? k + d < 1 : k + d > max)) return;
    shifts = saveShift(gmKey(subject.unit, group), k + d - no);
  }
  function toggleAdd(r: (typeof rows)[number]) {
    const s = subject, slot = r.slot;
    if (!s || !slot) return;
    if (r.added) return saveMakeups(app.makeups.filter((x) => x.uid !== r.mk));
    saveMakeups([...app.makeups, {
      src: 'usos', uid: r.mk, skey: `${s.code}|${s.name}|${r.g.group}`, code: s.code, name: s.name, group: r.g.group, url: '', unit: s.unit,
      start: slot.start, end: slot.end, room: slot.room, building: slot.building, makeup: true
    }]);
    if (settings.hidden.includes(s.code)) setHidden(s.code, false);
    toast(`Dodano do planu: ${fmtD(slot.start)} ${hm(slot.start)}`, 'Pokaż', () => (goToDate(slot.start), closeSheet()));
  }
  function shiftMine(d: number) {
    if (subject && no + d >= 1) shifts = saveShift(subject.key, myShift + d);
  }
</script>

{#snippet rowCard(r: (typeof rows)[number])}
        <div class="ver mk-row" class:dim={!r.slot || r.past}>
          <span class="ver-t">
            <b>Grupa {r.g.group}{#if r.lect}<small>{r.lect}</small>{/if}</b>
            {#if r.slot}
              <span class="mk-when">{fmtD(r.slot.start)} · {hm(r.slot.start)}–{hm(r.slot.end)}</span>
              {#if place(r.slot)}<small>{place(r.slot)}</small>{/if}
              {#if r.past}<span class="mk-st old">Już się odbyły</span>
              {:else if r.clash}<span class="mk-st bad">Koliduje z: {r.clash}</span>
              {:else}<span class="mk-st">Masz wtedy wolne</span>{/if}
              {#if !r.past}
                <button type="button" class="tbtn mk-add" class:on={r.added} aria-pressed={r.added} onclick={() => toggleAdd(r)}>{r.added ? 'W planie · usuń' : 'Dodaj do mojego planu'}</button>
              {/if}
            {:else}
              <small>Ta grupa nie ma zajęć nr {r.k}.</small>
            {/if}
          </span>
          <span class="mk-step">
            <span>
              <button type="button" class="ib muted" aria-label="Wcześniejsze zajęcia grupy {r.g.group}" title="Wcześniejszy termin tej grupy" disabled={r.k <= 1} onclick={() => shift(r.g.group, r.k, -1, r.g.slots.length)}><Icon name="prev" /></button>
              <b>nr {r.k}</b>
              <button type="button" class="ib muted" aria-label="Późniejsze zajęcia grupy {r.g.group}" title="Późniejszy termin tej grupy" disabled={r.k >= r.g.slots.length} onclick={() => shift(r.g.group, r.k, 1, r.g.slots.length)}><Icon name="next" /></button>
            </span>
            <small>{r.k === no ? 'ich termin' : `ich termin, ${r.k > no ? '+' : '−'}${Math.abs(r.k - no)}`}</small>
          </span>
        </div>
{/snippet}

<Sheet title="Odrabianie zajęć" subtitle="Te same zajęcia w innych grupach z przedmiotu">
  <div class="fld">
    <label for="mk-subj">Zajęcia</label>
    <select id="mk-subj" bind:value={key} onchange={load}>
      {#if !key}<option value="">Wybierz zajęcia…</option>{/if}
      {#each subjects as s (s.key)}<option value={s.key}>{s.name} · {s.code} gr. {s.group}</option>{/each}
    </select>
  </div>

  {#if !subjects.length}
    <p class="hint">W tym planie nie ma zajęć, które dałoby się odrobić w innej grupie.</p>
  {:else if loading}
    <p class="hint">Pobieram terminy wszystkich grup z USOS…</p>
  {:else if err}
    <div class="det-note">{err}</div>
    <button type="button" class="tbtn" style="justify-self:start" onclick={load}>Spróbuj ponownie</button>
  {:else if data && subject}
    <section class="det-sec">
      <h3>Których zajęć dotyczy?</h3>
      <div class="occ">
        {#each mine as m (+m.s.start)}
          <button
            type="button" class="oc" class:past={m.s.end < now} class:cx={!m.n} class:me={+m.s.start === pick} disabled={!m.n}
            title={m.n ? `Termin ${m.n}, ${fmtD(m.s.start)} ${hm(m.s.start)}` : 'Odwołane, nie liczą się do numeracji'} onclick={() => (pick = +m.s.start)}
          >{#if m.n}<i>#{m.n}</i>{/if}{shortDate(m.s.start)}</button>
        {:else}
          <span class="hint">USOS nie zwrócił terminów Twojej grupy.</span>
        {/each}
      </div>
      {#if cur}
        <div class="ver mk-row">
          <span class="ver-t">
            <b><TypeTag code={subject.code} />Twoja grupa {subject.group}{#if myLect}<small>{myLect}</small>{/if}</b>
            <span class="mk-when">{fmtD(cur.s.start)} · {hm(cur.s.start)}–{hm(cur.s.end)}</span>
            <small>Termin {cur.n} z {total}{myShift ? `, liczony jako zajęcia nr ${no}` : ''}</small>
          </span>
          <span class="mk-step">
            <span>
              <button type="button" class="ib muted" aria-label="Wcześniejszy numer zajęć Twojej grupy" disabled={no <= 1} onclick={() => shiftMine(-1)}>−</button>
              <b>nr {no}</b>
              <button type="button" class="ib muted" aria-label="Późniejszy numer zajęć Twojej grupy" onclick={() => shiftMine(1)}>+</button>
            </span>
            <small>{myShift ? `przesunięcie ${myShift > 0 ? '+' : '−'}${Math.abs(myShift)}` : 'bez przesunięcia'}</small>
          </span>
        </div>
      {/if}
    </section>

    {#if cur}
      <section class="det-sec">
        {#if mixed}
          <Switch label="Tylko mój prowadzący" sub="Ukrywa grupy prowadzone przez inne osoby." checked={onlyMine} onchange={setOnlyMine} />
          <h4 class="mk-grp mine">U Twojego prowadzącego</h4>
          <div class="vers">{#each rows.filter((r) => r.same) as r (r.g.group)}{@render rowCard(r)}{/each}</div>
          {#if !onlyMine}
            <h4 class="mk-grp">U innych prowadzących</h4>
            <div class="vers">{#each rows.filter((r) => !r.same) as r (r.g.group)}{@render rowCard(r)}{/each}</div>
          {/if}
        {:else}
          <div class="vers">
            {#each rows as r (r.g.group)}
              {@render rowCard(r)}
            {:else}
              <p class="hint">Ten przedmiot nie ma innych grup z terminami w USOS.</p>
            {/each}
          </div>
        {/if}
        <p class="hint">Zajęcia są liczone po kolei od początku semestru, bez terminów oznaczonych przez Ciebie jako odwołane. Domyślnie widzisz termin o tym samym numerze co u Ciebie. Jeśli inna grupa zaczęła później albo coś jej przepadło, strzałkami ‹ › przy grupie wybierz jej wcześniejszy lub późniejszy termin. Jeśli to Twoja grupa jest przesunięta, popraw swój numer przyciskami − i +. Apka zapamięta to dla każdej grupy.</p>
      </section>
    {/if}
  {:else}
    <p class="hint">Wybierz zajęcia, a apka pobierze z USOS terminy pozostałych grup. Do tego momentu nic nie jest pobierane.</p>
  {/if}

  {#snippet footer()}
    <button class="btn fill" type="button" onclick={closeSheet}>Zamknij</button>
  {/snippet}
</Sheet>
