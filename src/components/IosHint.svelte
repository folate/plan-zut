<script lang="ts">
  import { iosInBrowser, isNative } from '../lib/platform';
  import Icon from './Icon.svelte';

  const show = !isNative() && iosInBrowser(navigator.userAgent, navigator.platform, navigator.maxTouchPoints, isStandalone());

  function isStandalone() {
    return (navigator as { standalone?: boolean }).standalone === true || matchMedia('(display-mode: standalone)').matches;
  }
</script>

{#if show}
  <div class="ios-hint">
    <Icon name="warn" />
    <span>
      <b>Masz iPhone'a? Najpierw dodaj apkę do ekranu głównego.</b>
      Stuknij „Udostępnij”, potem „Do ekranu początkowego”, i dopiero tam dodaj plan. Apka z ekranu głównego nie widzi planu dodanego w Safari, więc trzeba by go wpisywać drugi raz.
    </span>
  </div>
{/if}
