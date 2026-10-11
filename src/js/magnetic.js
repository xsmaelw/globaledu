import gsap from 'gsap';
import { $$, finePointer, reduceMotion } from './env.js';

/** Buttons: fill grows from the exact point the pointer entered; [data-magnetic] also leans toward the pointer. */
export function initMagnetic() {
  $$('.btn').forEach((btn) => {
    const setOrigin = (e) => {
      const r = btn.getBoundingClientRect();
      btn.style.setProperty('--x', `${e.clientX - r.left}px`);
      btn.style.setProperty('--y', `${e.clientY - r.top}px`);
    };
    btn.addEventListener('pointerenter', setOrigin);
    btn.addEventListener('pointerleave', setOrigin);
  });
  if (!finePointer || reduceMotion) return;
  $$('[data-magnetic]').forEach((el) => {
    const qx = gsap.quickTo(el, 'x', { duration: 0.6, ease: 'elastic.out(1, .6)' });
    const qy = gsap.quickTo(el, 'y', { duration: 0.6, ease: 'elastic.out(1, .6)' });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      qx((e.clientX - (r.left + r.width / 2)) * 0.28);
      qy((e.clientY - (r.top + r.height / 2)) * 0.4);
    });
    el.addEventListener('pointerleave', () => { qx(0); qy(0); });
  });
}
