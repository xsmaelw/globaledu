import gsap from 'gsap';
import { $, finePointer, reduceMotion } from './env.js';

/** Soft follower ring. Grows on links, shows a short label on [data-cursor-text]. Desktop pointers only. */
export function initCursor() {
  const root = $('[data-cursor]');
  if (!root || !finePointer || reduceMotion) return;
  const dot = $('.cursor__dot', root);
  const ring = $('.cursor__ring', root);
  const label = $('.cursor__ring span', root);
  const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3' });
  const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3' });
  const dx = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'none' });
  const dy = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'none' });
  let hidden = true;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    if (hidden) { gsap.set([ring, dot], { x: e.clientX, y: e.clientY }); root.style.opacity = 1; hidden = false; }
    rx(e.clientX); ry(e.clientY); dx(e.clientX); dy(e.clientY);
    const el = e.target.closest?.('[data-cursor-text],a,button,[data-res-track]');
    root.classList.remove('is-link', 'is-text');
    if (!el) return;
    const text = el.dataset.cursorText || (el.matches('[data-res-track]') ? 'Surib' : '');
    if (text) { label.textContent = text; root.classList.add('is-text'); }
    else if (!el.matches('[data-res-track]')) root.classList.add('is-link');
  }, { passive: true });
  document.addEventListener('pointerleave', () => { root.style.opacity = 0; hidden = true; });
  root.style.opacity = 0;
}
