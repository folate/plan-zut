<script lang="ts">
  import { ui } from '../lib/ui.svelte';
  import AbsencesSheet from './sheets/AbsencesSheet.svelte';
  import AccountSheet from './sheets/AccountSheet.svelte';
  import ChangesSheet from './sheets/ChangesSheet.svelte';
  import ClassSheet from './sheets/ClassSheet.svelte';
  import DetailSheet from './sheets/DetailSheet.svelte';
  import EventSheet from './sheets/EventSheet.svelte';
  import ExportSheet from './sheets/ExportSheet.svelte';
  import HistorySheet from './sheets/HistorySheet.svelte';
  import ImportSheet from './sheets/ImportSheet.svelte';
  import MakeupSheet from './sheets/MakeupSheet.svelte';
  import NewsSheet from './sheets/NewsSheet.svelte';
  import PlansSheet from './sheets/PlansSheet.svelte';
  import ProfileSheet from './sheets/ProfileSheet.svelte';
  import SearchOverlay from './sheets/SearchOverlay.svelte';
  import SearchSheet from './sheets/SearchSheet.svelte';
  import SettingsSheet from './sheets/SettingsSheet.svelte';
  import SourcePicker from './sheets/SourcePicker.svelte';
  import WelcomeSheet from './sheets/WelcomeSheet.svelte';
</script>

{#key ui.sheet}
  {@const s = ui.sheet}
  {#if s}
    <div id="overlay">
      {#if s.name === 'plans'}<PlansSheet />
      {:else if s.name === 'profile'}<ProfileSheet id={s.id} mode={s.mode} />
      {:else if s.name === 'class'}<ClassSheet uid={s.uid} />
      {:else if s.name === 'event'}<EventSheet id={s.id} />
      {:else if s.name === 'changes'}<ChangesSheet />
      {:else if s.name === 'absences'}<AbsencesSheet />
      {:else if s.name === 'makeup'}<MakeupSheet uid={s.uid} />
      {:else if s.name === 'detail'}<DetailSheet uid={s.uid} />
      {:else if s.name === 'history'}<HistorySheet id={s.id} />
      {:else if s.name === 'source'}<SourcePicker target={s.target} />
      {:else if s.name === 'welcome'}<WelcomeSheet />
      {:else if s.name === 'account'}<AccountSheet target={s.target} />
      {:else if s.name === 'settings'}<SettingsSheet />
      {:else if s.name === 'news'}<NewsSheet />
      {:else if s.name === 'search'}<SearchSheet />
      {:else if s.name === 'searchOverlay'}<SearchOverlay />
      {:else if s.name === 'export'}<ExportSheet />
      {:else if s.name === 'import'}<ImportSheet code={s.code} />
      {/if}
    </div>
  {/if}
{/key}
