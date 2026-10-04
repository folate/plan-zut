import { defineConfig, loadEnv, type Plugin } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { VitePWA } from 'vite-plugin-pwa';

function umami(mode: string): Plugin {
  const env = loadEnv(mode, process.cwd());
  return {
    name: 'umami',
    apply: 'build',
    transformIndexHtml() {
      if (mode === 'native' || !env.VITE_UMAMI_URL || !env.VITE_UMAMI_ID) return;
      return [
        {
          tag: 'script',
          attrs: { defer: true, src: env.VITE_UMAMI_URL, 'data-website-id': env.VITE_UMAMI_ID, 'data-exclude-search': 'true', 'data-exclude-hash': 'true' },
          injectTo: 'head'
        }
      ];
    }
  };
}

function og(mode: string): Plugin {
  const site = (loadEnv(mode, process.cwd()).VITE_SITE_URL || '').replace(/\/$/, '');
  const meta = (key: string, name: string, content: string) => ({ tag: 'meta', attrs: { [key]: name, content }, injectTo: 'head' as const });
  return {
    name: 'og',
    transformIndexHtml() {
      if (mode === 'native' || !site) return;
      return [
        meta('property', 'og:type', 'website'),
        meta('property', 'og:url', site + '/'),
        meta('property', 'og:title', 'Plan zajęć ZUT'),
        meta('property', 'og:description', 'Plan z USOS, na który da się patrzeć. Przerwy, okienka, zmiany sal i porównywanie planów.'),
        meta('property', 'og:image', site + '/og.png'),
        meta('property', 'og:image:width', '1200'),
        meta('property', 'og:image:height', '630'),
        meta('property', 'og:locale', 'pl_PL'),
        meta('name', 'twitter:card', 'summary_large_image'),
        meta('name', 'twitter:image', site + '/og.png')
      ];
    }
  };
}

export default defineConfig(({ mode }) => ({
  base: './',
  envPrefix: ['VITE_', 'APP_'],
  plugins: [
    svelte(),
    umami(mode),
    og(mode),
    VitePWA({
      disable: mode === 'native',
      registerType: 'autoUpdate',
      injectRegister: 'script',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Plan zajęć ZUT',
        short_name: 'Plan ZUT',
        description: 'Plan zajęć z USOS ZUT',
        lang: 'pl',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        theme_color: '#fff8f6',
        background_color: '#fff8f6',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png}'],
        globIgnores: ['og.png'],
        navigateFallback: 'index.html',
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          { urlPattern: /^https:\/\/fonts\.googleapis\.com\//, handler: 'StaleWhileRevalidate', options: { cacheName: 'fonts-css', cacheableResponse: { statuses: [0, 200] } } },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\//,
            handler: 'CacheFirst',
            options: { cacheName: 'fonts', cacheableResponse: { statuses: [0, 200] }, expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } }
          }
        ]
      }
    })
  ]
}));
