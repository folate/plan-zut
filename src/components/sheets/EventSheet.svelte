<script lang="ts">
  import { onMount } from 'svelte';
  import { app } from '../../lib/app.svelte';
  import { DOWS, DOWS_ACC, DPLUR, DSHORT, OWN_COLORS, OWN_KEY, REPEAT } from '../../lib/constants';
  import { addDays, dowOf, fmtLong, fromYmd, monday, ymd } from '../../lib/dates';
  import { daysOf } from '../../lib/events';
  import { ensureProfile, saveCustom } from '../../lib/plans';
  import { setHidden } from '../../lib/settings.svelte';
  import type { CustomEvent, RepeatKind } from '../../lib/types';
  import { closeSheet } from '../../lib/ui.svelte';
  import ConfirmButton from '../ConfirmButton.svelte';
  import DateField from '../DateField.svelte';
  import Icon from '../Icon.svelte';
  import Sheet from '../Sheet.svelte';
  import TimeField from '../TimeField.svelte';

  let { id }: { id: string | null } = $props();

  // svelte-ignore state_referenced_locally
  const ex = id ? app.custom.find((c) => c.id === id) : undefined;
  const shownDay = addDays(app.week, app.selDay);
  const v: Omit<CustomEvent, 'id'> = ex ?? {
    title: '', date: ymd(shownDay < monday(new Date()) ? new Date() : shownDay), from: '12:00', to: '13:00', repeat: 'weekly', until: '', place: '', color: 'o1'
  };

  let title = $state(v.title);
  let date = $state(v.date);
  let repeat = $state<RepeatKind>(v.repeat);
  let from = $state(v.from);
  let to = $state(v.to);
  let days = $state([...daysOf(v)]);
  let touched = !!ex?.days?.length;
  let until = $state(v.until);
  let place = $state(v.place);
  let color = $state(v.color);
  let msg = $state('');
  let titleEl = $state<HTMLInputElement>();

  const weekly = $derived(repeat === 'weekly' || repeat === 'biweekly');

  onMount(() => {
    if (!app.pid) ensureProfile();
    if (!ex) setTimeout(() => titleEl?.focus(), 50);
  });

  function toggleDay(k: number) {
    touched = true;
    if (!days.includes(k)) days = [...days, k];
    else if (days.length > 1) days = days.filter((x) => x !== k);
  }
  function dateChanged() {
    if (date && !touched) days = [dowOf(fromYmd(date))];
  }

  const hint = $derived.by(() => {
    if (!date) return '';
    const dt = fromYmd(date), ds = [...days].sort((a, b) => a - b), names = ds.map((d) => DPLUR[d]);
    const joined = names.length > 1 ? names.slice(0, -1).join(', ') + ' i ' + names[names.length - 1] : names[0];
    const times = ds.length > 1 ? ` (${ds.length}× w tygodniu)` : '';
    return {
      none: `Tylko ${fmtLong(dt)}.`,
      weekly: ds.length > 1 ? `W ${joined}${times}.` : `W ${DOWS_ACC[dowOf(dt)]}.`,
      biweekly: `Co drugi tydzień w ${joined}${times}, licząc od tygodnia z ${fmtLong(dt)}.`,
      weekdays: 'Od poniedziałku do piątku.',
      daily: 'Każdego dnia.'
    }[repeat];
  });

  function save() {
    const n: CustomEvent = {
      id: ex ? ex.id : 'c' + Date.now().toString(36), title: title.trim(), date, from, to, repeat,
      days: weekly ? [...days].sort((a, b) => a - b) : undefined,
      until: repeat === 'none' ? '' : until, place: place.trim(), color
    };
    if (!n.title) return void (msg = 'Podaj nazwę wydarzenia.');
    if (!n.date) return void (msg = 'Wybierz datę.');
    if (!n.from || !n.to || n.to <= n.from) return void (msg = 'Godzina zakończenia musi być późniejsza niż rozpoczęcia.');
    if (n.until && n.until < n.date) return void (msg = 'Koniec powtarzania musi być po pierwszym wystąpieniu.');
    saveCustom(ex ? app.custom.map((c) => (c.id === ex.id ? n : c)) : [...app.custom, n]);
    setHidden(OWN_KEY, false);
    closeSheet();
  }

  function remove() {
    saveCustom(app.custom.filter((c) => c.id !== ex!.id));
    closeSheet();
  }
</script>

<Sheet title={ex ? 'Edytuj wydarzenie' : 'Nowe wydarzenie'} subtitle={ex ? '' : 'Praca, trening, korepetycje'}>
  <div class="fld"><label for="e-title">Nazwa</label><input id="e-title" type="text" maxlength="80" bind:value={title} bind:this={titleEl} /></div>
  <div class="two">
    <div class="fld"><label for="e-date">{repeat === 'none' ? 'Data' : 'Od dnia'}</label><DateField id="e-date" bind:value={date} onchange={dateChanged} /></div>
    <div class="fld">
      <label for="e-repeat">Powtarzanie</label>
      <select id="e-repeat" bind:value={repeat}>
        {#each Object.entries(REPEAT) as [k, n]}<option value={k}>{n}</option>{/each}
      </select>
    </div>
  </div>
  <div class="two">
    <div class="fld"><label for="e-from">Od</label><TimeField id="e-from" bind:value={from} /></div>
    <div class="fld"><label for="e-to">Do</label><TimeField id="e-to" bind:value={to} /></div>
  </div>
  {#if weekly}
    <div class="fld">
      <span class="lbl">W które dni tygodnia</span>
      <div class="dsel" role="group" aria-label="Dni tygodnia">
        {#each DSHORT as n, i}<button type="button" aria-pressed={days.includes(i)} aria-label={DOWS[i]} onclick={() => toggleDay(i)}>{n}</button>{/each}
      </div>
    </div>
  {/if}
  {#if repeat !== 'none'}
    <div class="fld"><label for="e-until">Powtarzaj do (opcjonalnie)</label><DateField id="e-until" clearable placeholder="Bez końca" bind:value={until} /></div>
  {/if}
  <div class="fld"><label for="e-place">Miejsce (opcjonalnie)</label><input id="e-place" type="text" maxlength="60" bind:value={place} /></div>
  <div class="fld">
    <span class="lbl">Kolor</span>
    <div class="sws">
      {#each OWN_COLORS as k, i}
        <button type="button" aria-pressed={k === color} style="--sw:var(--{k})" aria-label="Kolor {i + 1}" onclick={() => (color = k)}><Icon name="check" /></button>
      {/each}
    </div>
  </div>
  <p class="hint">{hint}</p>
  {#if msg}<div class="msg">{msg}</div>{/if}

  {#snippet footer()}
    {#if ex}<ConfirmButton class="btn danger sp" confirm="Na pewno?" onconfirm={remove}>Usuń</ConfirmButton>{/if}
    <button class="btn" type="button" onclick={closeSheet}>Anuluj</button>
    <button class="btn fill" type="button" onclick={save}>{ex ? 'Zapisz' : 'Dodaj'}</button>
  {/snippet}
</Sheet>
