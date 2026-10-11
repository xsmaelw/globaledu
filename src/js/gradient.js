import * as THREE from 'three';
import { reduceMotion } from './env.js';

/**
 * Moving "ShaderGradient" backgrounds for the coloured sections.
 *
 * The look comes from ShaderGradient (https://github.com/ruucm/shadergradient, MIT, © ruucm): a plane displaced
 * by animated Perlin noise, lit like silk and tinted with three colours. This is a compact vanilla-three port
 * (no React): ONE shared WebGL renderer draws into the 2D canvas of every host that is currently on screen.
 */

const CNOISE = /* glsl */ `
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

const VERT = /* glsl */ `
${CNOISE}
uniform float uTime, uSpeed, uDensity, uStrength;
varying float vH;
varying vec3 vN, vV;
float field(vec2 p) { return cnoise(vec3(p * 0.43 * uDensity, uTime * uSpeed)); }
void main() {
  vec3 p = position;
  float e = 0.05;
  float h  = field(p.xy);
  float hx = field(p.xy + vec2(e, 0.0));
  float hy = field(p.xy + vec2(0.0, e));
  float amp = uStrength * 0.5;
  p.z += h * amp;
  vec3 n = normalize(vec3(-(hx - h) / e * amp, -(hy - h) / e * amp, 1.0));
  vH = h;
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  vN = normalize(normalMatrix * n);
  vV = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform vec3 uC1, uC2, uC3;
uniform float uGrain, uTime;
varying float vH;
varying vec3 vN, vV;
float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
void main() {
  float k = clamp(vH * 0.5 + 0.5, 0.0, 1.0);
  vec3 col = mix(uC1, uC2, smoothstep(0.42, 0.95, k));       // base colour dominates, light colour on the crests
  col = mix(col, uC3, smoothstep(0.52, 0.05, k));             // deep colour in the valleys
  vec3 N = normalize(vN), V = normalize(vV), L = normalize(vec3(-0.45, 0.65, 0.75));
  float dif = dot(N, L) * 0.5 + 0.5;
  float spec = pow(max(dot(reflect(-L, N), V), 0.0), 22.0);
  col *= 0.82 + 0.34 * dif;
  col += spec * 0.16;
  col += (hash(gl_FragCoord.xy + uTime) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}`;

const hex = (h) => { const n = parseInt(h.replace('#', ''), 16); return new THREE.Vector3(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255); };

export function initGradients() {
  const hosts = [...document.querySelectorAll('[data-gradient]')];
  if (!hosts.length) return null;
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false, powerPreference: 'low-power' }); } catch { return null; }
  renderer.setPixelRatio(1);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 60);
  camera.position.set(0, 0, 8);
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: {
      uTime: { value: 0 }, uSpeed: { value: 0.16 }, uDensity: { value: 1.25 }, uStrength: { value: 2.6 }, uGrain: { value: 0.045 },
      uC1: { value: new THREE.Vector3() }, uC2: { value: new THREE.Vector3() }, uC3: { value: new THREE.Vector3() },
    },
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(26, 20, 200, 160), material);
  mesh.rotation.set(-0.55, 0.0, 0.5);
  mesh.position.z = -1.5;
  scene.add(mesh);

  const items = hosts.map((host, i) => {
    const [a, b, c] = host.dataset.gradient.split(',').map((s) => hex(s.trim()));
    const canvas = document.createElement('canvas');
    canvas.className = 'gradient';
    canvas.setAttribute('aria-hidden', 'true');
    host.classList.add('gradient-host');
    host.prepend(canvas);
    return { host, canvas, ctx: canvas.getContext('2d', { alpha: false }), c: [a, b, c], offset: i * 7.3, visible: false, w: 2, h: 2 };
  });

  const fit = (it) => {
    const r = it.host.getBoundingClientRect();
    const scale = Math.min(0.55, 800 / Math.max(1, r.width));          // the gradient is smooth: render small, let the browser upscale
    it.w = Math.max(2, Math.round(r.width * scale)); it.h = Math.max(2, Math.round(r.height * scale));
    it.canvas.width = it.w; it.canvas.height = it.h;
  };
  const ro = new ResizeObserver((entries) => { entries.forEach((e) => { const it = items.find((x) => x.host === e.target); if (it) { fit(it); if (!running) draw(it, 3); } }); });
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => { const it = items.find((x) => x.host === e.target); if (it) it.visible = e.isIntersecting; });
    sync();
  }, { rootMargin: '80px' });
  items.forEach((it) => { fit(it); ro.observe(it.host); io.observe(it.host); });

  const clock = { last: performance.now(), t: 0 };
  function draw(it, t) {
    if (renderer.domElement.width !== it.w || renderer.domElement.height !== it.h) renderer.setSize(it.w, it.h, false);
    camera.aspect = it.w / it.h; camera.updateProjectionMatrix();
    const u = material.uniforms;
    u.uTime.value = t + it.offset; u.uC1.value.copy(it.c[0]); u.uC2.value.copy(it.c[1]); u.uC3.value.copy(it.c[2]);
    renderer.render(scene, camera);
    it.ctx.drawImage(renderer.domElement, 0, 0, it.w, it.h);
  }

  let running = false, raf = 0;
  const loop = (now) => {
    clock.t += Math.min(0.05, (now - clock.last) / 1000); clock.last = now;
    for (const it of items) if (it.visible) draw(it, clock.t);
    raf = running ? requestAnimationFrame(loop) : 0;
  };
  function sync() {
    const want = !reduceMotion && !document.hidden && items.some((i) => i.visible);
    if (want && !running) { running = true; clock.last = performance.now(); raf = requestAnimationFrame(loop); }
    else if (!want && running) { running = false; cancelAnimationFrame(raf); raf = 0; }
    if (reduceMotion) items.forEach((it) => draw(it, 3));
  }
  document.addEventListener('visibilitychange', sync);
  items.forEach((it) => draw(it, 3));   // first paint: a still frame, so there is never a flat-colour flash
  return { destroy() { running = false; cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); } };
}
