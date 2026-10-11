import gsap from 'gsap';
import { $, $$, reduceMotion } from './env.js';

/**
 * Brand preloader: flag bars draw in, counter follows real readiness (fonts + hero image),
 * then the bars split like a curtain. Shown once per session.
 */
export function runPreloader(ready) {
  const pre = $('.pre');
  const done = () => { document.body.classList.remove('is-loading'); pre?.remove(); };
  let seen = false;
  try { seen = sessionStorage.getItem('ge-pre') === '1'; } catch {}
  if (!pre || reduceMotion || seen) { done(); return Promise.resolve(); }
  try { sessionStorage.setItem('ge-pre', '1'); } catch {}

  const bars = $$('.pre__bars i', pre);
  const word = $('.pre__word', pre);
  const count = $('[data-pre-count]', pre);
  const state = { v: 0 };

  gsap.set(bars, { scaleX: 0 });
  gsap.set(word.children, { yPercent: 120 });

  const intro = gsap.timeline()
    .to(bars, { scaleX: 1, duration: 0.9, ease: 'expo.out', stagger: 0.07 })
    .to(word.children, { yPercent: 0, duration: 0.8, ease: 'expo.out', stagger: 0.06 }, 0.25);

  const minTime = new Promise((r) => setTimeout(r, 1300));
  const target = { v: 0 };
  const climb = gsap.to(target, { v: 88, duration: 1.4, ease: 'power2.out', onUpdate: () => { count.textContent = Math.round(Math.max(state.v, target.v)); } });

  return Promise.all([ready, minTime]).then(() => new Promise((resolve) => {
    climb.kill();
    gsap.to(state, { v: 100, duration: 0.35, ease: 'power1.out', onUpdate: () => { count.textContent = Math.round(Math.max(state.v, target.v)); } });
    gsap.timeline({ delay: 0.3, onComplete: () => { done(); } })
      .to(word.children, { yPercent: -120, duration: 0.5, ease: 'power3.in' })
      .to($('.pre__count', pre), { yPercent: 120, duration: 0.5, ease: 'power3.in' }, '<')
      .to(bars, { scaleY: 40, duration: 0.9, ease: 'expo.inOut', stagger: 0.04, transformOrigin: '50% 50%' }, '>-0.1')
      .to(pre, { yPercent: -100, duration: 0.9, ease: 'expo.inOut' }, '<0.25')
      .add(resolve, '<0.35');
  }));
}
