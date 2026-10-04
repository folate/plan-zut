<script lang="ts">
  import { cap, hm, plural, weekdayShort } from '../lib/dates';
  import { msgOf } from '../lib/net';
  import { openPreview } from '../lib/plans';
  import { loadGroupMeta, metaFor, shortName } from '../lib/usos/meta.svelte';
  import { discoverGroups, suggest, usosTime, type SearchItem } from '../lib/usos/plans';
  import { hasKey } from '../lib/usos/session.svelte';
  import { MODE_NAME, studyInfo } from '../lib/usos/util';
  import Icon from './Icon.svelte';
  import TypeTag from './TypeTag.svelte';

  let { class: cls = '', autofocus = false, inline = false, ondone }: { class?: string; autofocus?: boolean; inline?: boolean; ondone?: () => void } = $props();
  const listId = $props.id();

  let host: HTMLDivElement, input: HTMLInputElement;
  let q = $state('');
  let open = $state(false);
  let items = $state.raw<SearchItem[]>([]);
  let active = $state(-1);
  let loading = $state(false);
  let err = $state('');
  let empty = $state(false);
  let header = $state('');
  let status = $state<{ text: string; err?: boolean } | null>(null);

  const keyHint = $derived(!hasKey() && q.trim().length >= 3 && !loading);
  const hasContent = $derived(!!status || items.length > 0 || loading || !!err || empty || keyHint);

  function paint(list: SearchItem[], o: { loading?: boolean; err?: string; empty?: boolean; header?: string } = {}) {
    items = list;
    active = -1;
    loading = !!o.loading;
    err = o.err || '';
    empty = !!o.empty && !list.length;
    header = o.header || '';
    status = null;
    open = true;
  }

  const WAIT = 1200;
  let token = 0, timer: ReturnType<typeof setTimeout> | undefined;
  let shownFor = '';

  async function run() {
    clearTimeout(timer);
    const my = ++token, text = q;
    const long = text.trim().length >= 3;
    if (long) paint([], { loading: true });
    const r = await suggest(text);
    if (my !== token) return;
    paint(r.items, { err: r.err, empty: long });
    shownFor = text.trim();
  }
  function onInput() {
    clearTimeout(timer);
    token++;
    if (q.trim().length >= 3) paint([], { loading: true });
    timer = setTimeout(run, WAIT);
  }

  async function pick(i: number) {
    let it = items[i];
    if (!it) return;
    token++;
    if (it.kind === 'course' && !it.groups && !it.all) {
      status = { text: `Szukam grup: ${it.name}…` };
      try {
        const d = await discoverGroups(it.id!);
        if (!d) throw new Error('Ten przedmiot nie ma zajęć w bieżącym semestrze.');
        await loadGroupMeta(d.groups).catch(() => {});
        it = { ...it, section: undefined, course: it.name };
        const list: SearchItem[] = [{ ...it, all: true, name: 'Cały przedmiot', sub: `${d.groups.length} ${plural(d.groups.length, 'grupa', 'grupy', 'grup')} · ${it.name}` }];
        for (const g of d.groups) {
          const dt = g.first ? usosTime(g.first.start_time) : null, m = metaFor(g.unit_id, g.group_number);
          list.push({
            ...it,
            groups: [{ unit_id: g.unit_id, group_number: g.group_number }],
            name: `Grupa ${g.group_number}${g.ct ? ' · ' + g.ct : ''}`,
            sub: [
              dt ? `${cap(weekdayShort(dt))} ${hm(dt)}` : 'brak terminów',
              g.first?.room_number ? 's. ' + g.first.room_number : '',
              m?.l.length ? m.l.map((x) => shortName(x.n)).join(', ') : ''
            ].filter(Boolean).join(' · ')
          });
        }
        paint(list, { header: `${it.name}: wybierz grupę` });
      } catch (e) {
        status = { text: msgOf(e), err: true };
      }
      return;
    }
    status = { text: `Wczytuję plan: ${it.name}…` };
    try {
      await openPreview(it);
      open = false;
      q = '';
      input.blur();
      ondone?.();
    } catch (e) {
      status = { text: msgOf(e), err: true };
    }
  }

  function onKey(e: KeyboardEvent) {
    const n = items.length;
    if (e.key === 'ArrowDown' && n) { e.preventDefault(); active = (active + 1) % n; }
    else if (e.key === 'ArrowUp' && n) { e.preventDefault(); active = (active - 1 + n) % n; }
    else if (e.key === 'Enter') {
      e.preventDefault();
      if (q.trim() !== shownFor) run();
      else pick(active < 0 ? 0 : active);
    }
    else if (e.key === 'Escape') open = false;
  }
  function onFocus() {
    if (q.trim() === shownFor && (items.length || status)) open = true;
    else run();
  }
  function onBlur() {
    if (inline) return;
    setTimeout(() => {
      if (!host?.contains(document.activeElement)) open = false;
    }, 150);
  }

  $effect(() => {
    if (autofocus) setTimeout(() => input?.focus(), 60);
  });
</script>

<div class="qs {cls}" bind:this={host}>
  <div class="qs-box">
    <Icon name="search" />
    <input
      type="search" class="qs-in" placeholder="Szukaj przedmiotu lub prowadzącego" autocomplete="off"
      role="combobox" aria-label="Szukaj planu przedmiotu lub prowadzącego" aria-autocomplete="list" aria-controls={listId} aria-expanded={open && hasContent}
      bind:this={input} bind:value={q} oninput={onInput} onfocus={onFocus} onkeydown={onKey} onblur={onBlur}
    />
  </div>
  {#if open && hasContent}
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="qs-drop" id={listId} role="listbox" tabindex="-1" onmousedown={(e) => e.preventDefault()}>
      {#if status}
        <div class="qs-msg" class:err={status.err}>{#if !status.err}<span class="spinner"></span>{/if}{status.text}</div>
      {:else}
        {#if header}<div class="qs-msg small top">{header}</div>{/if}
        {#each items as it, i}
          {#if it.section && it.section !== items[i - 1]?.section}<div class="qs-grp" role="presentation">{it.section}</div>{/if}
          {@const study = it.kind === 'course' && !it.course ? studyInfo(it.id) : null}
          {@const sub = [study?.label, it.sub].filter(Boolean).join(' · ')}
          <button type="button" class="qs-it" class:act={i === active} role="option" aria-selected={i === active} onclick={() => pick(i)}>
            <span class="qs-ic"><Icon name={it.kind === 'staff' ? 'person' : it.recent ? 'history' : 'book'} /></span>
            <span class="qs-t">
              <b title={it.name}>{it.name}</b>
              <small title={sub}>{#if study?.mode}<i class="mode {study.mode}">{MODE_NAME[study.mode]}</i>{/if}{sub}</small>
            </span>
            {#if it.kind === 'course' && it.code}<TypeTag code={it.code} />{/if}
          </button>
        {/each}
        {#if loading}<div class="qs-msg"><span class="spinner"></span>Szukam…</div>{/if}
        {#if err}<div class="qs-msg err">{err}</div>{/if}
        {#if empty && !loading && !err}<div class="qs-msg">Nic nie znaleziono.</div>{/if}
        {#if keyHint}<div class="qs-msg small">Prowadzących wyszukasz po linku z USOSweb albo numerze. Wyszukiwanie po nazwisku wymaga klucza API (Ustawienia).</div>{/if}
      {/if}
    </div>
  {/if}
</div>
