<script lang="ts">
  import { tick } from 'svelte';
  import { app } from '../lib/app.svelte';
  import { TOUR_STEPS, type TourStep } from '../lib/tour';
  import { endTour } from '../lib/ui.svelte';

  const PAD = 6;
  const GAP = 12;
  const EDGE = 12;

  interface Box { top: number; left: number; width: number; height: number }

  const visible = (s: TourStep) => [...document.querySelectorAll<HTMLElement>(s.target)].filter((el) => el.getClientRects().length);

  const available = () => TOUR_STEPS.filter((s) => visible(s).length);
  let steps = $state.raw(available());
  $effect(() => {
    void app.mobile;
    tick().then(() => (steps = available()));
  });
  let i = $state(0);
  const step = $derived(steps[Math.min(i, steps.length - 1)]);
  const last = $derived(i >= steps.length - 1);

  let box = $state.raw<Box | null>(null);
  let vw = $state(0), vh = $state(0), cardW = $state(0), cardH = $state(0);
  let nextEl = $state<HTMLButtonElement>();

  function measure() {
    if (!step) return void (box = null);
    const els = visible(step), rects = (step.first ? els.slice(0, 1) : els).map((el) => el.getBoundingClientRect());
    if (!rects.length) return void (box = null);
    const left = Math.max(4, Math.min(...rects.map((r) => r.left)) - PAD), top = Math.max(4, Math.min(...rects.map((r) => r.top)) - PAD);
    const right = Math.min(innerWidth - 4, Math.max(...rects.map((r) => r.right)) + PAD), bottom = Math.min(innerHeight - 4, Math.max(...rects.map((r) => r.bottom)) + PAD);
    box = { top, left, width: right - left, height: bottom - top };
  }

  $effect(() => {
    if (!step) return endTour();
    visible(step)[0]?.scrollIntoView({ block: 'center' });
    measure();
    nextEl?.focus();
  });

  const pos = $derived.by(() => {
    if (!box) return { top: Math.max(EDGE, (vh - cardH) / 2), left: Math.max(EDGE, (vw - cardW) / 2) };
    let top = box.top + box.height + GAP;
    if (top + cardH > vh - EDGE) {
      const above = box.top - GAP - cardH;
      top = above >= EDGE ? above : Math.max(EDGE, vh - cardH - EDGE);
    }
    const left = Math.max(EDGE, Math.min(box.left + box.width / 2 - cardW / 2, vw - cardW - EDGE));
    return { top, left };
  });

  const next = () => (last ? endTour() : i++);
  const back = () => (i = Math.max(0, i - 1));
  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') endTour();
    else if (e.key === 'ArrowRight') next();
    else if (e.key === 'ArrowLeft') back();
  }
</script>

<svelte:window bind:innerWidth={vw} bind:innerHeight={vh} onkeydown={onKey} onresize={measure} onscroll={measure} />

{#if step}
  <div class="tour" role="dialog" aria-modal="true" aria-label="Samouczek">
    <div class="tour-block" class:dim={!box}></div>
    {#if box}<div class="tour-spot" style="top:{box.top}px;left:{box.left}px;width:{box.width}px;height:{box.height}px"></div>{/if}
    <div class="tour-card" style="top:{pos.top}px;left:{pos.left}px" bind:clientWidth={cardW} bind:clientHeight={cardH}>
      <div class="tour-n">{i + 1} z {steps.length}</div>
      <h3>{step.title}</h3>
      <p>{(app.mobile && step.mobileText) || step.text}</p>
      <div class="tour-act">
        <button class="btn sp" type="button" onclick={endTour}>Pomiń</button>
        {#if i > 0}<button class="btn" type="button" onclick={back}>Wstecz</button>{/if}
        <button class="btn fill" type="button" bind:this={nextEl} onclick={next}>{last ? 'Gotowe' : 'Dalej'}</button>
      </div>
    </div>
  </div>
{/if}
