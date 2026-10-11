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
import { $ } from './js/env.js';
import { initSmooth } from './js/smooth.js';
import { runPreloader } from './js/preloader.js';
import { initHeader } from './js/header.js';
import { initCursor } from './js/cursor.js';
import { initMagnetic } from './js/magnetic.js';
import { initForm } from './js/form.js';
import { initPrivacy } from './js/priv.js';
import { initSections, playHero, hooks } from './js/sections.js';

gsap.registerPlugin(ScrollTrigger);
history.scrollRestoration = 'manual';
// Safety net: never leave a visitor behind the preloader if something above fails.
setTimeout(() => { document.body.classList.remove('is-loading'); $('.pre')?.remove(); }, 9000);

const lenis = initSmooth();
const fontsReady = Promise.all([
  document.fonts.load('300 40px "Manrope Variable"'),
  document.fonts.load('italic 400 40px "Playfair Display"'),
  document.fonts.load('400 40px "Great Vibes"'),
]).catch(() => {}).then(() => document.fonts.ready);

/* 3D layers are loaded as separate chunks so the first paint stays light. */
let hero3d = null;
const heroReady = (async () => {
  const canvas = $('[data-hero-canvas]');
  if (!canvas) return;
  try {
    const { initHero3D } = await import('./js/hero3d.js');
    hero3d = await initHero3D({ canvas, hero: $('[data-hero]') });
    if (hero3d) { hooks.hero = (p) => hero3d.setProgress(p); hooks.heroActive = (v) => hero3d.setActive(v); }
  } catch (err) { console.warn('[hero3d] disabled:', err); }
})();

let globe = null;
hooks.worldLoad = async () => {
  if (globe !== null) return;
  globe = false;
  try {
    const { initGlobe } = await import('./js/globe3d.js');
    globe = await initGlobe({ canvas: $('[data-globe-canvas]'), pin: $('[data-world-pin]'), list: $('[data-cities]') });
    if (globe) {
      hooks.world = (p) => globe.setProgress(p);
      hooks.worldActive = (v) => globe.setActive(v);
    } else { $('[data-globe-canvas]').hidden = true; $('.world__fallback').hidden = false; }
  } catch (err) {
    console.warn('[globe3d] disabled:', err);
    $('[data-globe-canvas]').hidden = true; $('.world__fallback').hidden = false;
  }
};

fontsReady.then(() => {
  initHeader(lenis);
  initCursor();
  initMagnetic();
  initForm(lenis);
  initPrivacy(lenis);
  initSections();
  ScrollTrigger.refresh();
  addEventListener('load', () => ScrollTrigger.refresh());
});

runPreloader(Promise.all([fontsReady, heroReady])).then(() => {
  window.scrollTo(0, 0);
  playHero();
});
