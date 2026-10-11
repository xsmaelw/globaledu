import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { $, $$, reduceMotion } from './env.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Callbacks the 3D modules plug into (they are lazy-loaded). */
export const hooks = { worldActive: null, worldLoad: null };

/* ---- helpers --------------------------------------------------------- */

/** Lines rise out of a mask — a reveal that is about reading order, not a fade. */
function revealLines(el, { trigger = el, start = 'top 96%', delay = 0, stagger = 0.08, duration = 0.95 } = {}) {
  if (!el || reduceMotion) return;
  SplitText.create(el, {
    type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
    onSplit: (self) => {
      gsap.set(el, { visibility: 'visible' });   // lines start below their mask, so nothing shows early
      return gsap.from(self.lines, { yPercent: 135, duration, ease: 'expo.out', stagger, delay, scrollTrigger: { trigger, start, once: true } });
    },
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
      type: 'lines', mask: 'lines', linesClass: 'ln', autoSplit: true,
      onSplit: (self) => {
        gsap.set(title, { visibility: 'visible' });
        heroTween = gsap.from(self.lines, { yPercent: 135, duration: 1.4, ease: 'expo.out', stagger: 0.11, paused: !heroGo });
        return heroTween;
      },
    });
    gsap.set(heroIn(), { y: 36, autoAlpha: 0 });
  }

}

export function playHero() {
  heroGo = true;
  heroTween?.play();
  if (!reduceMotion) gsap.to(heroIn(), { y: 0, autoAlpha: 1, duration: 1.1, ease: 'expo.out', stagger: 0.12, delay: 0.35 });
}

/* ---- MANIFESTO ------------------------------------------------------- */
// Written in, line by line, as soon as the paragraph enters the screen (no scrubbing): each line is revealed
// by a soft-edged wipe that travels along it, like ink flowing from a pen, with a slight settle upward.
function setupManifesto() {
  const text = $('[data-mani-text]');
  if (reduceMotion) return;
  SplitText.create(text, {
    type: 'lines', linesClass: 'wl', autoSplit: true,
    onSplit: (self) => {
      gsap.set(text, { visibility: 'visible' });
      gsap.set(self.lines, { '--p': '0%', y: 10 });
      return gsap.to(self.lines, {
        '--p': '118%', y: 0, duration: 2.3, ease: 'power1.inOut', stagger: 0.7,
        scrollTrigger: { trigger: text, start: 'top 94%', once: true },
      });
    },
  });
  gsap.fromTo('.mani__tags li', { autoAlpha: 0, y: 16 }, { autoAlpha: 1, y: 0, duration: 1, ease: 'power2.out', stagger: 0.1, delay: 1.2, scrollTrigger: { trigger: text, start: 'top 94%', once: true } });
}

/* ---- DIRECTIONS (plain coloured sections) ------------------------------ */
function setupDirections() {
  $$('[data-dir]').forEach((dir) => {
    revealLines($('[data-split]', dir), { trigger: dir, start: 'top 88%' });
    if (reduceMotion) return;
    gsap.from($$('.dir__rows > div', dir), { y: 24, autoAlpha: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06, scrollTrigger: { trigger: dir, start: 'top 82%', once: true } });
    gsap.from($$('.btn', dir), { autoAlpha: 0, duration: 0.8, ease: 'power2.out', delay: 0.25, scrollTrigger: { trigger: dir, start: 'top 82%', once: true } });
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
      trigger: section, start: 'top top', end: () => '+=' + dist() * 0.8, pin, scrub: 0.25, anticipatePin: 1, invalidateOnRefresh: true,
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

/* ---- WORLD (globe plays on its own) ----------------------------------- */
function setupWorld() {
  const world = $('[data-world]');
  ScrollTrigger.create({ trigger: world, start: 'top 260%', once: true, onEnter: () => hooks.worldLoad?.() });
  ScrollTrigger.create({ trigger: world, start: 'top bottom', end: 'bottom top', onToggle: (s) => hooks.worldActive?.(s.isActive) });
  if (reduceMotion) return;
  revealLines($('.t1', world), { trigger: world, start: 'top 70%' });
  gsap.from($('.t2', world), { clipPath: 'inset(0 100% -30% 0)', clearProps: 'clipPath', duration: 1.1, ease: 'expo.inOut', delay: 0.15, scrollTrigger: { trigger: world, start: 'top 70%', once: true } });
  revealLines($('.world__lead', world), { trigger: world, start: 'top 60%', delay: 0.25 });
}

/* ---- TEAM ------------------------------------------------------------- */
function setupTeam() {
  const people = $$('[data-person]');
  people.forEach((p) => {
    revealLines($('[data-split]', p), { trigger: p, start: 'top 90%' });
    if (reduceMotion) return;
    const wrap = $('[data-wipe]', p);
    const img = $('img', wrap);
    gsap.set(img, { scale: 1.3 });
    gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 92%', once: true } })
      .to(wrap, { clipPath: 'inset(0 0 0% 0)', duration: 1.5, ease: 'expo.inOut' })
      .to(img, { scale: 1.08, duration: 1.8, ease: 'expo.out' }, '<0.1');
    gsap.to(img, { yPercent: -6, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ---- CONTACT + FOOTER ------------------------------------------------- */
function setupContact() {
  const title = $('.contact__title');
  revealLines(title, { trigger: '.contact', start: 'top 80%' });
  if (reduceMotion) return;
  gsap.from('.contact__title em', { rotation: 7, duration: 1.4, ease: 'elastic.out(1, .5)', scrollTrigger: { trigger: '.contact', start: 'top 55%', once: true } });
  const trig = { trigger: '.contact__grid', start: 'top 92%', once: true };
  gsap.from(['.contact__sub', ...$$('.crow li'), ...$$('.form > :not(.btn)')], { y: 30, autoAlpha: 0, duration: 1, ease: 'expo.out', stagger: 0.07, scrollTrigger: trig });
  gsap.from('.form > .btn', { autoAlpha: 0, duration: 0.9, ease: 'power2.out', delay: 0.4, scrollTrigger: trig });   // fade only: its transform belongs to the magnetic effect
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
