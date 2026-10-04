<script lang="ts">
  import { app } from '../lib/app.svelte';
  import { closePreview, previewCompare, previewSave } from '../lib/plans';
  import Avatar from './Avatar.svelte';
  import Icon from './Icon.svelte';

  const viewing = $derived(app.viewingPreview);
</script>

{#if app.preview}
  <div class="pvbar" role="status">
    <Avatar p={app.preview.p} size="sm" />
    <span class="pv-t">
      <small>{viewing ? 'Podgląd · to nie jest Twój plan' : 'Porównujesz swój plan z podglądem'}</small>
      <b>{app.preview.p.name}</b>
    </span>
    <span class="pv-act">
      {#if viewing && app.profile}<button type="button" class="tbtn" onclick={previewCompare}><Icon name="compare" />Porównaj z moim</button>{/if}
      <button type="button" class="tbtn" onclick={previewSave}>Zapisz jako plan</button>
      <button type="button" class="tbtn back" onclick={closePreview}>{viewing && app.profile ? 'Wróć do mojego planu' : 'Zamknij podgląd'}</button>
    </span>
  </div>
{/if}
