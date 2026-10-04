<script lang="ts">
  import { onMount } from 'svelte';

  let { onresult }: { onresult: (text: string) => void } = $props();

  let video = $state<HTMLVideoElement>();
  let error = $state('');

  onMount(() => {
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      } catch {
        error = 'Nie mam dostępu do aparatu. Zezwól na niego w przeglądarce albo wklej link ręcznie.';
        return;
      }
      if (stopped || !video) return stop();
      video.srcObject = stream;
      await video.play().catch(() => {});

      const detector = 'BarcodeDetector' in window ? new (window as any).BarcodeDetector({ formats: ['qr_code'] }) : null;
      const jsQR = detector ? null : (await import('jsqr')).default;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
      let busy = false;

      timer = setInterval(async () => {
        if (busy || !video || video.readyState < 2) return;
        busy = true;
        try {
          let text = '';
          if (detector) text = (await detector.detect(video))[0]?.rawValue || '';
          else if (jsQR) {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            ctx.drawImage(video, 0, 0);
            text = jsQR(ctx.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data || '';
          }
          if (text) {
            stop();
            onresult(text);
          }
        } catch {}
        busy = false;
      }, 250);
    }

    function stop() {
      stopped = true;
      clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    }

    start();
    return stop;
  });
</script>

<div class="scan">
  {#if error}
    <p class="msg">{error}</p>
  {:else}
    <!-- svelte-ignore a11y_media_has_caption -->
    <video bind:this={video} playsinline muted></video>
    <p class="hint">Skieruj aparat na kod QR z pierwszego urządzenia.</p>
  {/if}
</div>
