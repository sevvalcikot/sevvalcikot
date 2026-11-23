/* Şevval'in Odası — 3D oda (Three.js)
   Oda tamamen kodla kuruldu: duvarlar, mobilyalar, pencere manzarası, kedi...
   Eşyalara tıklayınca kamera o eşyaya uçar ve ilgili sayfa yan panelde açılır. */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const doc = document.documentElement;
const EN = doc.lang === 'en';
const R = document.body.dataset.root;            // ortak assets klasörü (görseller)
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
const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 200);
const HOME_POS = new THREE.Vector3(13.6, 9.6, 13.6), HOME_TGT = new THREE.Vector3(-0.4, 2, -0.4);
camera.position.copy(HOME_POS);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME_TGT);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 3;
controls.maxDistance = 22;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = 1.42;
controls.minAzimuthAngle = -0.05;
controls.maxAzimuthAngle = Math.PI / 2 + 0.05;
controls.enablePan = false;
controls.rotateSpeed = 0.6;

/* ---------- yardımcılar ---------- */
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.75, metalness: 0, ...o });
const box = (w, h, d, m) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
const cyl = (rt, rb, h, m, seg = 24) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), m);
const sph = (r, m, seg = 20) => new THREE.Mesh(new THREE.SphereGeometry(r, seg, seg), m);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const shadow = (o, cast = true, recv = true) => { o.traverse((c) => { if (c.isMesh) { c.castShadow = cast; c.receiveShadow = recv; } }); return o; };
const canvasTex = (w, h, draw) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4;
  return tx;
};
const loader = new THREE.TextureLoader();
const photo = (p) => { const tx = loader.load(R + 'assets/images/' + p); tx.colorSpace = THREE.SRGBColorSpace; return tx; };

/* tıklanabilir eşyalar */
const clickables = [];
const hot = (obj, info) => { obj.userData.hot = info; clickables.push(obj); return obj; };

/* ---------- ışık ---------- */
const hemi = new THREE.HemisphereLight(0xfff1e0, 0xb08a78, 1.1);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffd9a8, 2.4);
sun.position.set(-14, 11, 3);
sun.target.position.set(1, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
sun.shadow.bias = -0.0008;
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight(0xbfe3ff, 0.45);
fill.position.set(10, 8, 10);
scene.add(fill);

/* ---------- oda ---------- */
const W = 10, HGT = 6.2;
const floorTex = canvasTex(1024, 1024, (g, w, h) => {
  const rows = 14;
  for (let i = 0; i < rows; i++) {
    let x = -((i * 137) % 300);
    while (x < w) {
      const len = 260 + ((i * 53 + x) % 180);
      const tone = 168 + ((i * 29 + x * 7) % 26);
      g.fillStyle = `rgb(${tone + 30},${tone - 22},${tone - 70})`;
      g.fillRect(x, (i * h) / rows, len, h / rows);
      g.fillStyle = 'rgba(70,35,15,.35)';
      g.fillRect(x, (i * h) / rows, 3, h / rows);
      x += len;
    }
    g.fillStyle = 'rgba(70,35,15,.4)'; g.fillRect(0, (i * h) / rows, w, 3);
  }
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, W), mat(0xffffff, { map: floorTex, roughness: 0.6 }));
floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true;
scene.add(floor);
// zemin kalınlığı (dışarıdan bakınca)
scene.add(at(box(W + 0.4, 0.4, W + 0.4, mat(0xb86f45)), 0.2, -0.2, 0.2));

const wallMatBack = mat(0xf6b99a), wallMatLeft = mat(0x9dd9c8);
const backWall = new THREE.Mesh(new THREE.BoxGeometry(W, HGT, 0.3), wallMatBack);
at(backWall, 0, HGT / 2, -W / 2 - 0.15); backWall.receiveShadow = true; scene.add(backWall);
// sol duvar: pencere boşluğu bırakmak için parçalar
const WIN = { z: -0.6, y: 3.2, w: 3.2, h: 2.4 };
const leftParts = [
  [W, WIN.y - WIN.h / 2, 0, (WIN.y - WIN.h / 2) / 2],                     // alt
  [W, HGT - (WIN.y + WIN.h / 2), 0, (HGT + WIN.y + WIN.h / 2) / 2],       // üst
];
leftParts.forEach(([d, h, , y]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, h, d), wallMatLeft); at(m, -W / 2 - 0.15, y, 0); m.receiveShadow = true; scene.add(m); });
const sideL = (WIN.z - WIN.w / 2) + W / 2, sideR = W / 2 - (WIN.z + WIN.w / 2);
[[sideL, -W / 2 + sideL / 2], [sideR, W / 2 - sideR / 2]].forEach(([d, z]) => {
  const m = new THREE.Mesh(new THREE.BoxGeometry(0.3, WIN.h, d), wallMatLeft); at(m, -W / 2 - 0.15, WIN.y, z); m.receiveShadow = true; scene.add(m);
});
// süpürgelik
scene.add(at(box(W, 0.25, 0.08, mat(0xffffff)), 0, 0.125, -W / 2 + 0.04));
scene.add(at(box(0.08, 0.25, W, mat(0xffffff)), -W / 2 + 0.04, 0.125, 0));

/* ---------- pencere ve manzara ---------- */
const viewDay = canvasTex(1024, 768, (g, w, h) => {
  let gr = g.createLinearGradient(0, 0, 0, h * .55);
  gr.addColorStop(0, '#5ec2f2'); gr.addColorStop(1, '#ffe2c4');
  g.fillStyle = gr; g.fillRect(0, 0, w, h * .56);
  g.fillStyle = '#fff6d8'; g.beginPath(); g.arc(w * .7, h * .22, 60, 0, 7); g.fill();
  g.fillStyle = 'rgba(255,255,255,.85)';
  [[.2, .18, 70], [.28, .2, 50], [.5, .12, 40]].forEach(([x, y, r]) => { g.beginPath(); g.ellipse(w * x, h * y, r * 1.8, r * .6, 0, 0, 7); g.fill(); });
  g.fillStyle = '#7d9b8a'; g.beginPath(); g.moveTo(0, h * .56);
  for (let x = 0; x <= w; x += 40) g.lineTo(x, h * .56 - 60 - Math.sin(x / 90) * 40 - Math.sin(x / 33) * 12);
  g.lineTo(w, h * .56); g.fill();
  gr = g.createLinearGradient(0, h * .55, 0, h); gr.addColorStop(0, '#1fa3c9'); gr.addColorStop(1, '#0b5f8a');
  g.fillStyle = gr; g.fillRect(0, h * .55, w, h * .45);
  g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineWidth = 3;
  for (let i = 0; i < 40; i++) { const x = (i * 197) % w, y = h * .6 + ((i * 71) % (h * .35)); g.beginPath(); g.moveTo(x, y); g.lineTo(x + 30, y); g.stroke(); }
  g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(w * .4, h * .7); g.lineTo(w * .46, h * .7); g.lineTo(w * .43, h * .6); g.fill(); // yelkenli
});
const viewNight = canvasTex(1024, 768, (g, w, h) => {
  let gr = g.createLinearGradient(0, 0, 0, h * .55);
  gr.addColorStop(0, '#0b1230'); gr.addColorStop(1, '#2b2a5a');
  g.fillStyle = gr; g.fillRect(0, 0, w, h * .56);
  g.fillStyle = '#fff'; for (let i = 0; i < 120; i++) g.fillRect((i * 97) % w, (i * 53) % (h * .5), 2, 2);
  g.fillStyle = '#fdf3c8'; g.beginPath(); g.arc(w * .3, h * .2, 44, 0, 7); g.fill();
  g.fillStyle = '#1b2440'; g.beginPath(); g.moveTo(0, h * .56);
  for (let x = 0; x <= w; x += 40) g.lineTo(x, h * .56 - 60 - Math.sin(x / 90) * 40 - Math.sin(x / 33) * 12);
  g.lineTo(w, h * .56); g.fill();
  g.fillStyle = '#ffd27a'; for (let i = 0; i < 26; i++) g.fillRect((i * 151) % w, h * .5 - ((i * 37) % 40), 4, 4);
  gr = g.createLinearGradient(0, h * .55, 0, h); gr.addColorStop(0, '#152a55'); gr.addColorStop(1, '#070e22');
  g.fillStyle = gr; g.fillRect(0, h * .55, w, h * .45);
  g.fillStyle = 'rgba(253,243,200,.5)'; g.fillRect(w * .28, h * .58, 40, h * .4);
});
const viewMat = new THREE.MeshBasicMaterial({ map: viewDay });
const view = new THREE.Mesh(new THREE.PlaneGeometry(WIN.w * 1.6, WIN.h * 1.6), viewMat);
view.rotation.y = Math.PI / 2; at(view, -W / 2 - 1.4, WIN.y, WIN.z); scene.add(view);
const frameMat = mat(0xffffff, { roughness: 0.4 });
const winGroup = new THREE.Group();
[[WIN.w + 0.3, 0.16, 0, WIN.h / 2], [WIN.w + 0.3, 0.16, 0, -WIN.h / 2], [0.16, WIN.h, WIN.w / 2, 0], [0.16, WIN.h, -WIN.w / 2, 0], [0.08, WIN.h, 0, 0], [WIN.w, 0.08, 0, 0]].forEach(([w, h, z, y]) => {
  winGroup.add(at(box(0.36, h, w, frameMat), 0, y, z));
});
winGroup.add(at(box(0.7, 0.1, WIN.w + 0.5, frameMat), 0.25, -WIN.h / 2 - 0.08, 0)); // pervaz
at(winGroup, -W / 2, WIN.y, WIN.z); shadow(winGroup); scene.add(winGroup);
// perdeler
const curtainMat = mat(0xffd36e, { side: THREE.DoubleSide, roughness: 0.9 });
const curtains = [-1, 1].map((s) => {
  const geo = new THREE.PlaneGeometry(0.9, WIN.h + 1.2, 10, 1);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin(p.getX(i) * 9) * 0.07);
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, curtainMat); m.rotation.y = Math.PI / 2;
  at(m, -W / 2 + 0.3, WIN.y + 0.2, WIN.z + s * (WIN.w / 2 + 0.35)); m.castShadow = true;
  scene.add(m); return m;
});
{ const rod = at(cyl(0.04, 0.04, WIN.w + 2.4, mat(0x8a5a3c)), -W / 2 + 0.3, WIN.y + WIN.h / 2 + 0.75, WIN.z); rod.rotation.x = Math.PI / 2; scene.add(rod); }
hot(winGroup, { label: t('Pencere · Akdeniz manzarası', 'Window · Mediterranean view'), action: 'daynight' });

/* güneş huzmesinde toz */
const dustGeo = new THREE.BufferGeometry(), dustN = 160, dp = new Float32Array(dustN * 3);
for (let i = 0; i < dustN; i++) { dp[i * 3] = -4.5 + Math.random() * 6; dp[i * 3 + 1] = 0.5 + Math.random() * 4; dp[i * 3 + 2] = -2 + Math.random() * 3; }
dustGeo.setAttribute('position', new THREE.BufferAttribute(dp, 3));
const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: 0xfff2cc, size: 0.04, transparent: true, opacity: 0.7, depthWrite: false }));
scene.add(dust);

/* ---------- halı ---------- */
const rugTex = canvasTex(512, 512, (g, w) => {
  const cols = ['#e2582f', '#ffd36e', '#1f8a80', '#f6b99a', '#7a5cff', '#fff3e0'];
  for (let i = 0; i < 12; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - i * 20, 0, 7); g.fill(); }
});
const rug = new THREE.Mesh(new THREE.CircleGeometry(2.8, 64), mat(0xffffff, { map: rugTex, roughness: 1 }));
rug.rotation.x = -Math.PI / 2; at(rug, 0.6, 0.012, 1.2); rug.receiveShadow = true; scene.add(rug);

/* ---------- masa, sandalye ---------- */
const wood = mat(0xd9a066, { roughness: 0.55 }), woodDark = mat(0x8a5a3c);
const desk = new THREE.Group();
desk.add(at(box(4, 0.14, 1.7, wood), 0, 1.55, 0));
[[-1.85, -0.7], [1.85, -0.7], [-1.85, 0.7], [1.85, 0.7]].forEach(([x, z]) => desk.add(at(box(0.12, 1.5, 0.12, woodDark), x, 0.75, z)));
desk.add(at(box(1.2, 0.5, 1.5, wood), 1.3, 1.2, 0)); // çekmece
desk.add(at(box(0.3, 0.06, 0.04, mat(0x333333)), 1.3, 1.2, 0.77));
at(desk, 1.3, 0, -3.85); shadow(desk); scene.add(desk);

const chair = new THREE.Group();
const chairMat = mat(0x1f8a80);
chair.add(at(box(1, 0.12, 1, chairMat), 0, 1.0, 0));
chair.add(at(box(1, 1.1, 0.12, chairMat), 0, 1.6, 0.46));
[[-.42, -.42], [.42, -.42], [-.42, .42], [.42, .42]].forEach(([x, z]) => chair.add(at(cyl(0.04, 0.04, 1, woodDark, 8), x, 0.5, z)));
at(chair, 0.9, 0, -2.5); chair.rotation.y = -0.25; shadow(chair); scene.add(chair);

/* ---------- laptop: ekranında projeler dönüyor ---------- */
const PROJ = ['projeler/proje1-sonrasi.jpg', 'projeler/proje2-sonrasi.jpg', 'projeler/proje3-sonrasi.jpg', 'projeler/proje4-sonrasi.jpg', 'projeler/proje5.jpg', 'projeler/proje6-sonrasi.jpg'];
const projImgs = PROJ.map((p) => { const im = new Image(); im.src = R + 'assets/images/' + p; return im; });
const screenCanvas = document.createElement('canvas'); screenCanvas.width = 640; screenCanvas.height = 400;
const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace;
let projIdx = 0;
function drawScreen() {
  const g = screenCanvas.getContext('2d'), w = 640, h = 400;
  g.fillStyle = '#1d1b22'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#2c2933'; g.fillRect(0, 0, w, 34);
  ['#ff5f57', '#febc2e', '#28c840'].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(20 + i * 20, 17, 6, 0, 7); g.fill(); });
  g.fillStyle = '#cfc8d8'; g.font = '600 16px sans-serif'; g.fillText(t('Projelerim.psd', 'MyProjects.psd'), 90, 23);
  const im = projImgs[projIdx];
  if (im.complete && im.naturalWidth) {
    const k = Math.min((w - 40) / im.naturalWidth, (h - 70) / im.naturalHeight), iw = im.naturalWidth * k, ih = im.naturalHeight * k;
    g.drawImage(im, (w - iw) / 2, 34 + (h - 34 - ih) / 2, iw, ih);
  }
  g.fillStyle = 'rgba(226,88,47,.95)'; g.fillRect(0, h - 6, ((projIdx + 1) / PROJ.length) * w, 6);
  screenTex.needsUpdate = true;
}
const laptop = new THREE.Group();
const alu = mat(0xc9ccd6, { metalness: 0.6, roughness: 0.35 });
laptop.add(at(box(1.5, 0.06, 1.0, alu), 0, 0, 0));
laptop.add(at(box(1.3, 0.01, 0.5, mat(0x2a2a30)), 0, 0.035, -0.12)); // klavye
const lid = new THREE.Group();
lid.add(at(box(1.5, 0.95, 0.04, alu), 0, 0.475, 0));
const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.38, 0.86), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
at(screen, 0, 0.475, 0.022); lid.add(screen);
at(lid, 0, 0.03, -0.5); lid.rotation.x = -0.22; laptop.add(lid);
at(laptop, 0.9, 1.65, -3.85); shadow(laptop); scene.add(laptop);
hot(laptop, { label: t('Laptop · Projelerim', 'Laptop · My projects'), href: t('projeler.html', 'projects.html'), focus: [0.9, 2.2, -3.9], from: [0.9, 2.9, -1.2] });
drawScreen();
setInterval(() => { projIdx = (projIdx + 1) % PROJ.length; drawScreen(); }, 2600);
projImgs.forEach((im) => (im.onload = drawScreen));

/* ---------- masa lambası ---------- */
const lamp = new THREE.Group();
const lampMat = mat(0xe2582f, { roughness: 0.4 });
lamp.add(at(cyl(0.28, 0.32, 0.08, lampMat), 0, 0.04, 0));
const arm = at(cyl(0.04, 0.04, 1.1, mat(0x333333), 8), 0, 0.55, 0); lamp.add(arm);
const shade = at(cyl(0.12, 0.38, 0.4, lampMat), 0.25, 1.1, 0.1); shade.rotation.z = 0.6; lamp.add(shade);
const bulb = at(sph(0.1, new THREE.MeshStandardMaterial({ color: 0xfff1c1, emissive: 0xffd27a, emissiveIntensity: 2 })), 0.33, 0.98, 0.1); lamp.add(bulb);
const lampLight = new THREE.PointLight(0xffc27a, 6, 7, 1.6); at(lampLight, 0.35, 0.85, 0.15); lampLight.castShadow = !small;
lampLight.shadow.mapSize.set(512, 512); lamp.add(lampLight);
at(lamp, 2.7, 1.62, -4.2); lamp.rotation.y = -0.9; shadow(lamp, true, false); scene.add(lamp);
let lampOn = true;
hot(lamp, { label: t('Masa lambası · aç / kapat', 'Desk lamp · on / off'), action: 'lamp' });

/* ---------- kupa ve buhar ---------- */
const mug = new THREE.Group();
const mugMat = mat(0xffffff, { roughness: 0.3 });
mug.add(at(cyl(0.16, 0.14, 0.32, mugMat), 0, 0.16, 0));
mug.add(at(cyl(0.145, 0.145, 0.01, mat(0x5a2f1c)), 0, 0.3, 0));
const handle = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.025, 8, 16), mugMat); at(handle, 0.17, 0.16, 0); mug.add(handle);
at(mug, -0.3, 1.62, -3.55); shadow(mug); scene.add(mug);
const steam = [];
for (let i = 0; i < 5; i++) {
  const s = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false }));
  s.userData.o = i / 5; scene.add(s); steam.push(s);
}

/* ---------- defter: Hakkımda ---------- */
const nbTex = canvasTex(512, 380, (g, w, h) => {
  g.fillStyle = '#7a5cff'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffd36e'; g.fillRect(0, 0, 40, h);
  g.fillStyle = '#fff'; g.font = '700 54px "Bricolage Grotesque", sans-serif'; g.fillText(t('Hakkımda', 'About me'), 70, 120);
  g.font = '500 30px sans-serif'; g.fillStyle = 'rgba(255,255,255,.85)'; g.fillText('Şevval Çikot', 72, 175);
  g.strokeStyle = 'rgba(255,255,255,.6)'; g.lineWidth = 4; g.strokeRect(60, 220, w - 110, 110);
});
const notebook = new THREE.Group();
notebook.add(at(box(0.95, 0.1, 0.7, mat(0xfff8ec)), 0, 0.05, 0));
const cover = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.025, 0.72), [mat(0x7a5cff), mat(0x7a5cff), mat(0xffffff, { map: nbTex }), mat(0x7a5cff), mat(0x7a5cff), mat(0x7a5cff)]);
at(cover, 0, 0.11, 0); notebook.add(cover);
const pen = at(cyl(0.02, 0.02, 0.8, mat(0xe2582f), 8), 0.2, 0.15, 0.05); pen.rotation.z = Math.PI / 2; pen.rotation.y = 0.5; notebook.add(pen);
at(notebook, 2.35, 1.62, -3.45); notebook.rotation.y = -0.3; shadow(notebook); scene.add(notebook);
hot(notebook, { label: t('Defter · Hakkımda', 'Notebook · About me'), href: t('hakkimda.html', 'about.html'), focus: [2.35, 1.7, -3.45], from: [2.6, 4.0, -1.6] });

/* ---------- duvardaki fotoğraflar: Galeri ---------- */
const GAL = [['galeri/bayburt.jpg', t('Memleketim Bayburt', 'My hometown, Bayburt')], ['galeri/ortaokul.jpg', t('Okuduğum ortaokul', 'My middle school')],
  ['galeri/lise.jpg', t('Okuduğum lise', 'My high school')], ['galeri/universite.jpg', t('Okuduğum üniversite', 'My university')]];
const frames = new THREE.Group();
const fCols = [0xffffff, 0x1f8a80, 0xe2582f, 0xffd36e];
GAL.forEach(([p, title], i) => {
  const f = new THREE.Group(), w = 1.05, h = 1.35;
  f.add(at(box(w + 0.14, h + 0.14, 0.06, mat(fCols[i])), 0, 0, 0));
  f.add(at(box(w, h, 0.02, mat(0xffffff)), 0, 0, 0.035));
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.14, h - 0.14), new THREE.MeshStandardMaterial({ map: photo(p), roughness: 0.5 }));
  at(pic, 0, 0, 0.05); f.add(pic);
  at(f, -3.7 + i * 1.35, 3.75 + (i % 2 ? 0.25 : -0.1), -W / 2 + 0.05); f.rotation.z = (i % 2 ? 1 : -1) * 0.025;
  frames.add(f);
  hot(f, { label: t('Fotoğraf · ', 'Photo · ') + title, href: t('galeri.html', 'gallery.html'), focus: [-1.7, 3.8, -4.9], from: [-1.7, 3.8, 1.2] });
});
// fotoğrafları bağlayan ip ve mandallar
const string = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-4.6, 4.75, -4.9), new THREE.Vector3(-1.7, 4.45, -4.9), new THREE.Vector3(1.2, 4.75, -4.9)]), 20, 0.012, 6), mat(0x5a3a2a));
scene.add(string);
shadow(frames, true, true); scene.add(frames);

/* ---------- neon isim ---------- */
const neonTex = canvasTex(1024, 256, (g, w, h) => {
  g.clearRect(0, 0, w, h);
  g.font = 'italic 700 150px "Bricolage Grotesque", "Brush Script MT", cursive';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = '#ff5fa2'; g.shadowBlur = 40; g.fillStyle = '#ffd0e4';
  g.fillText('Şevval', w / 2, h / 2); g.shadowBlur = 18; g.fillText('Şevval', w / 2, h / 2);
});
const neon = new THREE.Mesh(new THREE.PlaneGeometry(3, 0.75), new THREE.MeshBasicMaterial({ map: neonTex, transparent: true, toneMapped: false, depthWrite: false }));
at(neon, 2.9, 5.35, -W / 2 + 0.03); scene.add(neon);
const neonLight = new THREE.PointLight(0xff5fa2, 2.5, 5, 2); at(neonLight, 2.9, 5.2, -4.4); scene.add(neonLight);
hot(neon, { label: t('Neon · Anasayfa', 'Neon · Home'), href: 'index.html', home: true });

/* ---------- söz posteri ---------- */
const quoteTex = canvasTex(600, 800, (g, w, h) => {
  g.fillStyle = '#1f8a80'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#ffd36e'; g.beginPath(); g.arc(w * .78, h * .2, 110, 0, 7); g.fill();
  g.fillStyle = '#fff3e0'; g.font = '800 64px "Bricolage Grotesque", sans-serif';
  const words = (EN ? '“A lesson learned failure is actually a success.”' : '“Ders alınmış başarısızlık, aslında bir başarıdır.”').split(' ');
  let line = '', y = 330;
  words.forEach((wd) => { if (g.measureText(line + wd).width > w - 90) { g.fillText(line, 46, y); line = ''; y += 76; } line += wd + ' '; });
  g.fillText(line, 46, y);
  g.font = '500 30px monospace'; g.fillStyle = '#ffd36e'; g.fillText('— Edwin Land', 46, h - 60);
});
const poster = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2, 0.04), [mat(0xffffff), mat(0xffffff), mat(0xffffff), mat(0xffffff), mat(0xffffff, { map: quoteTex }), mat(0xffffff)]);
poster.rotation.y = Math.PI / 2; at(poster, -W / 2 + 0.03, 3.4, 3.1); shadow(poster, false, true); scene.add(poster);
hot(poster, { label: t('Poster · Sevdiğim söz', 'Poster · My favourite quote'), href: t('hakkimda.html', 'about.html'), focus: [-4.9, 3.4, 3.1], from: [-1.2, 3.4, 3.1] });

/* ---------- kitaplık: Blog ---------- */
const shelf = new THREE.Group();
const shelfMat = mat(0xffffff, { roughness: 0.6 });
shelf.add(at(box(0.7, 3.4, 0.08, shelfMat), 0, 1.7, -1.1));
shelf.add(at(box(0.7, 3.4, 0.08, shelfMat), 0, 1.7, 1.1));
[0.05, 1.15, 2.25, 3.36].forEach((y) => shelf.add(at(box(0.7, 0.08, 2.28, shelfMat), 0, y, 0)));
shelf.add(at(box(0.05, 3.4, 2.28, mat(0xf2e6d8)), -0.33, 1.7, 0));
const bookCols = [0xe2582f, 0xffd36e, 0x1f8a80, 0x7a5cff, 0xf6b99a, 0x2b3a67, 0x9dd9c8];
let bz = -1.0;
for (let i = 0; i < 9; i++) { // alt raf: süs kitaplar
  const h = 0.7 + (i % 3) * 0.12, w = 0.14 + (i % 2) * 0.05;
  shelf.add(at(box(0.5, h, w, mat(bookCols[i % bookCols.length])), 0.02, 0.09 + h / 2, bz + w / 2)); bz += w + 0.03;
}
const POSTS = [
  ['blog-layer-comps.html', 'Layer Comps', 0xe2582f], ['blog-image-stack.html', 'Image Stack', 0x1f8a80], ['blog-yapay-zeka-ile-web-sitesi.html', t('Yapay Zeka', 'AI'), 0x7a5cff],
];
POSTS.forEach(([href, name, col], i) => {
  const spine = canvasTex(128, 512, (g, w, h) => {
    g.fillStyle = '#' + col.toString(16).padStart(6, '0'); g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff3e0'; g.fillRect(0, 30, w, 8); g.fillRect(0, h - 38, w, 8);
    g.save(); g.translate(w / 2 + 12, h / 2); g.rotate(-Math.PI / 2); g.font = '700 46px "Bricolage Grotesque", sans-serif';
    g.textAlign = 'center'; g.fillText(name, 0, 0); g.restore();
  });
  const m = mat(col);
  const book = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.95, 0.24), [mat(0xffffff, { map: spine }), m, m, m, m, m]);
  at(book, 0.05, 1.19 + 0.475, -0.75 + i * 0.32); shelf.add(book);
  hot(book, { label: t('Kitap · Blog: ', 'Book · Blog: ') + name, href, focus: [-4.3, 1.7, 2.6], from: [-1.4, 2.2, 2.6] });
});
// üst raf: mezuniyet kepi ve bitki
const cap = new THREE.Group();
cap.add(at(box(0.6, 0.04, 0.6, mat(0x222222)), 0, 0.25, 0));
cap.add(at(cyl(0.2, 0.22, 0.22, mat(0x222222)), 0, 0.12, 0));
cap.add(at(cyl(0.01, 0.01, 0.3, mat(0xffd36e), 6), 0.25, 0.12, 0.25));
at(cap, 0.05, 2.3, -0.5); cap.rotation.y = 0.5; shelf.add(cap);
const succ = new THREE.Group();
succ.add(at(cyl(0.18, 0.14, 0.3, mat(0xe2582f)), 0, 0.15, 0));
for (let i = 0; i < 7; i++) { const l = at(sph(0.12, mat(0x4caf7a), 10), Math.cos(i) * 0.09, 0.35 + (i % 3) * 0.05, Math.sin(i) * 0.09); l.scale.set(0.6, 1.4, 0.6); succ.add(l); }
at(succ, 0.05, 2.3, 0.55); shelf.add(succ);
at(shelf, -W / 2 + 0.4, 0, 2.6); shadow(shelf); scene.add(shelf);
hot(cap, { label: t('Mezuniyet kepi · Eğitim', 'Graduation cap · Education'), href: t('hakkimda.html', 'about.html'), focus: [-4.5, 2.5, 2.1], from: [-1.6, 3.0, 2.1] });
const shelfHit = at(box(0.8, 3.4, 2.3, new THREE.MeshBasicMaterial({ visible: false })), -W / 2 + 0.4, 1.7, 2.6); scene.add(shelfHit);
hot(shelfHit, { label: t('Kitaplık · Blog', 'Bookshelf · Blog'), href: 'blog.html', focus: [-4.3, 1.9, 2.6], from: [-0.8, 2.4, 2.6], low: true });

/* ---------- yan sehpa ve telefon: İletişim ---------- */
const side = new THREE.Group();
side.add(at(cyl(0.55, 0.55, 0.06, wood), 0, 0.9, 0));
side.add(at(cyl(0.05, 0.05, 0.9, woodDark, 8), 0, 0.45, 0));
side.add(at(cyl(0.3, 0.35, 0.04, woodDark), 0, 0.02, 0));
at(side, 3.7, 0, 1.4); shadow(side); scene.add(side);
const phone = new THREE.Group();
const phoneMat = mat(0xe2582f, { roughness: 0.35 });
const base = at(box(0.6, 0.22, 0.45, phoneMat), 0, 0.11, 0); phone.add(base);
const dial = at(cyl(0.14, 0.14, 0.03, mat(0xfff3e0)), 0, 0.235, 0.05); phone.add(dial);
const hand = new THREE.Group();
{ const hb = at(cyl(0.05, 0.05, 0.62, phoneMat, 10), 0, 0, 0); hb.rotation.z = Math.PI / 2; hand.add(hb); }
hand.add(at(sph(0.1, phoneMat, 12), -0.31, 0, 0)); hand.add(at(sph(0.1, phoneMat, 12), 0.31, 0, 0));
at(hand, 0, 0.34, -0.12); phone.add(hand);
at(phone, 3.7, 0.93, 1.4); phone.rotation.y = -0.7; shadow(phone); scene.add(phone);
hot(phone, { label: t('Telefon · İletişim', 'Phone · Contact'), href: t('iletisim.html', 'contact.html'), focus: [3.7, 1.2, 1.4], from: [5.8, 2.8, 4.4] });

/* ---------- saksı bitkisi ---------- */
const plant = new THREE.Group();
plant.add(at(cyl(0.45, 0.35, 0.8, mat(0xf6b99a)), 0, 0.4, 0));
const leaves = [];
for (let i = 0; i < 9; i++) {
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.35, 12, 8), mat(i % 2 ? 0x3e9b6b : 0x57b882));
  leaf.scale.set(0.35, 1.3, 0.12);
  const a = (i / 9) * Math.PI * 2;
  const pivot = new THREE.Group(); at(pivot, 0, 0.8, 0); pivot.rotation.set(Math.sin(a) * 0.5, a, Math.cos(a) * 0.5);
  at(leaf, 0, 0.45, 0); pivot.add(leaf); plant.add(pivot); leaves.push(pivot);
}
at(plant, 4.2, 0, -4.2); shadow(plant); scene.add(plant);
hot(plant, { label: t('Bitkim · sallamak için tıkla', 'My plant · click to shake'), action: 'plant' });
let plantKick = 0;

/* ---------- duvar saati: gerçek saat ---------- */
const clockG = new THREE.Group();
{ const face = at(cyl(0.55, 0.55, 0.08, mat(0xffffff)), 0, 0, 0); face.rotation.x = Math.PI / 2; clockG.add(face); }
const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.05, 8, 40), mat(0x2b3a67)); clockG.add(ring);
for (let i = 0; i < 12; i++) { const m = at(box(0.03, 0.1, 0.02, mat(0x2b3a67)), Math.sin(i * Math.PI / 6) * 0.44, Math.cos(i * Math.PI / 6) * 0.44, 0.05); m.rotation.z = -i * Math.PI / 6; clockG.add(m); }
const handMk = (len, w, c) => { const p = new THREE.Group(); p.add(at(box(w, len, 0.02, mat(c)), 0, len / 2, 0)); at(p, 0, 0, 0.07); clockG.add(p); return p; };
const hH = handMk(0.28, 0.05, 0x2b3a67), mH = handMk(0.4, 0.035, 0x2b3a67), sH = handMk(0.45, 0.015, 0xe2582f);
at(clockG, 4.2, 4.4, -W / 2 + 0.06); shadow(clockG, true, false); scene.add(clockG);
hot(clockG, { label: '', action: 'clock' });

/* ---------- ışık düğmesi ---------- */
const sw = new THREE.Group();
sw.add(at(box(0.28, 0.42, 0.04, mat(0xffffff)), 0, 0, 0));
const toggle = at(box(0.08, 0.16, 0.06, mat(0xe2582f)), 0, 0.05, 0.03); sw.add(toggle);
sw.rotation.y = Math.PI / 2; at(sw, -W / 2 + 0.03, 2.3, 4.4); scene.add(sw);
hot(sw, { label: t('Işık düğmesi · gece / gündüz', 'Light switch · night / day'), action: 'daynight' });

/* ---------- kedi ---------- */
const cat = new THREE.Group();
const fur = mat(0xf0a35e), furD = mat(0xc97a3a);
const bodyC = at(sph(0.42, fur), 0, 0.3, 0); bodyC.scale.set(1.3, 0.75, 0.9); cat.add(bodyC);
const head = new THREE.Group(); at(head, 0.5, 0.45, 0.15); cat.add(head);
head.add(at(sph(0.25, fur), 0, 0, 0));
[-1, 1].forEach((s) => { const e = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.18, 4), furD); at(e, 0.02, 0.22, s * 0.12); e.rotation.x = s * -0.3; head.add(e); });
const eyes = [-1, 1].map((s) => { const e = at(box(0.02, 0.02, 0.08, mat(0x222222)), 0.23, 0.04, s * 0.09); head.add(e); return e; });
head.add(at(sph(0.035, mat(0xff8fa3), 8), 0.25, -0.03, 0));
const tail = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(-0.5, 0.2, 0), new THREE.Vector3(-0.7, 0.1, 0.3), new THREE.Vector3(-0.4, 0.06, 0.6), new THREE.Vector3(0.1, 0.06, 0.6)]), 20, 0.06, 8), furD);
cat.add(tail);
at(cat, -0.4, 0.02, 1.8); cat.rotation.y = 0.6; shadow(cat); scene.add(cat);
hot(cat, { label: t('Kedi · sev', 'Cat · pet it'), action: 'cat' });
let catJump = -9;


/* ---------- puf, yer minderi ve ip ışıklar ---------- */
const bean = new THREE.Mesh(new THREE.SphereGeometry(0.9, 28, 20), mat(0x7a5cff, { roughness: 0.95 }));
bean.scale.set(1, 0.62, 1); at(bean, 1.9, 0.5, 3.4); shadow(bean); scene.add(bean);
const dent = new THREE.Mesh(new THREE.SphereGeometry(0.5, 20, 14), mat(0x6a4ef0, { roughness: 0.95 }));
dent.scale.set(1, 0.3, 1); at(dent, 1.85, 0.95, 3.45); scene.add(dent);
const floorBooks = new THREE.Group();
[[0xffd36e, 0.9], [0x1f8a80, 0.8], [0xe2582f, 0.85]].forEach(([c, w], i) => { const b = at(box(w, 0.14, 0.6, mat(c)), 0, 0.07 + i * 0.14, 0); b.rotation.y = i * 0.25; floorBooks.add(b); });
at(floorBooks, 3.4, 0, -1.2); shadow(floorBooks); scene.add(floorBooks);
const bulbs = [];
const BC = [0xffd36e, 0xff8a5c, 0x9dd9c8, 0xffb3d1, 0xffffff];
const lineA = [], N_B = 26;
for (let i = 0; i < N_B; i++) {
  const k = i / (N_B - 1);
  // arka duvarın üstünden sol duvarın üstüne sarkan ip
  const x = k < .5 ? 4.6 - k * 2 * 9.2 : -4.85, z = k < .5 ? -4.85 : -4.6 + (k - .5) * 2 * 9.2;
  const y = 5.75 - Math.abs(Math.sin(k * Math.PI * 6)) * 0.35;
  lineA.push(new THREE.Vector3(x, y + 0.08, z));
  const m = new THREE.MeshStandardMaterial({ color: BC[i % BC.length], emissive: BC[i % BC.length], emissiveIntensity: 0.6 });
  const b = at(sph(0.07, m, 10), x, y, z); scene.add(b); bulbs.push(b);
}
scene.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(lineA), 120, 0.01, 4), mat(0x3a2a20)));
hot(bean, { label: t('Puf · zıpla', 'Beanbag · bounce'), action: 'bean' });
let beanKick = -9;

/* ---------- gece / gündüz ---------- */
let night = false;
const BG_DAY = new THREE.Color('#ffe6d2'), BG_NIGHT = new THREE.Color('#141a33');
scene.background = BG_DAY.clone();
function setNight(n) {
  night = n;
  doc.classList.toggle('night', n);
  viewMat.map = n ? viewNight : viewDay; viewMat.needsUpdate = true;
  toggle.position.y = n ? -0.05 : 0.05;
}
const lerp = (a, b, k) => a + (b - a) * k;

/* ---------- etkileşim: üzerine gelme, tıklama ---------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let hovered = null, downAt = null;
const findHot = (o) => { while (o) { if (o.userData.hot) return o; o = o.parent; } return null; };
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(clickables, true);
  let low = null;
  for (const h of hits) {
    const o = findHot(h.object);
    if (!o) continue;
    if (o.userData.hot.low) { low = low || o; continue; }
    return o;
  }
  return low;
}
const glow = (o, on) => o.traverse((c) => { if (c.isMesh && c.material && 'emissive' in c.material) { if (on) { c.userData.em = c.material.emissive.getHex(); c.material = c.material.clone(); c.material.emissive.set(0xff8a5c); c.material.emissiveIntensity = 0.35; } else if (c.userData.em !== undefined) { c.material.emissive.setHex(c.userData.em); c.material.emissiveIntensity = 1; } } });
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch') return;
  const o = pick(e);
  if (o !== hovered) { if (hovered) glow(hovered, false); hovered = o; if (o) glow(o, true); }
  canvas.style.cursor = o ? 'pointer' : 'grab';
  const label = o && (o.userData.hot.action === 'clock' ? clockLabel() : o.userData.hot.label);
  if (label) { tip.textContent = label; tip.hidden = false; tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`; }
  else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { tip.hidden = true; if (hovered) { glow(hovered, false); hovered = null; } });
canvas.addEventListener('pointerdown', (e) => { downAt = [e.clientX, e.clientY]; });
canvas.addEventListener('pointerup', (e) => {
  if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
  const o = pick(e); if (!o) return;
  activate(o.userData.hot, e);
});
const clockLabel = () => t('Saat · şu an ', 'Clock · now ') + new Date().toLocaleTimeString(EN ? 'en-GB' : 'tr-TR', { hour: '2-digit', minute: '2-digit' });

function say(text, e) {
  const b = document.querySelector('[data-bubble]');
  b.textContent = text; b.hidden = false;
  b.style.transform = `translate(${(e ? e.clientX : innerWidth / 2) - 30}px, ${(e ? e.clientY : innerHeight / 2) - 70}px)`;
  clearTimeout(say.t); say.t = setTimeout(() => (b.hidden = true), 1600);
}
function activate(h, e) {
  if (h.action === 'lamp') { lampOn = !lampOn; say(lampOn ? t('Işık açık', 'Light on') : t('Işık kapalı', 'Light off'), e); return; }
  if (h.action === 'daynight') { setNight(!night); say(night ? t('İyi geceler 🌙', 'Good night 🌙') : t('Günaydın ☀️', 'Good morning ☀️'), e); return; }
  if (h.action === 'cat') { catJump = clock.getElapsedTime(); say(t('Miyav! 🐾', 'Meow! 🐾'), e); return; }
  if (h.action === 'plant') { plantKick = clock.getElapsedTime(); return; }
  if (h.action === 'bean') { beanKick = clock.getElapsedTime(); say(t('Pof!', 'Poof!'), e); return; }
  if (h.action === 'clock') { say(clockLabel(), e); return; }
  if (h.href) window.RoomUI.open(h.href, h);
}

/* ---------- kamera uçuşu ---------- */
let fly = null;
function flyTo(pos, tgt, dur = 1.4) {
  fly = { p0: camera.position.clone(), t0: controls.target.clone(), p1: new THREE.Vector3(...pos), t1: new THREE.Vector3(...tgt), s: clock.getElapsedTime(), d: reduce ? 0.01 : dur };
}
const ease = (x) => (x < .5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);
const FOCUS = {};
const far = (h, k = innerWidth < 700 ? 1.9 : 1.45) => h.focus.map((f, i) => f + (h.from[i] - f) * k);
clickables.forEach((o) => { const h = o.userData.hot; if (h.href && h.focus && !FOCUS[h.href]) FOCUS[h.href] = h; });
// bir sayfa doğrudan açılınca hangi eşyaya bakılacak
FOCUS['index.html'] = { home: true };
window.RoomScene = {
  focus(href) {
    const key = href.split('/').pop().split('?')[0] || 'index.html';
    let h = FOCUS[key];
    if (!h && /^blog-|^yazi/.test(key)) h = FOCUS['blog.html'];
    if (!h || h.home) { flyTo(HOME_POS.toArray(), HOME_TGT.toArray()); return; }
    flyTo(far(h), h.focus);
  },
  home() { flyTo(HOME_POS.toArray(), HOME_TGT.toArray()); },
  setSheet(open) { sheetOpen = open; resize(); },
  tour,
};
let sheetOpen = false;

/* rehberli tur */
let touring = false;
async function tour(btn) {
  if (touring) { touring = false; return; }
  touring = true; btn && btn.setAttribute('aria-pressed', 'true');
  const stops = [
    [laptop, t('Laptop: Photoshop projelerim burada.', 'Laptop: my Photoshop projects live here.')],
    [frames.children[1], t('Duvarda okuduğum yerlerin fotoğrafları.', 'On the wall: photos of the places I studied.')],
    [notebook, t('Defterimde kendimi anlatıyorum.', 'My notebook tells my story.')],
    [shelfHit, t('Kitaplıkta blog yazılarım duruyor.', 'My blog posts sit on the bookshelf.')],
    [phone, t('Bana ulaşmak için telefon.', 'The phone, to reach me.')],
    [cat, t('Bu da odanın en tatlı sakini.', 'And the cutest resident of the room.')],
  ];
  for (const [o, text] of stops) {
    if (!touring) break;
    const h = o.userData.hot;
    if (h.focus) flyTo(far(h), h.focus); else { const p = o.getWorldPosition(new THREE.Vector3()); flyTo([p.x + 3, p.y + 2.2, p.z + 3], p.toArray()); }
    window.RoomUI.caption(text);
    await new Promise((r) => setTimeout(r, 3400));
  }
  touring = false; window.RoomUI.caption(''); btn && btn.setAttribute('aria-pressed', 'false');
  window.RoomScene.home();
}
controls.addEventListener('start', () => { fly = null; touring = false; });

/* ---------- boyut ---------- */
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  // panel açıkken oda sola, karşılama kartı varken sağa kayar
  const shift = w >= 980 ? (sheetOpen ? Math.min(600, w * 0.46) / 2 : -Math.min(170, w * 0.12)) : 0;
  if (shift) camera.setViewOffset(w, h, shift, 0, w, h); else camera.clearViewOffset();
  camera.fov = w < 700 ? 52 : 40;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

/* ---------- döngü ---------- */
const clock = new THREE.Clock();
let visible = true;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) loop(); });
function loop() {
  if (!visible) return;
  requestAnimationFrame(loop);
  const tm = clock.getElapsedTime();
  if (fly) {
    const k = Math.min(1, (tm - fly.s) / fly.d), e = ease(k);
    camera.position.lerpVectors(fly.p0, fly.p1, e); controls.target.lerpVectors(fly.t0, fly.t1, e);
    if (k >= 1) fly = null;
  }
  controls.update();
  // gece-gündüz geçişi
  const n = night ? 1 : 0;
  sun.intensity = lerp(sun.intensity, night ? 0.25 : 2.4, 0.05);
  sun.color.lerp(new THREE.Color(night ? 0x8fa8ff : 0xffd9a8), 0.05);
  hemi.intensity = lerp(hemi.intensity, night ? 0.3 : 1.1, 0.05);
  fill.intensity = lerp(fill.intensity, night ? 0.12 : 0.45, 0.05);
  scene.background.lerp(night ? BG_NIGHT : BG_DAY, 0.05);
  lampLight.intensity = lerp(lampLight.intensity, lampOn ? (night ? 9 : 6) : 0, 0.15);
  bulb.material.emissiveIntensity = lampOn ? 2 : 0;
  neonLight.intensity = lerp(neonLight.intensity, night ? 5 : 2.5, 0.05);
  neon.material.opacity = 0.85 + Math.sin(tm * 7) * 0.04 + (Math.random() < 0.004 ? -0.5 : 0);
  dust.material.opacity = lerp(dust.material.opacity, night ? 0 : 0.7, 0.05);
  if (!reduce) {
    const p = dust.geometry.attributes.position;
    for (let i = 0; i < dustN; i++) { let y = p.getY(i) + 0.002; if (y > 4.6) y = 0.5; p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(tm + i) * 0.0008); }
    p.needsUpdate = true;
    steam.forEach((s) => { const k = (tm * 0.4 + s.userData.o) % 1; s.position.set(-0.3 + Math.sin(tm * 2 + s.userData.o * 9) * 0.05, 1.95 + k * 0.8, -3.55); s.scale.setScalar(0.6 + k * 1.4); s.material.opacity = 0.35 * (1 - k); });
    const kick = Math.max(0, 1 - (tm - plantKick) / 1.6);
    leaves.forEach((l, i) => { l.rotation.z = Math.sin(tm * 1.3 + i) * 0.04 + Math.sin(tm * 14 + i) * 0.25 * kick; });
    curtains.forEach((c, i) => { c.rotation.y = Math.PI / 2 + Math.sin(tm * 0.8 + i * 2) * 0.04; });
    tail.rotation.y = Math.sin(tm * 1.5) * 0.12;
    const cj = tm - catJump;
    cat.position.y = cj > 0 && cj < 0.6 ? Math.sin((cj / 0.6) * Math.PI) * 0.6 : 0.02;
    bodyC.scale.y = 0.75 + Math.sin(tm * 2) * 0.02;
    const bk = Math.max(0, 1 - (tm - beanKick) / 0.9);
    bean.scale.set(1 + Math.sin(bk * 12) * 0.08 * bk, 0.62 - Math.sin(bk * 12) * 0.1 * bk, 1 + Math.sin(bk * 12) * 0.08 * bk);
    bulbs.forEach((b, i) => { b.material.emissiveIntensity = (night ? 2.2 : 0.6) * (0.75 + 0.25 * Math.sin(tm * 2 + i)); });
    const blink = (tm % 4) < 0.12 || (cj > 0 && cj < 1.2);
    eyes.forEach((e) => (e.scale.y = blink ? 3 : 1));
  }
  const now = new Date();
  sH.rotation.z = -now.getSeconds() * Math.PI / 30;
  mH.rotation.z = -(now.getMinutes() + now.getSeconds() / 60) * Math.PI / 30;
  hH.rotation.z = -((now.getHours() % 12) + now.getMinutes() / 60) * Math.PI / 6;
  renderer.render(scene, camera);
}

/* akşam saatlerinde oda gece modunda açılsın */
const hr = new Date().getHours();
if (hr >= 19 || hr < 6) setNight(true);
resize();
loop();
doc.classList.add('room-ready');
window.dispatchEvent(new Event('room:ready'));
