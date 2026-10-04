<script lang="ts">
  import { closeSheet } from '../../lib/ui.svelte';
  import SearchBox from '../SearchBox.svelte';
  import Sheet from '../Sheet.svelte';
</script>

<Sheet title="Szukaj planu" subtitle="Podgląd bez zapisywania. Możesz go potem porównać albo zapisać.">
  <SearchBox class="qs-sheet" autofocus inline ondone={closeSheet} />
</Sheet>
