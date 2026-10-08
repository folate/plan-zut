<script lang="ts">
  import { app, prof } from '../lib/app.svelte';
  import { changeLine } from '../lib/changes';
  import { REPEAT, pcolor, shortB, typeOf, typeStyle } from '../lib/constants';
  import { dur, fmtDay, hm, minsBetween } from '../lib/dates';
  import { act } from '../lib/events';
  import type { ViewEvent } from '../lib/types';
  import { openSheet } from '../lib/ui.svelte';
  import { lectLabel } from '../lib/usos/meta.svelte';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

  let { e, top, height, i, isNext }: { e: ViewEvent; top: number; height: number; i: number; isNext: boolean } = $props();

  const now = $derived(app.now);
  const live = $derived(act(e) && e.start <= now && e.end > now);
  const past = $derived(e.end <= now);
  const pct = $derived(live ? Math.round(((+now - +e.start) / (+e.end - +e.start)) * 100) : 0);
  const soon = $derived(isNext ? minsBetween(now, e.start) : null);
  const hasState = $derived(live || (soon != null && soon <= 120));
  const tm = $derived(`${hm(e.start)}–${hm(e.end)}`);

  const pos = $derived.by(() => {
    const cmp = app.comparing;
    const base = cmp && e.who === 'b' ? 50 : 0, w = (cmp ? 50 : 100) / e.lanes;
    return `top:${top}px;height:${height}px;left:calc(${base + e.lane * w}% + ${e.lane || base ? 3 : 6}px);width:calc(${w}% - ${cmp || e.lanes > 1 ? 9 : 12}px);--i:${i}`;
  });
  const cls = $derived(`bk${past ? ' past' : ''}${live ? ' now' : ''}${e.clash ? ' clash' : ''}${e.off ? ' off' : ''}`);

  const t = $derived(typeOf(e.code));
  const peer = $derived(prof(app.cmp));
  const lect = $derived(lectLabel(e));
  const title = $derived.by(() => {
    const orig = e.mod.size && e.orig ? ` · w USOS: ${fmtDay(e.orig.start)} ${hm(e.orig.start)}–${hm(e.orig.end)}${e.orig.room ? ', s. ' + e.orig.room : ''}` : '';
    return `${t.n} · ${e.name} · ${tm}${e.note ? ' · ' + e.note : ''}${orig}${e.srv ? ' · zmiana w USOS: ' + changeLine(e.srv) : ''}${e.ghost ? ' · zniknęło z planu w USOS' : ''}${e.absent ? ' · nieobecność' : ''}${e.makeup ? ' · odrabianie w innej grupie' : ''}`;
  });

  const openDetail = () => openSheet({ name: 'detail', uid: e.uid! });
  function onKey(ev: KeyboardEvent) {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === ev.currentTarget) {
      ev.preventDefault();
      openDetail();
    }
  }
</script>

{#snippet state()}
  {#if live}<span class="live">trwa · jeszcze {dur(minsBetween(now, e.end))}</span>{:else if soon != null && soon <= 120}<span class="soon">za {dur(soon)}</span>{/if}
{/snippet}
{#snippet progress()}
  {#if live}<span class="prog"><i style="width:{pct}%"></i></span>{/if}
{/snippet}
{#snippet building()}
  {#if e.building}<span class="bld" title={e.building}><i style="--bc:{app.bColors.get(e.building)}"></i>{shortB(e.building)}</span>{/if}
{/snippet}

{#if e.who === 'b'}
  <div class="{cls} peer" class:cancel={e.cancelled} style="{pos};--pc2:{pcolor(peer)}" title="{peer?.name}: {e.name} · {tm}">
    <span class="in">
      <span class="tm"><Avatar p={peer} size="xs" />{tm}</span>
      <span class="nm">{e.name}</span>
      <span class="ty">{e.cancelled ? 'Odwołane' : e.src === 'own' ? e.rep || REPEAT[e.repeat!] || '' : t.n}</span>
      <span class="mt">
        {#if e.room}<span class="room">{e.room}</span>{/if}
        {@render building()}
        {#if e.place}<span>{e.place}</span>{/if}
      </span>
    </span>
  </div>
{:else if e.src === 'own'}
  <button type="button" class="{cls} own" style="{pos};--oc:var(--{e.color})" title="{e.name} · {tm}" onclick={() => openSheet({ name: 'event', id: e.id! })}>
    <span class="in">
      <span class="tm"><Icon name="own" />{tm}</span>
      <span class="nm">{e.name}</span>
      {@render state()}
      {#if e.skip}<span class="skip">{e.skip}</span>{/if}
      <span class="mt">
        {#if e.clash}<span class="warn">kolizja</span>{/if}
        <span>{e.place || e.rep || REPEAT[e.repeat!] || ''}</span>
      </span>
    </span>
    {@render progress()}
  </button>
{:else}
  <div class={cls} class:cancel={e.cancelled} class:srvchg={!!e.srv} class:mk={e.makeup} role="button" tabindex="0" style="{pos};{typeStyle(t.k)}" {title} onclick={openDetail} onkeydown={onKey}>
    <span class="side">
      {#if e.srv}<span class="flag srv"><Icon name="bell" /></span>{/if}
      {#if e.mod.size && act(e)}<span class="flag"><Icon name="swap" /></span>{/if}
      {#if e.url}<a class="go" href={e.url} target="_blank" rel="noopener" aria-label="Otwórz w USOSweb" onclick={(ev) => ev.stopPropagation()}><Icon name="go" /></a>{/if}
    </span>
    <span class="in">
      <span class="tm" class:chg={e.mod.has('time') || e.mod.has('day')}>{tm}</span>
      <span class="nm">{e.name}</span>
      {#if e.cancelled}
        <span class="ty">{e.ghost ? 'Zniknęło z USOS' : 'Odwołane'}</span>
      {:else if e.absent}
        <span class="ty abs">Nieobecność</span>
      {:else if e.skip}
        <span class="skip">{e.skip}</span>
      {:else if hasState}
        {@render state()}
      {:else if e.makeup}
        <span class="ty"><span class="mkl">Odrabianie</span> {t.n} · gr. {e.group}</span>
      {:else}
        <span class="ty">{t.n}{e.group ? ` · gr. ${e.group}` : ''}</span>
      {/if}
      <span class="mt">
        {#if e.room}<span class="room" class:chg={e.mod.has('room')}>{e.room}</span>{/if}
        {@render building()}
        {#if lect}<span class="lect">{lect}</span>{/if}
        {#if e.clash}<span class="warn">kolizja</span>{/if}
      </span>
    </span>
    {@render progress()}
  </div>
{/if}
