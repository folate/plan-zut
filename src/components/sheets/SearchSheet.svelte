<script lang="ts">
  import { onMount } from 'svelte';
  import { cap, hm, monday, plural, weekdayShort, ymd } from '../../lib/dates';
  import { msgOf } from '../../lib/net';
  import { addApiProfile } from '../../lib/plans';
  import { closeSheet, openSheet } from '../../lib/ui.svelte';
  import { api } from '../../lib/usos/api';
  import { loadGroupMeta, metaFor, shortName } from '../../lib/usos/meta.svelte';
  import { discoverGroups, searchCourses, staffIdFrom, usosTime, type CourseHit, type DiscoveredGroup } from '../../lib/usos/plans';
  import { MODE_NAME, codeFromCourseId, codeFromCtype, pl, studyInfo } from '../../lib/usos/util';
  import Seg from '../Seg.svelte';
  import Sheet from '../Sheet.svelte';
  import TypeTag from '../TypeTag.svelte';

  type Mode = 'course' | 'staff';
  type Course = CourseHit;

  let mode = $state<Mode>('course');
  let courseQuery = $state(''), staffQuery = $state('');
  let msg = $state('');
  let busy = $state('');
  let note = $state('');
  let results = $state.raw<Course[]>([]);
  let course = $state.raw<{ id: string; name: string; term: string; groups: DiscoveredGroup[] } | null>(null);
  let staff = $state.raw<{ id: string; summary: string } | null>(null);
  let checked = $state<number[]>([]);
  let planName = $state('');
  let courseEl = $state<HTMLInputElement>();

  const picked = $derived(mode === 'course' ? !!course : !!staff);
  onMount(() => void setTimeout(() => courseEl?.focus(), 60));

  function reset() {
    msg = note = '';
    results = [];
    course = staff = null;
  }
  function setMode(m: Mode) {
    mode = m;
    reset();
  }

  async function findCourses() {
    const q = courseQuery.trim();
    reset();
    if (q.length < 3) return void (msg = 'Wpisz co najmniej 3 litery nazwy przedmiotu.');
    busy = 'Szukam…';
    try {
      results = (await searchCourses(q)).items;
      if (!results.length) msg = 'Nie znaleziono przedmiotów o tej nazwie.';
    } catch (e) {
      msg = msgOf(e);
    }
    busy = '';
  }

  async function openCourse(c: Course) {
    reset();
    note = 'Szukam grup w bieżącym semestrze…';
    try {
      const d = await discoverGroups(c.id);
      if (!d) msg = 'Ten przedmiot nie ma zajęć w bieżącym semestrze. Spróbuj innego wyniku z listy.';
      else {
        await loadGroupMeta(d.groups).catch(() => {});
        course = { ...c, term: pl(d.term.name), groups: d.groups };
        checked = d.groups.length === 1 ? [0] : [];
        planName = c.name.slice(0, 30);
      }
    } catch (e) {
      msg = msgOf(e);
    }
    note = '';
  }

  async function findStaff() {
    const id = staffIdFrom(staffQuery.trim());
    reset();
    if (!id) return void (msg = 'Wklej link do profilu prowadzącego (z parametrem os_id) albo sam numer.');
    busy = 'Szukam…';
    try {
      const r = await api('tt/staff', { user_id: id, start: ymd(monday(new Date())), days: 7, fields: 'start_time|course_name' });
      staff = { id, summary: r.length ? `${r.length} ${plural(r.length, 'zajęcia', 'zajęcia', 'zajęć')} w tym tygodniu` : 'brak zajęć w tym tygodniu' };
      planName = '';
    } catch (e) {
      msg = msgOf(e);
    }
    busy = '';
  }

  async function addPlan() {
    msg = '';
    const groups = course ? checked.map((i) => course!.groups[i]) : [];
    if (course && !groups.length) return void (msg = 'Zaznacz co najmniej jedną grupę.');
    busy = 'Pobieram plan…';
    try {
      if (course) await addApiProfile(planName.trim() || course.name, { kind: 'groups', course_id: course.id, groups: groups.map((g) => ({ unit_id: g.unit_id, group_number: g.group_number })) });
      else if (staff) await addApiProfile(planName.trim() || 'Prowadzący ' + staff.id, { kind: 'staff', user_id: staff.id });
      openSheet({ name: 'plans' });
    } catch (e) {
      msg = msgOf(e);
      busy = '';
    }
  }

  const search = () => (mode === 'course' ? findCourses() : findStaff());
  function onEnter(e: KeyboardEvent) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    search();
  }
  function groupInfo(g: DiscoveredGroup) {
    const dt = g.first ? usosTime(g.first.start_time) : null, m = metaFor(g.unit_id, g.group_number);
    return [dt ? `${cap(weekdayShort(dt))} ${hm(dt)}` : '', g.first?.room_number ? 's. ' + g.first.room_number : '', m?.l.length ? m.l.map((x) => shortName(x.n)).join(', ') : ''].filter(Boolean).join(' · ');
  }
</script>

<Sheet title="Szukaj planu w USOS" subtitle="Znajdź przedmiot i wybierz jego grupy albo podaj prowadzącego">
  <Seg items={[['course', 'Przedmiot'], ['staff', 'Prowadzący']] as const} value={mode} onchange={setMode} />
  {#if mode === 'course'}
    <div class="fld"><label for="q-course">Nazwa przedmiotu</label><input id="q-course" type="search" placeholder="np. aplikacje internetowe" autocomplete="off" bind:value={courseQuery} bind:this={courseEl} onkeydown={onEnter} /></div>
  {:else}
    <div class="fld"><label for="q-staff">Link do profilu prowadzącego w USOSweb albo jego numer ID</label><input id="q-staff" type="text" placeholder="https://usosweb.zut.edu.pl/…os_id=12345" bind:value={staffQuery} onkeydown={onEnter} /></div>
    <p class="hint">USOS nie pozwala wyszukiwać osób bez klucza API, dlatego potrzebny jest link z profilu albo numer.</p>
  {/if}
  {#if msg}<div class="msg">{msg}</div>{/if}

  <div class="results">
    {#if note}
      <p class="hint">{note}</p>
    {:else if course}
      <div class="res-head"><b>{course.name}</b><small>{course.term}</small></div>
      <p class="hint">Zaznacz grupy, które chcesz obserwować.</p>
      <div class="groups">
        {#each course.groups as g, i}
          <label class="grp-row">
            <input type="checkbox" value={i} bind:group={checked} />
            <span>
              <b><TypeTag code={codeFromCourseId(course.id) || codeFromCtype(g.ct)} label={cap(g.ct || '')} /> gr. {g.group_number}</b>
              <small>{groupInfo(g) || 'brak terminów'}</small>
            </span>
          </label>
        {/each}
      </div>
      <div class="fld"><label for="q-name">Nazwa planu</label><input id="q-name" type="text" maxlength="30" bind:value={planName} /></div>
    {:else if staff}
      <div class="res-head"><b>Prowadzący nr {staff.id}</b><small>{staff.summary}</small></div>
      <div class="fld"><label for="q-name">Nazwa planu</label><input id="q-name" type="text" maxlength="30" placeholder="np. dr Kowalski" bind:value={planName} /></div>
    {:else if results.length}
      <p class="hint">Wybierz przedmiot. Pokażę grupy zajęciowe z bieżącego semestru.</p>
      {#each results as c, i (c.id)}
        {#if c.faculty && c.faculty !== results[i - 1]?.faculty}<div class="qs-grp">{c.faculty}</div>{/if}
        {@const study = studyInfo(c.id)}
        <button type="button" class="res" onclick={() => openCourse(c)}>
          <span class="res-t">
            <b>{c.name}</b>
            <small class="meta">
              {#if study.mode}<i class="mode {study.mode}">{MODE_NAME[study.mode]}</i>{/if}
              {#if study.label}<span>{study.label}</span>{/if}
              <span class="cid">{c.id}</span>
            </small>
          </span>
          {#if codeFromCourseId(c.id)}<TypeTag code={codeFromCourseId(c.id)} />{/if}
        </button>
      {/each}
    {/if}
  </div>

  {#snippet footer()}
    <button class="btn" type="button" onclick={closeSheet}>Anuluj</button>
    {#if !note}
      <button class="btn fill" type="button" disabled={!!busy} onclick={picked ? addPlan : search}>{busy || (picked ? 'Dodaj plan' : 'Szukaj')}</button>
    {/if}
  {/snippet}
</Sheet>
