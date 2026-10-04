<script lang="ts">
  import { animate, app, selectDay } from '../lib/app.svelte';
  import { OWN_KEY, typeOf } from '../lib/constants';
  import { addDays, fmtFull, sameDay, weekdayShort } from '../lib/dates';
  import { act } from '../lib/events';
  import type { ViewEvent } from '../lib/types';
  import Icon from './Icon.svelte';

  function shiftWeek(d: 1 | -1) {
    app.week = addDays(app.week, d * 7);
    animate(d > 0 ? 'r' : 'l');
  }
  const dot = (e: ViewEvent) => (e.code === OWN_KEY ? `var(--${e.color})` : `var(--${typeOf(e.code).k}-fg)`);

  let lastWeek = +app.week;
  let weekDir = $state('');
  $effect.pre(() => {
    const w = +app.week;
    if (w === lastWeek) return;
    weekDir = w > lastWeek ? 'from-r' : 'from-l';
    lastWeek = w;
  });

  const SWIPE = 48;
  let startX: number | null = null, startY = 0;
  let drag = $state(0);
  function touchStart(e: TouchEvent) {
    if (e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }
  function touchMove(e: TouchEvent) {
    if (startX == null) return;
    const dx = e.touches[0].clientX - startX, dy = e.touches[0].clientY - startY;
    if (drag === 0 && Math.abs(dx) < Math.max(8, Math.abs(dy))) return;
    drag = dx;
  }
  function touchEnd() {
    if (startX == null) return;
    startX = null;
    const dx = drag;
    drag = 0;
    if (Math.abs(dx) >= SWIPE) shiftWeek(dx < 0 ? 1 : -1);
  }
</script>

<div
  class="days {weekDir}" class:dragging={drag !== 0} data-tour="nav" role="group" aria-label="Dni tygodnia"
  style="--n:{app.view.nDays};--drag:{drag * 0.6}px" ontouchstart={touchStart} ontouchmove={touchMove} ontouchend={touchEnd} ontouchcancel={touchEnd}
>
  <button type="button" class="wk-nav" aria-label="Poprzedni tydzień" onclick={() => shiftWeek(-1)}><Icon name="chev" /></button>
  {#key +app.week}
    {#each app.view.days as day, i (i)}
      <button type="button" class="dbtn" class:today={sameDay(day.date, app.now)} aria-pressed={i === app.selDay} aria-label={fmtFull(day.date)} onclick={() => selectDay(i)}>
        <span class="w">{weekdayShort(day.date)}</span>
        <span class="d">{day.date.getDate()}</span>
        <span class="k">
          {#each day.list.filter((e) => act(e) && e.who === 'a').slice(0, 4) as e}<i style="--kc:{dot(e)}"></i>{/each}
        </span>
      </button>
    {/each}
  {/key}
  <button type="button" class="wk-nav nx" aria-label="Następny tydzień" onclick={() => shiftWeek(1)}><Icon name="chev" /></button>
</div>
