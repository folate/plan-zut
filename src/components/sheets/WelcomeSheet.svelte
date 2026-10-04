<script lang="ts">
  import { app } from '../../lib/app.svelte';
  import type { IconName } from '../../lib/icons';
  import { store } from '../../lib/storage';
  import { closeSheet, pushSheet } from '../../lib/ui.svelte';
  import AndroidHint from '../AndroidHint.svelte';
  import Icon from '../Icon.svelte';
  import IosHint from '../IosHint.svelte';
  import Sheet from '../Sheet.svelte';

  const github = import.meta.env.VITE_GITHUB_URL;

  const features: { icon: IconName; title: string; desc: string }[] = [
    { icon: 'lock', title: 'Twoje dane zostają u Ciebie', desc: 'Zero zakładania kont. Plan i logowanie siedzą tylko na Twoim urządzeniu, a logujesz się prosto w USOS, bez pośredników. Do mnie trafiają najwyżej anonimowe statystyki wejść na stronę.' },
    { icon: 'book', title: 'Plan, który da się czytać', desc: 'Cały tydzień na kompie, jeden dzień na telefonie. Widać przerwy, okienka i to, że masz 5 minut na sprint do innego budynku.' },
    { icon: 'bell', title: 'Zmiany w planie', desc: 'Przenieśli salę albo odwołali zajęcia? Dowiesz się z apki, a nie pod zamkniętymi drzwiami.' },
    { icon: 'compare', title: 'Porównywanie', desc: 'Nałóż plan znajomego na swój i od razu widać, kiedy oboje macie wolne na buszka.' },
    { icon: 'own', title: 'Reszta życia', desc: 'Praca, trening, inne aktywności. Do tego licznik nieobecności, żeby było wiadomo, ile jeszcze można opuścić.' }
  ];

  function done(addPlan: boolean) {
    store.set('onboarded', true);
    if (addPlan) pushSheet({ name: 'source', target: app.pid });
    else closeSheet();
  }
</script>

<Sheet title="Cześć!" subtitle="USOSweb na telefonie to dramat, a ZUT&#8209;u w oficjalnej apce USOS po prostu nie ma. Więc zrobiłem plan zajęć, na który da się patrzeć.">
  <IosHint />
  <AndroidHint />
  <section class="det-sec">
    <h3>Co tu znajdziesz</h3>
    <div class="feats">
      {#each features as f (f.title)}
        <div class="feat">
          <span class="src-ic"><Icon name={f.icon} /></span>
          <span><b>{f.title}</b><small>{f.desc}</small></span>
        </div>
      {/each}
    </div>
  </section>

  {#snippet footer()}
    {#if github}<a class="btn sp" href={github} target="_blank" rel="noopener"><Icon name="github" />GitHub</a>{/if}
    <button class="btn" type="button" onclick={() => done(false)}>Najpierw się rozejrzę</button>
    <button class="btn fill" type="button" onclick={() => done(true)}>Dodaj swój plan</button>
  {/snippet}
</Sheet>
