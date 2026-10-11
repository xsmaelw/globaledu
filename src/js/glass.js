/**
 * Liquid-glass header. The idea follows dashersw/liquid-glass-js (refraction that bends the content at the
 * glass edge, soft blur, bright rim) but stays LIVE: instead of sampling a one-off page screenshot, the
 * browser refracts the real backdrop through an SVG displacement filter (backdrop-filter: url(#…)).
 * Chromium-based browsers get the refraction; Safari/Firefox keep the frosted-glass fallback from the CSS.
 */
const NS = 'http://www.w3.org/1999/xlink';

function buildMap(w, h, bezel) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const r = h / 2;                                   // pill: full-height radius
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const px = x + 0.5 - w / 2, py = y + 0.5 - h / 2;
      const qx = Math.abs(px) - (w / 2 - r), qy = Math.abs(py) - (h / 2 - r);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0);
      const out = Math.hypot(ox, oy);
      const d = -(out + Math.min(Math.max(qx, qy), 0) - r);      // distance inside the edge (>= 0)
      let nx = 0, ny = 0, m = 0;
      if (d < bezel) {
        const t = 1 - Math.max(d, 0) / bezel;
        m = t * t * t;                                             // strongest right at the rim
        if (out > 0) { nx = (ox / out) * Math.sign(px); ny = (oy / out) * Math.sign(py); }
        else if (qx > qy) { nx = Math.sign(px); } else { ny = Math.sign(py); }
      }
      const i = (y * w + x) * 4;
      img.data[i] = 128 + nx * m * 127; img.data[i + 1] = 128 + ny * m * 127; img.data[i + 2] = 128; img.data[i + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return c.toDataURL();
}

export function initGlass() {
  const pill = document.querySelector('.hdr__pill');
  const feImage = document.getElementById('lg-map');
  const filter = document.getElementById('lg-filter');
  if (!pill || !feImage || !filter) return;
  const chromium = /Chrome|Chromium|Edg\//.test(navigator.userAgent) && !/Firefox|OPR\/|SamsungBrowser/.test(navigator.userAgent);
  let ok = false;
  try { ok = chromium && CSS.supports('backdrop-filter', 'url(#lg-filter)'); } catch {}
  if (!ok) return;

  let w = 0, h = 0, t = 0;
  const apply = () => {
    const r = pill.getBoundingClientRect();
    const nw = Math.round(r.width), nh = Math.round(r.height);
    if (!nw || !nh || (nw === w && nh === h)) return;
    w = nw; h = nh;
    const url = buildMap(w, h, Math.min(h * 0.42, 26));
    feImage.setAttribute('width', w); feImage.setAttribute('height', h);
    feImage.setAttributeNS(NS, 'href', url); feImage.setAttribute('href', url);
    filter.querySelector('feDisplacementMap')?.setAttribute('scale', String(Math.round(h * 0.7)));
    document.documentElement.classList.add('lg');
  };
  apply();
  new ResizeObserver(() => { clearTimeout(t); t = setTimeout(apply, 80); }).observe(pill);
}
