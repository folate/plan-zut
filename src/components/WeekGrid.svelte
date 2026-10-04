<script lang="ts">
  import { app, gapOpts, prof } from '../lib/app.svelte';
  import { shortB } from '../lib/constants';
  import { cap, dur, hm, mins, pad, sameDay, weekdayLong, weekdayShort } from '../lib/dates';
  import { act, freeGaps, shown } from '../lib/events';
  import { settings } from '../lib/settings.svelte';
  import type { Gap, ViewEvent } from '../lib/types';
  import Avatar from './Avatar.svelte';
  import GridBlock from './GridBlock.svelte';

  let { day }: { day?: number } = $props();

  const PX = 1.45;
  const TOP = 10;
  const TINY_GAP = 20;

  const v = $derived(app.view);
  const cmp = $derived(app.comparing);
  const peer = $derived(app.cmp ? prof(app.cmp) : undefined);
  const single = $derived(day != null);
  const days = $derived(day != null ? v.days.slice(day, day + 1) : v.days);
  const events = $derived(day != null ? (days[0]?.list ?? []) : v.wk);

  const range = $derived.by(() => {
    let lo = single ? 1440 : settings.gridRange.from * 60, hi = single ? 0 : settings.gridRange.to * 60;
    if (events.length) {
      lo = Math.min(lo, Math.floor(Math.min(...events.map((e) => mins(e.start))) / 60) * 60);
      hi = Math.max(hi, Math.ceil(Math.max(...events.map((e) => mins(e.end) || 1440)) / 60) * 60);
    }
    return hi > lo ? { lo, hi } : { lo: 8 * 60, hi: 16 * 60 };
  });
  const height = $derived((range.hi - range.lo) * PX + TOP * 2);
  const y = (m: number) => (m - range.lo) * PX + TOP;
  const hours = $derived(Array.from({ length: (range.hi - range.lo) / 60 + 1 }, (_, i) => range.lo + i * 60));

  const nowMin = $derived(mins(app.now));
  const nowVisible = $derived(days.some((d) => sameDay(d.date, app.now)) && nowMin >= range.lo && nowMin <= range.hi);

  const cols = $derived.by(() => {
    let k = 0;
    return days.map((d, i) => {
      const isToday = sameDay(d.date, app.now), first = k;
      k += d.list.length;
      return {
        ...d, isToday, first, weekend: (day ?? i) >= 5,
        next: isToday ? d.list.find((e) => act(e) && e.who === 'a' && e.start > app.now) : undefined,
        gaps: freeGaps(d.list, cmp ? act : shown, gapOpts())
      };
    });
  });

  function daySummary(list: ViewEvent[]) {
    if (peer) {
      const free = freeGaps(list, act, gapOpts()).filter((g) => g.min >= 30).reduce((s, g) => s + g.min, 0);
      return free ? `razem wolne ${dur(free)}` : '';
    }
    const L = list.filter((e) => e.src === 'usos' && act(e));
    return L.length ? `${L.length} · ${dur(Math.round(L.reduce((s, e) => s + (+e.end - +e.start) / 6e4, 0)))}` : 'wolne';
  }

  const MIN_BLOCK = 20;
  const endMin = (e: ViewEvent) => mins(e.end) || 1440;
  const blockTop = (e: ViewEvent) => y(mins(e.start)) + 1;
  const blockHeight = (e: ViewEvent) => Math.max((endMin(e) - mins(e.start)) * PX - 3, MIN_BLOCK);

  function gapSpan(g: Gap, list: ViewEvent[]) {
    const above = list.filter((e) => e.end <= g.from).map((e) => blockTop(e) + blockHeight(e) + 2);
    const top = Math.max(y(mins(g.from)), ...above);
    return { top, height: Math.max(y(mins(g.to)) - top, 0) };
  }

  const gapLabel = (g: Gap) => (cmp ? `Oboje wolni · ${dur(g.min)}` : (g.min >= 90 ? 'Okienko ' : 'Przerwa ') + dur(g.min));
  const gapTitle = (g: Gap) => gapLabel(g) + (g.move ? ' · przejście do ' + shortB(g.move) : '') + (cmp ? ` (${hm(g.from)}–${hm(g.to)})` : '');

  let colEls: HTMLDivElement[] = [];
  $effect(() => {
    const el = app.flash && !single && colEls[app.flash.day];
    if (!el) return;
    el.classList.remove('flash');
    void el.offsetWidth;
    el.classList.add('flash');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
</script>

<div class="tg" class:single style="--n:{days.length};--hour:{60 * PX}px;--top:{TOP}px">
  <div class="tg-c">
    {#if peer && !single}<span class="tg-who"><Avatar p={app.profile} size="sm" /><Avatar p={peer} size="sm" /></span>{/if}
  </div>
  {#if single}
    <div class="tg-h duo">
      <span class="who"><Avatar p={app.profile} size="xs" /><span>{app.profile?.name}</span></span>
      <span class="who"><Avatar p={peer} size="xs" /><span>{peer?.name}</span></span>
    </div>
  {:else}
    {#each cols as c (+c.date)}
      {@const sum = daySummary(c.list)}
      <div class="tg-h" class:today={c.isToday} class:we={c.weekend}>
        <div class="tg-hi">
          <span class="wd"><span class="full">{cap(weekdayLong(c.date))}</span><span class="short">{cap(weekdayShort(c.date))}</span></span><span class="dt">{c.date.getDate()}</span>
          {#if sum}<span class="sum">{sum}</span>{/if}
        </div>
      </div>
    {/each}
  {/if}

  <div class="tg-ax" style="height:{height}px">
    {#each hours as m (m)}
      {#if !nowVisible || Math.abs(m - nowMin) >= 12}<span style="top:{y(m)}px">{pad(m / 60)}:00</span>{/if}
    {/each}
    {#if nowVisible}<span class="tg-nowlbl" style="top:{y(nowMin)}px">{hm(app.now)}</span>{/if}
  </div>
  {#each cols as c, i (+c.date)}
    <div class="tg-col" class:today={c.isToday} class:we={c.weekend} class:split={!!peer} style="height:{height}px" bind:this={colEls[i]}>
      {#each c.list as e, j}
        <GridBlock {e} i={c.first + j} isNext={e === c.next} top={blockTop(e)} height={blockHeight(e)} />
      {/each}
      {#each c.gaps as g}
        {@const span = gapSpan(g, c.list)}
        {@const to = g.move ? ` → ${shortB(g.move)}` : ''}
        {#if span.height < TINY_GAP}
          <div class="tg-gap tiny" class:move={!!g.move} class:tight={g.tight} class:both={cmp} style="top:{span.top + span.height / 2}px" title={gapTitle(g)}>
            <span>{dur(g.min)}{to}</span>
          </div>
        {:else}
          <div
            class="tg-gap" class:long={g.min >= 90 || (cmp && g.min >= 30)} class:move={!!g.move} class:tight={g.tight} class:both={cmp}
            style="top:{span.top + 3}px;height:{span.height - 6}px" title={gapTitle(g)}
          >
            <span class="full">{g.tight ? `Tylko ${dur(g.min)} na przejście` : gapLabel(g)}{to}</span>
            <span class="short">{dur(g.min)}{to}</span>
          </div>
        {/if}
      {/each}
      {#if c.isToday && nowVisible}<div class="tg-now" style="top:{y(nowMin)}px"></div>{/if}
    </div>
  {/each}
</div>
