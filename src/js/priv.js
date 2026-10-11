import { $, $$ } from './env.js';

export function initPrivacy(lenis) {
  const root = $('[data-priv]');
  if (!root) return;
  const panel = $('.priv__panel', root);
  let opener = null;
  const focusables = () => $$('a[href],button', panel).filter((el) => !el.disabled);

  const open = (from) => {
    opener = from || document.activeElement;
    root.hidden = false;
    lenis?.stop(); document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(() => { root.classList.add('is-open'); panel.focus(); });
  };
  const close = () => {
    root.classList.remove('is-open');
    setTimeout(() => { root.hidden = true; }, 600);
    document.documentElement.style.overflow = ''; lenis?.start();
    opener?.focus?.();
  };
  document.addEventListener('click', (e) => {
    const o = e.target.closest('[data-open-priv]'); if (o) { open(o); return; }
    if (e.target.closest('[data-close-priv]')) close();
  });
  addEventListener('keydown', (e) => {
    if (root.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'Tab') {
      const f = focusables(); if (!f.length) return;
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
}
