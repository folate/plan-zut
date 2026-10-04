import { mount } from 'svelte';
import './styles/index.css';
import App from './App.svelte';
import { isIos } from './lib/platform';
import { applyAppearance } from './lib/settings.svelte';

applyAppearance();

if (isIos(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)) {
  const viewport = document.querySelector('meta[name=viewport]');
  viewport?.setAttribute('content', viewport.getAttribute('content') + ',maximum-scale=1');
}

export default mount(App, { target: document.getElementById('app')! });
