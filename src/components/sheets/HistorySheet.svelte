<script lang="ts">
  import { prof } from '../../lib/app.svelte';
  import { quickDiff } from '../../lib/changes';
  import { fmtAt, plural } from '../../lib/dates';
  import { changesOf, enterPreview, setChanges, setVersions, versionsOf } from '../../lib/plans';
  import { sourceLabel } from '../../lib/profileLabels';
  import type { PlanVersion } from '../../lib/types';
  import { closeSheet, toast } from '../../lib/ui.svelte';
  import Avatar from '../Avatar.svelte';
  import ConfirmButton from '../ConfirmButton.svelte';
  import Icon from '../Icon.svelte';
  import Sheet from '../Sheet.svelte';

  let { id }: { id: string } = $props();

  const p = $derived(prof(id));
  const versions = $derived(versionsOf(id).slice().reverse());
  const changes = $derived(changesOf(id));

  function diffText(v: PlanVersion, prev: PlanVersion | undefined) {
    if (!prev) return 'pierwsza zapisana wersja';
    const d = quickDiff(prev.ics, v.ics);
    return [d.add ? `+${d.add} nowych` : '', d.rem ? `−${d.rem} usuniętych` : '', d.chg ? `${d.chg} zmienionych` : ''].filter(Boolean).join(' · ') || 'bez zmian w zajęciach';
  }
  function preview(v: PlanVersion) {
    const name = `${p!.name} · ${fmtAt(v.at)}`;
    closeSheet();
    enterPreview(name, v.ics, null);
  }
  const removeVersion = (v: PlanVersion) => setVersions(id, versionsOf(id).filter((x) => x.at !== v.at));
  function clearVersions() {
    setVersions(id, versionsOf(id).slice(-1));
    toast('Usunięto poprzednią wersję');
  }
  function clearChanges() {
    setChanges(id, []);
    toast('Wyczyszczono historię zmian');
  }
</script>

{#if p}
  <Sheet title="Historia planu">
    {#snippet sub()}<Avatar {p} size="xs" />{p.name} · {sourceLabel(p)}{/snippet}

    <div class="hist-sum">
      <div><small>Ostatnie pobranie</small><b>{p.synced ? fmtAt(p.synced) : '—'}</b></div>
      <div><small>Poprzednia wersja</small><b>{versions.length > 1 ? fmtAt(versions[1].at) : 'brak'}</b></div>
      <div><small>Zmiany w historii</small><b>{changes.length}</b></div>
    </div>
    {#if versions.length}
      <div class="vers">
        {#each versions as v, i (v.at)}
          <div class="ver" class:cur={i === 0}>
            <span class="ver-t">
              <b>{fmtAt(v.at)}{#if i === 0}<span class="tag ok">aktualna</span>{/if}</b>
              <small>{v.n} {plural(v.n, 'zajęcia', 'zajęcia', 'zajęć')} · {diffText(v, versions[i + 1])}</small>
            </span>
            <button type="button" class="tbtn" onclick={() => preview(v)}>Podgląd</button>
            {#if i}<button type="button" class="ib muted" aria-label="Usuń wersję z {fmtAt(v.at)}" onclick={() => removeVersion(v)}><Icon name="x" /></button>{/if}
          </div>
        {/each}
      </div>
    {:else}
      <p class="hint">Brak zapisanych wersji.</p>
    {/if}
    <p class="hint">Trzymam aktualny plan i jedną poprzednią wersję. Poprzednia zapisuje się przy pobraniu, gdy plan się zmienił. Wszystko jest tylko w tej przeglądarce.</p>

    {#snippet footer()}
      {#if versions.length > 1}<ConfirmButton confirm="Na pewno?" onconfirm={clearVersions}>Usuń poprzednią wersję</ConfirmButton>{/if}
      {#if changes.length}<ConfirmButton confirm="Na pewno?" onconfirm={clearChanges}>Wyczyść historię zmian</ConfirmButton>{/if}
      <button class="btn fill" type="button" onclick={closeSheet}>Zamknij</button>
    {/snippet}
  </Sheet>
{/if}
