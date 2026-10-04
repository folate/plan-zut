<script lang="ts">
  import { absencesBySubject } from '../../lib/absences';
  import { app } from '../../lib/app.svelte';
  import { pad, plural } from '../../lib/dates';
  import { saveAbsences } from '../../lib/plans';
  import type { Absence } from '../../lib/types';
  import { closeSheet, toast } from '../../lib/ui.svelte';
  import Icon from '../Icon.svelte';
  import Sheet from '../Sheet.svelte';
  import TypeTag from '../TypeTag.svelte';

  const subjects = $derived(absencesBySubject(app.absences));
  const total = $derived(app.absences.length);
  const shortDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate()}.${pad(d.getMonth() + 1)}`;
  };

  function remove(a: Absence) {
    const before = app.absences;
    saveAbsences(before.filter((x) => x.uid !== a.uid));
    toast(`Usunięto nieobecność z ${shortDate(a.at)}`, 'Cofnij', () => saveAbsences(before));
  }
</script>

<Sheet title="Nieobecności" subtitle={total ? `${total} ${plural(total, 'nieobecność', 'nieobecności', 'nieobecności')} w tym planie` : 'Brak nieobecności'}>
  {#if subjects.length}
    <div class="vers">
      {#each subjects as s (s.skey)}
        <div class="ver abs-row">
          <span class="ver-t">
            <b>{s.name}</b>
            <small><TypeTag code={s.code} />{#if s.group} gr. {s.group}{/if}</small>
            <span class="occ">
              {#each s.items as a (a.uid)}
                <button type="button" class="oc ab" aria-label="Usuń nieobecność z {shortDate(a.at)}" title="Usuń" onclick={() => remove(a)}>{shortDate(a.at)}<Icon name="x" /></button>
              {/each}
            </span>
          </span>
          <span class="abs-n">{s.items.length}</span>
        </div>
      {/each}
    </div>
  {/if}
  <p class="hint">Nieobecność zaznaczasz w szczegółach zajęć przyciskiem „Nie było mnie”. Licznik jest osobny dla każdych zajęć, np. laboratorium liczy się niezależnie od wykładu.</p>

  {#snippet footer()}
    <button class="btn fill" type="button" onclick={closeSheet}>Zamknij</button>
  {/snippet}
</Sheet>
