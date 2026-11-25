/* "Şevval'in Dünyası" — içinde dolaştığın bir animasyon filmi
   Rehber karakter Robi: Tomás Laulhé'nin (Quaternius) CC0 lisanslı RobotExpressive modeli.
   Meydan, deniz, gökyüzü, ekranlar ve tüm etkileşimler bu dosyada kodla kuruldu. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const doc = document.documentElement;
const EN = doc.lang === 'en';
const R = document.body.dataset.root;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = Math.min(innerWidth, innerHeight) < 700;
const canvas = document.querySelector('canvas.room');
const tip = document.querySelector('[data-tip]');
const t = (tr, en) => (EN ? en : tr);

/* ---------- sesler ---------- */
let ac = null, muted = false;
try { muted = localStorage.getItem('toon-muted') === '1'; } catch (e) { /* yok say */ }
const audio = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } return ac; };
function tone(type, f0, f1, dur, vol = 0.15, delay = 0) {
  if (muted || !audio()) return;
  const o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f0, now); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), now + dur);
  g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  o.connect(g).connect(ac.destination); o.start(now); o.stop(now + dur + 0.02);
}
const SFX = {
  pop: () => tone('sine', 600, 1200, 0.12),
  beep: () => { tone('square', 880, 880, 0.08, 0.06); tone('square', 1320, 1320, 0.1, 0.06, 0.1); },
  jingle: () => [392, 523, 659, 784].forEach((f, i) => tone('triangle', f, f, 0.25, 0.09, i * 0.13)),
  step: () => tone('square', 140, 90, 0.04, 0.025),
  ding: () => { tone('sine', 1320, 1320, 0.5, 0.1); tone('sine', 1760, 1760, 0.6, 0.07, 0.08); },
};
const muteBtn = document.querySelector('[data-mute]');
const showMute = () => { if (muteBtn) { muteBtn.textContent = muted ? '🔇' : '🔊'; muteBtn.setAttribute('aria-pressed', String(!muted)); } };
if (muteBtn) muteBtn.addEventListener('click', () => { muted = !muted; try { localStorage.setItem('toon-muted', muted ? '1' : '0'); } catch (e) { /* yok say */ } showMute(); if (!muted) SFX.pop(); });
showMute();

/* ---------- çizici ---------- */
let renderer;
try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' }); }
catch (e) { doc.classList.add('no-webgl'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.55;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1200);
scene.fog = new THREE.Fog(0xf0c9a0, 90, 420);

/* ---------- gökyüzü: gün batımı ---------- */
const sky = new Sky(); sky.scale.setScalar(900); scene.add(sky);
const su = sky.material.uniforms;
const sunDir = new THREE.Vector3();
const pmrem = new THREE.PMREMGenerator(renderer);
let envRT = null, night = false;
function setSky(n) {
  Object.assign(su.turbidity, { value: n ? 0.5 : 8 }); su.rayleigh.value = n ? 0.15 : 2.6; su.mieCoefficient.value = n ? 0.001 : 0.006; su.mieDirectionalG.value = 0.86;
  sunDir.setFromSphericalCoords(1, THREE.MathUtils.degToRad(90 - (n ? -8 : 7)), THREE.MathUtils.degToRad(235));
  su.sunPosition.value.copy(sunDir);
  const es = new THREE.Scene(), sk = new Sky(); sk.scale.setScalar(900); Object.keys(su).forEach((k) => (sk.material.uniforms[k].value = su[k].value)); es.add(sk);
  if (envRT) envRT.dispose(); envRT = pmrem.fromScene(es); scene.environment = envRT.texture;
}
setSky(false);
const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 2400 }, (_, i) => { const k = i % 3, a = Math.random() * Math.PI * 2, e = 0.05 + Math.random() * 1.4; return k === 0 ? Math.cos(a) * 600 * Math.cos(e) : k === 1 ? 600 * Math.sin(e) : Math.sin(a) * 600 * Math.cos(e); }), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, transparent: true, opacity: 0, fog: false }));
scene.add(stars);

/* ---------- ışık ---------- */
const hemi = new THREE.HemisphereLight(0xffe2c4, 0x4a5a6a, 0.6); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffc48a, 3.4);
sun.castShadow = true; sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -22, right: 22, top: 22, bottom: -22, near: 1, far: 120 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.04;
scene.add(sun, sun.target);

/* ---------- yardımcılar ---------- */
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0, ...o });
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const shadow = (o) => { o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx; };
const loader = new THREE.TextureLoader();
const photo = (p) => { const tx = loader.load(R + 'assets/images/' + p); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 8; return tx; };
const clickables = [];
const hot = (o, info) => { o.userData.hot = info; clickables.push(o); return o; };

/* ---------- deniz ---------- */
const seaGeo = new THREE.PlaneGeometry(1200, 1200, small ? 90 : 160, small ? 90 : 160); seaGeo.rotateX(-Math.PI / 2);
const seaBase = seaGeo.attributes.position.array.slice();
const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: 0x0d4a63, roughness: 0.12, metalness: 0.55, envMapIntensity: 1.2 }));
at(sea, 0, -4.2, 0); scene.add(sea);

/* ---------- uçurum ve meydan ---------- */
const RAD = 15;
const cliffGeo = new THREE.CylinderGeometry(RAD + 1.5, RAD + 4, 9, 40, 4);
{ const p = cliffGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), y = p.getY(i); const n = 1 + Math.sin(Math.atan2(z, x) * 7 + y) * 0.04 + (Math.random() - 0.5) * 0.04; if (y < 4.4) { p.setX(i, x * n); p.setZ(i, z * n); } } cliffGeo.computeVertexNormals(); }
const cliff = new THREE.Mesh(cliffGeo, std(0xb48a68, { roughness: 0.95, flatShading: true })); at(cliff, 0, -4.6, 0); cliff.receiveShadow = true; scene.add(cliff);
const tileTex = canvasTex(1024, 1024, (g, w) => {
  g.fillStyle = '#e9dcc6'; g.fillRect(0, 0, w, w);
  const c = w / 2;
  for (let r = 40; r < c; r += 38) { g.strokeStyle = 'rgba(120,95,70,.35)'; g.lineWidth = 3; g.beginPath(); g.arc(c, c, r, 0, 7); g.stroke();
    const n = Math.floor(r / 9); for (let k = 0; k < n; k++) { const a = (k / n) * Math.PI * 2 + r; g.beginPath(); g.moveTo(c + Math.cos(a) * r, c + Math.sin(a) * r); g.lineTo(c + Math.cos(a) * (r + 38), c + Math.sin(a) * (r + 38)); g.stroke(); } }
  for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(${90 + Math.random() * 60},${70 + Math.random() * 40},50,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * w, 3, 3); }
  g.fillStyle = 'rgba(226,88,47,.85)'; g.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2, r = k % 2 ? 40 : 110; g.lineTo(c + Math.cos(a) * r, c + Math.sin(a) * r); } g.fill();
});
const plaza = new THREE.Mesh(new THREE.CircleGeometry(RAD + 1.4, 72), std(0xffffff, { map: tileTex, roughness: 0.82 }));
plaza.rotation.x = -Math.PI / 2; at(plaza, 0, 0.01, 0); plaza.receiveShadow = true; scene.add(plaza);
// korkuluk
const rail = new THREE.Group();
for (let i = 0; i < 64; i++) { const a = (i / 64) * Math.PI * 2; const post = at(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 1.1, 8), std(0xf4efe6, { roughness: 0.5 })), Math.cos(a) * (RAD + 1.1), 0.55, Math.sin(a) * (RAD + 1.1)); rail.add(post); }
const ring = new THREE.Mesh(new THREE.TorusGeometry(RAD + 1.1, 0.08, 8, 140), std(0xf4efe6, { roughness: 0.4 })); ring.rotation.x = Math.PI / 2; ring.position.y = 1.12; rail.add(ring);
scene.add(shadow(rail));

/* ---------- palmiyeler, lambalar, saksılar ---------- */
function palm(x, z, s = 1, lean = 0.25) {
  const g = new THREE.Group(); const trunkM = std(0x8d6a48, { roughness: 0.9 });
  for (let i = 0; i < 9; i++) { const seg = at(new THREE.Mesh(new THREE.CylinderGeometry(0.16 - i * 0.008, 0.19 - i * 0.008, 0.5, 9), trunkM), Math.sin(lean) * i * 0.13, 0.25 + i * 0.47, 0); seg.rotation.z = -lean * 0.3; g.add(seg); }
  const top = new THREE.Group(); at(top, Math.sin(lean) * 9 * 0.13, 4.3, 0); g.add(top);
  for (let i = 0; i < 9; i++) {
    const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.quadraticCurveTo(0.45, 1.3, 0, 2.8); shape.quadraticCurveTo(-0.45, 1.3, 0, 0);
    const leaf = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), std(i % 2 ? 0x3f7f3a : 0x4e9446, { side: THREE.DoubleSide, roughness: 0.75 }));
    const piv = new THREE.Group(); piv.rotation.set(0, (i / 9) * Math.PI * 2, 0); leaf.rotation.x = -1.05 - Math.random() * 0.25; piv.add(leaf); top.add(piv);
  }
  for (let i = 0; i < 3; i++) top.add(at(new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 10), std(0x6b4a2a)), Math.cos(i * 2) * 0.2, -0.15, Math.sin(i * 2) * 0.2));
  at(g, x, 0, z); g.scale.setScalar(s); g.rotation.y = Math.random() * 6; scene.add(shadow(g)); return top;
}
const palmTops = [];
[[0.62, 1.1], [1.88, 1], [3.15, 1.2], [4.4, 0.95], [5.65, 1.1]].forEach(([a, s]) => palmTops.push(palm(Math.cos(a) * (RAD - 1.2), Math.sin(a) * (RAD - 1.2), s)));
const lampHeads = [], lampLights = [];
for (let i = 0; i < 10; i++) {
  const a = (i / 10) * Math.PI * 2, g = new THREE.Group();
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.1, 3.4, 10), std(0x22252c, { metalness: 0.6, roughness: 0.4 })), 0, 1.7, 0));
  const head = at(new THREE.Mesh(new THREE.SphereGeometry(0.26, 18, 18), new THREE.MeshStandardMaterial({ color: 0xfff1d0, emissive: 0xffc977, emissiveIntensity: 0.2 })), 0, 3.55, 0); g.add(head); lampHeads.push(head);
  if (!small && i % 2 === 0) { const pl = new THREE.PointLight(0xffc977, 0, 14, 1.8); at(pl, 0, 3.4, 0); g.add(pl); lampLights.push(pl); }
  at(g, Math.cos(a) * (RAD - 0.4), 0, Math.sin(a) * (RAD - 0.4)); scene.add(shadow(g));
}
const fountain = new THREE.Group();
fountain.add(at(new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.5, 0.6, 40), std(0xf4efe6, { roughness: 0.5 })), 0, 0.3, 0));
const water = at(new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.1, 0.05, 40), new THREE.MeshStandardMaterial({ color: 0x3aa6c8, roughness: 0.05, metalness: 0.4, transparent: true, opacity: 0.85 })), 0, 0.55, 0); fountain.add(water);
fountain.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 1.6, 20), std(0xf4efe6, { roughness: 0.5 })), 0, 1.1, 0));
fountain.add(at(new THREE.Mesh(new THREE.CylinderGeometry(1, 0.6, 0.3, 30), std(0xf4efe6, { roughness: 0.5 })), 0, 1.95, 0));
const jetGeo = new THREE.BufferGeometry(), JN = 300, jp = new Float32Array(JN * 3), jv = [];
for (let i = 0; i < JN; i++) { jv.push({ t: Math.random() * 1.4, a: Math.random() * Math.PI * 2, s: 0.6 + Math.random() * 0.6 }); }
jetGeo.setAttribute('position', new THREE.BufferAttribute(jp, 3));
const jets = new THREE.Points(jetGeo, new THREE.PointsMaterial({ color: 0xcdefff, size: 0.09, transparent: true, opacity: 0.85 })); fountain.add(jets);
scene.add(shadow(fountain));
const FOUNT_R = 2.8;

/* ---------- 5 sahne ekranı ---------- */
const textTex = (lines, bg, w = 1024, h = 256) => canvasTex(w, h, (g) => {
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.font = `400 ${Math.round(h * 0.42)}px "Lilita One", "Arial Rounded MT Bold", sans-serif`; g.fillText(lines[0], w / 2, h * 0.42);
  if (lines[1]) { g.font = `600 ${Math.round(h * 0.16)}px "Nunito", sans-serif`; g.globalAlpha = 0.85; g.fillText(lines[1], w / 2, h * 0.8); }
});
const contactTex = canvasTex(1024, 640, (g, w, h) => {
  const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, '#1fb5a5'); gr.addColorStop(1, '#0d6e8a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineWidth = 14; g.beginPath(); g.roundRect(w / 2 - 230, h / 2 - 150, 460, 300, 26); g.fill();
  g.strokeStyle = '#1fb5a5'; g.lineWidth = 12; g.beginPath(); g.moveTo(w / 2 - 220, h / 2 - 140); g.lineTo(w / 2, h / 2 + 20); g.lineTo(w / 2 + 220, h / 2 - 140); g.stroke();
  g.fillStyle = '#ff6f91'; g.beginPath(); g.arc(w / 2 - 22, h / 2 + 70, 26, 0, 7); g.arc(w / 2 + 22, h / 2 + 70, 26, 0, 7); g.fill(); g.beginPath(); g.moveTo(w / 2 - 47, h / 2 + 80); g.lineTo(w / 2, h / 2 + 130); g.lineTo(w / 2 + 47, h / 2 + 80); g.fill();
});
const PROJ = ['proje4-sonrasi.jpg', 'proje1-sonrasi.jpg', 'proje2-sonrasi.jpg', 'proje3-sonrasi.jpg', 'proje5.jpg', 'proje6-sonrasi.jpg'].map((p) => photo('projeler/' + p));
const GAL = ['bayburt', 'ortaokul', 'lise', 'universite'].map((p) => photo(`galeri/${p}.jpg`));
const STATIONS = [
  { href: t('hakkimda.html', 'about.html'), n: 1, title: t('Hakkımda', 'About me'), sub: t('Kimim, neler seviyorum', 'Who I am, what I love'), col: '#e2582f', tex: [photo('vesikalik.jpg')], a: -Math.PI / 2 },
  { href: t('projeler.html', 'projects.html'), n: 2, title: t('Projeler', 'Projects'), sub: t('Photoshop çalışmalarım', 'My Photoshop work'), col: '#7a5cff', tex: PROJ, a: -Math.PI / 2 + 1.257 },
  { href: t('galeri.html', 'gallery.html'), n: 3, title: t('Galeri', 'Gallery'), sub: t('Okuduğum yerler', 'Places I studied'), col: '#1f8a80', tex: GAL, a: -Math.PI / 2 + 2.513 },
  { href: 'blog.html', n: 4, title: 'Blog', sub: t('Yazılarım', 'My posts'), col: '#2b3a67', tex: [photo('blog/site.jpg'), PROJ[5], PROJ[0]], a: -Math.PI / 2 + 3.77 },
  { href: t('iletisim.html', 'contact.html'), n: 5, title: t('İletişim', 'Contact'), sub: t('Bana yaz', 'Write to me'), col: '#e23b3b', tex: [contactTex], a: -Math.PI / 2 + 5.027 },
];
const SR = 10.2;
STATIONS.forEach((s) => {
  const g = new THREE.Group();
  const x = Math.cos(s.a) * SR, z = Math.sin(s.a) * SR; at(g, x, 0, z); g.lookAt(0, 0, 0);
  const frameM = std(0x1c1d22, { metalness: 0.5, roughness: 0.35 });
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 0.22), frameM), -1.9, 1.6, -0.05));
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(0.22, 3.2, 0.22), frameM), 1.9, 1.6, -0.05));
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(4.3, 2.75, 0.18), frameM), 0, 4.25, -0.1));
  const scrM = new THREE.MeshBasicMaterial({ map: s.tex[0], toneMapped: false });
  const scr = at(new THREE.Mesh(new THREE.PlaneGeometry(4, 2.45), scrM), 0, 4.25, 0.0); g.add(scr);
  const plaque = at(new THREE.Mesh(new THREE.PlaneGeometry(3.6, 0.9), new THREE.MeshBasicMaterial({ map: textTex([s.title, t('Sahne ', 'Scene ') + s.n + ' · ' + s.sub], s.col), toneMapped: false })), 0, 2.4, 0.02); g.add(plaque);
  g.add(at(new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.0, 0.1), frameM), 0, 2.4, -0.05));
  const back = at(new THREE.Mesh(new THREE.PlaneGeometry(4.1, 2.6), new THREE.MeshBasicMaterial({ map: textTex([s.title, t('Sahne ', 'Scene ') + s.n], s.col, 1024, 640), toneMapped: false })), 0, 4.25, -0.2); back.rotation.y = Math.PI; g.add(back);
  const glow = new THREE.PointLight(new THREE.Color(s.col), 1.2, 7, 2); at(glow, 0, 4.2, 1.2); g.add(glow);
  const base = at(new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.5, 0.15, 32), std(new THREE.Color(s.col), { roughness: 0.4, emissive: new THREE.Color(s.col), emissiveIntensity: 0.25 })), 0, 0.08, 1.4); g.add(base);
  s.g = g; s.scrM = scrM; s.i = 0; s.base = base;
  s.stand = new THREE.Vector3(Math.cos(s.a) * (SR - 2.2), 0, Math.sin(s.a) * (SR - 2.2));
  scene.add(shadow(g));
  hot(g, { label: `${t('Sahne', 'Scene')} ${s.n} · ${s.title}`, station: s });
});
setInterval(() => STATIONS.forEach((s) => { if (s.tex.length > 1) { s.i = (s.i + 1) % s.tex.length; s.scrM.map = s.tex[s.i]; s.scrM.needsUpdate = true; } }), 2600);

/* ---------- yelkenliler ve martılar ---------- */
const boats = [];
for (let i = 0; i < 3; i++) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 0.4, 4, 8), std(0xffffff, { roughness: 0.4 })); hull.rotation.z = Math.PI / 2; hull.scale.z = 0.55; g.add(hull);
  g.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 5, 6), std(0x8a6a4a)), 0, 2.6, 0));
  const sail = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.1, 0.6, 0), new THREE.Vector3(0.1, 5, 0), new THREE.Vector3(2.4, 0.7, 0)]), std([0xfff3e0, 0xe2582f, 0x1f8a80][i], { side: THREE.DoubleSide })); sail.geometry.computeVertexNormals(); g.add(sail);
  g.userData = { r: 45 + i * 22, s: (i % 2 ? -1 : 1) * (0.025 + i * 0.006), o: i * 2.1 };
  scene.add(shadow(g)); boats.push(g);
}
const gulls = [];
for (let i = 0; i < 7; i++) {
  const g = new THREE.Group(), wm = new THREE.MeshStandardMaterial({ color: 0xffffff, side: THREE.DoubleSide, roughness: 0.6 });
  const mk = (s) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.22), wm); m.geometry.translate(s * 0.45, 0, 0); g.add(m); return m; };
  g.userData = { l: mk(-1), r: mk(1), rad: 14 + Math.random() * 25, h: 12 + Math.random() * 8, sp: 0.15 + Math.random() * 0.15, o: Math.random() * 6 };
  scene.add(g); gulls.push(g);
}

/* ---------- Robi (animasyonlu karakter) ---------- */
const robi = { obj: null, mixer: null, actions: {}, cur: null, face: null, pos: new THREE.Vector3(0, 0, 5), target: null, onArrive: null, busy: 0 };
const marker = new THREE.Mesh(new THREE.RingGeometry(0.35, 0.5, 32), new THREE.MeshBasicMaterial({ color: 0xffd36e, transparent: true, opacity: 0, depthWrite: false }));
marker.rotation.x = -Math.PI / 2; marker.position.y = 0.04; scene.add(marker);
function play(name, fade = 0.25, once = false) {
  const a = robi.actions[name]; if (!a || robi.cur === a) return;
  a.reset(); a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat); a.clampWhenFinished = once; a.fadeIn(fade).play();
  if (robi.cur) robi.cur.fadeOut(fade);
  robi.cur = a;
}
function emote(name, then = 'Idle') {
  play(name, 0.2, true); robi.busy = 1;
  const a = robi.actions[name];
  const done = (e) => { if (e.action !== a) return; robi.mixer.removeEventListener('finished', done); robi.busy = 0; robi.cur = null; play(robi.target ? 'Walking' : then, 0.3); };
  robi.mixer.addEventListener('finished', done);
}
function face(name, v = 1, ms = 1200) {
  if (!robi.face) return; const d = robi.face.morphTargetDictionary; Object.values(d).forEach((i) => (robi.face.morphTargetInfluences[i] = 0));
  if (name in d) { robi.face.morphTargetInfluences[d[name]] = v; setTimeout(() => (robi.face.morphTargetInfluences[d[name]] = 0), ms); }
}
new GLTFLoader().load(R + 'assets/models/RobotExpressive.glb', (gltf) => {
  const o = gltf.scene; o.scale.setScalar(0.52);
  o.traverse((c) => { if (c.isMesh) { c.castShadow = true; c.receiveShadow = true; if (c.material) c.material.envMapIntensity = 0.8; } });
  robi.obj = o; robi.mixer = new THREE.AnimationMixer(o);
  gltf.animations.forEach((clip) => (robi.actions[clip.name] = robi.mixer.clipAction(clip)));
  robi.face = o.getObjectByName('Head_4') || null;
  o.traverse((c) => { if (!robi.face && c.morphTargetDictionary && 'Surprised' in c.morphTargetDictionary) robi.face = c; });
  o.position.copy(robi.pos); scene.add(o);
  hot(o, { label: t('Robi · tıkla, dans etsin!', 'Robi · click to make it dance!'), robi: true });
  play('Idle', 0);
  if (pendingFocus) { const f = pendingFocus; pendingFocus = null; window.RoomScene.focus(f); }
}, undefined, (e) => console.warn('Robi yüklenemedi', e));

/* ---------- kamera: Robi'yi takip eden sinema kamerası ---------- */
const controls = new OrbitControls(camera, canvas);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.08, enablePan: false, minDistance: 4, maxDistance: 34, minPolarAngle: 0.35, maxPolarAngle: 1.45, rotateSpeed: 0.55 });
camera.position.set(0, 4.2, 11.8); controls.target.set(0, 1.7, 4.4);
let fly = null, cine = null;
const clock = new THREE.Clock();
function flyTo(pos, tgt, dur = 1.8) { fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: pos.clone(), t1: tgt.clone(), s: clock.getElapsedTime(), d: reduce ? 0.01 : dur }; }
const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
controls.addEventListener('start', () => { fly = null; cine = null; });

/* ---------- yürüme ---------- */
const keys = {};
addEventListener('keydown', (e) => { if (e.target.closest('input, textarea') || document.querySelector('.sheet.open')) return; if (/^(Arrow|Key[WASD])/.test(e.code)) { keys[e.code] = true; e.preventDefault(); robi.target = null; robi.onArrive = null; } });
addEventListener('keyup', (e) => { keys[e.code] = false; });
function walkTo(p, onArrive) {
  const v = p.clone(); v.y = 0;
  if (v.length() > RAD - 0.6) v.setLength(RAD - 0.6);
  if (v.length() < FOUNT_R) v.setLength(FOUNT_R);
  robi.target = v; robi.onArrive = onArrive || null;
  marker.position.set(v.x, 0.04, v.z); marker.material.opacity = 0.9; marker.scale.setScalar(1);
}

/* ---------- tıklama ve üzerine gelme ---------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
const findHot = (o) => { while (o) { if (o.userData && o.userData.hot) return o; o = o.parent; } return null; };
const setPtr = (e) => { const r = canvas.getBoundingClientRect(); ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ptr, camera); };
function pick(e) { setPtr(e); for (const h of ray.intersectObjects(clickables, true)) { const o = findHot(h.object); if (o) return o; } return null; }
let downAt = null, hovered = null;
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; audio(); });
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  const o = pick(e);
  if (o !== hovered) {
    hovered = o;
    if (o && o.userData.hot.robi && !robi.busy && !robi.target) { emote('Wave'); face('Surprised', 0.6); }
  }
  canvas.style.cursor = o ? 'pointer' : 'crosshair';
  if (o) { tip.textContent = o.userData.hot.label; tip.hidden = false; tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`; } else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { tip.hidden = true; hovered = null; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  if (doc.classList.contains('intro-playing')) return;
  const o = pick(e);
  if (o && o.userData.hot.robi) { SFX.beep(); const list = ['Dance', 'Jump', 'ThumbsUp', 'Yes', 'Wave']; emote(list[(pick.n = (pick.n || 0) + 1) % list.length]); face(['Surprised', 'Sad', 'Angry'][pick.n % 3], 0.5, 900); say([t('Hadi dans!', "Let's dance!"), t('Hop!', 'Hop!'), t('Süper!', 'Awesome!'), t('Evet!', 'Yes!'), t('Merhaba!', 'Hello!')][pick.n % 5], e); return; }
  if (o && o.userData.hot.station) { SFX.pop(); window.RoomUI.open(o.userData.hot.station.href); return; }
  // yere tıkla: Robi oraya yürür
  setPtr(e); const h = ray.intersectObject(plaza)[0];
  if (h) { SFX.step(); walkTo(h.point); }
});
function say(text, e) {
  const b = document.querySelector('[data-bubble]');
  b.textContent = text; b.hidden = false; b.style.transform = `translate(${e.clientX - 30}px, ${e.clientY - 80}px)`;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  clearTimeout(say.t); say.t = setTimeout(() => (b.hidden = true), 1800);
}
document.querySelectorAll('[data-night]').forEach((b) => b.addEventListener('click', () => { setNight(!night); SFX.ding(); }));
function setNight(n) { night = n; doc.classList.toggle('night', n); setSky(n); document.querySelectorAll('[data-night]').forEach((b) => (b.textContent = n ? '☀️' : '🌙')); }

/* ---------- sahne kartı ---------- */
const card = document.querySelector('[data-episode]');
function sceneCard(s) {
  if (!card) return;
  card.querySelector('[data-ep-num]').textContent = t('SAHNE ', 'SCENE ') + s.n;
  card.querySelector('[data-ep-title]').textContent = s.title;
  card.hidden = false; card.classList.remove('go'); void card.offsetWidth; card.classList.add('go');
  SFX.jingle(); clearTimeout(sceneCard.t); sceneCard.t = setTimeout(() => (card.hidden = true), reduce ? 300 : 1500);
}
function cineFor(s) {
  const dir = new THREE.Vector3(Math.cos(s.a), 0, Math.sin(s.a));
  const side = new THREE.Vector3(-dir.z, 0, dir.x);
  const scr = dir.clone().multiplyScalar(SR).setY(3.4);
  return { pos: dir.clone().multiplyScalar(SR - 6.8).add(side.multiplyScalar(3)).setY(3), tgt: scr };
}

/* ---------- arayüz bağlantısı ---------- */
const byHref = Object.fromEntries(STATIONS.map((s) => [s.href, s]));
let sheetOpen = false, pendingFocus = null, first = true;
window.RoomScene = {
  focus(href) {
    const key = href.split('/').pop().split('?')[0] || 'index.html';
    let s = byHref[key]; if (!s && /^blog-|^yazi/.test(key)) s = byHref['blog.html'];
    if (!robi.obj) { pendingFocus = href; return; }
    if (!s) { robi.target = null; cine = null; if (!first) flyTo(robi.pos.clone().multiplyScalar(0.3).add(new THREE.Vector3(0, 4.2, 9)), robi.pos.clone().setY(1.7)); first = false; return; }
    if (first) { first = false; robi.pos.copy(s.stand); robi.obj.position.copy(s.stand); robi.obj.lookAt(0, 0, 0); robi.obj.rotation.y += Math.PI; const c = cineFor(s); camera.position.copy(c.pos); controls.target.copy(c.tgt); cine = c; return; }
    sceneCard(s);
    walkTo(s.stand, () => { robi.obj.lookAt(Math.cos(s.a) * 30, 0, Math.sin(s.a) * 30); emote('ThumbsUp'); });
    const c = cineFor(s); flyTo(c.pos, c.tgt, 2.2); cine = c;
  },
  home() { cine = null; },
  setSheet(open) { sheetOpen = open; if (!open) cine = null; resize(); },
  tour,
};
let touring = false;
async function tour(btn) {
  if (touring) { touring = false; return; }
  touring = true; btn && btn.setAttribute('aria-pressed', 'true');
  for (const s of STATIONS) {
    if (!touring) break;
    window.RoomUI.caption(`${t('Sahne', 'Scene')} ${s.n}: ${s.title} — ${s.sub}`);
    walkTo(s.stand, () => emote('Wave'));
    const c = cineFor(s); flyTo(c.pos, c.tgt, 2.4); cine = c;
    await new Promise((r) => setTimeout(r, 4200));
  }
  touring = false; cine = null; window.RoomUI.caption(''); btn && btn.setAttribute('aria-pressed', 'false');
}

/* ---------- açılış jeneriği ---------- */
const introEl = document.querySelector('[data-film-intro]');
function intro() {
  let seen = false; try { seen = sessionStorage.getItem('film-intro') === '1'; } catch (e) { /* yok say */ }
  const file = location.pathname.split('/').pop() || 'index.html';
  if (seen || reduce || file !== 'index.html' || !introEl) { introEl && introEl.remove(); return; }
  try { sessionStorage.setItem('film-intro', '1'); } catch (e) { /* yok say */ }
  doc.classList.add('intro-playing'); introEl.hidden = false;
  camera.position.set(-60, 55, 90); controls.target.set(0, 2, 0);
  flyTo(new THREE.Vector3(0, 4.2, 11.8), new THREE.Vector3(0, 1.7, 4.4), 6.5);
  const end = () => { doc.classList.remove('intro-playing'); introEl.classList.add('out'); setTimeout(() => introEl.remove(), 900); };
  const tm = setTimeout(end, 6800);
  introEl.addEventListener('click', () => { clearTimeout(tm); fly = null; camera.position.set(0, 4.2, 11.8); controls.target.set(0, 1.7, 4.4); end(); }, { once: true });
}

/* ---------- çizim ---------- */
const composer = small ? null : new EffectComposer(renderer);
let bloom = null;
if (composer) { composer.addPass(new RenderPass(scene, camera)); bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.35, 0.55, 0.88); composer.addPass(bloom); composer.addPass(new OutputPass()); }
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); if (composer) composer.setSize(w, h);
  camera.aspect = w / h;
  const shift = w >= 980 && sheetOpen ? Math.min(600, w * 0.46) / 2 : 0;
  if (shift) camera.setViewOffset(w, h, shift, 0, w, h); else camera.clearViewOffset();
  camera.fov = w < 700 ? 58 : 45; camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

let visible = true, lastStep = 0;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) loop(); });
const tmpV = new THREE.Vector3(), camOff = new THREE.Vector3();
function loop() {
  if (!visible) return;
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05), tm = clock.elapsedTime;
  // klavye
  if (robi.obj) {
    const f = (keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowDown || keys.KeyS ? 1 : 0), sx = (keys.ArrowRight || keys.KeyD ? 1 : 0) - (keys.ArrowLeft || keys.KeyA ? 1 : 0);
    if (f || sx) {
      camera.getWorldDirection(tmpV); tmpV.y = 0; tmpV.normalize();
      const right = new THREE.Vector3(-tmpV.z, 0, tmpV.x);
      const mv = tmpV.multiplyScalar(f).add(right.multiplyScalar(sx)).normalize().multiplyScalar(4.2 * dt);
      const np = robi.pos.clone().add(mv); if (np.length() < RAD - 0.6 && np.length() > FOUNT_R) robi.pos.copy(np);
      robi.obj.rotation.y = Math.atan2(mv.x, mv.z); if (!robi.busy) play('Walking'); cine = null;
      if (tm - lastStep > 0.33) { lastStep = tm; SFX.step(); }
    } else if (robi.target) {
      const d = robi.target.clone().sub(robi.pos); d.y = 0; const dist = d.length();
      if (dist < 0.12) { robi.target = null; marker.material.opacity = 0; if (!robi.busy) play('Idle'); const cb = robi.onArrive; robi.onArrive = null; cb && cb(); }
      else {
        const run = dist > 7; const sp = (run ? 7.5 : 3.6) * dt;
        robi.pos.add(d.normalize().multiplyScalar(Math.min(sp, dist)));
        // çeşmenin içinden geçme
        if (robi.pos.length() < FOUNT_R) robi.pos.setLength(FOUNT_R);
        const want = Math.atan2(d.x, d.z); let dy = want - robi.obj.rotation.y; dy = Math.atan2(Math.sin(dy), Math.cos(dy)); robi.obj.rotation.y += dy * Math.min(1, dt * 10);
        if (!robi.busy) play(run ? 'Running' : 'Walking');
        if (tm - lastStep > (run ? 0.22 : 0.33)) { lastStep = tm; SFX.step(); }
      }
    } else if (!robi.busy && robi.cur !== robi.actions.Idle && !keys.x) play('Idle');
    robi.obj.position.copy(robi.pos);
    robi.mixer.update(dt);
  }
  marker.material.opacity = Math.max(0, marker.material.opacity - dt * 0.6); marker.scale.setScalar(1 + (0.9 - marker.material.opacity) * 0.6);
  // kamera
  if (fly) { const k = Math.min(1, (tm - fly.s) / fly.d), e = ease(k); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (k >= 1) fly = null; }
  else if (!cine && robi.obj && !doc.classList.contains('intro-playing')) {
    // takip: kamerayı Robi ile birlikte kaydır
    const goal = robi.pos.clone().setY(1.6), delta = goal.sub(controls.target).multiplyScalar(1 - Math.exp(-dt * 4));
    controls.target.add(delta); camera.position.add(delta);
  }
  controls.update();
  // ışık ve gölge kamerayla birlikte
  sun.position.copy(controls.target).addScaledVector(night ? new THREE.Vector3(-0.3, 0.8, 0.4).normalize() : sunDir.clone().setY(Math.max(0.35, sunDir.y)).normalize(), 60);
  sun.target.position.copy(controls.target);
  sun.intensity += ((night ? 0.4 : 3.4) - sun.intensity) * 0.05;
  sun.color.lerp(new THREE.Color(night ? 0x8fa6ff : 0xffc48a), 0.05);
  hemi.intensity += ((night ? 0.2 : 0.6) - hemi.intensity) * 0.05;
  scene.fog.color.lerp(new THREE.Color(night ? 0x0b1030 : 0xf0c9a0), 0.05);
  stars.material.opacity += ((night ? 0.95 : 0) - stars.material.opacity) * 0.05;
  if (bloom) bloom.strength += ((night ? 1.0 : 0.35) - bloom.strength) * 0.05;
  lampHeads.forEach((h) => (h.material.emissiveIntensity += ((night ? 3 : 0.2) - h.material.emissiveIntensity) * 0.08));
  lampLights.forEach((l) => (l.intensity += ((night ? 18 : 0) - l.intensity) * 0.08));
  if (!reduce) {
    const p = seaGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = seaBase[i * 3], z = seaBase[i * 3 + 2]; p.setY(i, Math.sin(x * 0.05 + tm * 0.8) * 0.5 + Math.cos(z * 0.06 + tm * 0.6) * 0.45 + Math.sin((x + z) * 0.15 + tm * 1.6) * 0.12); }
    p.needsUpdate = true; seaGeo.computeVertexNormals();
    boats.forEach((b) => { const u = b.userData, a = tm * u.s + u.o; at(b, Math.cos(a) * u.r, -4 + Math.sin(tm + u.o) * 0.25, Math.sin(a) * u.r); b.rotation.y = -a + (u.s > 0 ? 0 : Math.PI); b.rotation.z = Math.sin(tm * 1.2 + u.o) * 0.06; });
    gulls.forEach((g) => { const u = g.userData, a = tm * u.sp + u.o; at(g, Math.cos(a) * u.rad, u.h + Math.sin(tm + u.o), Math.sin(a) * u.rad); g.rotation.y = -a; const fl = Math.sin(tm * 7 + u.o) * 0.55; u.l.rotation.y = fl; u.r.rotation.y = -fl; });
    palmTops.forEach((pt, i) => { pt.rotation.z = Math.sin(tm * 0.9 + i) * 0.05; pt.rotation.x = Math.cos(tm * 0.7 + i) * 0.04; });
    for (let i = 0; i < JN; i++) { const v = jv[i]; v.t += dt; if (v.t > 1.4) v.t = 0; const k = v.t; jp[i * 3] = Math.cos(v.a) * k * v.s * 0.9; jp[i * 3 + 1] = 2.1 + k * 3.2 - k * k * 3.4; jp[i * 3 + 2] = Math.sin(v.a) * k * v.s * 0.9; }
    jetGeo.attributes.position.needsUpdate = true;
    STATIONS.forEach((s, i) => (s.base.material.emissiveIntensity = 0.2 + Math.sin(tm * 2 + i) * 0.12));
  }
  sky.position.copy(camera.position);
  if (composer) composer.render(); else renderer.render(scene, camera);
}

const hr = new Date().getHours(); if (hr >= 19 || hr < 6) setNight(true);
resize(); intro(); loop();
doc.classList.add('room-ready');
window.dispatchEvent(new Event('room:ready'));
