/**
 * Curved row of tiles (vanilla port of the "Tilted Grid Hero" idea).
 *
 * One row of images streams around the inside of a cylinder: the centre faces you flat, the ends curl toward
 * you and fade into the page. A CSS box can't bend, so every tile is cut into SLICES vertical strips, each a
 * flat facet turned a few degrees round the cylinder's axis; the tile (preserve-3d) is what moves — one
 * rotateY about that same axis carries it along the arc. One animation per tile, transform-only, on the
 * compositor. The only JS: a ResizeObserver that sizes the loop, and a handler that hands a tile its next
 * image each time it wraps (out of sight).
 */

const SLICES = 14;      // strips per tile: each is a few degrees of arc, too little to read as a facet
const CAMERA = 1.6;     // camera distance from the screen, in cylinder radii
const MAX_WIDTH = 55;   // a tile is never wider than this share of the hero (so phones still show neighbours)

/** Cylinder radius (share of the hero's width) that puts the frame's edge `bend` radians round the arc. */
const arc = (bend) => (CAMERA - 1 + Math.cos(bend)) / (2 * CAMERA * Math.sin(bend));

function measure(width, height, tile, aspect, gap, bend) {
  const h = Math.min((tile / 100) * height, ((MAX_WIDTH / 100) * width) / aspect);
  const radius = width * arc(bend);
  if (!(h > 0) || !(radius > 0)) return { columns: 2, sweep: 0, unit: 0, limit: 0 };
  const deg = (rad) => (rad * 180) / Math.PI;
  const unit = deg(h / radius);                         // arc one tile-height spans
  const pitch = (aspect + gap / 100) * unit;
  const limit = deg(bend) + (aspect * unit) / 2;        // how far round a tile can go before it is off-screen
  const columns = Math.min(40, Math.max(2, Math.ceil((2 * limit) / pitch)));
  const round = (n) => +n.toFixed(4);
  const sweep = round((columns * pitch) / 2);
  return { columns, sweep, unit: round(unit), limit: round(Math.min(sweep, limit)) };
}

let counter = 0;

/**
 * @param {HTMLElement} root  positioned element that gets `container-type: size`
 * @param {{images:{src:string,alt?:string}[], speed?:number, tileHeight?:number, aspectRatio?:number,
 *          gap?:number, axis?:number, curve?:number, fade?:number, paused?:boolean}} o
 */
export function initTiltedGrid(root, o) {
  const {
    images, speed = 4, tileHeight = 26, aspectRatio = 16 / 9, gap = 6, axis = 56, curve = 80, fade = 12, paused = false,
  } = o;
  const id = `tg${++counter}`;
  const orbit = `${id}-o`;
  const bend = (Math.min(85, Math.max(5, curve)) * Math.PI) / 180;

  root.style.containerType = 'size';
  const style = document.createElement('style');
  const band = document.createElement('div');
  band.setAttribute('aria-hidden', 'true');
  band.className = 'tg__band';
  root.append(style, band);

  const mask = `linear-gradient(90deg,transparent,#000 ${fade}%,#000 ${100 - fade}%,transparent)`;
  const r = 100 * arc(bend);
  Object.assign(band.style, {
    perspective: `${+(r * CAMERA).toFixed(3)}cqw`,    // shared vanishing point on the row's centre line
    perspectiveOrigin: `50% ${axis}%`,
    maskImage: mask, webkitMaskImage: mask,
  });

  let layout = null;
  const preload = () => images.forEach(({ src }) => { const i = new Image(); i.src = src; });
  preload();

  const u = (n) => `calc(${+n.toFixed(4)} * min(${tileHeight}cqh, ${+(MAX_WIDTH / aspectRatio).toFixed(4)}cqw))`;
  const radius = `${+r.toFixed(3)}cqw`;
  const turn = (deg) => `translateZ(${radius}) rotateY(${+deg.toFixed(4)}deg) translateZ(-${radius})`;

  function render(next) {
    layout = next;
    const { columns, sweep, unit, limit } = next;
    const hide = +(((sweep - limit) / (2 * sweep || 1)) * 100).toFixed(4);
    style.textContent =
      `@keyframes ${orbit}{from{transform:${turn(-sweep)}}to{transform:${turn(sweep)}}` +
      `0%,${hide}%,${100 - hide}%,100%{visibility:hidden}${hide + 0.001}%,${100 - hide - 0.001}%{visibility:visible}}`;
    const share = aspectRatio / SLICES;
    const duration = columns * speed;
    const frag = document.createDocumentFragment();
    for (let t = 0; t < columns; t++) {
      const first = columns - 1 - t;                      // tile numbering = the order in which tiles come on
      const el = document.createElement('div');
      el.className = 'tg__tile';
      el.style.cssText =
        `left:calc(50% - ${u(aspectRatio / 2)});top:calc(${axis}% - ${u(0.5)});width:${u(aspectRatio)};height:${u(1)};` +
        `animation:${orbit} ${duration}s linear ${-t * speed}s infinite;`;
      const set = (i) => { const im = images[i % images.length]; if (im) el.style.setProperty('--img', `url("${im.src}")`); };
      set(first);
      el.addEventListener('animationiteration', (e) => { set(Math.round(e.elapsedTime / duration) * columns + first); });
      for (let k = 0; k < SLICES; k++) {
        const s = document.createElement('div');
        s.className = 'tg__slice' + (k === 0 ? ' is-first' : k === SLICES - 1 ? ' is-last' : '');
        s.style.cssText =
          `left:${u((aspectRatio - share) / 2)};width:${k === SLICES - 1 ? u(share) : `calc(${u(share)} + 1px)`};height:${u(1)};` +
          `transform:${turn((aspectRatio / 2 - (k + 0.5) * share) * unit)};` +
          `background-size:${u(aspectRatio)} ${u(1)};background-position:${u(-k * share)} 0;`;
        el.appendChild(s);
      }
      frag.appendChild(el);
    }
    band.replaceChildren(frag);
    band.style.opacity = '1';
  }

  band.style.opacity = '0';
  const ro = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect;
    if (!width || !height) return;
    const next = measure(width, height, tileHeight, aspectRatio, gap, bend);
    if (layout && layout.columns === next.columns && layout.sweep === next.sweep && layout.unit === next.unit) return;
    render(next);
  });
  ro.observe(root);

  // Only animate while on screen; reduced motion keeps the finished still.
  root.classList.toggle('is-static', paused);
  const io = new IntersectionObserver(([e]) => root.classList.toggle('is-off', !e.isIntersecting));
  io.observe(root);

  return { destroy() { ro.disconnect(); io.disconnect(); band.remove(); style.remove(); } };
}
