<script lang="ts">
  import { ui } from '../lib/ui.svelte';

  function run() {
    ui.toastShown = false;
    ui.toast?.fn?.();
  }
</script>

<div id="toast" role="status" class:show={ui.toastShown}>
  <span>{ui.toast?.text}</span>
  {#if ui.toast?.action}<button type="button" onclick={run}>{ui.toast.action}</button>{/if}
</div>
