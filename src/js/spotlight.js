/**
 * Pointer spotlight for cards (vanilla port of the "GlowCard" idea): a light follows the cursor, its hue drifts
 * with the horizontal position, it shows as a lit edge plus a soft spot; [data-tilt] cards also lean toward it.
 * Mouse/pen only — touch has no hover, and the cards stay clean there.
 */
export function initSpotlight(reduced = false) {
  document.querySelectorAll('[data-glow]').forEach((el) => {
    const tilt = el.hasAttribute('data-tilt') && !reduced;
    el.addEventListener('pointermove', (e) => {
      if (e.pointerType === 'touch') return;
      const r = el.getBoundingClientRect();
      const x = e.clientX - r.left, y = e.clientY - r.top;
      el.style.setProperty('--x', x.toFixed(1) + 'px');
      el.style.setProperty('--y', y.toFixed(1) + 'px');
      el.style.setProperty('--xp', (x / r.width).toFixed(3));
      if (tilt) {
        el.style.setProperty('--ty', ((x / r.width - 0.5) * 9).toFixed(2) + 'deg');
        el.style.setProperty('--tx', ((0.5 - y / r.height) * 9).toFixed(2) + 'deg');
      }
      el.classList.add('is-lit');
    });
    el.addEventListener('pointerleave', () => {
      el.classList.remove('is-lit');
      if (tilt) { el.style.setProperty('--tx', '0deg'); el.style.setProperty('--ty', '0deg'); }
    });
  });
}
