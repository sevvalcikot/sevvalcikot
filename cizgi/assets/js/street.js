/* "Şevval Show" — 3D çizgi film sokağı
   Göz hizasında sokakta yürürsün. Tüm modeller, karakterler (Lapi ve Fırçı),
   dokular ve sesler kodla sıfırdan üretildi. Binaya tıklayınca kapısına yürür,
   bölüm kartı açılır ve sayfa yan panelde gelir. */

import * as THREE from 'three';

const doc = document.documentElement;
const EN = doc.lang === 'en';
const R = document.body.dataset.root;
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = Math.min(innerWidth, innerHeight) < 700;
const canvas = document.querySelector('canvas.room');
const tip = document.querySelector('[data-tip]');
const t = (tr, en) => (EN ? en : tr);
const INK = 0x1d1b2e;

/* ---------- sesler ---------- */
let ac = null, muted = false;
try { muted = localStorage.getItem('toon-muted') === '1'; } catch (e) { /* yok say */ }
const audio = () => { if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ac = null; } } return ac; };
function tone(type, f0, f1, dur, vol = 0.18, delay = 0) {
  if (muted || !audio()) return;
  const o = ac.createOscillator(), g = ac.createGain(), now = ac.currentTime + delay;
  o.type = type; o.frequency.setValueAtTime(f0, now); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), now + dur);
  g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.001, now + dur);
  o.connect(g).connect(ac.destination); o.start(now); o.stop(now + dur + 0.02);
}
const SFX = {
  pop: () => tone('sine', 600, 1200, 0.12),
  boing: () => { tone('triangle', 180, 520, 0.18, 0.22); tone('triangle', 520, 260, 0.25, 0.15, 0.16); },
  whoosh: () => tone('sawtooth', 900, 120, 0.35, 0.05),
  ding: () => { tone('sine', 1320, 1320, 0.5, 0.12); tone('sine', 1760, 1760, 0.6, 0.08, 0.08); },
  step: () => tone('square', 170, 120, 0.05, 0.035),
  jingle: () => [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, 0.14, 0.06, i * 0.11)),
  drop: () => tone('sine', 900, 200, 0.3, 0.16),
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

const scene = new THREE.Scene();
const SKY_D = new THREE.Color('#7fd4ff'), SKY_N = new THREE.Color('#1d1f52');
scene.background = SKY_D.clone();
scene.fog = new THREE.Fog(SKY_D.clone(), 40, 110);
const camera = new THREE.PerspectiveCamera(58, 1, 0.1, 300);

/* çizgi film gölgelendirmesi: 3 basamaklı ışık */
const gradTex = (() => { const d = new Uint8Array([90, 170, 255]); const tx = new THREE.DataTexture(d, 3, 1, THREE.RedFormat); tx.needsUpdate = true; tx.magFilter = tx.minFilter = THREE.NearestFilter; return tx; })();
const toon = (color, o = {}) => new THREE.MeshToonMaterial({ color, gradientMap: gradTex, ...o });
const outlineMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });
/* kalın siyah kontur: aynı şeklin biraz büyüğü, ters yüzüyle */
function ink(mesh, w = 0.06) {
  const o = new THREE.Mesh(mesh.geometry, outlineMat);
  mesh.geometry.computeBoundingSphere();
  const r = mesh.geometry.boundingSphere.radius || 1;
  o.scale.setScalar(1 + w / r);
  o.raycast = () => {};
  mesh.add(o);
  return mesh;
}
const M = (geo, color, o) => ink(new THREE.Mesh(geo, toon(color, o)));
const box = (w, h, d, c) => M(new THREE.BoxGeometry(w, h, d), c);
const cyl = (rt, rb, h, c, seg = 20) => M(new THREE.CylinderGeometry(rt, rb, h, seg), c);
const ball = (r, c, seg = 20) => M(new THREE.SphereGeometry(r, seg, seg), c);
const at = (o, x, y, z) => { o.position.set(x, y, z); return o; };
const shadow = (o) => { o.traverse((c) => { if (c.isMesh && c.material !== outlineMat) { c.castShadow = true; c.receiveShadow = true; } }); return o; };
const canvasTex = (w, h, draw) => { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; tx.anisotropy = 4; return tx; };
const loader = new THREE.TextureLoader();
const photo = (p) => { const tx = loader.load(R + 'assets/images/' + p); tx.colorSpace = THREE.SRGBColorSpace; return tx; };
const FONT = '"Lilita One", "Arial Rounded MT Bold", sans-serif';
const label = (txt, bg, fg = '#1d1b2e', w = 512, h = 140) => canvasTex(w, h, (g) => {
  g.fillStyle = bg; g.strokeStyle = '#1d1b2e'; g.lineWidth = 12;
  g.beginPath(); g.roundRect(8, 8, w - 16, h - 16, 30); g.fill(); g.stroke();
  g.fillStyle = fg; g.font = `${Math.round(h * 0.5)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(txt, w / 2, h / 2 + 6);
});
const plane = (w, h, map, o = {}) => new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map, transparent: true, ...o }));
/* sevimli surat dokusu */
const faceTex = (bg = null, w = 256, h = 256) => canvasTex(w, h, (g) => {
  if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
  g.lineWidth = 8; g.strokeStyle = '#1d1b2e';
  [[0.34, 0.42], [0.66, 0.42]].forEach(([x, y]) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(w * x, h * y, 24, 32, 0, 0, 7); g.fill(); g.stroke(); g.fillStyle = '#1d1b2e'; g.beginPath(); g.arc(w * x + 4, h * y + 6, 11, 0, 7); g.fill(); });
  g.beginPath(); g.arc(w / 2, h * 0.58, 40, 0.15 * Math.PI, 0.85 * Math.PI); g.stroke();
  g.fillStyle = 'rgba(255,143,163,.75)'; [[0.2, 0.62], [0.8, 0.62]].forEach(([x, y]) => { g.beginPath(); g.ellipse(w * x, h * y, 20, 11, 0, 0, 7); g.fill(); });
});

const clickables = [];
const hot = (o, info) => { o.userData.hot = info; clickables.push(o); return o; };

/* ---------- ışık ---------- */
const hemi = new THREE.HemisphereLight(0xffffff, 0x88aa77, 1.4); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff2d6, 2.2);
sun.position.set(20, 30, 18); sun.castShadow = true;
sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 90 });
scene.add(sun, sun.target);

/* ---------- zemin: yol, kaldırım, çimen ---------- */
const LEN = 120, X0 = -10;
const grass = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), toon(0x7ccf6c)); grass.rotation.x = -Math.PI / 2; grass.receiveShadow = true; scene.add(grass);
const road = new THREE.Mesh(new THREE.PlaneGeometry(LEN + 80, 7), toon(0x575a6b)); road.rotation.x = -Math.PI / 2; at(road, LEN / 2, 0.02, 6); road.receiveShadow = true; scene.add(road);
for (let x = -30; x < LEN + 40; x += 4) { const d = new THREE.Mesh(new THREE.PlaneGeometry(2, 0.3), new THREE.MeshBasicMaterial({ color: 0xffd36e })); d.rotation.x = -Math.PI / 2; at(d, x, 0.03, 6); scene.add(d); }
const walk = at(box(LEN + 80, 0.25, 3, 0xd9d4cf), LEN / 2, 0.12, 1.9); walk.receiveShadow = true; scene.add(walk);
const walk2 = at(box(LEN + 80, 0.25, 2.2, 0xd9d4cf), LEN / 2, 0.12, 10.6); scene.add(walk2);

/* ---------- binalar (yolun solunda, z < 0) ---------- */
const B = [];
function building(id, x, href, ep, title, lbl, build) {
  const g = new THREE.Group(); at(g, x, 0, -3.2); build(g); shadow(g); scene.add(g);
  const b = { id, x, href, ep, title, label: lbl, g }; B.push(b);
  hot(g, { label: lbl, href, b });
  return b;
}
const signBoard = (g, txt, bg, y, w = 4.2) => { const s = plane(w, w * 0.27, label(txt, bg)); at(s, 0, y, 2.62); g.add(s); };
const windowM = [];
const win = (g, x, y, z, w = 1.2, h = 1.2) => {
  const m = at(box(w, h, 0.12, 0xbfeaff), x, y, z); g.add(m); windowM.push(m);
  g.add(at(box(0.08, h, 0.16, INK), x, y, z)); g.add(at(box(w, 0.08, 0.16, INK), x, y, z));
};

// 1) Pembe ev — Hakkımda
const bHouse = building('ev', 4, t('hakkimda.html', 'about.html'), 1, t('Hakkımda', 'About me'), t('Pembe ev · Hakkımda', 'Pink house · About me'), (g) => {
  g.add(at(box(6, 4.4, 5, 0xffd1dc), 0, 2.2, 0));
  const roof = M(new THREE.ConeGeometry(4.8, 3, 4), 0xff6f91); roof.rotation.y = Math.PI / 4; at(roof, 0, 5.9, 0); g.add(roof);
  g.add(at(box(0.9, 2, 0.9, 0xc96a5a), -1.6, 6.4, -0.6));
  win(g, -1.7, 2.8, 2.52); win(g, 1.7, 2.8, 2.52);
  g.add(at(box(1.4, 2.2, 0.15, 0x7a5cff), 0, 1.1, 2.55));
  g.add(at(ball(0.12, 0xffd36e), 0.45, 1.1, 2.65));
  const av = new THREE.Mesh(new THREE.CircleGeometry(0.62, 32), new THREE.MeshBasicMaterial({ map: photo('avatar.jpg') })); at(av, 0, 3.05, 2.62); g.add(av);
  g.add(at(ink(new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.08, 8, 32), toon(0xffffff))), 0, 3.05, 2.62));
  signBoard(g, t('HAKKIMDA', 'ABOUT ME'), '#ffd36e', 4.5);
});
const smoke = [];
for (let i = 0; i < 4; i++) { const s = ball(0.35 + i * 0.08, 0xffffff, 12); s.userData.o = i / 4; scene.add(s); smoke.push(s); }

// 2) Boya atölyesi — Projeler
const PROJ = ['proje4-sonrasi.jpg', 'proje1-sonrasi.jpg', 'proje2-sonrasi.jpg', 'proje3-sonrasi.jpg', 'proje5.jpg', 'proje6-sonrasi.jpg'].map((p) => photo('projeler/' + p));
const projMat = new THREE.MeshBasicMaterial({ map: PROJ[0] });
const bStudio = building('atolye', 22, t('projeler.html', 'projects.html'), 2, t('Projeler', 'Projects'), t('Boya atölyesi · Projeler', 'Paint studio · Projects'), (g) => {
  g.add(at(box(7, 5.6, 5, 0xff9f43), 0, 2.8, 0));
  g.add(at(box(7.6, 0.5, 5.6, 0xe2582f), 0, 5.85, 0));
  [0x7a5cff, 0x1fb5a5, 0xffd36e, 0xff6f91, 0x5ec2f2].forEach((c, i) => { const d = M(new THREE.ConeGeometry(0.4, 1.2 + (i % 2) * 0.6, 12), c); d.rotation.x = Math.PI; at(d, -3 + i * 1.5, 5.1 - (i % 2) * 0.3, 2.6); g.add(d); });
  g.add(at(box(4.6, 3, 0.2, 0xffffff), 0, 3.1, 2.55));
  const pic = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 2.6), projMat); at(pic, 0, 3.1, 2.67); g.add(pic);
  g.add(at(box(1.5, 1.4, 0.15, 0x8a5a3c), -2.5, 0.7, 2.55));
  const bucket = cyl(0.55, 0.45, 0.9, 0x5ec2f2); at(bucket, 2.9, 0.45, 3.1); g.add(bucket);
  g.add(at(cyl(0.5, 0.5, 0.05, 0x7a5cff), 2.9, 0.92, 3.1));
  signBoard(g, t('PROJELER', 'PROJECTS'), '#ff6f91', 0.9 + 0.1, 3);
});

// 3) Fotoğraf stüdyosu — Galeri
const polaroids = [];
const bPhoto = building('studyo', 40, t('galeri.html', 'gallery.html'), 3, t('Galeri', 'Gallery'), t('Fotoğraf stüdyosu · Galeri', 'Photo studio · Gallery'), (g) => {
  g.add(at(box(7, 4.6, 5, 0x1fb5a5), 0, 2.3, 0));
  g.add(at(box(7.6, 0.5, 5.6, 0xfff3e0), 0, 4.85, 0));
  const cam = new THREE.Group();
  cam.add(box(3, 1.9, 1.4, INK)); cam.add(at(box(1, 0.5, 1, INK), -0.6, 1.1, 0));
  const lens = cyl(0.75, 0.75, 0.5, 0x9ad8f5); lens.rotation.x = Math.PI / 2; at(lens, 0, 0, 0.8); cam.add(lens);
  cam.add(at(cyl(0.35, 0.35, 0.52, INK), 0, 0, 0.82)).children; cam.children[cam.children.length - 1].rotation.x = Math.PI / 2;
  cam.add(at(ball(0.2, 0xff6f91), 1.1, 0.7, 0.7));
  at(cam, 0, 6.2, 0.4); g.add(cam); g.userData.cam = cam;
  ['bayburt', 'ortaokul', 'lise', 'universite'].forEach((p, i) => {
    const pg = new THREE.Group();
    pg.add(box(1.3, 1.55, 0.06, 0xffffff));
    const ph = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshBasicMaterial({ map: photo(`galeri/${p}.jpg`) })); at(ph, 0, 0.13, 0.04); pg.add(ph);
    pg.add(at(box(0.18, 0.35, 0.1, 0xffd36e), 0, 0.8, 0.04));
    const piv = new THREE.Group(); at(piv, -2.55 + i * 1.7, 3.95 - Math.abs(i - 1.5) * -0.08, 2.65); at(pg, 0, -0.85, 0); piv.add(pg); g.add(piv); polaroids.push(piv);
  });
  g.add(at(box(1.6, 2, 0.15, 0xffd36e), 0, 1, 2.55));
  signBoard(g, t('GALERİ', 'GALLERY'), '#5ec2f2', 2.45, 2.6);
});

// 4) Kitap kütüphanesi — Blog
const bLib = building('kutuphane', 58, 'blog.html', 4, 'Blog', t('Kitap kütüphanesi · Blog', 'Book library · Blog'), (g) => {
  [['#7a5cff', 'Layer Comps', 'blog-layer-comps.html'], ['#e2582f', 'Image Stack', 'blog-image-stack.html'], ['#1fb5a5', t('Yapay Zeka', 'AI'), 'blog-yapay-zeka-ile-web-sitesi.html']].forEach(([c, n, href], i) => {
    const col = new THREE.Color(c);
    const spine = label(n, c, '#ffffff', 1024, 220);
    const pages = toon(0xfff8ec), cover = toon(col);
    const bk = ink(new THREE.Mesh(new THREE.BoxGeometry(6.6 - i * 0.5, 1.9, 4.6), [pages, pages, cover, cover, new THREE.MeshBasicMaterial({ map: spine }), cover]));
    at(bk, 0, 0.95 + i * 1.95, 0); bk.rotation.y = (i - 1) * 0.08; g.add(bk);
    hot(bk, { label: t('Kitap · Blog: ', 'Book · Blog: ') + n, href, b: null, book: true });
  });
  const bulb = ball(0.55, 0xfff6a8); at(bulb, 0, 6.6, 0); g.add(bulb); g.userData.bulb = bulb;
  g.add(at(cyl(0.25, 0.3, 0.5, 0x888888), 0, 6, 0));
});

// 5) Postane — İletişim
const bPost = building('postane', 76, t('iletisim.html', 'contact.html'), 5, t('İletişim', 'Contact'), t('Postane · İletişim', 'Post office · Contact'), (g) => {
  g.add(at(box(6.6, 4.8, 5, 0xffd36e), 0, 2.4, 0));
  const dome = M(new THREE.SphereGeometry(3.6, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0xe23b3b); dome.scale.y = 0.45; at(dome, 0, 4.8, 0); g.add(dome);
  const env = new THREE.Group();
  env.add(box(2.6, 1.6, 0.15, 0xffffff));
  const flap = M(new THREE.ConeGeometry(1.55, 0.9, 3), 0xf3ede4); flap.rotation.z = Math.PI; flap.scale.set(1.1, 1, 0.1); at(flap, 0, 0.35, 0.09); env.add(flap);
  const heart = M(new THREE.SphereGeometry(0.28, 14, 14), 0xff6f91); at(heart, 0, -0.25, 0.15); env.add(heart); g.userData.heart = heart;
  at(env, 0, 3.4, 2.62); g.add(env);
  g.add(at(box(1.5, 2, 0.15, 0x5ec2f2), 0, 1, 2.55));
  signBoard(g, t('İLETİŞİM', 'CONTACT'), '#1fb5a5', 2.35, 2.6);
  const mb = new THREE.Group();
  mb.add(at(box(0.18, 1.4, 0.18, 0x8a5a3c), 0, 0.7, 0));
  mb.add(at(box(1.1, 0.8, 0.8, 0x1f6fd1), 0, 1.75, 0));
  const flag = at(box(0.08, 0.7, 0.4, 0xe23b3b), 0.6, 1.9, 0.1); mb.add(flag); mb.userData.flag = flag;
  at(mb, 4.4, 0, 3.4); g.add(mb); g.userData.mb = mb;
  hot(mb, { label: t('Posta kutusu', 'Mailbox'), action: 'mail' });
});

/* ---------- ağaçlar, lambalar, çiçekler ---------- */
const trees = [];
[-6, 13, 31, 49, 67, 86].forEach((x, i) => {
  const g = new THREE.Group();
  g.add(at(cyl(0.3, 0.4, 2.6, 0x9a6b42, 10), 0, 1.3, 0));
  const crown = new THREE.Group(); at(crown, 0, 3.6, 0);
  [[0, 0.4, 0, 1.6], [-1, -0.2, 0.3, 1.1], [1, -0.1, -0.2, 1.15]].forEach(([x2, y2, z2, r]) => crown.add(at(ball(r, i % 2 ? 0x5ec27a : 0x4fb46a, 16), x2, y2, z2)));
  [[0.6, 0.3, 1.2], [-0.9, -0.1, 1.05], [0.2, 1, 1.15]].forEach(([x2, y2, z2]) => { const a = ball(0.2, 0xe23b3b, 10); at(a, x2, y2, z2); a.userData.apple = [x2, y2, z2]; crown.add(a); });
  g.add(crown); g.userData.crown = crown;
  at(g, x, 0, -1.4); shadow(g); scene.add(g); trees.push(g);
  hot(g, { label: t('Ağaç · salla', 'Tree · shake it'), action: 'tree' });
});
const lamps = [];
for (let x = -2; x < LEN; x += 12) {
  const g = new THREE.Group();
  g.add(at(cyl(0.1, 0.12, 4, 0x2b3a67, 8), 0, 2, 0));
  g.add(at(box(0.9, 0.12, 0.12, 0x2b3a67), 0.35, 4, 0));
  const head = ball(0.32, 0xfff6a8, 12); at(head, 0.75, 3.75, 0); g.add(head); lamps.push(head);
  at(g, x + 6, 0, 2.8); shadow(g); scene.add(g);
}
// karşı taraf: deniz ve tepeler
const hills = new THREE.Group();
for (let i = 0; i < 9; i++) { const h = ball(7 + (i % 3) * 2, i % 2 ? 0x9fe08a : 0x8ed67a, 20); h.scale.y = 0.45; at(h, -10 + i * 16, -1, -22 - (i % 2) * 6); hills.add(h); }
scene.add(hills);
const seaBand = new THREE.Mesh(new THREE.PlaneGeometry(400, 60), toon(0x1fb5d5)); seaBand.rotation.x = -Math.PI / 2; at(seaBand, 60, 0.01, 44); scene.add(seaBand);
for (let i = 0; i < 60; i++) { const f = ball(0.12, [0xff6f91, 0xffd36e, 0xffffff, 0xb388ff][i % 4], 8); at(f, -8 + (i * 7.3) % 96, 0.15, -0.3 - (i % 5) * 0.35); scene.add(f); }

/* ---------- gökyüzü: surat yapan güneş, bulutlar ---------- */
const sunSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(512, 512, (g, w) => {
  g.translate(w / 2, w / 2); g.strokeStyle = '#1d1b2e'; g.lineWidth = 12;
  for (let i = 0; i < 12; i++) { g.save(); g.rotate(i * Math.PI / 6); g.fillStyle = '#ffb000'; g.beginPath(); g.roundRect(-14, -240, 28, 70, 14); g.fill(); g.stroke(); g.restore(); }
  g.fillStyle = '#ffd36e'; g.beginPath(); g.arc(0, 0, 150, 0, 7); g.fill(); g.stroke();
  g.translate(-128, -128); g.drawImage(faceTex(null).image, 0, 0);
}), transparent: true }));
sunSprite.scale.set(9, 9, 1); scene.add(sunSprite);
const moonSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: canvasTex(512, 512, (g, w) => { g.translate(w / 2, w / 2); g.fillStyle = '#fff6d6'; g.strokeStyle = '#1d1b2e'; g.lineWidth = 12; g.beginPath(); g.arc(0, 0, 150, 0, 7); g.fill(); g.stroke(); g.translate(-128, -128); g.drawImage(faceTex(null).image, 0, 0); }), transparent: true }));
moonSprite.scale.set(7, 7, 1); moonSprite.visible = false; scene.add(moonSprite);
hot(sunSprite, { label: t('Güneş · gece olsun', 'Sun · make it night'), action: 'night' });
hot(moonSprite, { label: t('Ay · sabah olsun', 'Moon · make it morning'), action: 'night' });
const cloudTex = canvasTex(512, 300, (g) => {
  g.fillStyle = '#fff'; g.strokeStyle = '#1d1b2e'; g.lineWidth = 12;
  g.beginPath(); g.arc(150, 180, 80, Math.PI * 0.5, Math.PI * 1.5); g.arc(250, 110, 95, Math.PI, 0); g.arc(370, 170, 85, Math.PI * 1.5, Math.PI * 0.5); g.closePath(); g.fill(); g.stroke();
  g.save(); g.translate(256 - 64, 150 - 64); g.scale(0.5, 0.5); g.drawImage(faceTex(null).image, 0, 0); g.restore();
});
const clouds = [];
for (let i = 0; i < 9; i++) { const c = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true })); c.scale.set(8, 4.7, 1); at(c, -10 + i * 15, 13 + (i % 3) * 2.5, -14 - (i % 2) * 8); scene.add(c); clouds.push(c); hot(c, { label: t('Bulut · yağmur yağdır', 'Cloud · make it rain'), action: 'rain' }); }
const rainGeo = new THREE.BufferGeometry(), RN = 220, rp = new Float32Array(RN * 3);
rainGeo.setAttribute('position', new THREE.BufferAttribute(rp, 3));
const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0x5ec2f2, size: 0.18 })); rain.visible = false; scene.add(rain);
let rainCloud = null, rainUntil = 0;

/* ---------- karakterler ---------- */
function makeLapi() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  body.add(at(box(1.8, 0.2, 1.2, 0xc9ccd6), 0, 0.95, 0));
  const lid = new THREE.Group(); at(lid, 0, 1.05, -0.55); body.add(lid);
  lid.add(at(box(1.8, 1.3, 0.12, 0xc9ccd6), 0, 0.65, 0));
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(1.55, 1.08), new THREE.MeshBasicMaterial({ map: faceTex('#2b3a67') })); at(scr, 0, 0.65, 0.07); lid.add(scr);
  lid.rotation.x = -0.1;
  const legs = [-0.45, 0.45].map((x) => { const l = new THREE.Group(); at(l, x, 0.9, 0); l.add(at(cyl(0.07, 0.07, 0.75, INK, 8), 0, -0.38, 0)); l.add(at(ball(0.2, 0xe2582f, 12), 0, -0.78, 0.08)); l.children[1].scale.set(1, 0.6, 1.5); body.add(l); return l; });
  g.userData = { body, legs }; return g;
}
function makeFirci() {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  body.add(at(cyl(0.34, 0.34, 1.3, 0xffd36e, 16), 0, 1.25, 0));
  body.add(at(cyl(0.4, 0.38, 0.4, 0xc9ccd6, 16), 0, 2.05, 0));
  const br = M(new THREE.ConeGeometry(0.42, 1.1, 16), 0xff6f91); at(br, 0, 2.8, 0); body.add(br);
  const f = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62), new THREE.MeshBasicMaterial({ map: faceTex(null), transparent: true })); at(f, 0, 1.35, 0.36); body.add(f);
  const legs = [-0.17, 0.17].map((x) => { const l = new THREE.Group(); at(l, x, 0.62, 0); l.add(at(cyl(0.06, 0.06, 0.5, INK, 8), 0, -0.25, 0)); l.add(at(ball(0.16, 0x7a5cff, 12), 0, -0.52, 0.06)); l.children[1].scale.set(1, 0.6, 1.5); body.add(l); return l; });
  g.userData = { body, legs }; return g;
}
const lapi = shadow(makeLapi()), firci = shadow(makeFirci());
lapi.scale.setScalar(0.85); firci.scale.setScalar(0.85);
lapi.position.set(3.5, 0, 4.4); firci.position.set(2, 0, 3.4);
scene.add(lapi, firci);
hot(lapi, { label: t('Lapi · dürt', 'Lapi · poke'), action: 'joke', who: 'lapi' });
hot(firci, { label: t('Fırçı · dürt', 'Fırçı · poke'), action: 'joke', who: 'firci' });
const JOKES = {
  lapi: [t('Şarjım %100, enerjim %200!', 'Battery 100%, energy 200%!'), t('Ctrl+Z ile dünü geri alabilsem…', 'If only Ctrl+Z worked on yesterday…'), t('Bana dokunma, güncelleme yapıyorum!', "Don't touch, I'm updating!"), t('Bu sitede 0 hata var. Şimdilik.', 'This site has 0 bugs. For now.')],
  firci: [t('Bir katman daha ekleyelim mi?', 'Shall we add one more layer?'), t('Ben renklendiririm, sen kaydet!', 'I paint, you hit save!'), t('Pembe her şeye yakışır.', 'Pink goes with everything.'), t('Fırçam saçım, saçım fırçam.', 'My bristles are my hairdo.')],
};
let jokeI = 0, jumpAt = { lapi: -9, firci: -9 };

/* ---------- yürüyüş (kamera sokakta ilerler) ---------- */
const START = -4, END = 80;
let camX = START, camXT = START, look = 0, lookT = 0, inside = null;
const keys = {};
const clampX = (x) => Math.max(START, Math.min(END, x));
addEventListener('keydown', (e) => {
  if (e.target.closest('input, textarea, [contenteditable]') || document.querySelector('.sheet.open')) return;
  if (['ArrowRight', 'ArrowLeft', 'KeyD', 'KeyA', 'ArrowUp', 'ArrowDown', 'KeyW', 'KeyS'].includes(e.code)) { keys[e.code] = true; e.preventDefault(); inside = null; }
});
addEventListener('keyup', (e) => { keys[e.code] = false; });
canvas.addEventListener('wheel', (e) => { e.preventDefault(); inside = null; camXT = clampX(camXT + (e.deltaY + e.deltaX) * 0.025); }, { passive: false });
let drag = null;
canvas.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, s: camXT, moved: false }; audio(); });
addEventListener('pointermove', (e) => {
  if (drag) { const dx = e.clientX - drag.x; if (Math.abs(dx) > 5) { drag.moved = true; inside = null; } camXT = clampX(drag.s - dx * 0.04); }
  lookT = (e.clientX / innerWidth - 0.5) * 2;
});
addEventListener('pointerup', () => { setTimeout(() => (drag = null), 0); });
document.querySelectorAll('[data-walk]').forEach((b) => {
  let iv = null;
  const go = () => { inside = null; camXT = clampX(camXT + Number(b.dataset.walk) * 0.6); };
  b.addEventListener('pointerdown', (e) => { e.preventDefault(); go(); iv = setInterval(go, 60); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach((ev) => b.addEventListener(ev, () => clearInterval(iv)));
  b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
});

/* ---------- üzerine gelme, tıklama ---------- */
const ray = new THREE.Raycaster(), ptr = new THREE.Vector2();
let hovered = null;
const findHot = (o) => { while (o) { if (o.userData && o.userData.hot) return o; o = o.parent; } return null; };
function pick(e) {
  const r = canvas.getBoundingClientRect();
  ptr.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  for (const h of ray.intersectObjects(clickables, true)) { const o = findHot(h.object); if (o) return o; }
  return null;
}
const setGlow = (o, on) => o.traverse((c) => { if (c.isMesh && c.material && c.material.isMeshToonMaterial) { if (!c.userData.own) { c.material = c.material.clone(); c.userData.own = true; } c.material.emissive.setHex(on ? 0x553322 : 0x000000); } });
canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'touch' || drag?.moved) { tip.hidden = true; return; }
  const o = pick(e);
  if (o !== hovered) { if (hovered) setGlow(hovered, false); hovered = o; if (o) setGlow(o, true); }
  canvas.style.cursor = o ? 'pointer' : 'grab';
  if (o) { tip.textContent = o.userData.hot.label; tip.hidden = false; tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`; } else tip.hidden = true;
});
canvas.addEventListener('pointerleave', () => { tip.hidden = true; if (hovered) { setGlow(hovered, false); hovered = null; } });
canvas.addEventListener('click', (e) => {
  if (drag && drag.moved) return;
  const o = pick(e); if (!o) return;
  const h = o.userData.hot;
  if (h.href) { SFX.pop(); window.RoomUI.open(h.href); return; }
  if (h.action === 'joke') { SFX.boing(); jumpAt[h.who] = clock.getElapsedTime(); say(JOKES[h.who][jokeI++ % 4], e); return; }
  if (h.action === 'night') { setNight(!night); SFX.ding(); say(night ? t('İyi geceler! 🌙', 'Good night! 🌙') : t('Günaydın! ☀️', 'Good morning! ☀️'), e); return; }
  if (h.action === 'rain') { SFX.whoosh(); rainCloud = o; rainUntil = clock.getElapsedTime() + 3; rain.visible = true; resetRain(); return; }
  if (h.action === 'tree') { SFX.drop(); o.userData.shake = clock.getElapsedTime(); return; }
  if (h.action === 'mail') { SFX.ding(); bPost.g.userData.mailAt = clock.getElapsedTime(); say(t('Yeni mesaj var mı? 📬', 'Any new mail? 📬'), e); }
});
function say(text, e) {
  const b = document.querySelector('[data-bubble]');
  b.textContent = text; b.hidden = false; b.style.transform = `translate(${e.clientX - 30}px, ${e.clientY - 80}px)`;
  b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  clearTimeout(say.t); say.t = setTimeout(() => (b.hidden = true), 2000);
}
function resetRain() { const c = rainCloud.position; for (let i = 0; i < RN; i++) { rp[i * 3] = c.x + (Math.random() - 0.5) * 6; rp[i * 3 + 1] = c.y - Math.random() * c.y; rp[i * 3 + 2] = c.z + (Math.random() - 0.5) * 2; } rainGeo.attributes.position.needsUpdate = true; }

/* ---------- gece / gündüz ---------- */
let night = false;
function setNight(n) { night = n; doc.classList.toggle('night', n); sunSprite.visible = !n; moonSprite.visible = n; }

/* ---------- bölüm kartı ---------- */
const card = document.querySelector('[data-episode]');
function episode(b) {
  if (!card) return;
  card.querySelector('[data-ep-num]').textContent = t('BÖLÜM ', 'EPISODE ') + b.ep;
  card.querySelector('[data-ep-title]').textContent = b.title;
  card.hidden = false; card.classList.remove('go'); void card.offsetWidth; card.classList.add('go');
  SFX.jingle();
  clearTimeout(episode.t); episode.t = setTimeout(() => { card.hidden = true; }, reduce ? 300 : 1500);
}

/* ---------- arayüz bağlantısı ---------- */
const byHref = Object.fromEntries(B.map((b) => [b.href, b]));
let sheetOpen = false, first = true;
window.RoomScene = {
  focus(href) {
    const key = href.split('/').pop().split('?')[0] || 'index.html';
    let b = byHref[key];
    if (!b && /^blog-|^yazi/.test(key)) b = byHref['blog.html'];
    if (!b) { inside = null; if (first) { first = false; } return; }
    if (first) { camX = camXT = clampX(b.x - 3); inside = b; first = false; return; }
    episode(b); camXT = clampX(b.x - 3); inside = b;
  },
  home() { inside = null; },
  setSheet(open) { sheetOpen = open; if (!open) inside = null; resize(); },
  tour,
};
let touring = false;
async function tour(btn) {
  if (touring) { touring = false; return; }
  touring = true; btn && btn.setAttribute('aria-pressed', 'true');
  const lines = [
    t('Lapi: Burası pembe ev, Şevval kendini burada anlatıyor.', 'Lapi: This is the pink house, where Şevval tells her story.'),
    t('Fırçı: Atölyede Photoshop projeleri var, en sevdiğim yer!', 'Fırçı: The studio has her Photoshop projects, my favourite place!'),
    t('Lapi: Stüdyoda okuduğu yerlerin fotoğrafları asılı.', 'Lapi: The photo studio shows the places she studied.'),
    t('Fırçı: Her kitap bir blog yazısı, okumayı unutma.', "Fırçı: Every book is a blog post, don't forget to read."),
    t("Lapi: Postaneden Şevval'e mesaj atabilirsin. Görüşürüz!", 'Lapi: Send Şevval a message from the post office. Bye!'),
  ];
  for (let i = 0; i < B.length && touring; i++) {
    inside = B[i]; camXT = clampX(B[i].x - 3);
    window.RoomUI.caption(lines[i]);
    await new Promise((r) => setTimeout(r, 3600));
  }
  inside = null; touring = false; window.RoomUI.caption(''); btn && btn.setAttribute('aria-pressed', 'false');
}

function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  const shift = w >= 980 && sheetOpen ? Math.min(600, w * 0.46) / 2 : 0;
  if (shift) camera.setViewOffset(w, h, shift, 0, w, h); else camera.clearViewOffset();
  camera.fov = w < 700 ? 70 : 58;
  camera.updateProjectionMatrix();
}
addEventListener('resize', resize);

/* ---------- döngü ---------- */
const clock = new THREE.Clock();
const tgt = new THREE.Vector3(), camPos = new THREE.Vector3();
let lastStep = 0, visible = true, projI = 0, projT = 0;
document.addEventListener('visibilitychange', () => { visible = !document.hidden; if (visible) loop(); });
function loop() {
  if (!visible) return;
  requestAnimationFrame(loop);
  const dt = Math.min(clock.getDelta(), 0.05), tm = clock.elapsedTime;
  const k = (keys.ArrowRight || keys.KeyD || keys.ArrowUp || keys.KeyW ? 1 : 0) - (keys.ArrowLeft || keys.KeyA || keys.ArrowDown || keys.KeyS ? 1 : 0);
  if (k) camXT = clampX(camXT + k * 14 * dt);
  const prev = camX;
  camX += (camXT - camX) * Math.min(1, dt * (reduce ? 30 : 3.2));
  const speed = Math.abs(camX - prev) / Math.max(dt, 1e-4);
  look += (lookT - look) * 0.05;
  // kamera: içerideyse binanın kapısına yaklaşır ve ona döner
  if (inside) { camPos.set(inside.x, 2.8, 8.6); tgt.set(inside.x, 3.2, -3); }
  else { camPos.set(camX, 2.4 + Math.sin(tm * 8) * Math.min(0.06, speed * 0.01), 8.6); tgt.set(camX + 7 + look * 4, 2.6, -1.5 - Math.abs(look) * 1.5); }
  camera.position.lerp(camPos, inside ? 0.06 : 0.25);
  camera.userData.t = (camera.userData.t || tgt.clone()).lerp(tgt, inside ? 0.06 : 0.2);
  camera.lookAt(camera.userData.t);
  sun.position.set(camera.position.x + 20, 30, 18); sun.target.position.set(camera.position.x, 0, 0);
  sunSprite.position.set(camera.position.x + 26, 22, -40); moonSprite.position.copy(sunSprite.position);
  // karakterler kameranın önünde yürür
  const walking = speed > 0.4 && !inside;
  [[lapi, 7.5, 4.4, 'lapi'], [firci, 6.0, 3.4, 'firci']].forEach(([c, ahead, z, who], i) => {
    const goal = (inside ? inside.x + (i ? -2.8 : 2.8) : camera.position.x + ahead);
    c.position.x += (goal - c.position.x) * 0.08;
    c.position.z += ((inside ? 3.0 : z) - c.position.z) * 0.08;
    const dir = goal - c.position.x;
    c.rotation.y += ((Math.abs(dir) > 0.2 ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : 0.4 * (i ? -1 : 1)) - c.rotation.y) * 0.12;
    const u = c.userData, moving = Math.abs(dir) > 0.2 || walking;
    const jt = tm - jumpAt[who], jump = jt > 0 && jt < 0.7 ? Math.sin((jt / 0.7) * Math.PI) * 1.4 : 0;
    u.body.position.y = (moving ? Math.abs(Math.sin(tm * 12 + i)) * 0.25 : Math.sin(tm * 3 + i) * 0.06) + jump;
    u.body.rotation.z = jt > 0 && jt < 0.7 ? Math.sin(jt * 9) * 0.3 : 0;
    u.legs.forEach((l, j) => (l.rotation.x = moving ? Math.sin(tm * 12 + j * Math.PI) * 0.6 : 0));
  });
  if (walking && tm - lastStep > 0.28) { lastStep = tm; SFX.step(); }
  // canlı ayrıntılar
  if (!reduce) {
    smoke.forEach((s) => { const p = (tm * 0.35 + s.userData.o) % 1; at(s, 4 - 1.6 + p * 0.6, 7.6 + p * 3, -3.8); s.scale.setScalar(0.5 + p); });
    polaroids.forEach((p, i) => (p.rotation.z = Math.sin(tm * 1.6 + i) * 0.08));
    clouds.forEach((c, i) => { c.position.x += dt * (0.4 + i * 0.05); if (c.position.x > camera.position.x + 60) c.position.x = camera.position.x - 40; });
    trees.forEach((tr) => { const s = tm - (tr.userData.shake ?? -9); tr.userData.crown.rotation.z = s < 1.2 ? Math.sin(s * 25) * 0.08 * (1 - s / 1.2) : Math.sin(tm + tr.position.x) * 0.015;
      tr.userData.crown.children.forEach((a) => { if (!a.userData.apple) return; const [x, y, z] = a.userData.apple; a.position.set(x, s < 1.6 ? y - Math.min(1, s / 0.8) ** 2 * (y + 3.4) : y, z); }); });
    bPhoto.g.userData.cam.rotation.y = Math.sin(tm * 0.8) * 0.25;
    bPost.g.userData.heart.scale.setScalar(1 + Math.max(0, Math.sin(tm * 5)) * 0.25);
    const mt = tm - (bPost.g.userData.mailAt ?? -9); bPost.g.userData.mb.userData.flag.rotation.z = mt < 1.4 ? -Math.PI / 2 * Math.sin(Math.min(1, mt / 0.3) * Math.PI / 2) : 0;
  }
  projT += dt; if (projT > 2.4) { projT = 0; projI = (projI + 1) % PROJ.length; projMat.map = PROJ[projI]; projMat.needsUpdate = true; }
  if (rain.visible) {
    for (let i = 0; i < RN; i++) { rp[i * 3 + 1] -= dt * 14; if (rp[i * 3 + 1] < 0) rp[i * 3 + 1] = rainCloud.position.y - 1; rp[i * 3] += (rainCloud.position.x - rp[i * 3]) * 0 + dt * 0.4; }
    rainGeo.attributes.position.needsUpdate = true; if (tm > rainUntil) rain.visible = false;
  }
  // gece-gündüz
  scene.background.lerp(night ? SKY_N : SKY_D, 0.05); scene.fog.color.copy(scene.background);
  hemi.intensity += ((night ? 0.55 : 1.4) - hemi.intensity) * 0.05;
  sun.intensity += ((night ? 0.3 : 2.2) - sun.intensity) * 0.05;
  const lampOn = night ? 1 : 0;
  lamps.forEach((l) => { l.material.emissive.setHex(0xffd36e); l.material.emissiveIntensity = lampOn * 1.6; });
  windowM.forEach((w) => { w.material.emissive.setHex(0xffc24a); w.material.emissiveIntensity = lampOn * 0.9; });
  bLib.g.userData.bulb.material.emissive.setHex(0xffe27a); bLib.g.userData.bulb.material.emissiveIntensity = 0.3 + lampOn * 1.4;
  renderer.render(scene, camera);
}
const hr = new Date().getHours(); if (hr >= 19 || hr < 6) setNight(true);
resize(); camera.position.set(camX, 2.4, 8.6); loop();
doc.classList.add('room-ready');
window.dispatchEvent(new Event('room:ready'));
