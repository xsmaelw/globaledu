import '@fontsource-variable/manrope';
import '@fontsource/playfair-display/latin-400-italic.css';
import '@fontsource/playfair-display/latin-ext-400-italic.css';
import '@fontsource/playfair-display/latin-400.css';
import '@fontsource/great-vibes/latin-400.css';
import '@fontsource/jetbrains-mono/latin-400.css';
import '@fontsource/jetbrains-mono/latin-500.css';
import './css/main.css';

import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { $, reduceMotion } from './js/env.js';
import { initSmooth } from './js/smooth.js';
import { runPreloader } from './js/preloader.js';
import { initHeader } from './js/header.js';
import { initMagnetic } from './js/magnetic.js';
import { initForm } from './js/form.js';
import { initPrivacy } from './js/priv.js';
import { initSections, playHero, hooks } from './js/sections.js';

gsap.registerPlugin(ScrollTrigger);
history.scrollRestoration = 'manual';
if (reduceMotion) document.documentElement.classList.remove('js');
// Safety net: never leave a visitor behind the preloader if something above fails.
setTimeout(() => { document.body.classList.remove('is-loading'); $('.pre')?.remove(); if (!window.__geReady) document.documentElement.classList.remove('js'); }, 9000);

const lenis = initSmooth();
const fontsReady = Promise.all([
  document.fonts.load('300 40px "Manrope Variable"'),
  document.fonts.load('italic 400 40px "Playfair Display"'),
  document.fonts.load('400 40px "Great Vibes"'),
]).catch(() => {}).then(() => document.fonts.ready);

/* Moving gradient backgrounds: loaded as a separate chunk once the first coloured section is near the viewport. */
{
  const hosts = document.querySelectorAll('[data-gradient]');
  if (hosts.length && 'IntersectionObserver' in window) {
    const io = new IntersectionObserver((entries) => {
      if (!entries.some((e) => e.isIntersecting)) return;
      io.disconnect();
      import('./js/gradient.js').then((m) => m.initGradients()).catch((err) => console.warn('[gradient] disabled:', err));
    }, { rootMargin: '1200px' });
    hosts.forEach((h) => io.observe(h));
  }
}

/* The globe is a separate chunk, loaded just before its section. */
let globe = null;
hooks.worldLoad = async () => {
  if (globe !== null) return;
  globe = false;
  try {
    const { initGlobe } = await import('./js/globe3d.js');
    globe = await initGlobe({ canvas: $('[data-globe-canvas]'), pin: $('[data-world-pin]'), list: $('[data-cities]') });
    if (globe) {
      hooks.worldActive = (v) => globe.setActive(v);
      const r = $('[data-world]').getBoundingClientRect();           // the toggle may have fired before the chunk loaded
      globe.setActive(r.bottom > 0 && r.top < innerHeight);
    } else { $('[data-globe-canvas]').hidden = true; $('.world__fallback').hidden = false; }
  } catch (err) {
    console.warn('[globe3d] disabled:', err);
    $('[data-globe-canvas]').hidden = true; $('.world__fallback').hidden = false;
  }
};

fontsReady.then(() => {
  initHeader(lenis);
  initMagnetic();
  initForm(lenis);
  initPrivacy(lenis);
  initSections();
  window.__geReady = true;
  ScrollTrigger.refresh();
  addEventListener('load', () => ScrollTrigger.refresh());
});

runPreloader(fontsReady).then(() => {
  window.scrollTo(0, 0);
  playHero();
});
