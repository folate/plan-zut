<script lang="ts">
  import { app } from '../../lib/app.svelte';
  import { DOWS, shortB } from '../../lib/constants';
  import { cap, dowOf, fmtDay, fmtLong, hm, ymd } from '../../lib/dates';
  import { applyOv } from '../../lib/events';
  import { saveOverrides } from '../../lib/plans';
  import type { Override } from '../../lib/types';
  import { closeSheet } from '../../lib/ui.svelte';
  import ConfirmButton from '../ConfirmButton.svelte';
  import Sheet from '../Sheet.svelte';
  import TypeTag from '../TypeTag.svelte';

  let { uid }: { uid: string } = $props();

  // svelte-ignore state_referenced_locally
  const base = app.usos.find((e) => e.uid === uid);
  const cur = base && applyOv(base, app.ov);
  // svelte-ignore state_referenced_locally
  const series = (base && app.ov.series[base.skey]) || {}, single = app.ov.single[uid] || {};
  const hasSeries = Object.keys(series).length > 0, hasSingle = Object.keys(single).length > 0;

  let scope = $state<'one' | 'all'>(hasSeries && !hasSingle ? 'all' : 'one');
  let date = $state(cur ? ymd(cur.start) : '');
  let dow = $state(series.dow != null ? String(series.dow) : '');
  let from = $state(cur ? hm(cur.start) : '');
  let to = $state(cur ? hm(cur.end) : '');
  let room = $state(cur?.room ?? '');
  let building = $state(cur?.building ?? '');
  let note = $state(cur?.note ?? '');
  let cancelled = $state(!!single.cancelled);
  let msg = $state('');

  function save() {
    if (!base) return;
    if (!from || !to || to <= from) return void (msg = 'Godzina zakończenia musi być późniejsza niż rozpoczęcia.');
    const n: Override = {};
    if (from !== hm(base.start) || to !== hm(base.end)) { n.from = from; n.to = to; }
    if (room.trim() && room.trim() !== base.room) n.room = room.trim();
    if (building.trim() && building.trim() !== base.building) n.building = building.trim();
    if (note.trim()) n.note = note.trim();
    const ov = { single: { ...app.ov.single }, series: { ...app.ov.series } };
    if (scope === 'one') {
      if (!date) return void (msg = 'Wybierz datę.');
      if (date !== ymd(base.start)) n.date = date;
      if (cancelled) n.cancelled = true;
      if (Object.keys(n).length) ov.single[uid] = n;
      else delete ov.single[uid];
    } else {
      if (dow !== '' && +dow !== dowOf(base.start)) n.dow = +dow;
      if (Object.keys(n).length) ov.series[base.skey] = n;
      else delete ov.series[base.skey];
    }
    saveOverrides(ov);
    closeSheet();
  }

  function reset() {
    if (!base) return;
    const ov = { single: { ...app.ov.single }, series: { ...app.ov.series } };
    delete ov.single[uid];
    delete ov.series[base.skey];
    saveOverrides(ov);
    closeSheet();
  }
</script>

{#if base}
  <Sheet title={base.name}>
    {#snippet sub()}
      <TypeTag code={base.code} />{#if base.group}<span>grupa {base.group}</span>{/if}
    {/snippet}

    <div class="orig">
      <b>W USOS</b>{cap(fmtDay(base.start))}, {hm(base.start)}–{hm(base.end)}{base.room ? ` · sala ${base.room}` : ''}{base.building ? ` · ${shortB(base.building)}` : ''}
    </div>
    <div class="radios" role="radiogroup" aria-label="Zakres zmiany">
      <label><input type="radio" value="one" bind:group={scope} /><span>Tylko {fmtLong(base.start)}<small>Jednorazowe przeniesienie lub odwołanie</small></span></label>
      <label><input type="radio" value="all" bind:group={scope} /><span>Wszystkie zajęcia tej grupy<small>Stała zmiana sali, godziny albo dnia</small></span></label>
    </div>
    {#if scope === 'one'}
      <div class="fld"><label for="c-date">Data</label><input id="c-date" type="date" bind:value={date} /></div>
    {:else}
      <div class="fld">
        <label for="c-dow">Dzień tygodnia</label>
        <select id="c-dow" bind:value={dow}>
          <option value="">Bez zmian</option>
          {#each DOWS as d, i}<option value={String(i)}>{d}</option>{/each}
        </select>
      </div>
    {/if}
    <div class="two">
      <div class="fld"><label for="c-from">Od</label><input id="c-from" type="time" bind:value={from} /></div>
      <div class="fld"><label for="c-to">Do</label><input id="c-to" type="time" bind:value={to} /></div>
    </div>
    <div class="two">
      <div class="fld"><label for="c-room">Sala</label><input id="c-room" type="text" maxlength="30" bind:value={room} /></div>
      <div class="fld">
        <label for="c-bld">Budynek</label><input id="c-bld" type="text" maxlength="60" list="bld-list" bind:value={building} />
        <datalist id="bld-list">{#each app.bColors.keys() as b}<option value={b}></option>{/each}</datalist>
      </div>
    </div>
    <div class="fld"><label for="c-note">Notatka</label><input id="c-note" type="text" maxlength="80" placeholder="np. ustalone na zajęciach 30.09" bind:value={note} /></div>
    {#if scope === 'one'}
      <label class="switch">Zajęcia odwołane<input type="checkbox" role="switch" bind:checked={cancelled} /></label>
    {/if}
    {#if msg}<div class="msg">{msg}</div>{/if}

    {#snippet footer()}
      {#if hasSeries || hasSingle}<ConfirmButton class="btn danger sp" confirm="Na pewno?" onconfirm={reset}>Przywróć z USOS</ConfirmButton>{/if}
      <button class="btn" type="button" onclick={closeSheet}>Anuluj</button>
      <button class="btn fill" type="button" onclick={save}>Zapisz</button>
    {/snippet}
  </Sheet>
{/if}
