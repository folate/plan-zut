<script lang="ts">
  import { ICONS, type IconName } from '../lib/icons';

  let { name }: { name: IconName } = $props();
</script>

<svg viewBox="0 0 24 24" fill="currentColor"><path d={ICONS[name]} /></svg>
