import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { $, $$, reduceMotion } from './env.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

/** Callbacks the 3D modules plug into (they are lazy-loaded). */
export const hooks = { worldActive: null, worldLoad: null };

/* ---- helpers --------------------------------------------------------- */

/** The text body itself eases in: opacity, a few px of lift and a breath of blur that clears. No masks, no per-line motion. */
function fade(el, { trigger = el, start = 'top 92%', delay = 0, duration = 1.6 } = {}) {
  if (!el || reduceMotion) return null;
  return gsap.fromTo(el,
    { autoAlpha: 0, y: 16, filter: 'blur(6px)' },
    { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration, delay, ease: 'power2.out', clearProps: 'filter', scrollTrigger: { trigger, start, once: true } });
}

/* ---- HERO ------------------------------------------------------------ */
let heroGo = false;
let heroTween = null;
const heroIn = () => [...$$('[data-hero-in]'), $('.pl')].filter(Boolean);

function setupHero() {
  if (reduceMotion) return;
  const title = $('[data-hero-title]');
  heroTween = gsap.fromTo(title, { autoAlpha: 0, y: 16, filter: 'blur(8px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.9, ease: 'power2.out', clearProps: 'filter', paused: !heroGo });
  gsap.set(heroIn(), { autoAlpha: 0 });
}

export function playHero() {
  heroGo = true;
  heroTween?.play();
  if (!reduceMotion) gsap.to(heroIn(), { autoAlpha: 1, duration: 1.8, ease: 'power2.out', stagger: 0.25, delay: 0.5 });
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

/* ---- DIRECTIONS ---------------------------------------------------------
   Desktop: one pinned stage; scrolling transforms it — the colour field and its shader cross-dissolve into the next,
   the old copy drifts away and the new copy settles in. Phones / reduced motion: the four panels simply stack. */
function setupDirections() {
  const dirs = $('[data-dirs]');
  const panels = $$('[data-dir]', dirs);
  const mm = gsap.matchMedia();

  mm.add('(min-width: 961px) and (min-height: 560px)', () => {
    if (reduceMotion) return undefined;
    const n = panels.length;
    const dots = $$('.dirs__nav i', dirs);
    const count = $('[data-dirs-count]', dirs);
    dirs.classList.add('is-morph');
    panels.forEach((p, i) => { gsap.set(p, { autoAlpha: i ? 0 : 1, zIndex: i + 1 }); if (i) p.setAttribute('data-idle', ''); });
    const parts = (p) => [$('.dir__text', p), $('.dir__art', p)];

    const tl = gsap.timeline({ defaults: { ease: 'none' } });
    for (let k = 1; k < n; k++) {
      const t = k - 1, prev = panels[k - 1], next = panels[k];
      tl.to(parts(prev), { autoAlpha: 0, y: -36, filter: 'blur(6px)', duration: 0.42, ease: 'power1.in' }, t + 0.15)
        .to(next, { autoAlpha: 1, duration: 0.6, ease: 'power1.inOut' }, t + 0.25)
        .fromTo(parts(next), { autoAlpha: 0, y: 44, filter: 'blur(6px)' }, { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 0.55, ease: 'power2.out', stagger: 0.08 }, t + 0.45)
        .fromTo($('.dir__art img', next), { scale: 1.12 }, { scale: 1, duration: 0.9, ease: 'power1.out' }, t + 0.35)
        .set(prev, { autoAlpha: 0 }, t + 1);
    }
    tl.to({}, { duration: 0.25 });

    const st = ScrollTrigger.create({
      trigger: dirs, start: 'top top', end: () => '+=' + Math.round(innerHeight * (n - 1) * 0.95 + innerHeight * 0.2), pin: true, scrub: 0.9, anticipatePin: 1, invalidateOnRefresh: true, animation: tl,
      onUpdate: (self) => {
        const f = self.progress * tl.duration();
        panels.forEach((p, i) => { const idle = Math.abs(i - f) >= 1; if (idle !== p.hasAttribute('data-idle')) p.toggleAttribute('data-idle', idle); });
        const a = Math.min(n - 1, Math.max(0, Math.round(f)));
        dots.forEach((d, i) => d.classList.toggle('is-on', i === a));
        count.textContent = `0${a + 1} / 0${n}`;
      },
    });
    dots[0]?.classList.add('is-on');
    return () => { dirs.classList.remove('is-morph'); st.kill(); tl.kill(); panels.forEach((p) => { p.removeAttribute('data-idle'); gsap.set([p, ...parts(p), $('.dir__art img', p)], { clearProps: 'all' }); }); };
  });

  mm.add('(max-width: 960px), (max-height: 559px)', () => {
    if (reduceMotion) return;
    panels.forEach((dir) => {
      fade($('.dir__title', dir), { trigger: dir, start: 'top 80%' });
      gsap.from([...$$('.dir__rows > div', dir), $('.dir__art', dir)], { autoAlpha: 0, y: 20, duration: 1.2, ease: 'power2.out', stagger: 0.08, scrollTrigger: { trigger: dir, start: 'top 70%', once: true } });
    });
  });
}

/* ---- RESULTS (a calm grid, no horizontal scroll) ---------------------- */
function setupResults() {
  const section = $('[data-res]');
  fade($('.res__title', section), { trigger: section, start: 'top 75%' });
  fade($('.res__sub', section), { trigger: section, start: 'top 75%', delay: 0.2 });
  if (reduceMotion) return;
  $$('[data-rcard]', section).forEach((card, i) => {
    const st = $('[data-stamp]', card);
    const base = parseFloat(getComputedStyle(st).getPropertyValue('--sr')) || -6;
    gsap.set(st, { rotation: base + 14, scale: 2.4, autoAlpha: 0 });
    gsap.timeline({ scrollTrigger: { trigger: card, start: 'top 82%', once: true }, delay: i * 0.08 })
      .from(card, { autoAlpha: 0, y: 40, duration: 1.4, ease: 'power2.out' })
      .to(st, { scale: 1, rotation: base, autoAlpha: 1, duration: 0.45, ease: 'power4.in' }, '>-0.2')
      .to(card, { y: 5, duration: 0.07, ease: 'power2.out' }, '>-0.02')
      .to(card, { y: 0, duration: 0.5, ease: 'elastic.out(1, .4)' });
  });
}

/* ---- WORLD (globe plays on its own) ----------------------------------- */
function setupWorld() {
  const world = $('[data-world]');
  ScrollTrigger.create({ trigger: world, start: 'top 260%', once: true, onEnter: () => hooks.worldLoad?.() });
  ScrollTrigger.create({ trigger: world, start: 'top bottom', end: 'bottom top', onToggle: (s) => hooks.worldActive?.(s.isActive) });
  if (reduceMotion) return;
  fade($('.world__title', world), { trigger: world, start: 'top 70%', duration: 1.8 });
  fade($('.world__lead', world), { trigger: world, start: 'top 60%', delay: 0.3 });
}

/* ---- TEAM ------------------------------------------------------------- */
// Each card's photo is drawn open; the name is then written onto its badge as the card scrolls through view.
function setupTeam() {
  $$('[data-person]').forEach((p) => {
    if (reduceMotion) return;
    const wrap = $('[data-wipe]', p);
    const img = $('img', wrap);
    const badge = $('.badge', p);
    const name = $('[data-badge-name]', p);
    gsap.set(img, { scale: 1.3 });
    gsap.set(badge, { autoAlpha: 0, y: 22 });
    gsap.set(name, { '--p': '0%' });
    gsap.timeline({ scrollTrigger: { trigger: p, start: 'top 90%', once: true } })
      .to(wrap, { clipPath: 'inset(0 0 0% 0)', duration: 1.6, ease: 'expo.inOut' })
      .to(img, { scale: 1.06, duration: 1.8, ease: 'expo.out' }, '<0.1')
      .to(badge, { autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out' }, '>-0.9');
    gsap.to(name, { '--p': '118%', ease: 'none', scrollTrigger: { trigger: p, start: 'top 58%', end: 'top 22%', scrub: 0.6 } });
    gsap.to(img, { yPercent: -5, ease: 'none', scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ---- CONTACT + FOOTER ------------------------------------------------- */
function setupContact() {
  fade($('.contact__title'), { trigger: '.contact', start: 'top 80%' });
  if (reduceMotion) return;
  const trig = { trigger: '.contact__grid', start: 'top 92%', once: true };
  gsap.from(['.contact__sub', ...$$('.crow li'), ...$$('.form > :not(.btn)')], { y: 24, autoAlpha: 0, duration: 1.3, ease: 'power2.out', stagger: 0.07, scrollTrigger: trig });
  gsap.from('.form > .btn', { autoAlpha: 0, duration: 0.9, ease: 'power2.out', delay: 0.4, scrollTrigger: trig });   // fade only: its transform belongs to the magnetic effect
}

function setupFooter() {
  if (reduceMotion) return;
  gsap.fromTo('[data-foot-word]', { yPercent: 30 }, { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '[data-foot]', start: 'top bottom', end: 'bottom bottom', scrub: true } });
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
