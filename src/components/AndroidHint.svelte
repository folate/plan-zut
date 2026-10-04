<script lang="ts">
  import { isNative } from '../lib/platform';
  import { apkUrl, isAndroid } from '../lib/release.svelte';
  import Icon from './Icon.svelte';

  const show = !isNative() && isAndroid() && !!apkUrl;
</script>

{#if show}
  <div class="ios-hint apk-hint">
    <Icon name="go" />
    <span>
      <b>Masz Androida? Jest też zwykła apka.</b>
      Działa tak samo jak strona, tylko siedzi na telefonie jak każda inna aplikacja. <a href={apkUrl}>Pobierz plik APK</a>
    </span>
  </div>
{/if}
