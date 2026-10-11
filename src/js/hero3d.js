import * as THREE from 'three';
import { reduceMotion } from './env.js';

/**
 * Hero: a fan of satin ribbons, each carrying a word. They sway on their own, lean away from the
 * pointer and stream out of frame as the page scrolls. Pure shader — one draw call per ribbon.
 */

// [word, ribbon colour, text colour]
const RIBBONS = [
  ['APPLE', '#E5322D', '#1A1A1A'], ['BRIDGE', '#3C72D9', '#F4F6FF'], ['SILK', '#161616', '#F2F2F2'], ['TEA', '#F1EEE6', '#1A1A1A'],
  ['LAW', '#F28B2D', '#1A1A1A'], ['KEY', '#1DAA5B', '#EFFFF4'], ['BOOK', '#0E8F52', '#E8FFF1'], ['DANCE', '#7B4FD0', '#F6F0FF'],
  ['SKY', '#F4C21F', '#1A1A1A'], ['SALOM', '#FF4F9A', '#1A1A1A'], ['CLOUD', '#CFE02E', '#1A1A1A'], ['EXAM', '#8C5CC9', '#F6F0FF'],
  ['BOLD', '#F2A81D', '#1A1A1A'], ['TIL', '#2BB3B1', '#102020'], ['SPACE', '#34A9D9', '#0E1C26'], ['WAVE', '#7A0E1E', '#FBE9EC'],
];

const VERT = /* glsl */ `
  uniform float uTime, uLen, uWidth, uPhase, uTwist, uAmp, uScroll;
  uniform vec2 uMouse, uDir;
  uniform vec3 uAnchor;
  varying vec2 vUv;
  varying vec3 vN, vView;

  vec3 centre(float s) {
    float L = uLen * s;
    vec2 n = vec2(-uDir.y, uDir.x);
    float w = sin(s * 3.1 + uTime * 0.55 + uPhase) * uAmp * (0.12 + s)
            + sin(s * 7.3 - uTime * 0.85 + uPhase * 1.7) * uAmp * 0.22 * s;
    vec3 p = uAnchor + vec3(uDir * L + n * w, 0.0);
    p.z += sin(s * 4.2 + uTime * 0.7 + uPhase * 2.0) * uAmp * 0.8 * s + s * s * 0.25;
    p.xy += uDir * uScroll * 4.5 * s;                       // stream out on scroll
    vec2 dm = p.xy - uMouse;                                 // lean away from pointer
    float f = exp(-dot(dm, dm) * 0.5);
    p.xy += normalize(dm + vec2(1e-4)) * f * 0.42 * s;
    p.z += f * 0.2 * s;
    return p;
  }

  void main() {
    float s = uv.x;
    vec3 p = centre(s);
    vec3 T = normalize(centre(min(s + 0.012, 1.0)) - centre(max(s - 0.012, 0.0)));
    vec3 side = normalize(cross(T, vec3(0.0, 0.0, 1.0)));
    vec3 nrm = normalize(cross(side, T));
    float tw = uTwist * sin(s * 5.2 + uTime * 0.5 + uPhase) + s * uTwist * 1.4;
    vec3 B = side * cos(tw) + nrm * sin(tw);
    float wv = (uv.y - 0.5) * uWidth * (0.82 + 0.4 * s);
    vec3 pos = p + B * wv;
    vN = normalize(cross(T, B));
    vUv = uv;
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vView = -mv.xyz;
    gl_Position = projectionMatrix * mv;
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColor, uTextColor, uLight;
  uniform sampler2D uMap;
  uniform float uRepeat;
  varying vec2 vUv;
  varying vec3 vN, vView;

  void main() {
    float ey = abs(vUv.y - 0.5) * 2.0;
    if (vUv.x > 1.0 - 0.15 * (1.0 - ey)) discard;            // swallow-tail cut
    vec3 N = normalize(vN);
    if (!gl_FrontFacing) N = -N;
    vec3 V = normalize(vView);
    vec3 L = normalize(uLight);
    float dif = dot(N, L) * 0.5 + 0.5;
    float spec = pow(max(dot(reflect(-L, N), V), 0.0), 26.0);
    float rim = pow(1.0 - abs(dot(N, V)), 2.2);
    vec3 col = uColor * (0.5 + 0.66 * dif) + spec * 0.5 + rim * uColor * 0.35;
    col *= 0.97 + 0.03 * sin(vUv.y * 180.0);                  // woven satin
    col *= 1.0 - 0.2 * smoothstep(0.8, 1.0, ey);              // darker edges
    // words run tail -> anchor (the ribbons sweep down-left, so this keeps them reading up and to the right)
    vec2 tuv = gl_FrontFacing ? vec2(1.0 - vUv.x * uRepeat, 1.0 - vUv.y) : vec2(1.0 - vUv.x * uRepeat, vUv.y);
    float a = texture2D(uMap, tuv).a;
    col = mix(col, uTextColor * (0.62 + 0.5 * dif) + spec * 0.15, a * 0.94);
    gl_FragColor = vec4(col, 1.0);
  }
`;

function wordTexture(word) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.font = '800 70px "Manrope Variable", "Manrope", system-ui, sans-serif';
  g.textBaseline = 'middle'; g.textAlign = 'center';
  if ('letterSpacing' in g) g.letterSpacing = '9px';
  g.fillText(word, 512, 66);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = THREE.RepeatWrapping; t.anisotropy = 4; t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export async function initHero3D({ canvas, hero }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch { return null; }
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  try { await document.fonts.load('800 56px "Manrope Variable"'); } catch {}

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
  camera.position.set(0, 0, 8);
  const group = new THREE.Group();
  scene.add(group);

  const light = new THREE.Vector3(-0.5, 0.7, 0.8);
  const ribbons = RIBBONS.map(([word, color, textColor], i) => {
    const geo = new THREE.PlaneGeometry(1, 1, 220, 1);
    const mat = new THREE.ShaderMaterial({
      vertexShader: VERT, fragmentShader: FRAG, side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 }, uLen: { value: 10 }, uWidth: { value: 0.46 }, uPhase: { value: i * 1.37 }, uTwist: { value: 0.6 + (i % 4) * 0.14 },
        uAmp: { value: 0.3 + (i % 5) * 0.06 }, uScroll: { value: 0 }, uMouse: { value: new THREE.Vector2(99, 99) }, uDir: { value: new THREE.Vector2(-1, -0.6) },
        uAnchor: { value: new THREE.Vector3() }, uColor: { value: new THREE.Color(color) }, uTextColor: { value: new THREE.Color(textColor) },
        uLight: { value: light }, uMap: { value: wordTexture(word) }, uRepeat: { value: 2.2 },
      },
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    group.add(mesh);
    return { mesh, mat, i };
  });

  const view = { w: 1, h: 1, halfW: 4, halfH: 2.2 };
  function layout() {
    const r = canvas.getBoundingClientRect();
    view.w = Math.max(1, r.width); view.h = Math.max(1, r.height);
    const dpr = Math.min(devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(dpr);
    renderer.setSize(view.w, view.h, false);
    camera.aspect = view.w / view.h; camera.updateProjectionMatrix();
    view.halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    view.halfW = view.halfH * camera.aspect;
    const portrait = camera.aspect < 0.9;
    const N = ribbons.length;
    // The fan: anchored beyond the top-right corner, sweeping down-left (right-aligned & compact on phones).
    const base = Math.atan2(-view.halfH * (portrait ? 1.1 : 1.25), -view.halfW * (portrait ? 0.7 : 1.1));
    ribbons.forEach(({ mat, i }) => {
      const k = i / (N - 1) - 0.5;
      const ang = base + k * (portrait ? 0.62 : 0.78) + Math.sin(i * 2.3) * 0.05;
      mat.uniforms.uDir.value.set(Math.cos(ang), Math.sin(ang));
      const reach = Math.hypot(view.halfW, view.halfH) * (portrait ? 0.95 : 1.0);
      mat.uniforms.uLen.value = reach * (0.74 + ((i * 37) % 11) / 11 * 0.4);
      mat.uniforms.uWidth.value = (portrait ? 0.36 : 0.46) * (0.9 + ((i * 17) % 7) / 7 * 0.3);
      mat.uniforms.uRepeat.value = mat.uniforms.uLen.value / (mat.uniforms.uWidth.value * 8) ;
      const perp = new THREE.Vector2(-Math.sin(ang), Math.cos(ang));
      const ax = view.halfW * (portrait ? 1.0 : 1.04) + perp.x * k * 1.4;
      const ay = view.halfH * (portrait ? 1.02 : 1.06) + perp.y * k * 1.4;
      mat.uniforms.uAnchor.value.set(ax, ay, ((i * 53) % 9 - 4) * 0.1);
    });
  }
  layout();

  /* --- input / state --- */
  const mouse = { x: 0, y: 0, tx: 0, ty: 0, wx: 99, wy: 99 };
  const onMove = (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.tx = ((e.clientX - r.left) / r.width) * 2 - 1;
    mouse.ty = -(((e.clientY - r.top) / r.height) * 2 - 1);
  };
  addEventListener('pointermove', onMove, { passive: true });
  let scroll = 0, scrollTarget = 0, visible = true, running = false, raf = 0;
  const clock = { last: performance.now(), elapsedTime: 0, getDelta() { const n = performance.now(), d = (n - this.last) / 1000; this.last = n; this.elapsedTime += d; return d; }, start() { this.last = performance.now(); } };

  function frame() {
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    mouse.x += (mouse.tx - mouse.x) * (1 - Math.exp(-dt * 5));
    mouse.y += (mouse.ty - mouse.y) * (1 - Math.exp(-dt * 5));
    scroll += (scrollTarget - scroll) * (1 - Math.exp(-dt * 6));
    mouse.wx = mouse.x * view.halfW; mouse.wy = mouse.y * view.halfH;
    for (const { mat } of ribbons) {
      mat.uniforms.uTime.value = t;
      mat.uniforms.uScroll.value = scroll;
      mat.uniforms.uMouse.value.set(mouse.wx, mouse.wy);
    }
    camera.position.x = mouse.x * 0.28; camera.position.y = mouse.y * 0.18; camera.lookAt(0, 0, 0);
    group.rotation.z = mouse.x * 0.015;
    renderer.render(scene, camera);
  }
  const loop = () => { frame(); raf = running ? requestAnimationFrame(loop) : 0; };
  const start = () => { if (running || reduceMotion) return; running = true; clock.getDelta(); raf = requestAnimationFrame(loop); };
  const stop = () => { running = false; cancelAnimationFrame(raf); raf = 0; };
  const sync = () => (visible && !document.hidden ? start() : stop());
  document.addEventListener('visibilitychange', sync);

  const ro = new ResizeObserver(() => { layout(); if (!running) frame(); });
  ro.observe(canvas);

  // warm up two frames so the first visible one is already composed
  clock.start(); frame();
  hero.classList.add('is-3d');
  if (!reduceMotion) start();

  return {
    setProgress(p) { scrollTarget = p; if (!running) frame(); },
    setActive(v) { visible = v; sync(); },
    destroy() { stop(); ro.disconnect(); removeEventListener('pointermove', onMove); renderer.dispose(); },
  };
}
