/* "Şevval Show" — çizgi film dünyası
   Tüm çizimler, karakterler (Lapi ve Fırçı) ve sesler kodla, sıfırdan üretildi.
   Binalara tıklayınca karakterler oraya yürür, bölüm kartı açılır ve sayfa panelde gelir. */

(() => {
  const doc = document.documentElement;
  const EN = doc.lang === 'en';
  const R = document.body.dataset.root;
  const t = (tr, en) => (EN ? en : tr);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const stage = document.querySelector('[data-stage]');
  const tip = document.querySelector('[data-tip]');
  const IMG = (p) => R + 'assets/images/' + p;
  const W = 3000, H = 1000, GROUND = 780;
  const INK = '#1d1b2e';
  const S = `stroke="${INK}" stroke-width="6" stroke-linejoin="round" stroke-linecap="round"`;

  /* ---------- sesler (WebAudio ile üretilir, dosya yok) ---------- */
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
    step: () => tone('square', 180, 120, 0.05, 0.04),
    jingle: () => [523, 659, 784, 1046].forEach((f, i) => tone('square', f, f, 0.14, 0.06, i * 0.11)),
    drop: () => tone('sine', 900, 200, 0.3, 0.16),
  };
  const muteBtn = document.querySelector('[data-mute]');
  const showMute = () => { if (muteBtn) { muteBtn.textContent = muted ? '🔇' : '🔊'; muteBtn.setAttribute('aria-pressed', String(!muted)); } };
  if (muteBtn) muteBtn.addEventListener('click', () => { muted = !muted; try { localStorage.setItem('toon-muted', muted ? '1' : '0'); } catch (e) { /* yok say */ } showMute(); if (!muted) SFX.pop(); });
  showMute();

  /* ---------- çizim parçaları ---------- */
  const face = (x, y, s = 1, mood = 'happy') => `
    <g class="face" transform="translate(${x} ${y}) scale(${s})">
      <g class="eyes"><ellipse cx="-16" cy="0" rx="9" ry="12" fill="#fff" ${S} stroke-width="4"/><ellipse cx="16" cy="0" rx="9" ry="12" fill="#fff" ${S} stroke-width="4"/>
      <circle class="pupil" cx="-14" cy="2" r="4.5" fill="${INK}"/><circle class="pupil" cx="18" cy="2" r="4.5" fill="${INK}"/></g>
      ${mood === 'happy' ? `<path d="M-14 20 Q0 34 14 20" fill="none" ${S} stroke-width="4"/>` : `<path d="M-10 24 Q0 18 10 24" fill="none" ${S} stroke-width="4"/>`}
      <ellipse cx="-26" cy="16" rx="6" ry="3.5" fill="#ff8fa3" opacity=".7"/><ellipse cx="26" cy="16" rx="6" ry="3.5" fill="#ff8fa3" opacity=".7"/>
    </g>`;
  const windowRect = (x, y, w, h, c = '#bfeaff') => `<rect class="win" x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${c}" ${S} stroke-width="5"/><path d="M${x + w / 2} ${y}V${y + h}M${x} ${y + h / 2}H${x + w}" ${S} stroke-width="4"/>`;
  const sign = (x, y, txt, bg, w = 250) => `<g><rect x="${x - w / 2}" y="${y}" width="${w}" height="62" rx="14" fill="${bg}" ${S}/><text x="${x}" y="${y + 43}" text-anchor="middle" class="sign-t">${txt}</text></g>`;

  /* ---------- binalar ---------- */
  const B = [
    { id: 'ev', x: 330, href: t('hakkimda.html', 'about.html'), ep: 1, title: t('Hakkımda', 'About me'), label: t('Pembe ev · Hakkımda', 'Pink house · About me') },
    { id: 'atolye', x: 880, href: t('projeler.html', 'projects.html'), ep: 2, title: t('Projeler', 'Projects'), label: t('Boya atölyesi · Projeler', 'Paint studio · Projects') },
    { id: 'studyo', x: 1440, href: t('galeri.html', 'gallery.html'), ep: 3, title: t('Galeri', 'Gallery'), label: t('Fotoğraf stüdyosu · Galeri', 'Photo studio · Gallery') },
    { id: 'kutuphane', x: 2000, href: 'blog.html', ep: 4, title: 'Blog', label: t('Kitap kütüphanesi · Blog', 'Book library · Blog') },
    { id: 'postane', x: 2560, href: t('iletisim.html', 'contact.html'), ep: 5, title: t('İletişim', 'Contact'), label: t('Postane · İletişim', 'Post office · Contact') },
  ];
  const byHref = Object.fromEntries(B.map((b) => [b.href, b]));

  const house = (x) => `
    <g class="bld" data-b="ev" transform="translate(${x} 0)">
      <rect x="-40" y="${GROUND - 470}" width="44" height="110" fill="#c96a5a" ${S}/>
      <g class="smoke">${[0, 1, 2].map((i) => `<circle cx="-18" cy="${GROUND - 500 - i * 40}" r="${16 + i * 6}" fill="#fff" ${S} stroke-width="4" style="animation-delay:${i * .6}s"/>`).join('')}</g>
      <path d="M-200 ${GROUND - 300} L0 ${GROUND - 470} L200 ${GROUND - 300} Z" fill="#ff6f91" ${S}/>
      <rect x="-170" y="${GROUND - 300}" width="340" height="300" fill="#ffd1dc" ${S}/>
      ${windowRect(-140, GROUND - 260, 90, 90)}${windowRect(50, GROUND - 260, 90, 90)}
      <rect x="-45" y="${GROUND - 140}" width="90" height="140" rx="40" fill="#7a5cff" ${S}/><circle cx="25" cy="${GROUND - 70}" r="7" fill="#ffd36e" ${S} stroke-width="3"/>
      <circle cx="0" cy="${GROUND - 370}" r="34" fill="#fff" ${S}/>
      <image href="${IMG('avatar.jpg')}" x="-30" y="${GROUND - 400}" width="60" height="60" clip-path="url(#round)" preserveAspectRatio="xMidYMid slice"/>
      ${sign(0, GROUND + 20, t('HAKKIMDA', 'ABOUT ME'), '#ffd36e')}
    </g>`;

  const studio = (x) => `
    <g class="bld" data-b="atolye" transform="translate(${x} 0)">
      <rect x="-200" y="${GROUND - 380}" width="400" height="380" fill="#ff9f43" ${S}/>
      <path d="M-220 ${GROUND - 380} H220 L190 ${GROUND - 440} H-190 Z" fill="#e2582f" ${S}/>
      ${[-160, -80, 0, 80, 160].map((dx, i) => `<path class="drip" d="M${dx - 18} ${GROUND - 380} q18 ${50 + (i % 2) * 30} 36 0" fill="${['#7a5cff', '#1fb5a5', '#ffd36e', '#ff6f91', '#5ec2f2'][i]}" ${S} stroke-width="4"/>`).join('')}
      <rect x="-150" y="${GROUND - 320}" width="300" height="190" rx="10" fill="#fff" ${S}/>
      <image class="proj-img" href="${IMG('projeler/proje4-sonrasi.jpg')}" x="-138" y="${GROUND - 308}" width="276" height="166" preserveAspectRatio="xMidYMid meet"/>
      <rect x="-60" y="${GROUND - 110}" width="120" height="110" fill="#8a5a3c" ${S}/>
      <g class="bucket" transform="translate(160 ${GROUND - 70})"><path d="M-30 0 L-24 60 H24 L30 0 Z" fill="#5ec2f2" ${S} stroke-width="5"/><ellipse cx="0" cy="0" rx="30" ry="9" fill="#7a5cff" ${S} stroke-width="5"/></g>
      ${sign(0, GROUND + 20, t('PROJELER', 'PROJECTS'), '#ff6f91')}
    </g>`;

  const photoStudio = (x) => `
    <g class="bld" data-b="studyo" transform="translate(${x} 0)">
      <rect x="-190" y="${GROUND - 340}" width="380" height="340" fill="#1fb5a5" ${S}/>
      <rect x="-210" y="${GROUND - 370}" width="420" height="40" rx="12" fill="#fff3e0" ${S}/>
      <g class="camera" transform="translate(0 ${GROUND - 450})"><rect x="-70" y="-40" width="140" height="90" rx="16" fill="${INK}"/><rect x="-30" y="-60" width="50" height="28" rx="6" fill="${INK}"/>
        <circle cx="0" cy="5" r="32" fill="#9ad8f5" ${S}/><circle cx="0" cy="5" r="14" fill="${INK}"/><circle cx="48" cy="-22" r="8" fill="#ff6f91"/><circle class="flash" cx="-46" cy="-22" r="9" fill="#fff"/></g>
      <path d="M-180 ${GROUND - 300} Q0 ${GROUND - 250} 180 ${GROUND - 300}" fill="none" ${S} stroke-width="4"/>
      ${['galeri/bayburt.jpg', 'galeri/ortaokul.jpg', 'galeri/lise.jpg', 'galeri/universite.jpg'].map((p, i) => {
        const px = -150 + i * 92, py = GROUND - 292 + Math.abs(i - 1.5) * -10 + 22;
        return `<g class="polaroid" style="--r:${(i % 2 ? 1 : -1) * 6}deg" transform="translate(${px} ${py})"><rect x="0" y="0" width="80" height="96" fill="#fff" ${S} stroke-width="4"/><image href="${IMG(p)}" x="7" y="7" width="66" height="66" preserveAspectRatio="xMidYMid slice"/><rect x="34" y="-10" width="12" height="18" fill="#ffd36e" ${S} stroke-width="3"/></g>`;
      }).join('')}
      <rect x="-55" y="${GROUND - 120}" width="110" height="120" fill="#ffd36e" ${S}/>
      ${sign(0, GROUND + 20, t('GALERİ', 'GALLERY'), '#5ec2f2')}
    </g>`;

  const library = (x) => {
    const books = [['#7a5cff', 'Layer Comps', 'blog-layer-comps.html'], ['#e2582f', 'Image Stack', 'blog-image-stack.html'], ['#1fb5a5', t('Yapay Zeka', 'AI'), 'blog-yapay-zeka-ile-web-sitesi.html']];
    return `
    <g class="bld" data-b="kutuphane" transform="translate(${x} 0)">
      ${books.map(([c, n, href], i) => `
        <g class="book" data-href="${href}" data-label="${t('Kitap · ', 'Book · ')}${n}">
          <rect x="${-190 + i * 14}" y="${GROUND - 130 - i * 130}" width="${360 - i * 30}" height="130" rx="10" fill="${c}" ${S}/>
          <rect x="${-190 + i * 14}" y="${GROUND - 130 - i * 130}" width="34" height="130" rx="8" fill="#fff3e0" ${S} stroke-width="4"/>
          <text x="${-10 + i * 0}" y="${GROUND - 55 - i * 130}" text-anchor="middle" class="book-t">${n}</text>
        </g>`).join('')}
      <g class="bulb"><path d="M-10 ${GROUND - 395} h20 v20 h-20z" fill="#888" ${S} stroke-width="4"/><circle cx="0" cy="${GROUND - 420}" r="26" fill="#fff6a8" ${S}/></g>
      ${sign(0, GROUND + 20, 'BLOG', '#7a5cff')}
    </g>`;
  };

  const post = (x) => `
    <g class="bld" data-b="postane" transform="translate(${x} 0)">
      <rect x="-180" y="${GROUND - 330}" width="360" height="330" fill="#ffd36e" ${S}/>
      <path d="M-200 ${GROUND - 330} Q0 ${GROUND - 430} 200 ${GROUND - 330} Z" fill="#e23b3b" ${S}/>
      <g class="envelope" transform="translate(0 ${GROUND - 250})"><rect x="-80" y="-50" width="160" height="100" rx="8" fill="#fff" ${S}/><path d="M-80 -50 L0 15 L80 -50" fill="none" ${S}/><path class="heart" d="M0 30 c-14 -12 -26 -2 -16 8 l16 14 16 -14 c10 -10 -2 -20 -16 -8z" fill="#ff6f91" ${S} stroke-width="3"/></g>
      <rect x="-50" y="${GROUND - 130}" width="100" height="130" fill="#5ec2f2" ${S}/>
      <g class="mailbox" transform="translate(240 ${GROUND - 150})">
        <rect x="-6" y="40" width="12" height="110" fill="#8a5a3c" ${S} stroke-width="4"/>
        <path d="M-50 0 h100 v50 h-100z M-50 0 a50 30 0 0 1 100 0" fill="#1f6fd1" ${S}/>
        <g class="flag"><rect x="48" y="-30" width="6" height="60" fill="${INK}"/><rect x="54" y="-30" width="34" height="22" fill="#e23b3b" ${S} stroke-width="3"/></g>
      </g>
      ${sign(0, GROUND + 20, t('İLETİŞİM', 'CONTACT'), '#1fb5a5')}
    </g>`;

  /* ---------- karakterler: Lapi (laptop) ve Fırçı (fırça) ---------- */
  const lapi = `
    <g class="char lapi" data-char="lapi">
      <g class="bob">
        <path class="leg l1" d="M-30 40 v46" ${S} stroke-width="8"/><path class="leg l2" d="M30 40 v46" ${S} stroke-width="8"/>
        <ellipse cx="-34" cy="90" rx="18" ry="9" fill="#e2582f" ${S} stroke-width="5"/><ellipse cx="34" cy="90" rx="18" ry="9" fill="#e2582f" ${S} stroke-width="5"/>
        <rect x="-85" y="20" width="170" height="24" rx="8" fill="#c9ccd6" ${S}/>
        <rect x="-75" y="-110" width="150" height="132" rx="14" fill="#c9ccd6" ${S}/>
        <rect x="-62" y="-98" width="124" height="104" rx="8" fill="#2b3a67" ${S} stroke-width="4"/>
        ${face(0, -55, 1.1)}
        <path class="arm a1" d="M-80 -10 q-40 10 -50 -30" fill="none" ${S} stroke-width="7"/><path class="arm a2" d="M80 -10 q40 10 50 -30" fill="none" ${S} stroke-width="7"/>
      </g>
      <ellipse class="shadow" cx="0" cy="102" rx="70" ry="10" fill="rgba(0,0,0,.18)"/>
    </g>`;
  const firci = `
    <g class="char firci" data-char="firci">
      <g class="bob">
        <path class="leg l1" d="M-14 70 v36" ${S} stroke-width="7"/><path class="leg l2" d="M14 70 v36" ${S} stroke-width="7"/>
        <ellipse cx="-18" cy="110" rx="14" ry="7" fill="#7a5cff" ${S} stroke-width="4"/><ellipse cx="18" cy="110" rx="14" ry="7" fill="#7a5cff" ${S} stroke-width="4"/>
        <rect x="-26" y="-30" width="52" height="104" rx="18" fill="#ffd36e" ${S}/>
        <rect x="-32" y="-60" width="64" height="34" rx="8" fill="#c9ccd6" ${S}/>
        <path class="bristle" d="M-34 -60 Q-40 -120 0 -150 Q40 -120 34 -60 Z" fill="#ff6f91" ${S}/>
        ${face(0, 10, 0.85)}
        <path class="arm a1" d="M-26 20 q-34 0 -40 -30" fill="none" ${S} stroke-width="6"/><path class="arm a2" d="M26 20 q34 0 40 -30" fill="none" ${S} stroke-width="6"/>
      </g>
      <ellipse class="shadow" cx="0" cy="118" rx="44" ry="8" fill="rgba(0,0,0,.18)"/>
    </g>`;

  /* ---------- sahne ---------- */
  const trees = [140, 610, 1170, 1720, 2280, 2860].map((x, i) => `
    <g class="tree" data-tree="${i}" transform="translate(${x} ${GROUND})">
      <rect x="-14" y="-150" width="28" height="150" fill="#9a6b42" ${S} stroke-width="5"/>
      <g class="crown"><circle cx="0" cy="-200" r="80" fill="${i % 2 ? '#5ec27a' : '#4fb46a'}" ${S}/><circle cx="-50" cy="-160" r="50" fill="${i % 2 ? '#5ec27a' : '#4fb46a'}" ${S}/><circle cx="50" cy="-165" r="52" fill="${i % 2 ? '#5ec27a' : '#4fb46a'}" ${S}/>
      ${[[-30, -210], [25, -180], [10, -240]].map(([ax, ay]) => `<circle class="apple" cx="${ax}" cy="${ay}" r="11" fill="#e23b3b" ${S} stroke-width="3"/>`).join('')}</g>
    </g>`).join('');
  const clouds = [[300, 140, 1], [1000, 90, 1.3], [1700, 160, .9], [2400, 110, 1.15]].map(([x, y, s], i) => `
    <g class="cloud" data-cloud="${i}" style="--d:${30 + i * 8}s" transform="translate(${x} ${y}) scale(${s})">
      <path d="M-90 30 a40 40 0 0 1 30 -60 a55 55 0 0 1 100 0 a40 40 0 0 1 50 60 z" fill="#fff" ${S}/>
      ${face(0, 10, 0.55)}
      <g class="rain">${[-50, -20, 10, 40].map((dx, k) => `<path d="M${dx} 50 l-6 26" stroke="#5ec2f2" stroke-width="6" stroke-linecap="round" style="animation-delay:${k * .12}s"/>`).join('')}</g>
    </g>`).join('');
  const stars = Array.from({ length: 50 }, (_, i) => `<circle cx="${(i * 613) % W}" cy="${(i * 97) % 420 + 20}" r="${2 + (i % 3)}" fill="#fff"/>`).join('');

  stage.innerHTML = `
  <svg class="world" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${t('Şevval Show çizgi film dünyası', 'Şevval Show cartoon world')}">
    <defs>
      <clipPath id="round"><circle cx="0" cy="${GROUND - 370}" r="30"/></clipPath>
      <filter id="boil"><feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="2" seed="1" result="n"/><feDisplacementMap in="SourceGraphic" in2="n" scale="4"/></filter>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fd4ff"/><stop offset="1" stop-color="#d8f3ff"/></linearGradient>
      <linearGradient id="skyN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#151a46"/><stop offset="1" stop-color="#3b2f6e"/></linearGradient>
    </defs>
    <rect class="sky-d" width="${W}" height="${H}" fill="url(#sky)"/>
    <rect class="sky-n" width="${W}" height="${H}" fill="url(#skyN)"/>
    <g class="stars">${stars}</g>
    <g class="sun" data-sun transform="translate(2750 150)">
      <g class="rays">${Array.from({ length: 12 }, (_, i) => `<path d="M0 -105 v-30" ${S} stroke="#ffb000" stroke-width="10" transform="rotate(${i * 30})"/>`).join('')}</g>
      <circle r="88" fill="#ffd36e" ${S}/>${face(0, 0, 1.2)}
    </g>
    <g class="moon" data-sun transform="translate(2750 150)"><circle r="78" fill="#fff6d6" ${S}/><circle cx="-24" cy="-18" r="12" fill="#efe3b8"/><circle cx="22" cy="20" r="9" fill="#efe3b8"/>${face(6, 6, 0.9)}</g>
    <g class="clouds">${clouds}</g>
    <g class="boil">
      <path d="M0 ${GROUND - 120} Q300 ${GROUND - 300} 700 ${GROUND - 160} T1500 ${GROUND - 180} T2300 ${GROUND - 150} T3000 ${GROUND - 200} V${H} H0 Z" fill="#9fe08a" ${S} opacity=".9"/>
      <path d="M0 ${GROUND - 60} Q500 ${GROUND - 180} 1000 ${GROUND - 80} T2000 ${GROUND - 90} T3000 ${GROUND - 70} V${H} H0 Z" fill="#7ccf6c" ${S}/>
      ${trees}
      ${house(B[0].x)}${studio(B[1].x)}${photoStudio(B[2].x)}${library(B[3].x)}${post(B[4].x)}
      <rect x="-10" y="${GROUND}" width="${W + 20}" height="40" fill="#d9d4cf" ${S}/>
      <rect x="-10" y="${GROUND + 40}" width="${W + 20}" height="${H - GROUND}" fill="#575a6b" ${S}/>
      ${Array.from({ length: 30 }, (_, i) => `<rect x="${i * 110 + 20}" y="${GROUND + 125}" width="60" height="12" rx="6" fill="#ffd36e"/>`).join('')}
    </g>
    <g class="cast">${lapi}${firci}</g>
  </svg>`;

  const svg = stage.querySelector('svg');
  const $ = (s) => svg.querySelector(s);
  const lapiEl = $('.lapi'), firciEl = $('.firci');

  /* ---------- karakter hareketi ---------- */
  const HOME_X = innerWidth >= 980 ? 760 : 380;
  const pos = { lapi: HOME_X + 90, firci: HOME_X - 40 };
  let walkingTo = null;
  function place() {
    lapiEl.setAttribute('transform', `translate(${pos.lapi} ${GROUND + 70}) scale(${dir.lapi} 1)`);
    firciEl.setAttribute('transform', `translate(${pos.firci} ${GROUND + 60}) scale(${dir.firci} 1)`);
  }
  const dir = { lapi: 1, firci: 1 };
  function walkTo(x) {
    return new Promise((res) => {
      walkingTo = { x, res };
      svg.classList.add('walking');
    });
  }
  let last = performance.now(), stepT = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (walkingTo) {
      const targets = { lapi: walkingTo.x + 90, firci: walkingTo.x - 40 };
      let done = true;
      ['lapi', 'firci'].forEach((k) => {
        const d = targets[k] - pos[k];
        if (Math.abs(d) > 6) { done = false; const sp = reduce ? 1e5 : 900; pos[k] += Math.sign(d) * Math.min(Math.abs(d), sp * dt); dir[k] = d > 0 ? 1 : -1; }
      });
      stepT += dt; if (stepT > 0.18) { stepT = 0; SFX.step(); }
      if (done) { const r = walkingTo.res; walkingTo = null; svg.classList.remove('walking'); r(); }
      follow(pos.lapi);
    }
    place();
    requestAnimationFrame(frame);
  }

  /* ---------- kaydırma (sürükle, tekerlek, dokunma) ---------- */
  const scale = () => stage.clientHeight / H;
  function follow(x) {
    const sheetW = sheetOpen && innerWidth >= 980 ? Math.min(600, innerWidth * 0.46) + 32 : 0;
    const visible = innerWidth - sheetW;
    const target = x * scale() - visible / 2;
    stage.scrollLeft = target;
  }
  let drag = null;
  stage.addEventListener('pointerdown', (e) => { if (e.pointerType === 'mouse') drag = { x: e.clientX, s: stage.scrollLeft, moved: false }; });
  addEventListener('pointermove', (e) => { if (drag) { const dx = e.clientX - drag.x; if (Math.abs(dx) > 4) drag.moved = true; stage.scrollLeft = drag.s - dx; } });
  addEventListener('pointerup', () => { setTimeout(() => (drag = null), 0); });
  stage.addEventListener('wheel', (e) => { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { stage.scrollLeft += e.deltaY; e.preventDefault(); } }, { passive: false });

  /* ---------- üzerine gelme ve tıklama ---------- */
  const hotOf = (el) => el.closest('.book, .bld, .char, [data-sun], .cloud, .tree, .mailbox');
  const labelOf = (h) => {
    if (h.classList.contains('book')) return h.dataset.label;
    if (h.classList.contains('bld')) return B.find((b) => b.id === h.dataset.b).label;
    if (h.classList.contains('lapi')) return t('Lapi · dürt', 'Lapi · poke');
    if (h.classList.contains('firci')) return t('Fırçı · dürt', 'Fırçı · poke');
    if (h.matches('[data-sun]')) return night ? t('Ay · sabah olsun', 'Moon · make it morning') : t('Güneş · gece olsun', 'Sun · make it night');
    if (h.classList.contains('cloud')) return t('Bulut · yağmur yağdır', 'Cloud · make it rain');
    if (h.classList.contains('tree')) return t('Ağaç · salla', 'Tree · shake it');
    if (h.classList.contains('mailbox')) return t('Posta kutusu', 'Mailbox');
    return '';
  };
  let hov = null;
  svg.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    const h = hotOf(e.target);
    if (h !== hov) { hov && hov.classList.remove('hover'); hov = h; h && h.classList.add('hover'); }
    if (h) { tip.textContent = labelOf(h); tip.hidden = false; tip.style.transform = `translate(${e.clientX + 16}px, ${e.clientY + 16}px)`; } else tip.hidden = true;
  });
  svg.addEventListener('pointerleave', () => { tip.hidden = true; hov && hov.classList.remove('hover'); hov = null; });

  const JOKES = {
    lapi: [t('Şarjım %100, enerjim %200!', 'Battery 100%, energy 200%!'), t('Ctrl+Z ile dünü geri alabilsem…', 'If only Ctrl+Z worked on yesterday…'), t('Bana dokunma, güncelleme yapıyorum!', "Don't touch, I'm updating!"), t('Bu sitede 0 hata var. Şimdilik.', 'This site has 0 bugs. For now.')],
    firci: [t('Bir katman daha ekleyelim mi?', 'Shall we add one more layer?'), t('Ben renklendiririm, sen kaydet!', 'I paint, you hit save!'), t('Pembe her şeye yakışır.', 'Pink goes with everything.'), t('Fırçam saçım, saçım fırçam.', 'My bristles are my hairdo.')],
  };
  let jokeI = 0;
  function say(text, x, y) {
    const b = document.querySelector('[data-bubble]');
    b.textContent = text; b.hidden = false; b.style.transform = `translate(${x - 30}px, ${y - 80}px)`;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
    clearTimeout(say.t); say.t = setTimeout(() => (b.hidden = true), 2000);
  }
  const bump = (el, cls = 'jump', ms = 700) => { el.classList.remove(cls); void el.getBoundingClientRect(); el.classList.add(cls); setTimeout(() => el.classList.remove(cls), ms); };

  svg.addEventListener('click', (e) => {
    if (drag && drag.moved) return;
    const h = hotOf(e.target); if (!h) return;
    const x = e.clientX, y = e.clientY;
    if (h.classList.contains('book')) { SFX.pop(); window.RoomUI.open(h.dataset.href); return; }
    if (h.classList.contains('bld')) { SFX.pop(); window.RoomUI.open(B.find((b) => b.id === h.dataset.b).href); return; }
    if (h.classList.contains('char')) { const k = h.dataset.char; SFX.boing(); bump(h); say(JOKES[k][jokeI++ % JOKES[k].length], x, y); return; }
    if (h.matches('[data-sun]')) { setNight(!night); SFX.ding(); say(night ? t('İyi geceler! 🌙', 'Good night! 🌙') : t('Günaydın! ☀️', 'Good morning! ☀️'), x, y); return; }
    if (h.classList.contains('cloud')) { SFX.whoosh(); bump(h, 'raining', 2200); return; }
    if (h.classList.contains('tree')) { SFX.drop(); bump(h, 'shake', 1200); return; }
    if (h.classList.contains('mailbox')) { SFX.ding(); bump(h, 'mail', 1400); say(t('Yeni mesaj var mı? 📬', 'Any new mail? 📬'), x, y); }
  });

  /* proje penceresinde projeler sırayla */
  const PROJ = ['proje4-sonrasi.jpg', 'proje1-sonrasi.jpg', 'proje2-sonrasi.jpg', 'proje3-sonrasi.jpg', 'proje5.jpg', 'proje6-sonrasi.jpg'];
  let pi = 0; setInterval(() => { pi = (pi + 1) % PROJ.length; $('.proj-img').setAttribute('href', IMG('projeler/' + PROJ[pi])); }, 2400);

  /* ---------- gece / gündüz ---------- */
  let night = false;
  function setNight(n) { night = n; doc.classList.toggle('night', n); svg.classList.toggle('is-night', n); }

  /* ---------- "kaynayan" çizgiler (çizgi film titremesi) ---------- */
  if (!reduce && innerWidth > 700) { let sd = 1; const turb = svg.querySelector('#boil feTurbulence'); svg.querySelector('.boil').setAttribute('filter', 'url(#boil)'); setInterval(() => { sd = (sd % 3) + 1; turb.setAttribute('seed', sd); }, 160); }

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

  /* ---------- arayüze açılan bağlantılar ---------- */
  let sheetOpen = false, first = true;
  window.RoomScene = {
    focus(href) {
      const key = href.split('/').pop().split('?')[0] || 'index.html';
      let b = byHref[key];
      if (!b && /^blog-|^yazi/.test(key)) b = byHref['blog.html'];
      if (!b) { walkTo(HOME_X).then(() => follow(pos.lapi)); first = false; return; }
      if (first) { pos.lapi = b.x + 90; pos.firci = b.x - 40; place(); follow(pos.lapi); first = false; return; }
      episode(b);
      walkTo(b.x).then(() => { bump(lapiEl); bump(firciEl); });
    },
    home() { walkTo(HOME_X); },
    setSheet(open) { sheetOpen = open; setTimeout(() => follow(pos.lapi), 50); },
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
      t('Lapi: Postaneden Şevval\'e mesaj atabilirsin. Görüşürüz!', 'Lapi: Send Şevval a message from the post office. Bye!'),
    ];
    for (let i = 0; i < B.length && touring; i++) {
      window.RoomUI.caption(lines[i]);
      await walkTo(B[i].x);
      bump(lapiEl); SFX.boing();
      await new Promise((r) => setTimeout(r, 2600));
    }
    touring = false; window.RoomUI.caption(''); btn && btn.setAttribute('aria-pressed', 'false');
  }

  const hr = new Date().getHours(); if (hr >= 19 || hr < 6) setNight(true);
  place(); requestAnimationFrame((n) => { last = n; frame(n); });
  setTimeout(() => follow(pos.lapi), 30);
  addEventListener('resize', () => follow(pos.lapi));
  doc.classList.add('room-ready');
  window.dispatchEvent(new Event('room:ready'));
})();
