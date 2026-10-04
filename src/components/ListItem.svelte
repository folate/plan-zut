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

  let { e, isNext, i }: { e: ViewEvent; isNext: boolean; i: number } = $props();

  const now = $derived(app.now);
  const live = $derived(act(e) && e.start <= now && e.end > now);
  const past = $derived(e.end <= now);
  const pct = $derived(live ? Math.round(((+now - +e.start) / (+e.end - +e.start)) * 100) : 0);
  const soon = $derived(isNext ? minsBetween(now, e.start) : null);
  const hasState = $derived(e.who === 'a' && (live || (soon != null && soon <= 120)));
  const cls = $derived(`it${past ? ' past' : ''}${live && e.who === 'a' ? ' now' : ''}${e.clash ? ' clash' : ''}${e.off ? ' off' : ''}`);

  const t = $derived(typeOf(e.code));
  const peer = $derived(prof(app.cmp));
  const lect = $derived(lectLabel(e));
  const descs = $derived.by(() => {
    const d: string[] = [];
    if (e.ghost) d.push('Zniknęło z planu w USOS');
    else {
      if (e.cancelled) d.push('Zajęcia odwołane');
      else if (e.orig) {
        if (e.mod.has('day')) d.push(`Przeniesione z ${fmtDay(e.orig.start)}`);
        if (e.mod.has('time')) d.push(`Zwykle ${hm(e.orig.start)}–${hm(e.orig.end)}`);
        if (e.mod.has('room') && e.orig.room) d.push(`Zwykle s. ${e.orig.room}`);
      }
      if (e.note) d.push(e.note);
    }
    if (e.absent) d.push('Nieobecność');
    if (e.srv) d.push('Zmiana w USOS: ' + changeLine(e.srv));
    return d.join(' · ');
  });

  const openDetail = () => openSheet({ name: 'detail', uid: e.uid! });
  function onKey(ev: KeyboardEvent) {
    if ((ev.key === 'Enter' || ev.key === ' ') && ev.target === ev.currentTarget) {
      ev.preventDefault();
      openDetail();
    }
  }
</script>

{#snippet times(chg = false)}
  <span class="tms" class:chg><span>{hm(e.start)}</span><span>{hm(e.end)}</span></span>
{/snippet}
{#snippet state()}
  {#if hasState}
    <span class="state">
      {#if live}<span class="live">trwa · jeszcze {dur(minsBetween(now, e.end))}</span>{:else}<span class="soon">za {dur(soon ?? 0)}</span>{/if}
    </span>
  {/if}
{/snippet}
{#snippet progress()}
  {#if live}<span class="prog"><i style="width:{pct}%"></i></span>{/if}
{/snippet}

{#if e.who === 'b'}
  <div class="{cls} peer" class:cancel={e.cancelled} style="--i:{i};--pc2:{pcolor(peer)}">
    {@render times()}
    <span class="main">
      <span class="subj">{e.name}</span>
      <span class="sub">
        <Avatar p={peer} size="xs" /><span>{peer?.name}</span>
        <span>{e.cancelled ? 'odwołane' : e.src === 'own' ? e.rep || REPEAT[e.repeat!] || '' : t.n}</span>
        {#if e.room}<span class="room">{e.room}</span>{/if}
        {#if e.place}<span>{e.place}</span>{/if}
      </span>
    </span>
  </div>
{:else if e.src === 'own'}
  <button type="button" class="{cls} own" style="--i:{i};--oc:var(--{e.color})" onclick={() => openSheet({ name: 'event', id: e.id! })}>
    {@render times()}
    <span class="main">
      <span class="subj">{e.name}</span>
      {@render state()}
      <span class="sub">
        {#if e.clash}<span class="warn">Koliduje z zajęciami</span>{/if}
        {#if e.place}<span>{e.place}</span>{/if}
        <span class="tag">{e.rep || REPEAT[e.repeat!] || ''}</span>
      </span>
      {#if e.skip}<span class="skip">{e.skip}</span>{/if}
    </span>
    {@render progress()}
  </button>
{:else}
  <div
    class={cls} class:cancel={e.cancelled} class:srvchg={!!e.srv} role="button" tabindex="0" style="--i:{i};{typeStyle(t.k)}"
    aria-label="{t.n}: {e.name}, {hm(e.start)}–{hm(e.end)}" onclick={openDetail} onkeydown={onKey}
  >
    {@render times(e.mod.has('time') || e.mod.has('day'))}
    <span class="main">
      <span class="subj">{e.name}</span>
      {@render state()}
      <span class="sub">
        <span class="tag">{t.n}</span>
        {#if e.room}<span class="room" class:chg={e.mod.has('room')}>{e.room}</span>{/if}
        {#if e.building}<span class="bld" title={e.building}><i style="--bc:{app.bColors.get(e.building)}"></i>{shortB(e.building)}</span>{/if}
        {#if e.group}<span>gr. {e.group}</span>{/if}
        {#if lect}<span class="lect">{lect}</span>{/if}
        {#if e.clash}<span class="warn">kolizja</span>{/if}
      </span>
      {#if descs}<span class="desc">{descs}</span>{/if}
      {#if e.skip}<span class="skip">{e.skip}</span>{/if}
    </span>
    <span class="side">
      {#if e.srv}<span class="flag srv" title="Nowa zmiana w USOS"><Icon name="bell" /></span>{/if}
      {#if e.mod.size && act(e)}<span class="flag" title="Zmienione ręcznie"><Icon name="swap" /></span>{/if}
      {#if e.url}<a class="go" href={e.url} target="_blank" rel="noopener" aria-label="Otwórz w USOSweb" title="Otwórz w USOSweb" onclick={(ev) => ev.stopPropagation()}><Icon name="go" /></a>{/if}
    </span>
    {@render progress()}
  </div>
{/if}
