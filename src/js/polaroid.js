/**
 * Polaroid line carousel (vanilla port): prints pegged to a sagging string. Drag, arrows, ←/→ and autoplay move
 * the line; each print then swings from its peg like a pendulum. Position and swing are springs stepped per frame.
 * The loop only runs while the section is on screen.
 */
const TAU_SPRING = 70;                  // stiffness of the critically damped carriage spring
const wrap = (n, m) => ((n % m) + m) % m;
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const pad2 = (n) => String(n).padStart(2, '0');

export function initPolaroid(root, { autoplay = true, reduced = false, interval = 3600 } = {}) {
  const stage = root.querySelector('[data-pl-stage]');
  const prints = [...root.querySelectorAll('[data-pl-print]')];
  const string = root.querySelector('[data-pl-string]');
  const capEl = root.querySelector('[data-pl-cap]');
  const cntEl = root.querySelector('[data-pl-count]');
  const N = prints.length;
  if (!stage || !N) return;

  let W = 0, H = 0, step = 260, pw = 220, sag = 60, top = 40, half = 600;
  let pos = 0, vel = 0, target = 0;              // carriage position in prints (float), its velocity, rest target
  let dragging = false, lastX = 0, lastT = 0, dvel = 0, moved = 0;
  let visible = false, raf = 0, last = 0, lastVx = 0, lastPos = 0, idleAt = 0, active = -1;
  const ang = new Float32Array(N), angV = new Float32Array(N);
  const K = prints.map((_, i) => 38 + ((i * 37) % 11));   // slightly different pendulum stiffness per print

  const sagAt = (x) => top + sag * (1 - (x / half) ** 2);
  const slopeAt = (x) => (-2 * sag * x) / (half * half);

  function measure() {
    const r = stage.getBoundingClientRect();
    W = r.width; H = r.height;
    pw = clamp(W * 0.28, 150, 236);
    step = Math.max(pw * 1.14, (W + pw * 2 + 40) / N);       // enough prints to always cover the line
    sag = clamp(H * 0.09, 22, 64);
    top = clamp(H * 0.07, 18, 44);
    half = W / 2 + pw;
    stage.style.setProperty('--pw', pw + 'px');
    const y2 = top + sag * 2;
    string.setAttribute('viewBox', `0 0 ${W} ${H}`);
    string.firstElementChild.setAttribute('d', `M${W / 2 - half} ${top} Q${W / 2} ${y2} ${W / 2 + half} ${top}`);
    frame(0, true);
  }

  function setActive(i) {
    if (i === active) return;
    active = i;
    prints.forEach((p, k) => p.classList.toggle('is-active', k === i));
    if (capEl) capEl.textContent = prints[i].dataset.caption;
    if (cntEl) cntEl.textContent = `${pad2(i + 1)} / ${pad2(N)}`;
  }

  function frame(dt, force) {
    // carriage spring toward target (critically damped), free while dragging
    if (!dragging) {
      const d = target - pos;
      vel += (TAU_SPRING * d - 2 * Math.sqrt(TAU_SPRING) * vel) * dt;
      pos += vel * dt;
      if (Math.abs(d) < 0.0004 && Math.abs(vel) < 0.002) { pos = target; vel = 0; }
    }
    const vx = dt ? ((pos - lastPos) / dt) * step : 0;       // px/s of the line
    const dvx = vx - lastVx;
    lastVx = vx; lastPos = pos;

    let near = 0, nearD = 9;
    for (let i = 0; i < N; i++) {
      const el = prints[i];
      let d = wrap(i - pos + N / 2, N) - N / 2;                // signed distance from centre, in prints
      const x = d * step;
      const vis = Math.abs(x) < W / 2 + pw;
      if (Math.abs(d) < nearD) { nearD = Math.abs(d); near = i; }
      if (!vis) { if (el._v !== false) { el.style.visibility = 'hidden'; el._v = false; } continue; }
      if (el._v === false || el._v === undefined) { el.style.visibility = 'visible'; el._v = true; }
      const tilt = Math.atan(slopeAt(x));
      if (!reduced && dt) {
        angV[i] += -0.0011 * dvx - (K[i] * ang[i] + 3.2 * angV[i]) * dt;
        ang[i] = clamp(ang[i] + angV[i] * dt, -0.7, 0.7);
      }
      const a = tilt * 0.7 + ang[i];
      const lift = 1 - clamp(Math.abs(d), 0, 1) * 1;           // 1 at the centre, 0 one print away
      const s = 1 + 0.07 * lift;
      el.style.transform = `translate3d(${(W / 2 + x - pw / 2).toFixed(2)}px,${sagAt(x).toFixed(2)}px,0) rotate(${a.toFixed(4)}rad) scale(${s.toFixed(3)})`;
      el.style.zIndex = String(10 + Math.round(lift * 10));
    }
    setActive(near);
    return force;
  }

  function loop(t) {
    raf = 0;
    if (!visible) return;
    const dt = Math.min(0.05, (t - last) / 1000 || 0.016);
    last = t;
    if (autoplay && !reduced && !dragging && t > idleAt && Math.abs(target - pos) < 0.02 && t - (loop.t || 0) > interval) {
      loop.t = t; target = Math.round(target) + 1;
    }
    frame(dt);
    raf = requestAnimationFrame(loop);
  }
  const kick = () => { if (!raf && visible) { last = performance.now(); raf = requestAnimationFrame(loop); } };
  const touch = () => { idleAt = performance.now() + 7000; };

  function go(n) { target = Math.round(target) + n; touch(); kick(); }

  // --- pointer drag with velocity + rubber feel (it is a loop, so no edges)
  stage.addEventListener('pointerdown', (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    dragging = true; moved = 0; lastX = e.clientX; lastT = performance.now(); dvel = 0;
    stage.setPointerCapture(e.pointerId); stage.classList.add('is-drag'); touch(); kick();
  });
  stage.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const now = performance.now(), dx = e.clientX - lastX;
    moved += Math.abs(dx);
    pos -= dx / step; target = pos;
    dvel = 0.8 * dvel + 0.2 * (-dx / step / Math.max(0.001, (now - lastT) / 1000));
    lastX = e.clientX; lastT = now; touch();
  });
  const end = () => {
    if (!dragging) return;
    dragging = false; stage.classList.remove('is-drag');
    target = Math.round(pos + clamp(dvel, -9, 9) * 0.22);
    vel = 0; touch(); kick();
  };
  stage.addEventListener('pointerup', end);
  stage.addEventListener('pointercancel', end);
  stage.addEventListener('click', (e) => { if (moved > 6) e.preventDefault(); }, true);

  root.querySelector('[data-pl-prev]')?.addEventListener('click', () => go(-1));
  root.querySelector('[data-pl-next]')?.addEventListener('click', () => go(1));
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
  });
  prints.forEach((p, i) => p.addEventListener('click', () => { if (moved <= 6) { target = Math.round(pos) + (wrap(i - Math.round(pos) + N / 2, N) - N / 2); touch(); kick(); } }));

  new ResizeObserver(measure).observe(stage);
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, { rootMargin: '120px' }).observe(root);
  measure();
}
