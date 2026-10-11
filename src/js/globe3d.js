import * as THREE from 'three';
import { isLand } from './land-mask.js';
import { reduceMotion } from './env.js';

/**
 * "Toshkentdan dunyoga": a dotted globe (real land mask), Uzbekistan lit in lime,
 * great-circle arcs that draw themselves from Tashkent as the section scrolls.
 */

const D2R = Math.PI / 180;
const ll = (lat, lon, r = 1) => new THREE.Vector3(
  r * Math.cos(lat * D2R) * Math.sin(lon * D2R), r * Math.sin(lat * D2R), r * Math.cos(lat * D2R) * Math.cos(lon * D2R));

const HOME = { code: 'TAS', name: 'Toshkent', lat: 41.3, lon: 69.24 };
// order = order the arcs draw in while scrolling (Asia first, then Europe)
const CITIES = [
  { code: 'DEL', name: 'Delhi', lat: 28.6, lon: 77.2 }, { code: 'DXB', name: 'Dubay', lat: 25.2, lon: 55.3 },
  { code: 'PEK', name: 'Pekin', lat: 39.9, lon: 116.4 }, { code: 'SEL', name: 'Seul', lat: 37.57, lon: 126.98 },
  { code: 'IST', name: 'Istanbul', lat: 41.0, lon: 28.98 }, { code: 'MOW', name: 'Moskva', lat: 55.75, lon: 37.6 },
  { code: 'BER', name: 'Berlin', lat: 52.5, lon: 13.4 }, { code: 'LON', name: 'London', lat: 51.5, lon: -0.12 },
];

const DOT_V = /* glsl */ `
  attribute float aHome;
  uniform float uPx, uSize;
  varying float vA, vHome;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * position);
    float facing = dot(n, normalize(cameraPosition - wp.xyz));
    vA = smoothstep(0.06, 0.5, facing);
    vHome = aHome;
    vec4 mv = viewMatrix * wp;
    gl_PointSize = uSize * uPx * (aHome > 0.5 ? 1.55 : 1.0) / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const DOT_F = /* glsl */ `
  varying float vA, vHome;
  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    if (d > 0.5 || vA < 0.01) discard;
    vec3 col = mix(vec3(0.93, 0.93, 0.92), vec3(0.776, 0.957, 0.196), vHome);
    float a = mix(0.5, 1.0, vHome) * vA * smoothstep(0.5, 0.36, d);
    gl_FragColor = vec4(col, a);
  }
`;

const BODY_F = /* glsl */ `
  varying vec3 vN, vV;
  void main() {
    float f = pow(1.0 - max(dot(normalize(vN), normalize(vV)), 0.0), 3.0);
    vec3 col = mix(vec3(0.062, 0.066, 0.06), vec3(0.28, 0.34, 0.12), f * 0.9);
    gl_FragColor = vec4(col, 1.0);
  }
`;
const BODY_V = /* glsl */ `
  varying vec3 vN, vV;
  void main() {
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vN = normalize(normalMatrix * normal); vV = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;
const GLOW_F = /* glsl */ `
  varying vec3 vN, vV;
  void main() {
    float f = pow(max(dot(normalize(vN), normalize(vV)), 0.0), 3.2);
    gl_FragColor = vec4(0.776, 0.957, 0.196, f * 0.22);
  }
`;

const ARC_V = /* glsl */ `
  varying float vT;
  void main() { vT = uv.x; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const ARC_F = /* glsl */ `
  uniform float uDraw;
  varying float vT;
  void main() {
    if (vT > uDraw) discard;
    float head = smoothstep(uDraw - 0.12, uDraw, vT);
    vec3 col = mix(vec3(0.95), vec3(0.776, 0.957, 0.196), head);
    gl_FragColor = vec4(col, 0.95);
  }
`;

const MARK_V = /* glsl */ `
  attribute float aSize;
  uniform float uPx, uTime;
  varying float vA, vPhase;
  void main() {
    vec4 wp = modelMatrix * vec4(position, 1.0);
    vec3 n = normalize(mat3(modelMatrix) * position);
    vA = smoothstep(0.0, 0.3, dot(n, normalize(cameraPosition - wp.xyz)));
    vPhase = fract(uTime * 0.55 + position.x * 3.0);
    vec4 mv = viewMatrix * wp;
    gl_PointSize = aSize * uPx / -mv.z;
    gl_Position = projectionMatrix * mv;
  }
`;
const MARK_F = /* glsl */ `
  varying float vA, vPhase;
  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0 || vA < 0.01) discard;
    float core = smoothstep(0.2, 0.14, d);
    float ring = smoothstep(0.06, 0.0, abs(d - (0.3 + vPhase * 0.7))) * (1.0 - vPhase);
    gl_FragColor = vec4(vec3(0.776, 0.957, 0.196), (core + ring) * vA);
  }
`;

export async function initGlobe({ canvas, pin, list }) {
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch { return null; }
  renderer.setClearColor(0x000000, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
  const root = new THREE.Group();   // placement on screen
  const globe = new THREE.Group();  // rotation
  root.add(globe); scene.add(root);

  /* --- body, glow, graticule --- */
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(0.985, 64, 48), new THREE.ShaderMaterial({ vertexShader: BODY_V, fragmentShader: BODY_F })));
  globe.add(new THREE.Mesh(new THREE.SphereGeometry(1.16, 48, 32), new THREE.ShaderMaterial({ vertexShader: BODY_V, fragmentShader: GLOW_F, side: THREE.BackSide, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
  const grat = [];
  for (let lat = -60; lat <= 60; lat += 30) for (let lon = 0; lon < 360; lon += 4) grat.push(ll(lat, lon), ll(lat, lon + 4));
  for (let lon = 0; lon < 360; lon += 30) for (let lat = -88; lat < 88; lat += 4) grat.push(ll(lat, lon, 0.99), ll(lat + 4, lon, 0.99));
  globe.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(grat), new THREE.LineBasicMaterial({ color: 0xeeeeec, transparent: true, opacity: 0.05 })));

  /* --- land dots --- */
  const pos = [], home = [];
  const N = 9500, GA = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (2 * (i + 0.5)) / N, lat = Math.asin(y) / D2R, lon = ((i * GA) / D2R + 180) % 360 - 180;
    if (!isLand(lat, lon)) continue;
    const p = ll(lat, lon, 1.002);
    pos.push(p.x, p.y, p.z);
    home.push(lat > 37.2 && lat < 45.7 && lon > 55.9 && lon < 73.3 ? 1 : 0);
  }
  const dotGeo = new THREE.BufferGeometry();
  dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  dotGeo.setAttribute('aHome', new THREE.Float32BufferAttribute(home, 1));
  const dotMat = new THREE.ShaderMaterial({ vertexShader: DOT_V, fragmentShader: DOT_F, transparent: true, depthWrite: false, uniforms: { uPx: { value: 1 }, uSize: { value: 0.0125 } } });
  globe.add(new THREE.Points(dotGeo, dotMat));

  /* --- arcs + markers + labels --- */
  const a = ll(HOME.lat, HOME.lon);
  const arcs = CITIES.map((c, k) => {
    const b = ll(c.lat, c.lon);
    const ang = a.angleTo(b);
    const pts = [];
    for (let i = 0; i <= 80; i++) {
      const t = i / 80;
      const v = a.clone().lerp(b, t).normalize().multiplyScalar(1.003 + (0.1 + 0.2 * (ang / Math.PI)) * Math.sin(Math.PI * t));
      pts.push(v);
    }
    const geo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 120, 0.0042, 5, false);
    const mat = new THREE.ShaderMaterial({ vertexShader: ARC_V, fragmentShader: ARC_F, transparent: true, depthWrite: false, uniforms: { uDraw: { value: reduceMotion ? 1 : 0 } } });
    globe.add(new THREE.Mesh(geo, mat));
    const start = 0.04 + k * 0.105;
    return { c, mat, start, end: start + 0.2, pos: b };
  });

  const markPos = [a.x, a.y, a.z, ...arcs.flatMap((r) => [r.pos.x, r.pos.y, r.pos.z])].map((v, i) => v * (i < 3 ? 1.004 : 1.004));
  const markGeo = new THREE.BufferGeometry();
  markGeo.setAttribute('position', new THREE.Float32BufferAttribute(markPos, 3));
  markGeo.setAttribute('aSize', new THREE.Float32BufferAttribute([0.1, ...arcs.map(() => 0.055)], 1));
  const markMat = new THREE.ShaderMaterial({ vertexShader: MARK_V, fragmentShader: MARK_F, transparent: true, depthWrite: false, uniforms: { uPx: { value: 1 }, uTime: { value: 0 } } });
  globe.add(new THREE.Points(markGeo, markMat));

  const mkLabel = (txt, homeCls) => { const li = document.createElement('li'); li.textContent = txt; if (homeCls) li.className = 'is-home'; list.appendChild(li); return li; };
  list.innerHTML = '';
  const labels = [{ li: mkLabel(`${HOME.name} · ${HOME.code}`, true), pos: a, at: 0 }, ...arcs.map((r) => ({ li: mkLabel(`${r.c.name} · ${r.c.code}`), pos: r.pos, at: r.start + 0.14 }))];

  /* --- layout / loop --- */
  const view = { w: 1, h: 1, narrow: false };
  function layout() {
    const r = canvas.getBoundingClientRect();
    view.w = Math.max(1, r.width); view.h = Math.max(1, r.height);
    view.narrow = view.w < 760 || view.w / view.h < 0.9;
    const dpr = Math.min(devicePixelRatio || 1, 1.5);
    renderer.setPixelRatio(dpr); renderer.setSize(view.w, view.h, false);
    camera.aspect = view.w / view.h;
    camera.position.set(0, 0, view.narrow ? 6.2 : 5.1);
    camera.updateProjectionMatrix();
    const halfH = Math.tan(15 * D2R) * camera.position.z, halfW = halfH * camera.aspect;
    root.position.set(view.narrow ? 0 : halfW * 0.34, view.narrow ? halfH * 0.1 : 0, 0);
    root.scale.setScalar(view.narrow ? 0.92 : 1);
    const px = (dpr * view.h) / (2 * Math.tan(15 * D2R));   // world size → device pixels at distance 1
    dotMat.uniforms.uPx.value = px; markMat.uniforms.uPx.value = px;
  }
  layout();

  let p = reduceMotion ? 1 : 0, running = false, visible = false, raf = 0;
  const mouse = { x: 0, y: 0, tx: 0, ty: 0 };
  const onMove = (e) => { mouse.tx = (e.clientX / innerWidth) * 2 - 1; mouse.ty = (e.clientY / innerHeight) * 2 - 1; };
  addEventListener('pointermove', onMove, { passive: true });
  const clock = { last: performance.now(), elapsedTime: 0, getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; this.elapsedTime += d; return d; }, start() { this.last = performance.now(); } };
  const tmp = new THREE.Vector3(), cam = new THREE.Vector3(), ctr = new THREE.Vector3(), nrm = new THREE.Vector3();

  const ease = (t) => t * t * (3 - 2 * t);
  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
    // Plays on its own: arcs draw out and withdraw, the globe swings east → west and back (22 s loop).
    p = reduceMotion ? 1 : 0.5 - 0.5 * Math.cos((t / 22) * Math.PI * 2);
    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 4)); mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 4));
    const swing = 36 * (1 - 2 * ease(p));              // east → west, in degrees
    globe.rotation.order = 'XYZ';
    globe.rotation.y = -(HOME.lon + swing) * D2R + mouse.x * 0.07 + Math.sin(t * 0.15) * 0.02;
    globe.rotation.x = (HOME.lat * 0.82) * D2R + mouse.y * 0.05;
    markMat.uniforms.uTime.value = t;
    arcs.forEach((r) => { r.mat.uniforms.uDraw.value = reduceMotion ? 1 : THREE.MathUtils.clamp((p - r.start) / (r.end - r.start), 0, 1); });
    renderer.render(scene, camera);

    // HTML labels follow their cities
    root.updateMatrixWorld(true); camera.getWorldPosition(cam); globe.getWorldPosition(ctr);
    for (const l of labels) {
      tmp.copy(l.pos).applyMatrix4(globe.matrixWorld);
      nrm.copy(tmp).sub(ctr).normalize();
      const facing = nrm.dot(cam.clone().sub(tmp).normalize());
      const shown = (reduceMotion || p >= l.at) && facing > 0.22;
      tmp.project(camera);
      const x = (tmp.x * 0.5 + 0.5) * view.w, y = (-tmp.y * 0.5 + 0.5) * view.h;
      l.li.style.transform = `translate3d(${x + 12}px, ${y - 30}px, 0)`;
      l.li.style.opacity = shown ? '1' : '0';
    }
  }
  const loop = () => { frame(); raf = running ? requestAnimationFrame(loop) : 0; };
  const start = () => { if (running) return; running = true; clock.getDelta(); raf = requestAnimationFrame(loop); };
  const stop = () => { running = false; cancelAnimationFrame(raf); raf = 0; };
  const sync = () => (visible && !document.hidden ? start() : stop());
  document.addEventListener('visibilitychange', sync);
  const ro = new ResizeObserver(() => { layout(); if (!running) frame(); });
  ro.observe(canvas);
  clock.start(); frame();

  return {
    setActive(v) { visible = v; reduceMotion ? frame() : sync(); },
    destroy() { stop(); ro.disconnect(); removeEventListener('pointermove', onMove); renderer.dispose(); },
  };
}
