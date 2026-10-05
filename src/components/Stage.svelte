<script lang="ts">
  import { app, step } from '../lib/app.svelte';
  import { sameDay } from '../lib/dates';
  import { openSheet, ui } from '../lib/ui.svelte';
  import ConflictBar from './ConflictBar.svelte';
  import DayList from './DayList.svelte';
  import ErrorBar from './ErrorBar.svelte';
  import WeekGrid from './WeekGrid.svelte';

  const empty = $derived(!app.usos.length && !app.custom.length && !app.cmp && !app.viewingPreview);
  const animCls = $derived(app.anim.on ? 'anim' + (app.anim.dir ? ' from-' + app.anim.dir : '') : '');

  function lookUp() {
    if (app.mobile) openSheet({ name: 'searchOverlay' });
    else document.querySelector<HTMLInputElement>('.qs-top .qs-in')?.focus();
  }

  let tx: number | null = null, ty = 0;
  // Nasłuch na całym dokumencie, żeby gest działał też na pustym tle pod zajęciami.
  function touchStart(e: TouchEvent) {
    const t = e.target as HTMLElement;
    const onPlan = t.closest('.stage') || t === document.body || t === document.documentElement || t.classList.contains('wrap');
    if (!onPlan || ui.sheet || ui.tour || e.touches.length !== 1) return;
    tx = e.touches[0].clientX;
    ty = e.touches[0].clientY;
  }
  function touchEnd(e: TouchEvent) {
    if (tx == null) return;
    const t = e.changedTouches[0], dx = t.clientX - tx, dy = t.clientY - ty;
    tx = null;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
  }
</script>

<svelte:document ontouchstart={touchStart} ontouchend={touchEnd} ontouchcancel={() => (tx = null)} />

<div class="stage {empty ? '' : animCls}" class:cmp={app.comparing} class:pv={app.viewingPreview}>
  {#if empty}
    <div class="notice">
      <b>{app.hasSource ? 'Plan jeszcze się nie pobrał' : 'Nie masz jeszcze planu'}</b>
      {app.hasSource ? 'Spróbuj odświeżyć albo sprawdź źródło planu.' : 'Dodaj swój plan z USOS albo zajrzyj w plan przedmiotu, grupy lub prowadzącego.'}
      <br />
      <button class="tbtn on" type="button" onclick={() => openSheet({ name: 'source', target: app.pid })}>Dodaj plan</button>
      <button class="tbtn" type="button" onclick={lookUp}>Szukaj planu</button>
    </div>
  {:else}
    {#if !app.viewingPreview}
      <ErrorBar />
      <ConflictBar />
    {/if}
    {#key app.anim.key}
      {#if !app.mobile}
        <WeekGrid />
      {:else if app.comparing && app.view.days[app.selDay]?.list.length}
        <WeekGrid day={app.selDay} />
      {:else}
        <div class="week" style="--n:{app.view.nDays}">
          {#each app.view.days as day, i (i)}
            <section class="day" class:today={sameDay(day.date, app.now)} class:sel={i === app.selDay}>
              <div class="list"><DayList list={day.list} /></div>
            </section>
          {/each}
        </div>
      {/if}
    {/key}
  {/if}
</div>
