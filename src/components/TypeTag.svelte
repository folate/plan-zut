<script lang="ts">
  import { typeOf, typeStyle } from '../lib/constants';

  let { code, label }: { code: string | null | undefined; label?: string } = $props();
  const t = $derived(typeOf(code));
</script>

<span class="tag" style={typeStyle(t.k)}>{label || t.n}</span>
