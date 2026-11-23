/* Parçacık evreni — Şevval Çikot
   Binlerce parçacık, sayfadaki bölüme göre portreye, proje görsellerine,
   fotoğraflara, yazılara ve grafiklere dönüşür. Three.js (WebGL) ile çizilir. */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const doc = document.documentElement;
const EN = doc.lang === 'en';
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = Math.min(innerWidth, innerHeight) < 700 || navigator.hardwareConcurrency <= 4;
const N = small ? 7000 : 16000;
const canvas = document.querySelector('canvas.universe');
const hud = document.querySelector('[data-hud]');

/* ---------- WebGL yoksa sade görünüm ---------- */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: true, powerPreference: 'high-performance' });
} catch (e) {
  doc.classList.add('no-webgl');
  throw e;
}
const PR = Math.min(devicePixelRatio || 1, small ? 1.5 : 1.75);
renderer.setPixelRatio(PR);
renderer.setClearColor(0x000000, 0);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
camera.position.set(0, 0, 7.2);
const group = new THREE.Group();
scene.add(group);

/* ---------- parçacık tamponları ---------- */
const geo = new THREE.BufferGeometry();
const A = (n) => new Float32Array(N * n);
const from = A(3), to = A(3), cFrom = A(3), cTo = A(3), rand = new Float32Array(N);
for (let i = 0; i < N; i++) rand[i] = Math.random();
geo.setAttribute('position', new THREE.BufferAttribute(A(3), 3)); // three.js için gerekli, kullanılmıyor
geo.setAttribute('aFrom', new THREE.BufferAttribute(from, 3));
geo.setAttribute('aTo', new THREE.BufferAttribute(to, 3));
geo.setAttribute('cFrom', new THREE.BufferAttribute(cFrom, 3));
geo.setAttribute('cTo', new THREE.BufferAttribute(cTo, 3));
geo.setAttribute('aRand', new THREE.BufferAttribute(rand, 1));
geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 50);

const U = {
  uProg: { value: 1 }, uTime: { value: 0 }, uSize: { value: small ? 30 : 26 }, uPR: { value: PR },
  uMouse: { value: new THREE.Vector2(99, 99) }, uRad: { value: 0.9 }, uPush: { value: 1 },
  uBurst: { value: new THREE.Vector3(0, 0, -99) }, uSwirl: { value: reduce ? 0 : 1 },
  uTint: { value: new THREE.Color(1, 1, 1) }, uTintAmt: { value: 0 },
};

const mat = new THREE.ShaderMaterial({
  uniforms: U, transparent: true, depthWrite: false,
  vertexShader: /* glsl */`
    attribute vec3 aFrom; attribute vec3 aTo; attribute vec3 cFrom; attribute vec3 cTo; attribute float aRand;
    uniform float uProg, uTime, uSize, uPR, uRad, uPush, uSwirl, uTintAmt;
    uniform vec2 uMouse; uniform vec3 uBurst, uTint;
    varying vec3 vCol; varying float vA;
    float ease(float t){ return t < .5 ? 4.*t*t*t : 1. - pow(-2.*t + 2., 3.) / 2.; }
    void main(){
      float t = ease(clamp((uProg - aRand * .35) / .65, 0., 1.));
      vec3 p = mix(aFrom, aTo, t);
      float mid = sin(t * 3.14159);
      p += vec3(sin(aRand * 40. + uTime * .9), cos(aRand * 31. + uTime * 1.1), sin(aRand * 17. + uTime)) * .75 * mid * uSwirl;
      p += vec3(sin(uTime * .6 + aRand * 20.), cos(uTime * .5 + aRand * 13.), sin(uTime * .4 + aRand * 7.)) * .012 * uSwirl;
      vec2 d = p.xy - uMouse; float dist = length(d);
      float f = smoothstep(uRad, 0., dist) * uPush;
      p.xy += normalize(d + 1e-4) * f * uRad * .55; p.z += f * .6;
      float bt = uTime - uBurst.z;
      if (bt > 0. && bt < 2.5) {
        vec3 bd = vec3(p.xy - uBurst.xy, (aRand - .5) * 2.);
        float k = exp(-bt * 2.2) * sin(min(bt * 5., 3.14159)) * smoothstep(3.5, 0., length(bd.xy));
        p += normalize(bd + 1e-4) * k * 1.6;
      }
      vec4 mv = modelViewMatrix * vec4(p, 1.);
      gl_Position = projectionMatrix * mv;
      gl_PointSize = uSize * uPR * (.55 + aRand * .6) / -mv.z;
      vCol = mix(mix(cFrom, cTo, t), uTint, uTintAmt);
      vA = .55 + .45 * aRand;
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vCol; varying float vA;
    void main(){
      vec2 c = gl_PointCoord - .5; float r = length(c);
      if (r > .5) discard;
      gl_FragColor = vec4(vCol, vA * smoothstep(.5, .15, r));
    }`,
});
const points = new THREE.Points(geo, mat);
group.add(points);

/* ---------- şekiller ---------- */
const H = 3.4; // şeklin yüksekliği (dünya birimi)
const palette = [new THREE.Color('#c8ff3d'), new THREE.Color('#5ee7ff'), new THREE.Color('#a98bff')];
const grad = (k, out) => {
  const s = k * (palette.length - 1), i = Math.min(palette.length - 2, Math.floor(s));
  return out.copy(palette[i]).lerp(palette[i + 1], s - i);
};
const tmp = new THREE.Color();

function fill(pos, col, gen) { for (let i = 0; i < N; i++) gen(i, pos, col); }

const SHAPES = {
  galaxy: () => shape((i, P, C) => {
    const arm = i % 3, r = Math.pow(rand[i], 0.7) * 2.6 + 0.05, a = r * 2.3 + arm * 2.094 + (Math.random() - .5) * .5;
    P.push(Math.cos(a) * r * 1.25, Math.sin(a) * r * .62, (Math.random() - .5) * .35 * (2.7 - r));
    grad(r / 2.7, tmp); C.push(tmp.r, tmp.g, tmp.b);
  }),
  sphere: () => shape((i, P, C) => {
    const y = 1 - (i / (N - 1)) * 2, rr = Math.sqrt(1 - y * y), th = i * 2.39996;
    const R = 1.75 + (Math.random() - .5) * .05;
    P.push(Math.cos(th) * rr * R, y * R, Math.sin(th) * rr * R);
    grad((y + 1) / 2, tmp); C.push(tmp.r, tmp.g, tmp.b);
  }),
  wave: () => shape((i, P, C) => {
    const cols = Math.round(Math.sqrt(N * 2.2)), x = (i % cols) / cols, z = Math.floor(i / cols) / (N / cols);
    const X = (x - .5) * 7, Z = (z - .5) * 3.2;
    P.push(X, Math.sin(X * 1.3) * .35 + Math.cos(Z * 2.2) * .25 - .6, Z);
    grad(x, tmp); C.push(tmp.r, tmp.g, tmp.b);
  }),
  grid: () => shape((i, P, C) => {
    const cols = 6, rows = 9, cell = i % (cols * rows), cx = cell % cols, cy = Math.floor(cell / cols);
    const fx = Math.random(), fy = Math.random(), edge = Math.random() < .5;
    const x = cx + (edge ? (Math.random() < .5 ? 0 : 1) : fx), y = cy + (edge ? fy : (Math.random() < .5 ? 0 : 1));
    P.push((x / cols - .5) * 4.6, (.5 - y / rows) * 3.6, (Math.random() - .5) * .05);
    grad(cx / cols, tmp); C.push(tmp.r, tmp.g, tmp.b);
  }),
};

function shape(gen) {
  const P = [], C = [];
  for (let i = 0; i < N; i++) gen(i, P, C);
  return { pos: new Float32Array(P), col: new Float32Array(C) };
}

/* çubuklar: <data value> değerlerinden yetenek grafiği */
function bars(values) {
  const n = values.length || 1, w = 3.8 / n;
  return shape((i, P, C) => {
    const b = i % n, v = (values[b] || 0) / 100, h = Math.max(.08, v * 3.2);
    const x = -1.9 + b * w + w * .15 + Math.random() * w * .7, y = -1.6 + Math.random() * h;
    P.push(x, y, (Math.random() - .5) * .4);
    grad(b / Math.max(1, n - 1), tmp); C.push(tmp.r, tmp.g, tmp.b);
  });
}

/* metni parçacıkla yaz */
function text(str) {
  const cv = document.createElement('canvas'), W = 900, Hh = 300;
  cv.width = W; cv.height = Hh;
  const g = cv.getContext('2d');
  let fs = 220;
  g.font = `800 ${fs}px Syne, "Arial Black", sans-serif`;
  while (g.measureText(str).width > W * .92 && fs > 40) { fs -= 10; g.font = `800 ${fs}px Syne, "Arial Black", sans-serif`; }
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(str, W / 2, Hh / 2);
  return fromCanvas(g, W, Hh, true);
}

/* görselden: her parçacık bir pikselin rengini alır, parlaklık derinlik olur */
const imgCache = new Map();
function image(url) {
  if (imgCache.has(url)) return imgCache.get(url);
  const p = new Promise((res, rej) => {
    const im = new Image();
    im.crossOrigin = 'anonymous';
    im.onload = () => {
      const maxW = 220, k = Math.min(maxW / im.width, 160 / im.height);
      const W = Math.max(8, Math.round(im.width * k)), Hh = Math.max(8, Math.round(im.height * k));
      const cv = document.createElement('canvas'); cv.width = W; cv.height = Hh;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(im, 0, 0, W, Hh);
      try { res(fromCanvas(g, W, Hh, false)); } catch (e) { rej(e); }
    };
    im.onerror = rej;
    im.src = url;
  });
  imgCache.set(url, p);
  return p;
}

function fromCanvas(g, W, Hh, mono) {
  const d = g.getImageData(0, 0, W, Hh).data, cand = [];
  for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) {
    const o = (y * W + x) * 4;
    if (d[o + 3] > 128) cand.push(o);
  }
  if (!cand.length) return SHAPES.sphere();
  const scale = (mono ? 2.2 : H) / Hh, P = new Float32Array(N * 3), C = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const o = cand[(i * 7919 + Math.floor(rand[i] * cand.length)) % cand.length], px = (o / 4) % W, py = Math.floor(o / 4 / W);
    const r = d[o] / 255, gg = d[o + 1] / 255, b = d[o + 2] / 255, lum = .3 * r + .59 * gg + .11 * b;
    P[i * 3] = (px - W / 2 + Math.random()) * scale;
    P[i * 3 + 1] = (Hh / 2 - py - Math.random()) * scale;
    P[i * 3 + 2] = mono ? (Math.random() - .5) * .3 : (lum - .5) * .9 + (Math.random() - .5) * .06;
    if (mono) { grad(px / W, tmp); C[i * 3] = tmp.r; C[i * 3 + 1] = tmp.g; C[i * 3 + 2] = tmp.b; }
    else { C[i * 3] = Math.min(1, r * 1.08 + .03); C[i * 3 + 1] = Math.min(1, gg * 1.08 + .03); C[i * 3 + 2] = Math.min(1, b * 1.08 + .03); }
  }
  return { pos: P, col: C };
}

/* ---------- dönüşüm ---------- */
const clock = new THREE.Clock();
let progStart = 0, morphDur = reduce ? .01 : 1.9, current = '', want = '';
const easeJS = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function morphTo(s) {
  const prog = U.uProg.value;
  for (let i = 0; i < N; i++) {
    const t = easeJS(Math.min(1, Math.max(0, (prog - rand[i] * .35) / .65)));
    for (let k = 0; k < 3; k++) {
      const j = i * 3 + k;
      from[j] = from[j] + (to[j] - from[j]) * t;
      cFrom[j] = cFrom[j] + (cTo[j] - cFrom[j]) * t;
    }
  }
  to.set(s.pos); cTo.set(s.col);
  ['aFrom', 'aTo', 'cFrom', 'cTo'].forEach((a) => { geo.attributes[a].needsUpdate = true; });
  U.uProg.value = 0; progStart = clock.getElapsedTime();
}

const LABELS = {
  portrait: EN ? 'portrait' : 'portre', galaxy: EN ? 'galaxy' : 'galaksi', sphere: EN ? 'sphere' : 'küre',
  wave: EN ? 'wave' : 'dalga', grid: EN ? 'grid' : 'ızgara', bars: EN ? 'chart' : 'grafik', image: EN ? 'image' : 'görsel', text: EN ? 'text' : 'yazı',
};
let hudShape = '';

async function resolve(spec) {
  const [kind, ...rest] = spec.split(':'), arg = rest.join(':');
  hudShape = LABELS[kind] || kind;
  if (kind === 'img' || kind === 'portrait') { hudShape = LABELS[kind === 'portrait' ? 'portrait' : 'image']; return image(arg); }
  if (kind === 'text') return text(arg);
  if (kind === 'bars') return bars(arg.split(',').map(Number));
  if (kind === 'skills') {
    const vals = [...document.querySelectorAll('[data-cms="skills"] data')].map((d) => +d.value);
    hudShape = LABELS.bars; return bars(vals.length ? vals : [60, 30, 20, 10]);
  }
  return (SHAPES[kind] || SHAPES.galaxy)();
}

async function go(spec) {
  if (!spec || spec === want) return;
  want = spec;
  try {
    const s = await resolve(spec);
    if (want !== spec) return;
    current = spec;
    morphTo(s);
  } catch (e) { console.warn('Şekil yüklenemedi:', spec, e); }
}

/* başlangıç: rastgele bir bulut, sonra ilk şekle */
for (let i = 0; i < N * 3; i++) { from[i] = to[i] = (Math.random() - .5) * 14; cFrom[i] = cTo[i] = .5; }

/* ---------- bölümler ---------- */
const sections = [...document.querySelectorAll('[data-shape]')];
let active = null, hoverSpec = null;
const sideOf = (el) => (el && el.dataset.side) || 'right';
const pick = () => {
  const mid = innerHeight * .45;
  let best = sections[0], bd = Infinity;
  for (const s of sections) {
    const r = s.getBoundingClientRect();
    const d = r.top > mid ? r.top - mid : r.bottom < mid ? mid - r.bottom : 0;
    if (d < bd) { bd = d; best = s; }
  }
  if (best !== active) { active = best; if (!hoverSpec) go(best.dataset.shape); }
};

/* proje, fotoğraf ve yazı kartlarının üzerine gelince o görsel */
const imgOf = (el) => el.dataset.preview || el.dataset.img2 && el.dataset.cap2 === (EN ? 'After' : 'Sonrası') && el.dataset.img2 || el.dataset.img || el.querySelector('img')?.src;
document.addEventListener('pointerover', (e) => {
  if (e.pointerType === 'touch') return;
  const el = e.target.closest('.prow, .project-card, .gallery-item, .strip-item, .blog-card');
  if (!el) return;
  const src = imgOf(el);
  if (src) { hoverSpec = 'img:' + new URL(src, location.href).href; go(hoverSpec); }
});
document.addEventListener('pointerout', (e) => {
  const el = e.target.closest('.prow, .project-card, .gallery-item, .strip-item, .blog-card');
  if (!el || el.contains(e.relatedTarget)) return;
  hoverSpec = null;
  clearTimeout(pointerout.t);
  pointerout.t = setTimeout(() => { if (!hoverSpec && active) go(active.dataset.shape); }, 600);
});
function pointerout() {}

/* ---------- fare, dokunma, eğim ---------- */
const ndc = new THREE.Vector2(), ray = new THREE.Raycaster(), plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
let tiltX = 0, tiltY = 0, tx = 0, ty = 0;
const toWorld = (x, y) => {
  ndc.set((x / innerWidth) * 2 - 1, -(y / innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  if (!ray.ray.intersectPlane(plane, hit)) return null;
  return group.worldToLocal(hit.clone());
};
addEventListener('pointermove', (e) => {
  tx = (e.clientX / innerWidth - .5); ty = (e.clientY / innerHeight - .5);
  if (reduce) return;
  const w = toWorld(e.clientX, e.clientY); if (w) U.uMouse.value.set(w.x, w.y);
}, { passive: true });
document.addEventListener('pointerleave', () => U.uMouse.value.set(99, 99));
addEventListener('pointerdown', (e) => {
  if (reduce || e.target.closest('a, button, input, textarea, select, label, iframe, .lightbox, .code-drawer, table')) return;
  const w = toWorld(e.clientX, e.clientY); if (w) U.uBurst.value.set(w.x, w.y, U.uTime.value);
});
addEventListener('deviceorientation', (e) => {
  if (e.gamma == null) return;
  tx = Math.max(-.5, Math.min(.5, e.gamma / 60)); ty = Math.max(-.5, Math.min(.5, (e.beta - 40) / 80));
}, { passive: true });

/* ---------- boyut ---------- */
let wide = true;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
  wide = w >= 900;
  camera.position.z = wide ? 7.2 : 8.6;
  pick();
}
addEventListener('resize', resize);
addEventListener('scroll', pick, { passive: true });

/* ---------- döngü ---------- */
let frames = 0, fpsT = 0, fps = 60, scrollV = 0, lastY = scrollY, visible = true;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) loop(); });
const speed = { v: 1 };
function loop() {
  if (!visible) return;
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), .05), t = clock.getElapsedTime();
  U.uTime.value += dt * speed.v;
  U.uProg.value = Math.min(1, (t - progStart) / morphDur);
  // kaydırma hızı ve eğim ile hafif dönme
  scrollV += ((scrollY - lastY) - scrollV) * .1; lastY = scrollY;
  tiltX += (tx - tiltX) * .05; tiltY += (ty - tiltY) * .05;
  const side = wide ? (sideOf(active) === 'left' ? -2.1 : sideOf(active) === 'center' ? 0 : 2.1) : 0;
  group.position.x += (side - group.position.x) * .05;
  group.position.y += ((wide ? 0 : .9) - group.position.y) * .05;
  if (!reduce) {
    group.rotation.y = tiltX * .5 + Math.sin(t * .15) * .08;
    group.rotation.x = tiltY * .3 + Math.max(-.4, Math.min(.4, scrollV * .004));
  }
  renderer.render(scene, camera);
  frames++;
  if (t - fpsT > 1) { fps = Math.round(frames / (t - fpsT)); frames = 0; fpsT = t; if (hud) hud.textContent = hudText(); }
}
const fmt = (n) => n.toLocaleString(EN ? 'en-US' : 'tr-TR');
const hudText = () => EN
  ? `${fmt(N)} particles · shape: ${hudShape} · ${fps} fps`
  : `${fmt(N)} parçacık · şekil: ${hudShape} · ${fps} fps`;

/* ---------- "kodu göster": evrenin ayarlarını canlı değiştir ---------- */
const drawer = document.querySelector('[data-code]');
if (drawer) {
  const ta = drawer.querySelector('textarea'), msg = drawer.querySelector('[data-code-msg]');
  const btn = document.querySelector('[data-code-btn]');
  const code = EN
    ? `// universe.js — edit me, changes are live\nconst universe = {\n  size: 1.0,      // particle size\n  push: 1.0,      // how hard the cursor pushes\n  speed: 1.0,     // motion speed\n  color: "image"  // "image" or a colour like "#c8ff3d"\n};`
    : `// evren.js — beni düzenle, değişiklik anında olur\nconst evren = {\n  boyut: 1.0,     // parçacık büyüklüğü\n  itme: 1.0,      // imlecin itme gücü\n  hız: 1.0,       // hareket hızı\n  renk: "görsel"  // "görsel" ya da "#c8ff3d" gibi bir renk\n};`;
  const num = (k, d) => { const m = ta.value.match(new RegExp(k + '\\s*:\\s*(-?[\\d.]+)')); return m ? Math.max(0, Math.min(5, parseFloat(m[1]))) : d; };
  const apply = () => {
    const size = num(EN ? 'size' : 'boyut', 1), push = num(EN ? 'push' : 'itme', 1), sp = num(EN ? 'speed' : 'h[ıi]z', 1);
    U.uSize.value = (small ? 30 : 26) * size; U.uPush.value = push; speed.v = sp;
    const m = ta.value.match(new RegExp((EN ? 'color' : 'renk') + '\\s*:\\s*["\\\']([^"\\\']+)'));
    const c = m && m[1].trim();
    if (c && /^#?[0-9a-f]{3,6}$/i.test(c)) { U.uTint.value.set(c.startsWith('#') ? c : '#' + c); U.uTintAmt.value = .85; }
    else U.uTintAmt.value = 0;
    msg.textContent = EN ? '✓ applied' : '✓ uygulandı';
  };
  let typed = false;
  const typeIn = () => {
    if (typed) return; typed = true;
    if (reduce) { ta.value = code; return; }
    let i = 0; ta.value = '';
    const step = () => { ta.value = code.slice(0, i += 3); if (i < code.length) setTimeout(step, 12); else ta.focus(); };
    step();
  };
  const toggle = (open) => {
    drawer.hidden = !open; btn.setAttribute('aria-expanded', String(open));
    if (open) typeIn();
  };
  btn.addEventListener('click', () => toggle(drawer.hidden));
  drawer.querySelector('[data-code-close]').addEventListener('click', () => { toggle(false); btn.focus(); });
  ta.addEventListener('input', apply);
  drawer.querySelector('[data-code-reset]').addEventListener('click', () => { ta.value = code; apply(); });
}

/* başla: cms içerik yerleştirdikten sonra şekilleri oku */
const start = () => { resize(); loop(); doc.classList.add('universe-on'); };
if (document.readyState === 'complete') setTimeout(start, 50); else addEventListener('load', () => setTimeout(start, 50));
