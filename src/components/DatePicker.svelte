<script lang="ts">
  import { DOWS } from '../lib/constants';
  import { addDays, cap, dowOf, fmtDay, fromYmd, ymd } from '../lib/dates';
  import Icon from './Icon.svelte';

  let { value, clearable = false, title = 'Wybierz datę', onpick, onclose }: { value: string; clearable?: boolean; title?: string; onpick: (v: string) => void; onclose: () => void } = $props();

  const today = ymd(new Date());
  // svelte-ignore state_referenced_locally
  let sel = $state(value);
  // svelte-ignore state_referenced_locally
  const start = fromYmd(value || today);
  let year = $state(start.getFullYear()), month = $state(start.getMonth());
  let years = $state(false);

  const first = $derived(new Date(year, month, 1));
  const cells = $derived([
    ...Array<null>(dowOf(first)).fill(null),
    ...Array.from({ length: new Date(year, month + 1, 0).getDate() }, (_, i) => ymd(new Date(year, month, i + 1)))
  ]);
  const label = $derived(cap(first.toLocaleDateString('pl-PL', { month: 'long', year: 'numeric' })));
  const yearList = Array.from({ length: 21 }, (_, i) => start.getFullYear() - 10 + i);

  function show(d: Date) {
    year = d.getFullYear();
    month = d.getMonth();
  }
  function move(n: number) {
    show(new Date(year, month + n, 1));
  }
  function key(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'Escape') return onclose();
    const n = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
    if (!n || years) return;
    e.preventDefault();
    const d = addDays(fromYmd(sel || today), n);
    sel = ymd(d);
    show(d);
  }
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    node.querySelector<HTMLElement>('.dp')?.focus();
    return { destroy: () => node.remove() };
  }
  const scrollTo = (node: HTMLElement) => node.scrollIntoView({ block: 'center' });
</script>

<div use:portal>
  <div class="dp-scrim" role="presentation" onclick={onclose}></div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="dp" role="dialog" aria-modal="true" aria-label={title} tabindex="-1" onkeydown={key}>
    <div class="dp-head">
      <span>{title}</span>
      <b>{sel ? cap(fmtDay(fromYmd(sel))) : 'Brak daty'}</b>
    </div>
    <div class="dp-nav">
      <button type="button" class="dp-my" class:open={years} aria-expanded={years} onclick={() => (years = !years)}>{label}<Icon name="chev" /></button>
      {#if !years}
        <button type="button" class="ib muted" aria-label="Poprzedni miesiąc" onclick={() => move(-1)}><Icon name="prev" /></button>
        <button type="button" class="ib muted" aria-label="Następny miesiąc" onclick={() => move(1)}><Icon name="next" /></button>
      {/if}
    </div>
    {#if years}
      <div class="dp-years">
        {#each yearList as y}
          {#if y === year}
            <button type="button" aria-pressed="true" use:scrollTo onclick={() => (years = false)}>{y}</button>
          {:else}
            <button type="button" aria-pressed="false" onclick={() => { year = y; years = false; }}>{y}</button>
          {/if}
        {/each}
      </div>
    {:else}
      <div class="dp-grid">
        {#each DOWS as d}<span class="dp-dow" title={d}>{d[0].toUpperCase()}</span>{/each}
        {#each cells as c}
          {#if c}
            <button type="button" class:today={c === today} aria-pressed={c === sel} aria-label={fmtDay(fromYmd(c))} onclick={() => (sel = c)}>{+c.slice(8)}</button>
          {:else}<span></span>{/if}
        {/each}
      </div>
    {/if}
    <div class="dp-act">
      {#if clearable}<button type="button" class="btn sp" onclick={() => onpick('')}>Wyczyść</button>{/if}
      <button type="button" class="btn" onclick={onclose}>Anuluj</button>
      <button type="button" class="btn" disabled={!sel} onclick={() => onpick(sel)}>OK</button>
    </div>
  </div>
</div>
