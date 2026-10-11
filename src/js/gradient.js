import * as THREE from 'three';
import { reduceMotion } from './env.js';

/**
 * Moving shader backgrounds for the coloured sections — a different pattern per section:
 *   silk (3D wave plane, the ShaderGradient look), pixel (posterised mosaic), ripples (concentric waves),
 *   lines (flowing contour lines), bubbles (rising glass bubbles), halftone (dot screen).
 *
 * The "silk" pattern is a compact vanilla-three port of ShaderGradient (https://github.com/ruucm/shadergradient,
 * MIT, © ruucm). ONE shared WebGL renderer draws into the 2D canvas of every host that is on screen, at low
 * resolution and ≤30 fps — the patterns are smooth, so this is visually free and light on the GPU.
 */

/* ------------------------------------------------------------------ shared GLSL */
const NOISE3 = /* glsl */ `
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}
vec3 fade(vec3 t){return t*t*t*(t*(t*6.0-15.0)+10.0);}
float cnoise(vec3 P){
  vec3 Pi0=floor(P),Pi1=Pi0+vec3(1.0);Pi0=mod289(Pi0);Pi1=mod289(Pi1);
  vec3 Pf0=fract(P),Pf1=Pf0-vec3(1.0);
  vec4 ix=vec4(Pi0.x,Pi1.x,Pi0.x,Pi1.x),iy=vec4(Pi0.yy,Pi1.yy),iz0=Pi0.zzzz,iz1=Pi1.zzzz;
  vec4 ixy=permute(permute(ix)+iy),ixy0=permute(ixy+iz0),ixy1=permute(ixy+iz1);
  vec4 gx0=ixy0*(1.0/7.0),gy0=fract(floor(gx0)*(1.0/7.0))-0.5;gx0=fract(gx0);
  vec4 gz0=vec4(0.5)-abs(gx0)-abs(gy0),sz0=step(gz0,vec4(0.0));
  gx0-=sz0*(step(0.0,gx0)-0.5);gy0-=sz0*(step(0.0,gy0)-0.5);
  vec4 gx1=ixy1*(1.0/7.0),gy1=fract(floor(gx1)*(1.0/7.0))-0.5;gx1=fract(gx1);
  vec4 gz1=vec4(0.5)-abs(gx1)-abs(gy1),sz1=step(gz1,vec4(0.0));
  gx1-=sz1*(step(0.0,gx1)-0.5);gy1-=sz1*(step(0.0,gy1)-0.5);
  vec3 g000=vec3(gx0.x,gy0.x,gz0.x),g100=vec3(gx0.y,gy0.y,gz0.y),g010=vec3(gx0.z,gy0.z,gz0.z),g110=vec3(gx0.w,gy0.w,gz0.w);
  vec3 g001=vec3(gx1.x,gy1.x,gz1.x),g101=vec3(gx1.y,gy1.y,gz1.y),g011=vec3(gx1.z,gy1.z,gz1.z),g111=vec3(gx1.w,gy1.w,gz1.w);
  vec4 n0=taylorInvSqrt(vec4(dot(g000,g000),dot(g010,g010),dot(g100,g100),dot(g110,g110)));
  g000*=n0.x;g010*=n0.y;g100*=n0.z;g110*=n0.w;
  vec4 n1=taylorInvSqrt(vec4(dot(g001,g001),dot(g011,g011),dot(g101,g101),dot(g111,g111)));
  g001*=n1.x;g011*=n1.y;g101*=n1.z;g111*=n1.w;
  float n000=dot(g000,Pf0),n100=dot(g100,vec3(Pf1.x,Pf0.yz)),n010=dot(g010,vec3(Pf0.x,Pf1.y,Pf0.z)),n110=dot(g110,vec3(Pf1.xy,Pf0.z));
  float n001=dot(g001,vec3(Pf0.xy,Pf1.z)),n101=dot(g101,vec3(Pf1.x,Pf0.y,Pf1.z)),n011=dot(g011,vec3(Pf0.x,Pf1.yz)),n111=dot(g111,Pf1);
  vec3 f=fade(Pf0);
  vec4 nz=mix(vec4(n000,n100,n010,n110),vec4(n001,n101,n011,n111),f.z);
  vec2 nyz=mix(nz.xy,nz.zw,f.y);
  return 2.2*mix(nyz.x,nyz.y,f.x);
}`;

const FRAG_HEAD = /* glsl */ `
precision highp float;
uniform vec2 uRes; uniform float uTime, uGrain; uniform vec3 uC1, uC2, uC3;
float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p = p * 2.03 + 17.0; a *= 0.5; } return v; }
/* base colour dominates, the light colour sits on the crests, the deep one in the valleys */
vec3 pal(float k){ vec3 c = mix(uC1, uC2, smoothstep(0.45, 0.95, k)); return mix(c, uC3, smoothstep(0.5, 0.05, k)); }
vec3 finish(vec3 col){ return col + (hash(gl_FragCoord.xy + uTime) - 0.5) * uGrain; }
`;

const QUAD_VERT = /* glsl */ `void main() { gl_Position = vec4(position.xy, 0.0, 1.0); }`;

const FRAGS = {
  pixel: /* glsl */ `
void main() {
  float cell = max(9.0, uRes.y / 24.0);
  vec2 g = floor(gl_FragCoord.xy / cell);
  float n = fbm(g * 0.085 + vec2(uTime * 0.05, -uTime * 0.035));
  n += 0.16 * vnoise(g * 0.6 + uTime * 0.35);                     // slow twinkle
  float k = floor(clamp(n * 1.2 - 0.05, 0.0, 1.0) * 7.0) / 7.0;    // posterised
  vec3 col = pal(k);
  vec2 f = fract(gl_FragCoord.xy / cell);
  col *= 1.0 - 0.07 * step(0.93, max(f.x, f.y));                  // hairline between cells
  gl_FragColor = vec4(finish(col), 1.0);
}`,
  ripples: /* glsl */ `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float h = 0.0;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    vec2 c = vec2(sin(uTime * 0.11 + fi * 2.1) * 0.75, cos(uTime * 0.09 + fi * 1.7) * 0.36);
    float d = length(uv - c);
    h += sin(d * 13.0 - uTime * 0.85 + fi) * exp(-d * 1.25);
  }
  float k = clamp(h * 0.55 + 0.5, 0.0, 1.0);
  vec3 col = pal(k);
  vec2 gr = vec2(dFdx(h), dFdy(h)) * uRes.y * 0.05;
  col *= 0.86 + 0.26 * clamp(gr.x - gr.y, -1.0, 1.0) * 0.5 + 0.14;
  gl_FragColor = vec4(finish(col), 1.0);
}`,
  lines: /* glsl */ `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  float f = fbm(uv * 1.6 + vec2(uTime * 0.04, uTime * 0.025));
  float k = fbm(uv * 0.9 + 3.1 - uTime * 0.02);
  vec3 col = pal(k);
  float lv = f * 17.0;
  float d = abs(fract(lv) - 0.5);
  float aa = fwidth(lv);
  float line = 1.0 - smoothstep(0.012, 0.012 + aa * 1.3, d);
  col = mix(col, mix(uC2, vec3(1.0), 0.4), line * 0.38);
  gl_FragColor = vec4(finish(col), 1.0);
}`,
  bubbles: /* glsl */ `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  vec3 col = mix(uC3, uC1, smoothstep(-0.7, 0.6, uv.y + uv.x * 0.25));
  for (int i = 0; i < 11; i++) {
    float fi = float(i);
    float sp = 0.022 + 0.02 * hash(vec2(fi, 1.0));
    vec2 c = vec2(sin(uTime * 0.07 * (1.0 + fi * 0.11) + fi * 2.3) * 0.95, mod(uTime * sp + fi * 0.37, 1.7) - 0.85);
    float r = 0.06 + 0.09 * hash(vec2(fi, 3.0));
    vec2 q = (uv - c) / r;
    float d = length(q);
    col += uC2 * exp(-d * d * 1.6) * 0.22;                        // soft glow
    if (d < 1.0) {
      float rim = smoothstep(0.72, 1.0, d);
      float hi = smoothstep(0.45, 0.0, length(q - vec2(-0.36, 0.42)));
      col = mix(col, uC2, 0.3 * (1.0 - d * d));
      col += rim * 0.2 + hi * 0.4;
    }
  }
  gl_FragColor = vec4(finish(col), 1.0);
}`,
  halftone: /* glsl */ `
void main() {
  vec2 uv = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;
  mat2 R = mat2(0.7071, -0.7071, 0.7071, 0.7071);
  vec2 p = R * uv * 24.0;
  vec2 g = floor(p), f = fract(p) - 0.5;
  float n = fbm(g * 0.055 + uTime * 0.045);
  float r = 0.1 + 0.44 * smoothstep(0.2, 0.85, n);
  float dotm = 1.0 - smoothstep(r - 0.06, r + 0.06, length(f));
  vec3 base = mix(uC3, uC1, smoothstep(-0.7, 0.6, uv.y + uv.x * 0.3));
  vec3 col = mix(base, mix(uC2, vec3(1.0), 0.28), dotm * 0.5);
  gl_FragColor = vec4(finish(col), 1.0);
}`,
};

/* silk: displaced plane, lit like satin */
const SILK_VERT = /* glsl */ `
${NOISE3}
uniform float uTime;
varying float vH; varying vec3 vN, vV;
float field(vec2 p) { return cnoise(vec3(p * 0.43 * 1.25, uTime * 0.16)); }
void main() {
  vec3 p = position;
  float e = 0.05;
  float h = field(p.xy), hx = field(p.xy + vec2(e, 0.0)), hy = field(p.xy + vec2(0.0, e));
  float amp = 1.3;
  p.z += h * amp;
  vec3 n = normalize(vec3(-(hx - h) / e * amp, -(hy - h) / e * amp, 1.0));
  vH = h;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * n); vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;
const SILK_FRAG = /* glsl */ `
${FRAG_HEAD}
varying float vH; varying vec3 vN, vV;
void main() {
  float k = clamp(vH * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = pal(k);
  vec3 N = normalize(vN), V = normalize(vV), L = normalize(vec3(-0.45, 0.65, 0.75));
  float dif = dot(N, L) * 0.5 + 0.5;
  float spec = pow(max(dot(reflect(-L, N), V), 0.0), 22.0);
  col *= 0.82 + 0.34 * dif;
  col += spec * 0.16;
  gl_FragColor = vec4(finish(col), 1.0);
}`;

const hex = (h) => { const n = parseInt(h.replace('#', ''), 16); return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };

export function initGradients() {
  const hosts = [...document.querySelectorAll('[data-gradient]')];
  if (!hosts.length) return null;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' }); } catch { return null; }
  renderer.setPixelRatio(1);

  const uniforms = () => ({
    uRes: { value: new THREE.Vector2(2, 2) }, uTime: { value: 0 }, uGrain: { value: 0.04 },
    uC1: { value: new THREE.Vector3() }, uC2: { value: new THREE.Vector3() }, uC3: { value: new THREE.Vector3() },
  });
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const layers = {};
  const layer = (type) => {
    if (layers[type]) return layers[type];
    const scene = new THREE.Scene();
    let camera = quadCam, material;
    if (type === 'silk') {
      camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60); camera.position.set(0, 0, 8);
      material = new THREE.ShaderMaterial({ vertexShader: SILK_VERT, fragmentShader: SILK_FRAG, uniforms: uniforms() });
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(26, 20, 130, 100), material);
      mesh.rotation.set(-0.55, 0, 0.5); mesh.position.z = -1.5; scene.add(mesh);
    } else {
      material = new THREE.ShaderMaterial({ vertexShader: QUAD_VERT, fragmentShader: FRAG_HEAD + FRAGS[type], uniforms: uniforms() });
      const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material); quad.frustumCulled = false; scene.add(quad);
    }
    return (layers[type] = { scene, camera, material });
  };

  const items = hosts.map((host, i) => {
    const type = FRAGS[host.dataset.gradientType] || host.dataset.gradientType === 'silk' ? host.dataset.gradientType : 'silk';
    const cols = host.dataset.gradient.split(',').map((s) => s.trim());
    const canvas = document.createElement('canvas');
    canvas.className = 'gradient';
    canvas.setAttribute('aria-hidden', 'true');
    canvas.style.backgroundColor = cols[0];          // never a dark/transparent flash while a frame is being prepared
    host.classList.add('gradient-host');
    host.prepend(canvas);
    return { host, canvas, ctx: canvas.getContext('2d'), c: cols.map(hex), type, offset: i * 9.1, visible: false, w: 2, h: 2 };
  });

  const fit = (it) => {
    const r = it.host.getBoundingClientRect();
    const scale = Math.min(0.5, 720 / Math.max(1, r.width));
    const w = Math.max(2, Math.round(r.width * scale)), h = Math.max(2, Math.round(r.height * scale));
    if (Math.abs(w - it.w) < 3 && Math.abs(h - it.h) < 3 && it.canvas.width > 2) return false;   // pin/unpin jitter: don't clear the canvas
    it.w = w; it.h = h; it.canvas.width = w; it.canvas.height = h;
    return true;
  };
  const ro = new ResizeObserver((entries) => entries.forEach((e) => { const it = items.find((x) => x.host === e.target); if (it && fit(it)) draw(it, clock.t); }));
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { const it = items.find((x) => x.host === e.target); if (it) it.visible = e.isIntersecting; });
    sync();
  }, { rootMargin: '60px' });

  const clock = { last: performance.now(), t: 3, acc: 0 };
  function draw(it, t) {
    const L = layer(it.type);
    if (renderer.domElement.width !== it.w || renderer.domElement.height !== it.h) renderer.setSize(it.w, it.h, false);
    if (L.camera.isPerspectiveCamera) { L.camera.aspect = it.w / it.h; L.camera.updateProjectionMatrix(); }
    const u = L.material.uniforms;
    u.uTime.value = t + it.offset; u.uRes.value.set(it.w, it.h);
    u.uC1.value.copy(it.c[0]); u.uC2.value.copy(it.c[1]); u.uC3.value.copy(it.c[2]);
    renderer.render(L.scene, L.camera);
    it.ctx.drawImage(renderer.domElement, 0, 0, it.w, it.h);
  }

  let running = false, raf = 0;
  const loop = (now) => {
    const dt = Math.min(0.1, (now - clock.last) / 1000); clock.last = now; clock.t += dt; clock.acc += dt;
    if (clock.acc >= 1 / 30) { clock.acc = 0; for (const it of items) if (it.visible) draw(it, clock.t); }   // 30 fps is plenty for slow gradients
    raf = running ? requestAnimationFrame(loop) : 0;
  };
  function sync() {
    const want = !reduceMotion && !document.hidden && items.some((i) => i.visible);
    if (want && !running) { running = true; clock.last = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!want && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
  }
  document.addEventListener('visibilitychange', sync);
  items.forEach((it) => { fit(it); draw(it, clock.t); ro.observe(it.host); io.observe(it.host); });   // first paint: a still frame
  return { destroy() { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); } };
}
