import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { $, $$, finePointer, reduceMotion } from './env.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Callbacks the 3D modules plug into (they are lazy-loaded). */
export const hooks = { hero: null, heroActive: null, world: null, worldActive: null, worldLoad: null };

/* ---- helpers --------------------------------------------------------- */

/** Lines rise out of a mask — a reveal that is about reading order, not a fade. */
function revealLines(el, { trigger = el, start = 'top 86%', delay = 0, stagger = 0.09, duration = 1.15 } = {}) {
  if (!el || reduceMotion) return;
  SplitText.create(el, {
    type: 'lines', mask: 'lines', autoSplit: true,
    onSplit: (self) => gsap.from(self.lines, { yPercent: 118, duration, ease: 'expo.out', stagger, delay, scrollTrigger: { trigger, start, once: true } }),
  });
}

/* ---- HERO ------------------------------------------------------------ */
let heroGo = false;
let heroTween = null;
const heroIn = () => $$('[data-hero-in]');

function setupHero() {
  const title = $('[data-hero-title]');
  if (!reduceMotion) {
    SplitText.create(title, {
      type: 'lines', mask: 'lines', autoSplit: true,
      onSplit: (self) => {
        heroTween = gsap.from(self.lines, { yPercent: 118, duration: 1.4, ease: 'expo.out', stagger: 0.11, paused: !heroGo });
        return heroTween;
      },
    });
    gsap.set(heroIn(), { y: 36, autoAlpha: 0 });
  }

  // Scroll: copy drifts up, the stage pushes in; 3D module gets the progress value.
  const st = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  if (!reduceMotion) {
    gsap.to('.hero__inner', { yPercent: -16, ease: 'none', scrollTrigger: st });
    gsap.to('[data-hero-stage]', { scale: 1.1, yPercent: 8, ease: 'none', scrollTrigger: st });
  }
  ScrollTrigger.create({ ...st, onUpdate: (s) => hooks.hero?.(s.progress), onToggle: (s) => hooks.heroActive?.(s.isActive) });
}

export function playHero() {
  heroGo = true;
  heroTween?.play();
  if (!reduceMotion) gsap.to(heroIn(), { y: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.35 });
}

/* ---- MANIFESTO ------------------------------------------------------- */
function setupManifesto() {
  const text = $('[data-mani-text]');
  if (!reduceMotion) {
    const sp = SplitText.create(text, { type: 'words', wordsClass: 'w' });
    gsap.fromTo(sp.words, { color: '#BDBCB6' }, {
      color: '#141414', ease: 'none', stagger: 0.14,
      scrollTrigger: { trigger: text, start: 'top 82%', end: 'bottom 48%', scrub: 0.5 },
    });
    gsap.from('.mani__tags li', { yPercent: 120, duration: 1, ease: 'expo.out', stagger: 0.08, scrollTrigger: { trigger: '.mani__tags', start: 'top 92%', once: true } });
  }
}

/* ---- DIRECTIONS (sticky stack) ---------------------------------------- */
function setupDirections() {
  const dirs = $$('[data-dir]');
  dirs.forEach((dir, i) => {
    revealLines($('[data-split]', dir), { trigger: dir, start: 'top 72%' });
    if (!reduceMotion) {
      gsap.from($$('.dir__rows > div', dir), { y: 34, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.09, scrollTrigger: { trigger: dir, start: 'top 62%', once: true } });
      gsap.from($$('.btn', dir), { y: 28, autoAlpha: 0, duration: 1, ease: 'expo.out', delay: 0.3, scrollTrigger: { trigger: dir, start: 'top 62%', once: true } });
      gsap.fromTo($('.dir__num', dir), { yPercent: 14 }, { yPercent: -8, ease: 'none', scrollTrigger: { trigger: dir, start: 'top bottom', end: 'bottom top', scrub: true } });
      gsap.fromTo($('.dir__art img', dir), { yPercent: 6, scale: 1.04 }, { yPercent: -4, scale: 1, ease: 'none', scrollTrigger: { trigger: dir, start: 'top bottom', end: 'bottom top', scrub: true } });
      if (i < dirs.length - 1) {
        const link = { trigger: dirs[i + 1], start: 'top bottom', end: 'top top', scrub: true };
        gsap.to(dir, { scale: 0.92, ease: 'none', scrollTrigger: link });
        gsap.to($('[data-veil]', dir), { opacity: 0.55, ease: 'none', scrollTrigger: link });
      }
    }
    // pointer tilt on the artwork
    const art = $('[data-tilt]', dir);
    if (art && finePointer && !reduceMotion) {
      const img = $('img', art);
      const rx = gsap.quickTo(img, 'rotationX', { duration: 0.8, ease: 'power3' });
      const ry = gsap.quickTo(img, 'rotationY', { duration: 0.8, ease: 'power3' });
      art.addEventListener('pointermove', (e) => {
        const r = art.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * 9);
        rx(-((e.clientY - r.top) / r.height - 0.5) * 7);
      });
      art.addEventListener('pointerleave', () => { rx(0); ry(0); });
    }
  });
}

/* ---- RESULTS (pinned horizontal) -------------------------------------- */
function setupResults() {
  const section = $('[data-res]');
  const pin = $('[data-res-pin]');
  const track = $('[data-res-track]');
  const bar = $('[data-res-bar]');
  const count = $('[data-res-count]');
  const stamps = $$('[data-stamp]', section);
  revealLines($('[data-split]', section), { trigger: section, start: 'top 70%' });
  if (reduceMotion) return;

  const dist = () => Math.max(0, track.scrollWidth - innerWidth);
  const tween = gsap.to(track, {
    x: () => -dist(), ease: 'none',
    scrollTrigger: {
      trigger: section, start: 'top top', end: () => '+=' + dist() * 1.05, pin, scrub: 0.7, anticipatePin: 1, invalidateOnRefresh: true,
      onUpdate: (s) => {
        bar.parentElement.style.setProperty('--p', s.progress.toFixed(4));
        bar.style.setProperty('--p', s.progress.toFixed(4));
        const i = Math.min(3, Math.floor(s.progress * 3 + 0.0001) + 1);
        count.textContent = `0${i} / 03`;
      },
    },
  });

  stamps.forEach((st) => {
    const base = parseFloat(getComputedStyle(st).getPropertyValue('--sr')) || -6;
    const holder = st.closest('.rcard') || st.parentElement;
    gsap.set(st, { rotation: base + 16, scale: 2.8, autoAlpha: 0 });
    ScrollTrigger.create({
      trigger: holder, containerAnimation: tween, start: 'left 66%', once: true,
      onEnter: () => {
        gsap.timeline()
          .to(st, { scale: 1, rotation: base, autoAlpha: 1, duration: 0.42, ease: 'power4.in' })
          .to(holder, { y: 6, duration: 0.07, ease: 'power2.out' }, '>-0.02')
          .to(holder, { y: 0, duration: 0.5, ease: 'elastic.out(1, .4)' });
      },
    });
  });
}

/* ---- WORLD (globe) ---------------------------------------------------- */
function setupWorld() {
  const world = $('[data-world]');
  const pin = $('[data-world-pin]');
  ScrollTrigger.create({ trigger: world, start: 'top 260%', once: true, onEnter: () => hooks.worldLoad?.() });
  ScrollTrigger.create({ trigger: world, start: 'top bottom', end: 'bottom top', onToggle: (s) => hooks.worldActive?.(s.isActive) });
  if (reduceMotion) { hooks.world?.(1); return; }
  ScrollTrigger.create({
    trigger: world, start: 'top top', end: '+=230%', pin, scrub: true, anticipatePin: 1,
    onUpdate: (s) => hooks.world?.(s.progress),
  });
  revealLines($('.t1', world), { trigger: world, start: 'top 55%' });
  gsap.from($('.t2', world), { clipPath: 'inset(0 100% 0 0)', duration: 1.2, ease: 'expo.inOut', delay: 0.2, scrollTrigger: { trigger: world, start: 'top 55%', once: true } });
  revealLines($('.world__lead', world), { trigger: world, start: 'top 45%', delay: 0.3 });
}

/* ---- TEAM ------------------------------------------------------------- */
function setupTeam() {
  const people = $$('[data-person]');
  people.forEach((p) => {
    revealLines($('[data-split]', p), { trigger: p, start: 'top 78%' });
    if (reduceMotion) return;
    const wrap = $('[data-wipe]', p);
    const img = $('img', wrap);
    gsap.set(img, { scale: 1.3 });
    gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 80%', once: true } })
      .to(wrap, { clipPath: 'inset(0 0 0% 0)', duration: 1.5, ease: 'expo.inOut' })
      .to(img, { scale: 1.08, duration: 1.8, ease: 'expo.out' }, '<0.1');
    gsap.to(img, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ---- CONTACT + FOOTER ------------------------------------------------- */
function setupContact() {
  const title = $('.contact__title');
  revealLines(title, { trigger: '.contact', start: 'top 62%' });
  if (reduceMotion) return;
  gsap.from('.contact__title em', { rotation: 7, duration: 1.4, ease: 'elastic.out(1, .5)', scrollTrigger: { trigger: '.contact', start: 'top 55%', once: true } });
  gsap.from(['.contact__sub', ...$$('.crow li'), ...$$('.form > *')], { y: 36, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.07, scrollTrigger: { trigger: '.contact__grid', start: 'top 82%', once: true } });
}

function setupFooter() {
  if (reduceMotion) return;
  gsap.fromTo('[data-foot-word]', { yPercent: 38 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '[data-foot]', start: 'top bottom', end: 'bottom bottom', scrub: true } });
}

export function initSections() {
  ScrollTrigger.config({ ignoreMobileResize: true });
  setupHero();
  setupManifesto();
  setupDirections();
  setupResults();
  setupWorld();
  setupTeam();
  setupContact();
  setupFooter();
}
