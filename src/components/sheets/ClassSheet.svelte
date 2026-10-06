<script lang="ts">
  import { app } from '../../lib/app.svelte';
  import { DOWS, DPLUR, shortB } from '../../lib/constants';
  import { cap, dowOf, fmtDay, fmtLong, fmtShort, hm, plural, ymd } from '../../lib/dates';
  import { applyOv, cancelledByRule, cancelRules, ruleHits } from '../../lib/events';
  import { saveOverrides } from '../../lib/plans';
  import type { CancelRule, Override } from '../../lib/types';
  import { closeSheet } from '../../lib/ui.svelte';
  import ConfirmButton from '../ConfirmButton.svelte';
  import DateField from '../DateField.svelte';
  import Icon from '../Icon.svelte';
  import Sheet from '../Sheet.svelte';
  import TimeField from '../TimeField.svelte';
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
  // svelte-ignore state_referenced_locally
  const byRule = !!base && cancelledByRule(base, app.ov);
  let cancelled = $state(!!cur?.cancelled);
  let allCancelled = $state(!!series.cancelled);
  const blank = () => ({ dow: '', every: '1', from: '', to: '' });
  let rules = $state(
    series.cancelled
      ? cancelRules(series).map((r) => ({ dow: r.dow != null ? String(r.dow) : '', every: String(r.every ?? 1), from: r.from ?? '', to: r.to ?? '' }))
      : [blank()]
  );
  // svelte-ignore state_referenced_locally
  const seriesDates = app.usos.filter((e) => e.skey === base?.skey).map((e) => e.start).sort((a, b) => +a - +b);
  const seriesDows = [...new Set(seriesDates.map(dowOf))].sort();

  // "co N tygodni" liczymy od pierwszych zajęć pasujących do reguły
  function toRule(r: ReturnType<typeof blank>): CancelRule {
    const n: CancelRule = {};
    if (r.dow !== '') n.dow = +r.dow;
    if (r.from) n.from = r.from;
    if (r.to) n.to = r.to;
    if (+r.every > 1) {
      const first = seriesDates.find((d) => ruleHits(d, n));
      n.every = +r.every;
      if (first) n.anchor = ymd(first);
    }
    return n;
  }
  const previews = $derived(
    rules.map((r) => {
      const n = toRule(r), hit = n.every && !n.anchor ? [] : seriesDates.filter((d) => ruleHits(d, n));
      if (!hit.length) return 'Żadne zajęcia nie pasują do tej reguły.';
      return `${hit.length} ${plural(hit.length, 'termin', 'terminy', 'terminów')}: ${hit.slice(0, 4).map(fmtShort).join(', ')}${hit.length > 4 ? '…' : ''}`;
    })
  );
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
      if (cancelled !== byRule) n.cancelled = cancelled;
      if (Object.keys(n).length) ov.single[uid] = n;
      else delete ov.single[uid];
    } else {
      if (dow !== '' && +dow !== dowOf(base.start)) n.dow = +dow;
      if (allCancelled) {
        if (rules.some((r) => r.from && r.to && r.to < r.from)) return void (msg = 'Koniec odwołania musi być po jego początku.');
        n.cancelled = true;
        n.cRules = rules.map(toRule);
      }
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
      <label><input type="radio" value="all" bind:group={scope} /><span>Wszystkie zajęcia tej grupy<small>Stała zmiana sali, godziny albo dnia, odwołanie na dłużej</small></span></label>
    </div>
    {#if scope === 'one'}
      <div class="fld"><label for="c-date">Data</label><DateField id="c-date" bind:value={date} /></div>
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
      <div class="fld"><label for="c-from">Od</label><TimeField id="c-from" bind:value={from} /></div>
      <div class="fld"><label for="c-to">Do</label><TimeField id="c-to" bind:value={to} /></div>
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
      {#if byRule}<p class="hint">Ten termin odwołuje reguła ustawiona dla całej grupy. Wyłącz, jeśli te jedne zajęcia jednak się odbywają.</p>{/if}
    {:else}
      <label class="switch">Zajęcia odwołane<input type="checkbox" role="switch" bind:checked={allCancelled} /></label>
      {#if allCancelled}
        {#each rules as r, i}
          <div class="rule">
            {#if rules.length > 1}
              <div class="rule-h">Reguła {i + 1}<button type="button" class="ib muted" aria-label="Usuń regułę {i + 1}" onclick={() => (rules = rules.filter((x) => x !== r))}><Icon name="x" /></button></div>
            {/if}
            <div class="two">
              {#if seriesDows.length > 1}
                <div class="fld">
                  <label for="c-cdow{i}">W które dni</label>
                  <select id="c-cdow{i}" bind:value={r.dow}>
                    <option value="">We wszystkie</option>
                    {#each seriesDows as d}<option value={String(d)}>{cap(DPLUR[d])}</option>{/each}
                  </select>
                </div>
              {/if}
              <div class="fld">
                <label for="c-cev{i}">Jak często</label>
                <select id="c-cev{i}" bind:value={r.every}>
                  <option value="1">Co tydzień</option>
                  <option value="2">Co 2 tygodnie</option>
                  <option value="3">Co 3 tygodnie</option>
                  <option value="4">Co 4 tygodnie</option>
                </select>
              </div>
            </div>
            <div class="two">
              <div class="fld"><label for="c-cfrom{i}">Od dnia</label><DateField id="c-cfrom{i}" clearable placeholder="Dowolnie" bind:value={r.from} /></div>
              <div class="fld"><label for="c-cto{i}">Do dnia</label><DateField id="c-cto{i}" clearable placeholder="Dowolnie" bind:value={r.to} /></div>
            </div>
            <p class="hint">{previews[i]}</p>
          </div>
        {/each}
        <button type="button" class="btn add" onclick={() => (rules = [...rules, blank()])}><Icon name="plus" />Dodaj kolejną regułę</button>
        <p class="hint">Puste daty oznaczają cały semestr. Co kilka tygodni liczy się od pierwszych pasujących zajęć, więc początek ustawisz polem „Od dnia”. Liczy się termin z USOS, nie przeniesiony przez Ciebie.</p>
      {/if}
    {/if}
    {#if msg}<div class="msg">{msg}</div>{/if}

    {#snippet footer()}
      {#if hasSeries || hasSingle}<ConfirmButton class="btn danger sp" confirm="Na pewno?" onconfirm={reset}>Przywróć z USOS</ConfirmButton>{/if}
      <button class="btn" type="button" onclick={closeSheet}>Anuluj</button>
      <button class="btn fill" type="button" onclick={save}>Zapisz</button>
    {/snippet}
  </Sheet>
{/if}
