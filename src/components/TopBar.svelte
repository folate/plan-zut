<script lang="ts">
  import { animate, app, gapOpts, goToDate, step } from '../lib/app.svelte';
  import { addDays, cap, dowOf, dur, fmtShort, fromYmd, hm, monday, pad, plural, sameDay, weekdayShort, ymd } from '../lib/dates';
  import { news } from '../lib/changelog.svelte';
  import { act, freeGaps } from '../lib/events';
  import { sync } from '../lib/plans';
  import { openSheet } from '../lib/ui.svelte';
  import Avatar from './Avatar.svelte';
  import DatePicker from './DatePicker.svelte';
  import Icon from './Icon.svelte';
  import SearchBox from './SearchBox.svelte';

  const v = $derived(app.view);
  const selDate = $derived(addDays(app.week, app.selDay));

  let picking = $state(false);
  function jump(v: string) {
    picking = false;
    if (v) goToDate(fromYmd(v));
  }
  const titleDesk = $derived(`${fmtShort(app.week)} – ${fmtShort(addDays(app.week, v.nDays - 1))}`);
  const titleMob = $derived(`${cap(weekdayShort(selDate))} ${selDate.getDate()}.${pad(selDate.getMonth() + 1)}`);

  const info = $derived.by(() => {
    if (app.comparing) {
      let tot = 0;
      v.days.forEach((d, i) => {
        if (app.mobile && i !== app.selDay) return;
        tot += freeGaps(d.list, act, gapOpts()).filter((g) => g.min >= 30).reduce((s, g) => s + g.min, 0);
      });
      return tot ? `Wspólnie wolne: ${dur(tot)}` : 'Brak wspólnych okienek';
    }
    const scope = app.mobile ? (v.days[app.selDay]?.list ?? []) : v.wk;
    const cls = scope.filter((e) => e.src === 'usos' && act(e));
    return cls.length ? `Zajęcia: ${cls.length} · ${dur(Math.round(cls.reduce((s, e) => s + (+e.end - +e.start) / 6e4, 0)))}` : 'Brak zajęć';
  });

  const ERR: Record<string, string> = {
    offline: 'Offline', down: 'USOS nie działa', timeout: 'USOS nie odpowiada', auth: 'Wylogowano z USOS', key: 'Problem z kluczem API', link: 'Link nie działa'
  };
  const status = $derived.by((): [kind: string, text: string] => {
    if (app.busy) return ['idle', 'Pobieram…'];
    if (app.viewingPreview) return ['idle', app.preview?.p.api ? 'Podgląd z USOS' : 'Zapisana wersja'];
    if (app.lastErr) return ['err', ERR[app.lastErr.kind] || 'Nie udało się pobrać planu'];
    if (app.synced) {
      const d = new Date(app.synced);
      return ['', sameDay(d, new Date()) ? 'Pobrano ' + hm(d) : 'Stan z ' + fmtShort(d)];
    }
    if (app.usos.length) return ['', 'Plan z pliku'];
    return ['idle', 'Brak planu'];
  });

  const unack = $derived(app.viewingPreview ? 0 : app.changes.filter((c) => !c.ack).length);

  const onToday = $derived(+app.week === +monday(app.now) && app.selDay === Math.min(dowOf(app.now), v.nDays - 1));

  function today() {
    const n = new Date(), w = monday(n);
    const dir = w < app.week ? 'l' : w > app.week ? 'r' : '';
    app.week = w;
    app.sel = dowOf(n);
    animate(dir);
  }
</script>

<div class="top">
  <div class="top-l">
    <button class="avbtn" type="button" data-tour="plans" aria-label="Plany" title="Plan: {app.shownProfile?.name ?? ''}" onclick={() => openSheet({ name: 'plans' })}>
      {#if app.shownProfile}<Avatar p={app.shownProfile} />{:else}<span class="av empty"><Icon name="plus" /></span>{/if}
    </button>
    <div class="ttl">
      <h1 class="jump" data-tour="date" title="Skocz do daty">
        <span class="desk">{titleDesk}</span><span class="mob">{titleMob}</span><Icon name="chev" />
        <button type="button" aria-label="Skocz do daty" aria-haspopup="dialog" onclick={() => (picking = true)}></button>
        {#if picking}<DatePicker title="Skocz do daty" value={ymd(app.mobile ? selDate : app.week)} onpick={jump} onclose={() => (picking = false)} />{/if}
      </h1>
      <div class="meta {status[0]}" title={app.lastErr?.msg || `${info} · ${status[1]}`}><span class="sdot"></span><span class="st">{status[1]}</span>{#if !app.mobile || app.comparing}<span id="metaTxt">· {info}</span>{/if}</div>
    </div>
    {#if !onToday}<button class="tbtn mob-only" type="button" onclick={today}>Dziś</button>{/if}
    <div class="nav" data-tour="nav">
      <button class="ib" id="prev" type="button" aria-label="Poprzedni tydzień" title="Poprzedni tydzień" onclick={() => step(-1)}><Icon name="prev" /></button>
      <button class="ib" id="next" type="button" aria-label="Następny tydzień" title="Następny tydzień" onclick={() => step(1)}><Icon name="next" /></button>
      <button class="tbtn" type="button" title="Wróć do bieżącego tygodnia" onclick={today}>Dziś</button>
    </div>
  </div>
  <SearchBox class="qs-top" />
  <div class="top-r">
    <button class="ib muted mob-only" type="button" data-tour="search" aria-label="Szukaj planu" onclick={() => openSheet({ name: 'searchOverlay' })}><Icon name="search" /></button>
    <button
      class="ib muted desk-only" class:spin={app.busy} type="button" aria-label="Odśwież plan" disabled={app.busy}
      title={app.hasSource ? 'Pobierz plan ponownie z USOS' : 'Najpierw dodaj link do planu'}
      onclick={() => sync().catch(() => {})}
    ><Icon name="sync" /></button>
    <button
      class="ib muted" class:has={unack > 0} id="chgBtn" type="button" data-tour="changes" aria-label="Zmiany w planie"
      title={unack ? `${unack} ${plural(unack, 'nowa zmiana', 'nowe zmiany', 'nowych zmian')} w planie` : 'Zmiany w planie'}
      onclick={() => openSheet({ name: 'changes' })}
    ><Icon name="bell" /><span class="badge">{unack || ''}</span></button>
    <button class="ib muted" class:dot={news.unseen} type="button" data-tour="settings" aria-label={news.unseen ? 'Ustawienia, są nowości' : 'Ustawienia'} title="Ustawienia" onclick={() => openSheet({ name: 'settings' })}><Icon name="gear" /></button>
  </div>
</div>
