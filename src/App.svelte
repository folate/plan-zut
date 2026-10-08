<script lang="ts">
  import { App as NativeApp } from '@capacitor/app';
  import { onMount } from 'svelte';
  import Chips from './components/Chips.svelte';
  import DayStrip from './components/DayStrip.svelte';
  import Icon from './components/Icon.svelte';
  import PreviewBar from './components/PreviewBar.svelte';
  import PullRefresh from './components/PullRefresh.svelte';
  import SheetHost from './components/SheetHost.svelte';
  import Stage from './components/Stage.svelte';
  import Toast from './components/Toast.svelte';
  import TopBar from './components/TopBar.svelte';
  import { app, step } from './lib/app.svelte';
  import { autoSync, boot, closePreview, ensureWeek, retryAfterOutage } from './lib/plans';
  import { isNative } from './lib/platform';
  import Tour from './components/Tour.svelte';
  import { backSheet, closeSheet, endTour, openSheet, startTour, tourSeen, ui } from './lib/ui.svelte';
  import { ensureMeta } from './lib/usos/meta.svelte';

  onMount(boot);

  onMount(() => {
    if (!isNative()) return;
    const l = NativeApp.addListener('backButton', onBack);
    return () => void l.then((h) => h.remove());
  });

  function onBack() {
    if (ui.tour) endTour();
    else if (ui.sheet) ui.stack.length ? backSheet() : closeSheet();
    else if (app.preview) closePreview();
    else NativeApp.minimizeApp();
  }

  $effect(() => {
    ensureMeta([...app.usos, ...app.view.all]);
  });

  $effect(() => {
    const src = app.lazySrc, week = app.week;
    const t = setTimeout(() => void ensureWeek(src, week), 500);
    return () => clearTimeout(t);
  });

  $effect(() => {
    if (ui.tour || ui.sheet || app.viewingPreview || !app.usos.length || tourSeen()) return;
    const t = setTimeout(startTour, 700);
    return () => clearTimeout(t);
  });

  function onVisible() {
    if (document.visibilityState !== 'visible') return;
    retryAfterOutage(['down', 'timeout', 'offline']);
    autoSync();
  }

  function onKey(e: KeyboardEvent) {
    if (ui.tour) return;
    if (ui.sheet) {
      if (e.key === 'Escape') closeSheet();
      return;
    }
    if ((e.target as HTMLElement).closest('input,textarea,select')) return;
    if (e.key === 'ArrowLeft') step(-1);
    if (e.key === 'ArrowRight') step(1);
  }
</script>

<svelte:window ononline={() => retryAfterOutage(['offline', 'down', 'timeout'])} />
<svelte:document
  onkeydown={onKey}
  onvisibilitychange={onVisible}
/>

<div class="wrap">
  <TopBar />
  <DayStrip />
  <Chips />
  <PreviewBar />
  <Stage />
</div>

{#if !app.viewingPreview}
  <button class="fab" type="button" data-tour="add" onclick={() => openSheet({ name: 'event', id: null })}>
    <Icon name="plus" /><span>Wydarzenie</span>
  </button>
{/if}
<SheetHost />
<Toast />
<PullRefresh />
{#if ui.tour}<Tour />{/if}
