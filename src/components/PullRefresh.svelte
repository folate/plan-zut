<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { sync } from '../lib/plans';
  import { toast, ui } from '../lib/ui.svelte';
  import Icon from './Icon.svelte';

  const THRESHOLD = 64;
  const MAX = 96;

  let startX = 0, startY: number | null = null;
  let pull = $state(0);
  const refreshing = $derived(app.mobile && app.busy);

  function start(e: TouchEvent) {
    if (!app.mobile || ui.sheet || ui.tour || app.busy || scrollY > 0 || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
  }
  function move(e: TouchEvent) {
    if (startY == null) return;
    const dx = Math.abs(e.touches[0].clientX - startX), dy = e.touches[0].clientY - startY;
    if (pull === 0 && (dy <= 0 || dx > dy)) {
      if (dy < 0 || dx > 12) startY = null;
      return;
    }
    pull = Math.max(0, Math.min(MAX, dy * 0.5));
  }
  function end() {
    if (startY == null) return;
    startY = null;
    const go = pull >= THRESHOLD;
    pull = 0;
    if (!go) return;
    if (app.profile && !app.hasSource && !app.viewingPreview) toast('Ten plan jest z pliku, więc nie ma skąd go odświeżyć.');
    else sync().catch(() => {});
  }
</script>

<svelte:document ontouchstart={start} ontouchmove={move} ontouchend={end} ontouchcancel={end} />

<div
  class="ptr" class:on={pull > 0 || refreshing} class:ready={pull >= THRESHOLD} class:spin={refreshing} class:settle={pull === 0}
  style="transform:translate(-50%,{refreshing ? MAX : pull * 1.5}px)" aria-hidden="true"
>
  <span style="transform:rotate({pull * 3}deg)"><Icon name="sync" /></span>
</div>
