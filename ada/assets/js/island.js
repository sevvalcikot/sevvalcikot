/* Şevval'in Adası — Akdeniz'de yüzen 3D bir ada (Three.js)
   Ada tamamen kodla kuruldu. Yapılara tıklayınca kamera o yapıya uçar
   ve ilgili sayfa yan panelde açılır. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const doc = document.documentElement;
const EN = doc.lang === 'en';
const R = document.body.dataset.root;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = Math.min(innerWidth, innerHeight) < 700;
const canvas = document.querySelector('canvas.room');
const tip = document.querySelector('[data-tip]');
const t = (tr, en) => (EN ? en : tr);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: !small, powerPreference: 'high-performance' });
} catch (e) { doc.classList.add('no-webgl'); throw e; }
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, small ? 1.5 : 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;

const scene = new THREE.Scene();
const SKY_DAY = new THREE.Color('#9fdcf5'), SKY_NIGHT = new THREE.Color('#0d1433');
scene.background = SKY_DAY.clone();
scene.fog = new THREE.Fog(SKY_DAY.clone(), 38, 90);
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 300);
const HOME_POS = new THREE.Vector3(20, 15.5, 25), HOME_TGT = new THREE.Vector3(0, 1.4, 0);
camera.position.copy(HOME_POS);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME_TGT);
Object.assign(controls, { enableDamping: true, dampingFactor: 0.07, minDistance: 5, maxDistance: 42, minPolarAngle: 0.3, maxPolarAngle: 1.38, enablePan: false, rotateSpeed: 0.6 });
controls.autoRotate = !reduce; controls.autoRotateSpeed = 0.35;

/* ---------- yardımcılar ---------- */
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.8, metalness: 0, flatShading: true, ...o });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt, rb, h, m, seg = 16) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const cone = (r, h, m, seg = 8) => new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m);
const sph = (r, m, seg = 10) => new THREE.Mesh(new THREE.IcosahedronGeometry(r, seg > 12 ? 2 : 1), m);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const shadow = (o, cast = true, recv = true) => { o.traverse((c) => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = recv; } }); return o; };
const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx;
};
const loader = new THREE.TextureLoader();
const photo = (p) => { const tx = loader.load(R + 'assets/images/' + p); tx.colorSpace = THREE.SRGBColorSpace; return tx; };
const clickables = [];
const hot = (obj, info) => { obj.userData.hot = info; clickables.push(obj); return obj; };
const rnd = (i) => { const x = Math.sin(i * 127.1) * 43758.5453; return x - Math.floor(x); };

/* ---------- ışık ---------- */
const hemi = new THREE.HemisphereLight(0xdff4ff, 0x6a8a5a, 1.1); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff0d6, 2.6);
sun.position.set(-16, 22, 10); sun.castShadow = true;
sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
sun.shadow.bias = -0.0008;
scene.add(sun);

/* ---------- deniz ---------- */
const seaGeo = new THREE.PlaneGeometry(160, 160, small ? 70 : 110, small ? 70 : 110);
seaGeo.rotateX(-Math.PI / 2);
const seaBase = seaGeo.attributes.position.array.slice();
const sea = new THREE.Mesh(seaGeo, new THREE.MeshStandardMaterial({ color: 0x1aa6c9, roughness: 0.35, metalness: 0.1, flatShading: true, transparent: true, opacity: 0.94 }));
sea.receiveShadow = true; scene.add(sea);
const waveH = (x, z, tm) => Math.sin(x * 0.35 + tm * 1.2) * 0.18 + Math.cos(z * 0.3 + tm * 0.9) * 0.16 + Math.sin((x + z) * 0.8 + tm * 2) * 0.05;

/* ---------- ada ---------- */
const island = new THREE.Group(); scene.add(island);
function blob(r, h, m, jitter, seed, y) {
  const g = new THREE.CylinderGeometry(r, r * 1.08, h, 28, 2);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x);
    const k = 1 + Math.sin(a * 3 + seed) * jitter + Math.sin(a * 7 + seed * 2) * jitter * 0.5;
    p.setX(i, x * k); p.setZ(i, z * k);
  }
  g.computeVertexNormals();
  const m2 = new THREE.Mesh(g, m); m2.position.y = y; return m2;
}
const rockMat = mat(0xb98b62), sandMat = mat(0xf3d9a4), grassMat = mat(0x7cc46a), grass2 = mat(0x5aa85a);
island.add(blob(9.2, 3, rockMat, 0.08, 1, -1.3));
island.add(blob(9.6, 0.5, sandMat, 0.08, 1, 0.15));
island.add(blob(7.6, 0.5, grassMat, 0.09, 2.2, 0.55));
const hill = blob(3.2, 1.6, grass2, 0.12, 4, 1.4); hill.position.set(-3.2, 1.4, -2.6); hill.scale.set(1, 1, 0.9); island.add(hill);
shadow(island);
// kayalar
for (let i = 0; i < 14; i++) {
  const a = rnd(i) * Math.PI * 2, r = 9.3 + rnd(i + 30) * 1.2;
  const rk = sph(0.3 + rnd(i + 9) * 0.5, mat(0x9a8676)); at(rk, Math.cos(a) * r, 0.05, Math.sin(a) * r); rk.scale.y = 0.6; island.add(shadow(rk));
}

/* ---------- ağaçlar ---------- */
function palm(x, z, s = 1, lean = 0.2) {
  const g = new THREE.Group();
  for (let i = 0; i < 6; i++) { const seg = at(cyl(0.12 - i * 0.008, 0.14 - i * 0.008, 0.5, mat(0x9a6b42), 6), Math.sin(lean) * i * 0.18, 0.25 + i * 0.46, 0); g.add(seg); }
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.9, 4), mat(i % 2 ? 0x3e9b5b : 0x4fb46a));
    leaf.geometry.translate(0, 0.95, 0);
    const piv = new THREE.Group(); at(piv, Math.sin(lean) * 5 * 0.18, 2.9, 0); piv.rotation.set(1.15, (i / 7) * Math.PI * 2, 0, 'YXZ');
    piv.add(leaf); g.add(piv);
  }
  at(g, x, 0.75, z); g.scale.setScalar(s); g.rotation.y = rnd(x * z) * 6; island.add(shadow(g)); return g;
}
function pine(x, z, s = 1) {
  const g = new THREE.Group();
  g.add(at(cyl(0.12, 0.16, 0.6, mat(0x7a5236), 6), 0, 0.3, 0));
  [[1, 1.4, 1.0], [0.8, 1.2, 1.7], [0.55, 1, 2.3]].forEach(([r, h, y]) => g.add(at(cone(r, h, mat(0x2f8a5a), 7), 0, y, 0)));
  at(g, x, 0.75, z); g.scale.setScalar(s); island.add(shadow(g)); return g;
}
const palms = [palm(6.4, 3.2, 1.05), palm(5.6, 5.1, 0.85, 0.35), palm(-6.8, 2.8, 1), palm(2.2, 7, 0.9), palm(-1.8, 7.2, 0.8, 0.3)];
pine(-5.6, -3.8, 1.2); pine(-4.4, -5.2, 0.9); pine(-1.8, -4.6, 1); pine(3.6, -6.2, 1.1);
// çiçekler
for (let i = 0; i < 40; i++) {
  const a = rnd(i + 3) * Math.PI * 2, r = 1.5 + rnd(i + 7) * 5.5;
  const f = sph(0.08, mat([0xff6f91, 0xffd36e, 0xffffff, 0xb388ff][i % 4])); at(f, Math.cos(a) * r, 0.84, Math.sin(a) * r); island.add(f);
}

/* ---------- patika ---------- */
const pathMat = mat(0xe8cf9c);
const PATH = [[0, 0], [2.6, -2], [4.6, -3.4], [0, 0], [-2.4, 1.6], [-4.4, 3.6], [0, 0], [1.2, 3.2], [1.6, 5.6], [0, 0], [-0.6, -3.2], [-0.4, -5.6]];
for (let i = 0; i < PATH.length; i += 3) {
  const curve = new THREE.CatmullRomCurve3(PATH.slice(i, i + 3).map(([x, z]) => new THREE.Vector3(x, 0.81, z)));
  for (let k = 0; k <= 10; k++) { const p = curve.getPoint(k / 10); const st = at(cyl(0.32, 0.32, 0.04, pathMat, 7), p.x, 0.81, p.z); st.rotation.y = k; island.add(st); st.receiveShadow = true; }
}

/* ---------- 1) Üniversite binası: Hakkımda ---------- */
const uni = new THREE.Group();
const wallW = mat(0xfff3e0), roofM = mat(0xe2582f);
uni.add(at(box(3.4, 1.9, 2.2, wallW), 0, 0.95, 0));
const roof = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 2.2, 1.1, 4), roofM); roof.rotation.y = Math.PI / 4; roof.scale.set(1.25, 1, 0.82); at(roof, 0, 2.45, 0); uni.add(roof);
for (let i = 0; i < 4; i++) uni.add(at(cyl(0.12, 0.12, 1.6, mat(0xffffff), 8), -1.2 + i * 0.8, 0.8, 1.2));
uni.add(at(box(3.6, 0.15, 0.5, mat(0xffffff)), 0, 1.65, 1.2));
for (let i = 0; i < 3; i++) uni.add(at(box(0.5, 0.6, 0.05, mat(0x5ec2f2, { emissive: 0x000000 })), -1 + i, 1.1, 1.11));
uni.add(at(box(0.6, 0.9, 0.06, mat(0x8a5a3c)), 0, 0.45, 1.12));
const signTex = (txt, bg = '#1f8a80', fg = '#fff') => canvasTex(512, 128, (g, w, h) => { g.fillStyle = bg; g.fillRect(0, 0, w, h); g.fillStyle = fg; g.font = '800 64px "Bricolage Grotesque", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 4); });
const uniSign = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 0.55), new THREE.MeshBasicMaterial({ map: signTex(t('HAKKIMDA', 'ABOUT ME')) }));
at(uniSign, 0, 2.05, 1.46); uni.add(uniSign);
const flagPole = at(cyl(0.03, 0.03, 1.5, mat(0x888888), 6), 1.4, 3.0, 0); uni.add(flagPole);
const flag = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.45, 8, 1), new THREE.MeshStandardMaterial({ color: 0xe23b3b, side: THREE.DoubleSide }));
at(flag, 1.77, 3.5, 0); uni.add(flag);
at(uni, 4.6, 0.8, -3.6); uni.rotation.y = -0.6; island.add(shadow(uni));
hot(uni, { label: t('Üniversite · Hakkımda', 'University · About me'), href: t('hakkimda.html', 'about.html'), focus: [4.6, 2, -3.6], from: [9.2, 4.8, 2.2] });

/* ---------- 2) Atölye ve şövale: Projeler ---------- */
const PROJ = ['projeler/proje4-sonrasi.jpg', 'projeler/proje1-sonrasi.jpg', 'projeler/proje2-sonrasi.jpg', 'projeler/proje3-sonrasi.jpg', 'projeler/proje5.jpg', 'projeler/proje6-sonrasi.jpg'];
const projTex = PROJ.map(photo);
const studio = new THREE.Group();
studio.add(at(box(2.4, 1.6, 2, mat(0xffd36e)), 0, 0.8, 0));
const sRoof = at(box(2.8, 0.18, 2.4, mat(0x1f8a80)), 0, 1.7, 0); sRoof.rotation.z = 0.12; studio.add(sRoof);
studio.add(at(box(0.6, 1, 0.06, mat(0x8a5a3c)), -0.5, 0.5, 1.01));
studio.add(at(box(0.7, 0.5, 0.05, mat(0x5ec2f2)), 0.5, 1, 1.01));
const easel = new THREE.Group();
[[-0.45, 0.15], [0.45, 0.15], [0, -0.4]].forEach(([x, z], i) => { const l = at(cyl(0.04, 0.04, 2.3, mat(0x8a5a3c), 6), x, 1.1, z); l.rotation.x = i === 2 ? -0.25 : 0.12; l.rotation.z = x * -0.25; easel.add(l); });
const canvasM = new THREE.MeshStandardMaterial({ map: projTex[0], roughness: 0.6 });
const board = at(box(1.4, 1.1, 0.06, mat(0xffffff)), 0, 1.55, 0.25); easel.add(board);
const pic = at(new THREE.Mesh(new THREE.PlaneGeometry(1.28, 0.98), canvasM), 0, 1.55, 0.29); easel.add(pic);
easel.rotation.x = -0.12; at(easel, 2.1, 0, 1.1); easel.rotation.y = -0.5; studio.add(easel);
const palette = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.04, 14), mat(0xd9a066)); palette.scale.z = 0.7; at(palette, 1.3, 0.6, 1.6); studio.add(palette);
[0xe2582f, 0x1f8a80, 0xffd36e, 0x7a5cff].forEach((c, i) => studio.add(at(sph(0.06, mat(c)), 1.1 + i * 0.12, 0.64, 1.55 + (i % 2) * 0.12)));
const stSign = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.45), new THREE.MeshBasicMaterial({ map: signTex(t('PROJELER', 'PROJECTS'), '#e2582f') }));
at(stSign, 0, 1.45, 1.02); studio.add(stSign);
at(studio, -4.4, 0.8, 3.6); studio.rotation.y = 0.9; island.add(shadow(studio));
hot(studio, { label: t('Atölye · Projelerim', 'Studio · My projects'), href: t('projeler.html', 'projects.html'), focus: [-3.4, 1.8, 4.4], from: [-8.6, 4.4, 10.4] });
let projIdx = 0;
setInterval(() => { projIdx = (projIdx + 1) % projTex.length; canvasM.map = projTex[projIdx]; canvasM.needsUpdate = true; }, 2600);

/* ---------- 3) Açık hava sergisi: Galeri ---------- */
const GAL = [['galeri/bayburt.jpg', t('Memleketim Bayburt', 'My hometown, Bayburt')], ['galeri/ortaokul.jpg', t('Okuduğum ortaokul', 'My middle school')],
  ['galeri/lise.jpg', t('Okuduğum lise', 'My high school')], ['galeri/universite.jpg', t('Okuduğum üniversite', 'My university')]];
const expo = new THREE.Group();
GAL.forEach(([p, title], i) => {
  const st = new THREE.Group(), a = (i - 1.5) * 0.55;
  st.add(at(cyl(0.05, 0.05, 1.2, mat(0x333333), 6), 0, 0.6, 0));
  st.add(at(box(1.1, 1.4, 0.08, mat([0xffffff, 0xe2582f, 0x1f8a80, 0xffd36e][i])), 0, 1.8, 0));
  st.add(at(new THREE.Mesh(new THREE.PlaneGeometry(0.95, 1.25), new THREE.MeshStandardMaterial({ map: photo(p), roughness: 0.5 })), 0, 1.8, 0.05));
  at(st, Math.sin(a) * 2.2, 0, Math.cos(a) * 2.2 - 2.2); st.rotation.y = a;
  expo.add(st);
  hot(st, { label: t('Sergi · ', 'Exhibition · ') + title, href: t('galeri.html', 'gallery.html'), focus: [1.4, 2.2, 6.4], from: [3.6, 4.2, 13] });
});
// sergi tentesi
const awn = new THREE.Mesh(new THREE.CylinderGeometry(3.1, 3.1, 0.12, 24, 1, true, -1.2, 2.4), new THREE.MeshStandardMaterial({ color: 0xff8a5c, side: THREE.DoubleSide, flatShading: true }));
at(awn, 0, 3.0, -2.2); expo.add(awn);
at(expo, 1.4, 0.8, 7); island.add(shadow(expo));

/* ---------- 4) Kitap kulesi: Blog ---------- */
const POSTS = [['blog-layer-comps.html', 'Layer Comps', '#e2582f'], ['blog-image-stack.html', 'Image Stack', '#1f8a80'], ['blog-yapay-zeka-ile-web-sitesi.html', t('Yapay Zeka', 'AI'), '#7a5cff']];
const tower = new THREE.Group();
POSTS.forEach(([href, name, col], i) => {
  const spine = canvasTex(512, 128, (g, w, h) => { g.fillStyle = col; g.fillRect(0, 0, w, h); g.fillStyle = '#fff3e0'; g.fillRect(20, 0, 10, h); g.fillRect(w - 30, 0, 10, h); g.font = '800 58px "Bricolage Grotesque", sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(name, w / 2, h / 2 + 4); });
  const c = new THREE.Color(col), m = mat(c), pages = mat(0xfff8ec);
  const b = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.62, 1.7), [pages, m, m, m, new THREE.MeshStandardMaterial({ map: spine }), pages]);
  at(b, 0, 0.31 + i * 0.64, 0); b.rotation.y = (i - 1) * 0.22; tower.add(b);
  hot(b, { label: t('Kitap · Blog: ', 'Book · Blog: ') + name, href, focus: [-4.6, 1.8, -1.4], from: [-9.8, 3.6, 2.4] });
});
const lampTop = at(cyl(0.12, 0.2, 0.3, mat(0xffd36e, { emissive: 0xffc24a, emissiveIntensity: 0.6 })), 0, 2.1, 0); tower.add(lampTop);
at(tower, -4.6, 0.8, -1.4); tower.rotation.y = 0.9; island.add(shadow(tower));
const towerHit = at(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 8), new THREE.MeshBasicMaterial({ visible: false })), -4.6, 2, -1.4); island.add(towerHit);
hot(towerHit, { label: t('Kitap kulesi · Blog', 'Book tower · Blog'), href: 'blog.html', focus: [-4.6, 1.8, -1.4], from: [-9.8, 3.6, 2.4], low: true });

/* ---------- 5) Deniz feneri: İletişim ---------- */
const lh = new THREE.Group();
const stripe = canvasTex(64, 512, (g, w, h) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#e23b3b'; g.fillRect(0, (i * h) / 8, w, h / 8); } });
lh.add(at(cyl(0.95, 1.2, 0.5, mat(0x9a8676)), 0, 0.25, 0));
lh.add(at(new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.85, 4.2, 16), new THREE.MeshStandardMaterial({ map: stripe, roughness: 0.6 })), 0, 2.6, 0));
lh.add(at(cyl(0.85, 0.85, 0.12, mat(0x333333)), 0, 4.75, 0));
const glass = at(cyl(0.45, 0.45, 0.7, new THREE.MeshStandardMaterial({ color: 0xfff2b0, emissive: 0xffd36e, emissiveIntensity: 0.3, transparent: true, opacity: 0.85 })), 0, 5.15, 0); lh.add(glass);
lh.add(at(cone(0.6, 0.6, mat(0xe23b3b), 12), 0, 5.8, 0));
const beamPivot = new THREE.Group(); at(beamPivot, 0, 5.15, 0); lh.add(beamPivot);
const beamGeo = new THREE.ConeGeometry(1.4, 9, 20, 1, true); beamGeo.translate(0, -4.5, 0); beamGeo.rotateZ(Math.PI / 2);
const beam = new THREE.Mesh(beamGeo, new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
beamPivot.add(beam);
const lhLight = new THREE.PointLight(0xffe08a, 0, 14, 1.6); at(lhLight, 0, 5.15, 0); lh.add(lhLight);
at(lh, 7.6, 0.4, -0.6); island.add(shadow(lh));
hot(lh, { label: t('Deniz feneri · İletişim', 'Lighthouse · Contact'), href: t('iletisim.html', 'contact.html'), focus: [7.6, 3.2, -0.6], from: [15, 6, 4] });

/* ---------- yön tabelası (merkez) ---------- */
const post = new THREE.Group();
post.add(at(cyl(0.08, 0.1, 3, mat(0x8a5a3c), 6), 0, 1.5, 0));
const ARROWS = [
  [t('Hakkımda', 'About'), t('hakkimda.html', 'about.html'), '#1f8a80', -0.65],
  [t('Projeler', 'Projects'), t('projeler.html', 'projects.html'), '#e2582f', 2.45],
  [t('Galeri', 'Gallery'), t('galeri.html', 'gallery.html'), '#7a5cff', 1.65],
  ['Blog', 'blog.html', '#2b3a67', 3.6],
  [t('İletişim', 'Contact'), t('iletisim.html', 'contact.html'), '#e23b3b', 0.1],
];
ARROWS.forEach(([txt, href, col, ang], i) => {
  const tx = canvasTex(512, 128, (g, w, h) => { g.fillStyle = col; g.beginPath(); g.moveTo(0, 0); g.lineTo(w - 70, 0); g.lineTo(w, h / 2); g.lineTo(w - 70, h); g.lineTo(0, h); g.fill(); g.fillStyle = '#fff'; g.font = '800 60px "Bricolage Grotesque", sans-serif'; g.textBaseline = 'middle'; g.fillText(txt, 30, h / 2 + 4); });
  const m = new THREE.MeshStandardMaterial({ map: tx, transparent: true, side: THREE.DoubleSide, roughness: 0.6 });
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.4), m); sign.geometry.translate(0.8, 0, 0);
  at(sign, 0, 2.7 - i * 0.42, 0); sign.rotation.y = -ang; post.add(sign);
  hot(sign, { label: t('Tabela · ', 'Sign · ') + txt, href, signHref: true });
});
at(post, 0, 0.8, 0); island.add(shadow(post));

/* ---------- kaplumbağa (Caretta caretta) ---------- */
const turtle = new THREE.Group();
const shell = sph(0.5, mat(0x8a6a3a), 14); shell.scale.set(1, 0.45, 1.2); at(shell, 0, 0.2, 0); turtle.add(shell);
turtle.add(at(sph(0.18, mat(0xc9a46a)), 0, 0.15, 0.68));
[[-1, 1], [1, 1], [-1, -1], [1, -1]].forEach(([x, z]) => { const f = sph(0.14, mat(0xc9a46a)); f.scale.set(1.6, 0.4, 0.8); at(f, x * 0.45, 0.08, z * 0.45); turtle.add(f); });
const T_HOME = new THREE.Vector3(3.6, 0.42, 8.8);
turtle.position.copy(T_HOME); turtle.rotation.y = 0.3; island.add(shadow(turtle));
hot(turtle, { label: t('Caretta caretta · denize gönder', 'Caretta caretta · send to the sea'), action: 'turtle' });
let turtleGo = -99;

/* ---------- tekneler, martılar, yunus, bulutlar ---------- */
function boat(col, sailCol) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.25, 2.2, 6, 1), mat(col)); hull.rotation.z = Math.PI / 2; hull.scale.z = 0.6; at(hull, 0, 0.2, 0); g.add(hull);
  g.add(at(cyl(0.04, 0.04, 2.4, mat(0x8a5a3c), 6), 0, 1.4, 0));
  const sail = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.05, 0.4, 0), new THREE.Vector3(0.05, 2.5, 0), new THREE.Vector3(1.2, 0.5, 0)]), new THREE.MeshStandardMaterial({ color: sailCol, side: THREE.DoubleSide }));
  sail.geometry.computeVertexNormals(); g.add(sail);
  scene.add(shadow(g)); return g;
}
const boats = [{ g: boat(0xffffff, 0xe2582f), r: 15, s: 0.07, o: 0 }, { g: boat(0x1f8a80, 0xfff3e0), r: 20, s: -0.045, o: 2.5 }];
boats.forEach((b) => hot(b.g, { label: t('Yelkenli · selam ver', 'Sailboat · say hello'), action: 'boat' }));
const gulls = [];
for (let i = 0; i < 6; i++) {
  const g = new THREE.Group(), wm = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const wing = (s) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.14), wm); m.geometry.translate(s * 0.27, 0, 0); g.add(m); return m; };
  g.userData = { l: wing(-1), r: wing(1), rad: 6 + rnd(i) * 9, h: 8 + rnd(i + 4) * 4, sp: 0.25 + rnd(i + 8) * 0.25, o: i };
  g.scale.setScalar(0.7);
  scene.add(g); gulls.push(g);
}
const dolphin = new THREE.Group();
const dBody = sph(0.45, mat(0x6f8fa8), 14); dBody.scale.set(0.6, 0.6, 2); dolphin.add(dBody);
const fin = cone(0.2, 0.45, mat(0x6f8fa8), 4); at(fin, 0, 0.35, 0); dolphin.add(fin);
const dTail = cone(0.3, 0.35, mat(0x6f8fa8), 4); dTail.rotation.x = Math.PI / 2; dTail.scale.x = 2; at(dTail, 0, 0, -1); dolphin.add(dTail);
dolphin.visible = false; scene.add(dolphin);
const clouds = [];
for (let i = 0; i < 7; i++) {
  const c = new THREE.Group(), cm = mat(0xffffff, { roughness: 1 });
  for (let k = 0; k < 4; k++) c.add(at(sph(1 + rnd(i * 4 + k) * 0.8, cm, 14), k * 1.2 - 1.8, rnd(k + i) * 0.5, rnd(k * 2 + i) * 0.6));
  at(c, -40 + i * 13, 15 + rnd(i) * 5, -18 + rnd(i + 2) * 30); c.scale.y = 0.6;
  scene.add(c); clouds.push(c);
}
// güneş ve ay
const sunBall = at(new THREE.Mesh(new THREE.SphereGeometry(2.4, 24, 24), new THREE.MeshBasicMaterial({ color: 0xffe08a })), -30, 26, -40); scene.add(sunBall);
const moon = at(new THREE.Mesh(new THREE.SphereGeometry(1.8, 24, 24), new THREE.MeshBasicMaterial({ color: 0xf5f1dc })), 30, 24, -40); moon.visible = false; scene.add(moon);
hot(sunBall, { label: t('Güneş · geceye geç', 'Sun · switch to night'), action: 'daynight' });
hot(moon, { label: t('Ay · sabaha geç', 'Moon · switch to day'), action: 'daynight' });
const stars = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(Array.from({ length: 900 }, (_, i) => { const k = i % 3; const a = rnd(i) * Math.PI * 2, e = 0.15 + rnd(i + 1) * 1.2; return k === 0 ? Math.cos(a) * 80 * Math.cos(e) : k === 1 ? 80 * Math.sin(e) : Math.sin(a) * 80 * Math.cos(e); }), 3)), new THREE.PointsMaterial({ color: 0xffffff, size: 0.35, transparent: true, opacity: 0 }));
scene.add(stars);
// pencere ışıkları (gece)
const winLights = []; uni.traverse((c) => { if (c.isMesh && c.material.color && c.material.color.getHex() === 0x5ec2f2) winLights.push(c); });

/* ---------- gece / gündüz ---------- */
let night = false;
function setNight(n) { night = n; doc.classList.toggle('night', n); sunBall.visible = !n; moon.visible = n; }
const lerp = (a, b, k) => a + (b - a) * k;

/* ---------- etkileşim ---------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let hovered = null, downAt = null;
const findHot = (o) => { while (o) { if (o.userData.hot) return o; o = o.parent; } return null; };
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  let low = null;
  for (const h of ray.intersectObjects(clickables, true)) {
    const o = findHot(h.object); if (!o) continue;
    if (o.userData.hot.low) { low = low || o; continue; }
    return o;
  }
  return low;
}
const glow = (o, on) => o.traverse((c) => {
  if (!c.isMesh || !c.material || Array.isArray(c.material) || !('emissive' in c.material)) return;
  if (on) { if (!c.userData.own) { c.material = c.material.clone(); c.userData.own = true; } c.userData.em = [c.material.emissive.getHex(), c.material.emissiveIntensity]; c.material.emissive.set(0xff8a5c); c.material.emissiveIntensity = 0.35; }
  else if (c.userData.em) { c.material.emissive.setHex(c.userData.em[0]); c.material.emissiveIntensity = c.userData.em[1]; }
});
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  const o = pick(e);
  if (o !== hovered) { if (hovered) glow(hovered, false); hovered = o; if (o) glow(o, true); }
  canvas.style.cursor = o ? 'pointer' : 'grab';
  const label = o && o.userData.hot.label;
  if (label) { tip.textContent = label; tip.hidden = false; tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`; } else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { tip.hidden = true; if (hovered) { glow(hovered, false); hovered = null; } });
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; controls.autoRotate = false; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  const o = pick(e); if (o) activate(o.userData.hot, e);
});
function say(text, e) {
  const b = document.querySelector('[data-bubble]');
  b.textContent = text; b.hidden = false;
  b.style.transform = `translate(${(e ? e.clientX : innerWidth / 2) - 30}px, ${(e ? e.clientY : innerHeight / 2) - 70}px)`;
  clearTimeout(say.t); say.t = setTimeout(() => (b.hidden = true), 1700);
}
let honk = -9;
function activate(h, e) {
  if (h.action === 'daynight') { setNight(!night); say(night ? t('İyi geceler 🌙', 'Good night 🌙') : t('Günaydın ☀️', 'Good morning ☀️'), e); return; }
  if (h.action === 'turtle') { if (clock.getElapsedTime() - turtleGo > 9) { turtleGo = clock.getElapsedTime(); say(t('Güle güle küçük caretta! 🐢', 'Bye, little caretta! 🐢'), e); } return; }
  if (h.action === 'boat') { honk = clock.getElapsedTime(); say(t('Ahoy! ⛵', 'Ahoy! ⛵'), e); return; }
  if (h.href) window.RoomUI.open(h.href);
}

/* ---------- kamera uçuşu ve dışa açılan arayüz ---------- */
let fly = null;
const clock = new THREE.Clock();
function flyTo(pos, tgt, dur = 1.6) { controls.autoRotate = false; fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...tgt), s: clock.getElapsedTime(), d: reduce ? 0.01 : dur }; }
const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const FOCUS = {};
clickables.forEach((o) => { const h = o.userData.hot; if (h.href && h.focus && !FOCUS[h.href]) FOCUS[h.href] = h; });
const far = (h) => h.focus.map((f, i) => f + (h.from[i] - f) * (innerWidth < 700 ? 1.6 : 1.3));
let sheetOpen = false;
window.RoomScene = {
  focus(href) {
    const key = href.split('/').pop().split('?')[0] || 'index.html';
    let h = FOCUS[key];
    if (!h && /^blog-|^yazi/.test(key)) h = FOCUS['blog.html'];
    if (!h) { flyTo(HOME_POS.toArray(), HOME_TGT.toArray()); return; }
    flyTo(far(h), h.focus);
  },
  home() { flyTo(HOME_POS.toArray(), HOME_TGT.toArray()); },
  setSheet(open) { sheetOpen = open; resize(); if (!open) controls.autoRotate = false; },
  tour,
};
let touring = false;
async function tour(btn) {
  if (touring) { touring = false; return; }
  touring = true; btn && btn.setAttribute('aria-pressed', 'true');
  const stops = [
    [uni, t('Üniversite: kim olduğumu burada anlatıyorum.', 'University: this is where I tell who I am.')],
    [studio, t('Atölye: şövalede Photoshop projelerim dönüyor.', 'Studio: my Photoshop projects turn on the easel.')],
    [expo.children[0], t('Açık hava sergisi: okuduğum yerlerin fotoğrafları.', 'Open-air exhibition: photos of the places I studied.')],
    [towerHit, t('Kitap kulesi: her kitap bir blog yazım.', 'Book tower: every book is one of my blog posts.')],
    [lh, t('Deniz feneri: bana buradan ulaşabilirsin.', 'Lighthouse: you can reach me from here.')],
  ];
  for (const [o, text] of stops) {
    if (!touring) break;
    const h = o.userData.hot; flyTo(far(h), h.focus, 1.8);
    window.RoomUI.caption(text);
    await new Promise((r) => setTimeout(r, 3600));
  }
  touring = false; window.RoomUI.caption(''); btn && btn.setAttribute('aria-pressed', 'false');
  window.RoomScene.home();
}
controls.addEventListener('start', () => { fly = null; touring = false; });

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const shift = w >= 980 ? (sheetOpen ? Math.min(600, w * 0.46) / 2 : -Math.min(170, w * 0.12)) : 0;
  if (shift) camera.setViewOffset(w, h, shift, 0, w, h); else camera.clearViewOffset();
  camera.fov = w < 700 ? 55 : 40;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

/* ---------- döngü ---------- */
let visible = true;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) loop(); });
let nextDolphin = 4;
function loop() {
  if (!visible) return;
  requestAnimationFrame(loop);
  const tm = clock.getElapsedTime();
  if (fly) { const k = Math.min(1, (tm - fly.s) / fly.d), e = ease(k); camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e); if (k >= 1) fly = null; }
  controls.update();
  // ışıklar
  sun.intensity = lerp(sun.intensity, night ? 0.35 : 2.6, 0.05);
  sun.color.lerp(new THREE.Color(night ? 0x8fa8ff : 0xfff0d6), 0.05);
  hemi.intensity = lerp(hemi.intensity, night ? 0.35 : 1.1, 0.05);
  scene.background.lerp(night ? SKY_NIGHT : SKY_DAY, 0.05); scene.fog.color.copy(scene.background);
  stars.material.opacity = lerp(stars.material.opacity, night ? 0.9 : 0, 0.05);
  beam.material.opacity = lerp(beam.material.opacity, night ? 0.22 : 0.04, 0.05);
  lhLight.intensity = lerp(lhLight.intensity, night ? 18 : 0, 0.05);
  glass.material.emissiveIntensity = night ? 2.4 : 0.3;
  lampTop.material.emissiveIntensity = night ? 2 : 0.6;
  winLights.forEach((w) => { w.material.emissive.setHex(night ? 0xffc24a : 0x000000); w.material.emissiveIntensity = night ? 1.2 : 0; });
  beamPivot.rotation.y = tm * 0.9;
  if (!reduce) {
    // dalgalar
    const p = seaGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = seaBase[i * 3], z = seaBase[i * 3 + 2]; p.setY(i, waveH(x, z, tm) - 0.05); }
    p.needsUpdate = true; seaGeo.computeVertexNormals();
    // tekneler
    boats.forEach((b, i) => {
      const a = tm * b.s + b.o, x = Math.cos(a) * b.r, z = Math.sin(a) * b.r, hk = Math.max(0, 1 - (tm - honk) / 1.2);
      b.g.position.set(x, waveH(x, z, tm) + Math.sin(hk * 10) * 0.4 * hk, z);
      b.g.rotation.y = -a + (b.s > 0 ? 0 : Math.PI); b.g.rotation.z = Math.sin(tm * 1.5 + i) * 0.08;
    });
    gulls.forEach((g) => { const u = g.userData, a = tm * u.sp + u.o; g.position.set(Math.cos(a) * u.rad, u.h + Math.sin(tm + u.o) * 0.6, Math.sin(a) * u.rad); g.rotation.y = -a; const f = Math.sin(tm * 6 + u.o) * 0.5; u.l.rotation.y = f; u.r.rotation.y = -f; });
    clouds.forEach((c, i) => { c.position.x += 0.01 + i * 0.002; if (c.position.x > 50) c.position.x = -50; });
    palms.forEach((pl, i) => pl.children.forEach((ch, k) => { if (k >= 6) ch.rotation.x = 1.15 + Math.sin(tm * 1.6 + i + k) * 0.06; }));
    const fp = flag.geometry.attributes.position; for (let i = 0; i < fp.count; i++) fp.setZ(i, Math.sin(fp.getX(i) * 6 + tm * 6) * 0.06 * (fp.getX(i) + 0.35)); fp.needsUpdate = true;
    // yunus
    if (tm > nextDolphin) { const a = rnd(Math.floor(tm)) * Math.PI * 2; dolphin.userData = { s: tm, x: Math.cos(a) * 13, z: Math.sin(a) * 13, a }; dolphin.visible = true; nextDolphin = tm + 7 + rnd(tm) * 6; }
    if (dolphin.visible) {
      const d = dolphin.userData, k = (tm - d.s) / 1.6;
      if (k > 1) dolphin.visible = false;
      else { const dir = new THREE.Vector3(-Math.sin(d.a), 0, Math.cos(d.a)); dolphin.position.set(d.x + dir.x * (k - .5) * 5, Math.sin(k * Math.PI) * 2.2 - 0.4, d.z + dir.z * (k - .5) * 5); dolphin.lookAt(dolphin.position.clone().add(new THREE.Vector3(dir.x, Math.cos(k * Math.PI) * 1.2, dir.z))); }
    }
    // kaplumbağa denize yürür ve geri gelir
    const tk = tm - turtleGo;
    if (tk >= 0 && tk < 9) {
      const out = T_HOME.clone().add(new THREE.Vector3(0.4, 0, 3.2));
      const k = tk < 4 ? tk / 4 : tk < 5 ? 1 : 1 - (tk - 5) / 4;
      turtle.position.lerpVectors(T_HOME, out, k); turtle.position.y = T_HOME.y - Math.max(0, k - 0.55) * 1.2;
      turtle.rotation.y = tk < 4.5 ? 0.12 : Math.PI + 0.12;
      turtle.children.slice(2).forEach((f, i) => (f.rotation.y = Math.sin(tm * 8 + i) * 0.4));
    } else { turtle.position.copy(T_HOME); turtle.rotation.y = 0.3; }
  }
  renderer.render(scene, camera);
}

const hr = new Date().getHours();
if (hr >= 19 || hr < 6) setNight(true);
resize(); loop();
doc.classList.add('room-ready');
window.dispatchEvent(new Event('room:ready'));
