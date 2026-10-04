<script lang="ts">
  import { initials, pcolor } from '../lib/constants';

  let { p, size = '' }: { p: { name?: string; ci?: number } | null | undefined; size?: '' | 'sm' | 'xs' } = $props();
</script>

<span class="av {size}" style="--avc:{pcolor(p)}">{initials(p?.name || '?')}</span>
