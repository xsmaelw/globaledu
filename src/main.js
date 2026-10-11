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

/* Hero loop: autoplay muted video; resolves when it can play (or after a short timeout). */
const heroReady = new Promise((resolve) => {
  const v = $('[data-hero-video]');
  if (!v) return resolve();
  if (reduceMotion) { v.removeAttribute('autoplay'); v.pause(); return resolve(); }
  const done = () => resolve();
  if (v.readyState >= 3) done(); else v.addEventListener('canplay', done, { once: true });
  setTimeout(done, 2500);
  v.play?.().catch(() => {});
});

/* The globe is a separate chunk, loaded just before its section. */
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
