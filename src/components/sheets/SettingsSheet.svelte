<script lang="ts">
  import { CHANGELOG, news } from '../../lib/changelog.svelte';
  import { AUTO_SYNC, FM, HUES, SYNC_MIN_ACCOUNT, SYNC_MIN_LINK, THEMES, TRANSFER } from '../../lib/constants';
  import { pad } from '../../lib/dates';
  import { syncMin } from '../../lib/plans';
  import { isNative } from '../../lib/platform';
  import { apkUrl, checkUpdate, isAndroid, release, VERSION } from '../../lib/release.svelte';
  import { setAutoSync, setCollisions, setFm, setGridRange, setHue, setProxy, setTheme, settings } from '../../lib/settings.svelte';
  import { store } from '../../lib/storage';
  import { closeSheet, openSheet, pushSheet, startTour, toast } from '../../lib/ui.svelte';
  import { session, setKey } from '../../lib/usos/session.svelte';
  import ConfirmButton from '../ConfirmButton.svelte';
  import Icon from '../Icon.svelte';
  import Seg from '../Seg.svelte';
  import Sheet from '../Sheet.svelte';
  import Switch from '../Switch.svelte';
  import AccountSection from './AccountSection.svelte';

  const FROM_HOURS = [5, 6, 7, 8, 9, 10, 11, 12];
  const TO_HOURS = [13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23];

  const github = import.meta.env.VITE_GITHUB_URL;
  const author = (github || '').match(/github[.]com[/]([^/]+)/)?.[1];

  let key = $state(session.key.key), secret = $state(session.key.secret);
  const saveKey = () => setKey({ key: key.trim(), secret: secret.trim() });

  const syncOpts = $derived(AUTO_SYNC.filter(([m]) => !m || m >= syncMin()));
  const syncVal = $derived(settings.autoSync && Math.max(settings.autoSync, syncMin()));

  let syncNote = $state(0);
  function pickSync(min: number) {
    setAutoSync(min);
    if (min && min < SYNC_MIN_LINK) syncNote = min;
  }
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    return { destroy: () => node.remove() };
  }

  let checking = $state(false);
  async function check() {
    checking = true;
    const ok = await checkUpdate(true);
    checking = false;
    if (ok && release.latest) toast(`Jest nowa wersja apki (${release.latest})`, 'Zobacz', () => pushSheet({ name: 'news' }));
    else toast(ok ? 'Masz najnowszą wersję.' : 'Nie udało się sprawdzić. Spróbuj później.');
  }

  function wipe() {
    store.clear();
    location.reload();
  }
</script>

{#snippet newsBtn()}
  <button type="button" class="tbtn" class:dot={news.unseen} onclick={() => pushSheet({ name: 'news' })}>Zobacz, co się zmieniło</button>
{/snippet}

<Sheet title="Ustawienia">
  <section class="set">
    <h3>Wygląd</h3>
    <div class="fld"><span class="lbl">Motyw</span><Seg items={THEMES} value={settings.theme} onchange={setTheme} /></div>
    <div class="fld">
      <span class="lbl">Kolor motywu</span>
      <div class="pres">
        {#each HUES as [name, h] (h)}
          <button type="button" style="--ph:{h}" title={name} aria-label={name} aria-pressed={h === settings.hue} onclick={() => setHue(h)}></button>
        {/each}
      </div>
      <input type="range" min="0" max="360" step="1" aria-label="Odcień" value={settings.hue} oninput={(e) => setHue(+e.currentTarget.value)} />
      <div class="row"><span>Odcień</span><span>{settings.hue}°</span></div>
    </div>
    <div class="fld">
      <span class="lbl">Siatka godzin (komputer)</span>
      <div class="two">
        <div class="fld">
          <label for="s-gfrom">Zawsze od</label>
          <select id="s-gfrom" value={settings.gridRange.from} onchange={(e) => setGridRange(+e.currentTarget.value, settings.gridRange.to)}>
            {#each FROM_HOURS as h}<option value={h}>{pad(h)}:00</option>{/each}
          </select>
        </div>
        <div class="fld">
          <label for="s-gto">Zawsze do</label>
          <select id="s-gto" value={settings.gridRange.to} onchange={(e) => setGridRange(settings.gridRange.from, +e.currentTarget.value)}>
            {#each TO_HOURS as h}<option value={h}>{pad(h)}:00</option>{/each}
          </select>
        </div>
      </div>
      <p class="hint">Siatka zawsze pokazuje co najmniej ten zakres, a rozszerza się, gdy zajęcia zaczynają się wcześniej albo kończą później.</p>
    </div>
    <div class="fld">
      <span class="lbl">Odznaczone typy zajęć</span>
      <Seg items={FM} value={settings.fm} onchange={setFm} />
      <p class="hint">{FM.find((f) => f[0] === settings.fm)?.[2]}</p>
    </div>
  </section>

  <section class="set">
    <h3>Detektor kolizji</h3>
    <Switch label="Wykrywaj kolizje" sub="Pokazuje zajęcia, które nachodzą na siebie, i listę problemów nad planem." checked={settings.cd.on} onchange={(on) => setCollisions({ on })} />
    {#if settings.cd.on}
      <div class="js-cd">
        <Switch label="Uwzględniaj własne wydarzenia" sub="Np. praca albo trening nakładające się na zajęcia." checked={settings.cd.own} onchange={(own) => setCollisions({ own })} />
        <div class="fld">
          <span class="lbl">Ostrzegaj o krótkim przejściu między budynkami</span>
          <Seg items={TRANSFER} value={String(settings.cd.transfer)} onchange={(v) => setCollisions({ transfer: +v })} />
          <p class="hint">Gdy kolejne zajęcia są w innym budynku, a przerwa jest krótsza niż ustawiony czas.</p>
        </div>
      </div>
    {/if}
  </section>

  <section class="set">
    <h3>Pobieranie</h3>
    <div class="fld">
      <label for="s-sync">Automatyczna aktualizacja planu</label>
      <select id="s-sync" value={syncVal} onchange={(e) => pickSync(+e.currentTarget.value)}>
        {#each syncOpts as [m, label] (m)}<option value={m}>{label}</option>{/each}
      </select>
      <p class="hint">
        {#if session.auth}
          Plan z konta USOS może odświeżać się nawet co {SYNC_MIN_ACCOUNT} minut, a plan z linku do kalendarza najczęściej co godzinę. Odstęp krótszy niż godzina działa przy otwarciu apki; gdy jest cały czas otwarta, plan odświeża się w tle co godzinę.
        {:else}
          Bez logowania plan odświeża się najczęściej co godzinę. Po zalogowaniu przez USOS wybierzesz nawet co {SYNC_MIN_ACCOUNT} minut.
        {/if}
        Ręczne odświeżanie działa zawsze.
      </p>
    </div>
    <div class="fld">
      <label for="s-proxy">Serwer pośredniczący</label>
      <input id="s-proxy" type="url" placeholder={'https://twoj-proxy.workers.dev/?url={url}'} value={settings.proxy} onchange={(e) => setProxy(e.currentTarget.value.trim())} />
    </div>
    <p class="hint">Potrzebny tylko wtedy, gdy przeglądarka blokuje pobieranie kalendarza z USOS. <code>{'{url}'}</code> zostanie zastąpione linkiem.</p>
    <div class="two">
      <div class="fld"><label for="s-key">Klucz API USOS</label><input id="s-key" type="text" autocomplete="off" spellcheck="false" bind:value={key} onchange={saveKey} /></div>
      <div class="fld"><label for="s-sec">Sekret klucza</label><input id="s-sec" type="password" autocomplete="off" bind:value={secret} onchange={saveKey} /></div>
    </div>
    <p class="hint">Opcjonalnie. Włącza wyszukiwanie prowadzących po nazwisku i logowanie przez USOS. Darmowy klucz wygenerujesz na <code>usosapi.zut.edu.pl/developers</code>. Zostaje tylko w tej przeglądarce.</p>
  </section>

  <section class="set"><AccountSection /></section>

  <section class="set">
    <h3>Dane</h3>
    <p class="hint">Plany, zmiany, ustawienia i logowanie są zapisane tylko w tej przeglądarce. Możesz je przenieść na inne urządzenie zaszyfrowanym kodem QR.</p>
    <div class="row-btns">
      <button type="button" class="tbtn" onclick={() => openSheet({ name: 'export' })}>Przenieś na inne urządzenie</button>
      <button type="button" class="tbtn" onclick={() => openSheet({ name: 'import', code: null })}>Wczytaj z innego urządzenia</button>
    </div>
    <ConfirmButton confirm="Na pewno usunąć wszystko?" onconfirm={wipe} style="justify-self:start">Usuń wszystkie dane</ConfirmButton>
  </section>

  {#if isNative()}
    <section class="set">
      <h3>Aplikacja</h3>
      <p class="hint">Wersja {VERSION}{release.latest ? `, dostępna jest ${release.latest}` : ', aktualna'}. Aktualizacja nie rusza zapisanych planów.</p>
      <div class="row-btns">
        {@render newsBtn()}
        {#if apkUrl}<button type="button" class="tbtn" disabled={checking} onclick={check}>{checking ? 'Sprawdzam…' : 'Sprawdź aktualizacje'}</button>{/if}
      </div>
    </section>
  {:else}
    {#if apkUrl && isAndroid()}
      <section class="set">
        <h3>Aplikacja</h3>
        <p class="hint">Plan ZUT jest też jako zwykła aplikacja na Androida. Dane ze strony przeniesiesz do niej kodem QR.</p>
        <a class="tbtn" style="justify-self:start" href={apkUrl}>Pobierz plik APK</a>
      </section>
    {/if}
    {#if CHANGELOG.length}
      <section class="set">
        <h3>Co nowego</h3>
        <p class="hint">Ostatnie zmiany: wersja {CHANGELOG[0].v}{CHANGELOG[0].when ? ` (${CHANGELOG[0].when})` : ''}.</p>
        <div class="row-btns">{@render newsBtn()}</div>
      </section>
    {/if}
  {/if}

  {#if author}<p class="made">made with ❤️ by <a href="https://github.com/{author}" target="_blank" rel="noopener">{author}</a></p>{/if}
  {#if github}<a class="btn" style="justify-self:center" href={github} target="_blank" rel="noopener"><Icon name="github" />GitHub</a>{/if}

  {#snippet footer()}
    <button class="btn sp" type="button" onclick={startTour}>Pokaż samouczek</button>
    <button class="btn fill" type="button" onclick={closeSheet}>Gotowe</button>
  {/snippet}
</Sheet>

{#if syncNote}
  <div use:portal>
    <div class="dp-scrim" role="presentation" onclick={() => (syncNote = 0)}></div>
    <div class="dp" role="alertdialog" aria-modal="true" aria-label="Odświeżanie co {syncNote} minut">
      <div class="mk-warn">
        <b>Odświeżanie co {syncNote} minut</b>
        <p>Plan pobierze się od razu, gdy otworzysz apkę albo do niej wrócisz, a od ostatniego pobrania minęło co najmniej {syncNote} minut.</p>
        <p>Gdy apka jest cały czas otwarta, plan odświeża się w tle co godzinę, żeby nie obciążać USOS. W każdej chwili możesz też odświeżyć go ręcznie.</p>
      </div>
      <div class="dp-act">
        <button class="btn fill" type="button" onclick={() => (syncNote = 0)}>Rozumiem</button>
      </div>
    </div>
  </div>
{/if}
