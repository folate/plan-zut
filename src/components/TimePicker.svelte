<script lang="ts">
  import { pad } from '../lib/dates';

  let { value, title = 'Wybierz godzinę', onpick, onclose }: { value: string; title?: string; onpick: (v: string) => void; onclose: () => void } = $props();

  // svelte-ignore state_referenced_locally
  const [h0, m0] = (value || '12:00').split(':').map(Number);
  let h = $state(h0), m = $state(m0);
  let hs = $state(pad(h0)), ms = $state(pad(m0));
  let mode = $state<'h' | 'm'>('h');
  let hEl = $state<HTMLInputElement>(), mEl = $state<HTMLInputElement>();

  const OUT = 104, IN = 62;
  const at = (i: number, r: number) => `left:${128 + r * Math.sin((i * Math.PI) / 6)}px;top:${128 - r * Math.cos((i * Math.PI) / 6)}px`;
  const inner = $derived(mode === 'h' && (h === 0 || h > 12));
  const hand = $derived(`height:${inner ? IN : OUT}px;transform:rotate(${mode === 'h' ? (h % 12) * 30 : m * 6}deg)`);

  function setH(n: number) { h = n; hs = pad(n); }
  function setM(n: number) { m = n; ms = pad(n); }
  function typed(e: Event & { currentTarget: HTMLInputElement }, max: number, set: (n: number) => void) {
    const s = e.currentTarget.value.replace(/\D/g, '');
    e.currentTarget.value = s;
    if (s !== '' && +s <= max) set(+s);
    return s;
  }

  let drag = false;
  function point(e: PointerEvent & { currentTarget: HTMLElement }) {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - r.left - r.width / 2, dy = e.clientY - r.top - r.height / 2;
    const ang = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360;
    if (mode === 'm') return setM(Math.round(ang / 6) % 60);
    const i = Math.round(ang / 30) % 12;
    setH(Math.hypot(dx, dy) < ((OUT + IN) / 2 / 256) * r.width ? (i ? i + 12 : 0) : i || 12);
  }
  function down(e: PointerEvent & { currentTarget: HTMLElement }) {
    drag = true;
    e.currentTarget.setPointerCapture(e.pointerId);
    point(e);
  }
  function up() {
    if (drag && mode === 'h') mode = 'm';
    drag = false;
  }
  const done = () => onpick(`${pad(h)}:${pad(m)}`);
  function key(e: KeyboardEvent) {
    e.stopPropagation();
    if (e.key === 'Escape') onclose();
    if (e.key === 'Enter') { e.preventDefault(); done(); }
  }
  function portal(node: HTMLElement) {
    document.body.appendChild(node);
    node.querySelector<HTMLElement>('.dp')?.focus();
    return { destroy: () => node.remove() };
  }
</script>

<div use:portal>
  <div class="dp-scrim" role="presentation" onclick={onclose}></div>
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div class="dp tp" role="dialog" aria-modal="true" aria-label={title} tabindex="-1" onkeydown={key}>
    <span class="tp-title">{title}</span>
    <div class="tp-time">
      <input
        bind:this={hEl} class:on={mode === 'h'} type="text" inputmode="numeric" maxlength="2" aria-label="Godzina" value={hs}
        onfocus={() => { mode = 'h'; hEl?.select(); }} oninput={(e) => { hs = typed(e, 23, (n) => (h = n)); if (hs.length === 2) mEl?.focus(); }} onblur={() => (hs = pad(h))}
      />
      <b>:</b>
      <input
        bind:this={mEl} class:on={mode === 'm'} type="text" inputmode="numeric" maxlength="2" aria-label="Minuty" value={ms}
        onfocus={() => { mode = 'm'; mEl?.select(); }} oninput={(e) => (ms = typed(e, 59, (n) => (m = n)))} onblur={() => (ms = pad(m))}
      />
    </div>
    <div class="tp-dial" role="presentation" onpointerdown={down} onpointermove={(e) => drag && point(e)} onpointerup={up} onpointercancel={() => (drag = false)}>
      <i class="tp-hand" style={hand}></i>
      {#if mode === 'h'}
        {#each Array(12) as _, i}
          <span class:on={h === (i || 12)} style={at(i, OUT)}>{i || 12}</span>
          <span class="in" class:on={h === (i ? i + 12 : 0)} style={at(i, IN)}>{i ? i + 12 : '00'}</span>
        {/each}
      {:else}
        {#each Array(12) as _, i}<span class:on={m === i * 5} style={at(i, OUT)}>{pad(i * 5)}</span>{/each}
      {/if}
    </div>
    <div class="dp-act">
      <button type="button" class="btn" onclick={onclose}>Anuluj</button>
      <button type="button" class="btn" onclick={done}>OK</button>
    </div>
  </div>
</div>
