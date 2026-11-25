'use strict';

/* Şevval Çikot — Uzay yolculuğu teması
   Kaydırmak = uzaya yükselmek. Yüksekliğe göre gökyüzü rengi, mesafe göstergesi,
   bulutsu (nebula) ışığı, yıldız tozu, imleçten kaçan yıldız sürüsü, kayan yıldızlar,
   derin uzayda el feneri, roketle mesaj. Dokunmatik ve "hareketi azalt" durumlarında sadeleşir. */

(() => {
  const doc = document.documentElement;
  const body = document.body;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isEN = doc.lang === 'en';
  const lerp = (a, b, t) => a + (b - a) * t;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const DPR = Math.min(window.devicePixelRatio || 1, 2);

  /* ---------- imleç ---------- */
  const mouse = { x: -9999, y: -9999, vx: 0, vy: 0, t: 0 };
  addEventListener('pointermove', (e) => {
    const now = performance.now();
    const dt = Math.max(16, now - mouse.t);
    mouse.vx = (e.clientX - mouse.x) / dt * 16;
    mouse.vy = (e.clientY - mouse.y) / dt * 16;
    if (mouse.x < -999) { mouse.vx = 0; mouse.vy = 0; }
    mouse.x = e.clientX; mouse.y = e.clientY; mouse.t = now;
    doc.style.setProperty('--mx', mouse.x + 'px');
    doc.style.setProperty('--my', mouse.y + 'px');
  }, { passive: true });

  /* ---------- 1. derinlik: deniz rengi, gösterge, fener ---------- */
  const STOPS = [   // yükseklik, üst renk, alt renk (alacakaranlıktan derin uzaya)
    [0.00, [36, 28, 92], [196, 92, 120]],
    [0.25, [22, 18, 70], [70, 40, 110]],
    [0.50, [12, 10, 46], [30, 18, 70]],
    [0.75, [6, 6, 26], [14, 10, 40]],
    [1.00, [2, 2, 10], [6, 4, 18]],
  ];
  const mix = (a, b, t) => a.map((v, i) => Math.round(lerp(v, b[i], t)));
  const seaAt = (d) => {
    for (let i = 0; i < STOPS.length - 1; i++) {
      const [d0, t0, b0] = STOPS[i]; const [d1, t1, b1] = STOPS[i + 1];
      if (d <= d1) { const t = (d - d0) / (d1 - d0); return [mix(t0, t1, t), mix(b0, b1, t)]; }
    }
    return [STOPS[4][1], STOPS[4][2]];
  };
  const base = parseFloat(body.dataset.depth || '0');
  const span = parseFloat(body.dataset.span || '1');
  const meterEl = document.querySelector('[data-meter]');
  const tempEl = document.querySelector('[data-temp]');
  const surface = document.querySelector('.surface');
  const titleWrap = document.querySelector('.title-wrap');
  let depth = 0;

  const onScroll = () => {
    const max = doc.scrollHeight - innerHeight;
    const p = max > 0 ? scrollY / max : 0;
    depth = clamp(base + p * span, 0, 1);
    doc.style.setProperty('--d', depth.toFixed(4));
    const [top, bot] = seaAt(depth);
    doc.style.setProperty('--sea-top', `rgb(${top})`);
    doc.style.setProperty('--sea-bot', `rgb(${bot})`);
    if (meterEl) meterEl.textContent = Math.round(depth * 384400).toLocaleString(isEN ? 'en-US' : 'tr-TR') + ' km';
    if (tempEl) tempEl.textContent = Math.round(15 - depth * 285) + ' °C';
    body.classList.toggle('deep', depth > 0.62);

    // yüzey: dalarken su çizgisi yukarı çıkar, başlık giderek suya gömülür
    if (surface && titleWrap && scrollY < surface.offsetHeight * 1.2) {
      const h = surface.offsetHeight;
      const sp = clamp(scrollY / h, 0, 1);
      const wl = (reduce ? 0.6 : 0.6 - sp * 0.75) * h;
      surface.style.setProperty('--wl', wl + 'px');
      const tr = titleWrap.getBoundingClientRect();
      const sr = surface.getBoundingClientRect();
      titleWrap.style.setProperty('--cut', clamp(sr.top + wl - tr.top, 0, tr.height) + 'px');
    }
  };
  addEventListener('scroll', () => requestAnimationFrame(onScroll), { passive: true });
  addEventListener('resize', onScroll);

  /* ---------- 2. başlık harfleri + suyun altındaki kopya ---------- */
  const split = (h, label) => {
    if (label) h.setAttribute('aria-label', h.textContent.replace(/\s+/g, ' ').trim());
    let i = 0;
    const walk = (node) => {
      [...node.childNodes].forEach((n) => {
        if (n.nodeType === 3) {
          const frag = document.createDocumentFragment();
          n.textContent.split(/(\s+)/).forEach((part) => {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(' ')); return; }
            const w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
            [...part].forEach((ch) => {
              const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch;
              s.style.setProperty('--i', i++); w.appendChild(s);
            });
            frag.appendChild(w);
          });
          n.replaceWith(frag);
        } else if (n.nodeType === 1 && n.tagName !== 'BR') walk(n);
      });
    };
    walk(h); h.classList.add('split');
  };
  document.querySelectorAll('.surface h1, .page-hero h1').forEach((h) => {
    const wet = h.parentElement.querySelector('.wet');
    split(h, true);
    if (wet) split(wet, false);
    if (!reduce) requestAnimationFrame(() => { h.classList.add('in'); if (wet) wet.classList.add('in'); });
  });
  onScroll();

  /* ---------- 3. kostik ışık (düşük çözünürlüklü tuval, büyütülüp bulanıklaştırılır) ---------- */
  const caus = document.querySelector('.caustics');
  let causDraw = null;
  if (caus) {
    const W = 112, H = 72;
    caus.width = W; caus.height = H;
    const c = caus.getContext('2d');
    const img = c.createImageData(W, H);
    causDraw = (t) => {
      const d = img.data;
      for (let y = 0; y < H; y++) {
        const v = y / H * 5;
        for (let x = 0; x < W; x++) {
          const u = x / W * 7.5;
          const s = Math.sin(u * 1.7 + t * 0.9 + Math.sin(v * 2.1 - t * 0.6))
                  + Math.sin(v * 1.9 - t * 0.7 + Math.sin(u * 1.3 + t * 0.5))
                  + Math.sin((u + v) * 1.15 + t * 0.45);
          let k = 1 - Math.abs(s) / 2.4;
          k = k < 0 ? 0 : k * k;
          const o = (y * W + x) * 4;
          d[o] = 150 + (x / W) * 100; d[o + 1] = 110 + (y / H) * 60; d[o + 2] = 255; d[o + 3] = k * 150;
        }
      }
      c.putImageData(img, 0, 0);
    };
  }

  /* ---------- 4. kabarcıklar, balıklar, halkalar (tek tuval) ---------- */
  const fx = document.querySelector('.fx');
  const ctx = fx && fx.getContext('2d');
  let W = 0, H = 0;
  const size = () => {
    if (!fx) return;
    W = innerWidth; H = innerHeight;
    fx.width = W * DPR; fx.height = H * DPR;
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  };
  size(); addEventListener('resize', size);

  const bubbles = [];
  const ripples = [];
  const shooting = [];
  const addBubble = (x, y, r, vy) => {
    if (bubbles.length > 160) bubbles.shift();
    bubbles.push({ x, y, r, vy, ph: Math.random() * 6.28, w: 0.6 + Math.random() * 1.2 });
  };
  for (let i = 0; i < 26; i++) addBubble(Math.random() * innerWidth, Math.random() * innerHeight, 1 + Math.random() * 3.5, 0.3 + Math.random() * 0.8);

  const FISH_N = innerWidth < 700 ? 9 : 16;
  const fish = Array.from({ length: FISH_N }, (_, i) => ({
    x: Math.random() * innerWidth, y: innerHeight * (0.25 + Math.random() * 0.5),
    vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5), s: 0.7 + Math.random() * 0.7, ph: Math.random() * 6.28, k: i,
  }));

  if (fine) {
    addEventListener('pointermove', () => {
      const sp = Math.hypot(mouse.vx, mouse.vy);
      if (Math.random() < Math.min(0.7, sp / 25)) addBubble(mouse.x + (Math.random() - 0.5) * 10, mouse.y, 1.5 + Math.random() * 3, 0.8 + Math.random());
    }, { passive: true });
  }
  addEventListener('pointerdown', (e) => {
    ripples.push({ x: e.clientX, y: e.clientY, r: 4, a: 0.6 });
    for (let i = 0; i < 10; i++) addBubble(e.clientX + (Math.random() - 0.5) * 30, e.clientY + (Math.random() - 0.5) * 20, 1.5 + Math.random() * 4, 1 + Math.random() * 1.6);
  }, { passive: true });

  const drawFrame = (t, dt) => {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    const deep = depth > 0.6;

    // rastgele yeni kabarcık
    if (Math.random() < 0.18) addBubble(Math.random() * W, -10, 1 + Math.random() * 3.5, 0.15 + Math.random() * 0.35);
    // kayan yıldız
    if (Math.random() < 0.006) shooting.push({ x: Math.random() * W * 0.8, y: Math.random() * H * 0.4, vx: 9 + Math.random() * 6, vy: 3 + Math.random() * 3, a: 1 });
    for (let i = shooting.length - 1; i >= 0; i--) {
      const s = shooting[i]; s.x += s.vx * dt; s.y += s.vy * dt; s.a -= 0.012 * dt;
      if (s.a <= 0) { shooting.splice(i, 1); continue; }
      const g = ctx.createLinearGradient(s.x - s.vx * 12, s.y - s.vy * 12, s.x, s.y);
      g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(1, `rgba(255,255,255,${s.a})`);
      ctx.strokeStyle = g; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(s.x - s.vx * 12, s.y - s.vy * 12); ctx.lineTo(s.x, s.y); ctx.stroke();
    }

    // kabarcıklar
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y += b.vy * dt * (1 + b.r * 0.08);
      b.ph += 0.05 * dt;
      const x = b.x + Math.sin(b.ph) * b.w * 3;
      if (b.y > H + 20) { bubbles.splice(i, 1); continue; }
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(b.ph * 2));
      ctx.fillStyle = `rgba(255,${230 + (b.r * 6 | 0)},${200 + (b.r * 15 | 0)},${tw})`;
      ctx.beginPath(); ctx.arc(x, b.y, b.r * 0.45, 0, 6.283); ctx.fill();
      if (b.r > 2.6) { ctx.strokeStyle = `rgba(255,255,255,${tw * 0.5})`; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(x - b.r * 1.6, b.y); ctx.lineTo(x + b.r * 1.6, b.y); ctx.moveTo(x, b.y - b.r * 1.6); ctx.lineTo(x, b.y + b.r * 1.6); ctx.stroke(); }
    }

    // balık sürüsü: gezinen bir hedefi izler, imleçten kaçar
    const tx = W * (0.5 + 0.38 * Math.sin(t * 0.00011)), ty = H * (0.5 + 0.28 * Math.sin(t * 0.00017 + 1));
    fish.forEach((f, i) => {
      let ax = (tx - f.x) * 0.00008 + Math.sin(t * 0.001 + f.k) * 0.01, ay = (ty - f.y) * 0.00008;
      for (let j = 0; j < fish.length; j++) {             // ayrışma
        if (j === i) continue;
        const dx = f.x - fish[j].x, dy = f.y - fish[j].y, dd = dx * dx + dy * dy;
        if (dd < 900 && dd > 0) { ax += dx / dd * 0.6; ay += dy / dd * 0.6; }
      }
      const mx = f.x - mouse.x, my = f.y - mouse.y, md = Math.hypot(mx, my);
      if (md < 160) { ax += mx / md * 0.5; ay += my / md * 0.5; }   // kaç!
      f.vx = clamp((f.vx + ax * dt) * 0.99, -4, 4);
      f.vy = clamp((f.vy + ay * dt) * 0.99, -2.5, 2.5);
      const sp = Math.hypot(f.vx, f.vy);
      if (sp < 0.6) { f.vx *= 0.6 / (sp || 1); f.vy *= 0.6 / (sp || 1); }
      f.x += f.vx * dt; f.y += f.vy * dt;
      if (f.x < -40) f.x = W + 40; if (f.x > W + 40) f.x = -40;
      f.y = clamp(f.y, 40, H - 40);
      f.ph += (0.15 + sp * 0.08) * dt;

      const ang = Math.atan2(f.vy, f.vx), L = 16 * f.s;
      ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(ang);
      {                                               // kuyruklu küçük yıldızlar
        const g = ctx.createLinearGradient(-L * 1.6, 0, 0, 0);
        g.addColorStop(0, 'rgba(160,140,255,0)'); g.addColorStop(1, deep ? 'rgba(140,255,240,0.55)' : 'rgba(255,190,230,0.55)');
        ctx.strokeStyle = g; ctx.lineWidth = 1.6 * f.s; ctx.beginPath(); ctx.moveTo(-L * 1.6, 0); ctx.lineTo(0, 0); ctx.stroke();
        ctx.shadowColor = deep ? 'rgba(120,255,240,0.95)' : 'rgba(255,200,240,0.95)'; ctx.shadowBlur = 10;
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 1.7 * f.s, 0, 6.283); ctx.fill();
      }
      ctx.restore();
    });

    // tıklama halkaları
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i];
      r.r += 2.2 * dt; r.a -= 0.012 * dt;
      if (r.a <= 0) { ripples.splice(i, 1); continue; }
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, 6.283);
      ctx.strokeStyle = `rgba(200,170,255,${r.a})`; ctx.lineWidth = 2; ctx.stroke();
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * 0.6, 0, 6.283);
      ctx.strokeStyle = `rgba(255,190,230,${r.a * 0.6})`; ctx.lineWidth = 1; ctx.stroke();
    }
  };

  let last = performance.now(), causT = 0, running = true;
  document.addEventListener('visibilitychange', () => {
    running = !document.hidden;
    if (running) { last = performance.now(); requestAnimationFrame(loop); }
  });
  function loop(now) {
    if (!running) return;
    const dt = Math.min(3, (now - last) / 16.67); last = now;
    if (causDraw && now - causT > 50 && depth < 0.75) { causDraw(now / 1000); causT = now; }   // ~25 fps yeterli
    drawFrame(now, dt);
    requestAnimationFrame(loop);
  }
  if (reduce) { if (causDraw) causDraw(2); drawFrame(0, 0); }
  else requestAnimationFrame(loop);

  /* ---------- 5. özel imleç (kabarcık) ---------- */
  const cursor = document.querySelector('.cursor');
  if (fine && cursor && !reduce) {
    body.classList.add('has-cursor');
    const dot = cursor.querySelector('.cursor-dot');
    const ring = cursor.querySelector('.cursor-ring');
    const label = ring.querySelector('em');
    const r = { x: innerWidth / 2, y: innerHeight / 2 };
    const tick = () => {
      r.x = lerp(r.x, mouse.x, 0.16); r.y = lerp(r.y, mouse.y, 0.16);
      dot.style.transform = `translate(${mouse.x}px, ${mouse.y}px)`;
      ring.style.transform = `translate(${r.x}px, ${r.y}px)`;
      requestAnimationFrame(tick);
    };
    tick();
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor], [data-lb], a, button, input, textarea, label');
      cursor.classList.toggle('hover', !!t);
      let txt = '';
      if (t && t.dataset.cursor) txt = t.dataset.cursor;
      else if (t && t.hasAttribute('data-lb')) txt = isEN ? 'Open' : 'Aç';
      label.textContent = txt; cursor.classList.toggle('label', !!txt);
    });
    document.addEventListener('pointerdown', () => cursor.classList.add('down'));
    document.addEventListener('pointerup', () => cursor.classList.remove('down'));
    document.addEventListener('mouseleave', () => cursor.classList.add('gone'));
    document.addEventListener('mouseenter', () => cursor.classList.remove('gone'));

    document.querySelectorAll('.btn, .lang, .footer-meta a').forEach((el) => {   // mıknatıs
      el.classList.add('magnet');
      el.addEventListener('pointermove', (e) => {
        const b = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - b.left - b.width / 2) * 0.28}px, ${(e.clientY - b.top - b.height / 2) * 0.38}px)`;
      });
      el.addEventListener('pointerleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------- 6. proje dizini: imleci izleyen, suyla kırılan önizleme ---------- */
  const rows = document.querySelectorAll('.prow');
  if (rows.length && fine && !reduce) {
    const fp = document.createElement('div');
    fp.className = 'float-preview'; fp.setAttribute('aria-hidden', 'true'); fp.innerHTML = '<img alt="">';
    body.appendChild(fp);
    const im = fp.querySelector('img');
    const p = { x: 0, y: 0, r: 0 }; let on = false;
    const tick = () => {
      p.x = lerp(p.x, mouse.x, 0.12); p.y = lerp(p.y, mouse.y, 0.12);
      p.r = lerp(p.r, clamp(mouse.vx * 0.8, -10, 10), 0.08);
      fp.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%) rotate(${p.r}deg)`;
      if (on) requestAnimationFrame(tick);
    };
    rows.forEach((row) => {
      row.addEventListener('pointerenter', () => {
        im.src = row.dataset.preview; fp.classList.add('show');
        if (!on) { on = true; p.x = mouse.x; p.y = mouse.y; tick(); }
      });
      row.addEventListener('pointerleave', () => { fp.classList.remove('show'); on = false; });
    });
  }

  /* ---------- 7. akıntı şeridi: sürükle, bırak, süzülsün ---------- */
  document.querySelectorAll('[data-throw]').forEach((strip) => {
    const track = strip.querySelector('.strip-track');
    const items = [...track.children];
    let x = 0, v = 0, down = false, sx = 0, ox = 0, lastX = 0, lastT = 0, moved = 0;
    const bounds = () => Math.min(0, strip.clientWidth - track.scrollWidth);
    const render = () => {
      track.style.transform = `translate3d(${x}px,0,0)`;
      const sk = reduce ? 0 : clamp(v * 0.5, -8, 8);
      items.forEach((it) => { it.style.transform = `skewX(${-sk}deg) rotate(${sk * 0.3}deg)`; });
    };
    const glide = () => {
      if (down) return;
      const min = bounds();
      v *= 0.95; x += v;
      if (x > 0) { x = lerp(x, 0, 0.16); v *= 0.6; }
      if (x < min) { x = lerp(x, min, 0.16); v *= 0.6; }
      render();
      if (Math.abs(v) > 0.05 || x > 0.5 || x < min - 0.5) requestAnimationFrame(glide); else { v = 0; render(); }
    };
    strip.addEventListener('pointerdown', (e) => {
      down = true; moved = 0; sx = e.clientX; ox = x; lastX = e.clientX; lastT = performance.now(); v = 0;
      strip.classList.add('grabbing');
    });
    addEventListener('pointermove', (e) => {
      if (!down) return;
      const dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx));
      if (moved > 6 && !strip.hasPointerCapture(e.pointerId)) strip.setPointerCapture(e.pointerId);
      const min = bounds();
      let nx = ox + dx;
      if (nx > 0) nx *= 0.35;
      if (nx < min) nx = min + (nx - min) * 0.35;
      const now = performance.now();
      v = (e.clientX - lastX) / Math.max(8, now - lastT) * 16; lastX = e.clientX; lastT = now; x = nx;
      render();
    });
    const up = () => { if (!down) return; down = false; strip.classList.remove('grabbing'); requestAnimationFrame(glide); };
    addEventListener('pointerup', up); addEventListener('pointercancel', up);
    strip.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight') { v = -18; requestAnimationFrame(glide); }
      if (e.key === 'ArrowLeft') { v = 18; requestAnimationFrame(glide); }
    });
    addEventListener('resize', () => { x = clamp(x, bounds(), 0); render(); });
  });

  /* ---------- 8. galeri: imleç suyu iter, kareler açılır ---------- */
  document.querySelectorAll('[data-repel]').forEach((grid) => {
    if (!fine || reduce) return;
    const items = [...grid.children];
    const st = items.map(() => ({ x: 0, y: 0, tx: 0, ty: 0 }));
    let active = false, running = false;
    const step = () => {
      let e = 0;
      items.forEach((it, k) => {
        const s = st[k];
        s.x = lerp(s.x, s.tx, 0.1); s.y = lerp(s.y, s.ty, 0.1);
        e += Math.abs(s.x - s.tx) + Math.abs(s.y - s.ty) + Math.abs(s.x) + Math.abs(s.y);
        it.style.transform = `translate(${s.x.toFixed(2)}px, ${s.y.toFixed(2)}px)`;
      });
      if (active || e > 0.2) requestAnimationFrame(step); else running = false;
    };
    const aim = () => {
      const reach = Math.max(innerWidth, innerHeight) * 0.75;
      items.forEach((it, k) => {
        const b = it.getBoundingClientRect();
        const cx = b.left + b.width / 2 - st[k].x, cy = b.top + b.height / 2 - st[k].y;
        const dx = cx - mouse.x, dy = cy - mouse.y, d = Math.hypot(dx, dy) || 1;
        const inside = mouse.x > b.left && mouse.x < b.right && mouse.y > b.top && mouse.y < b.bottom;
        const f = inside ? 0 : Math.max(0, 1 - d / reach) * 48;
        st[k].tx = active ? dx / d * f : 0; st[k].ty = active ? dy / d * f : 0;
      });
    };
    grid.addEventListener('pointermove', () => { active = true; aim(); if (!running) { running = true; step(); } });
    grid.addEventListener('pointerleave', () => { active = false; aim(); if (!running) { running = true; step(); } });
  });

  /* ---------- 9. pencere: tıklanan yerden su halkası gibi açılır ---------- */
  const lbBox = document.querySelector('.lb-box');
  if (lbBox && !reduce && lbBox.animate) {
    document.querySelectorAll('[data-lb]').forEach((t) => {
      t.addEventListener('click', (e) => {
        requestAnimationFrame(() => {
          const b = lbBox.getBoundingClientRect();
          const x = (e.clientX || b.left + b.width / 2) - b.left, y = (e.clientY || b.top + b.height / 2) - b.top;
          lbBox.animate([
            { clipPath: `circle(0px at ${x}px ${y}px)`, filter: 'url(#water)' },
            { clipPath: `circle(${Math.hypot(b.width, b.height)}px at ${x}px ${y}px)`, filter: 'url(#water)', offset: 0.85 },
            { clipPath: `circle(${Math.hypot(b.width, b.height)}px at ${x}px ${y}px)`, filter: 'none' },
          ], { duration: 900, easing: 'cubic-bezier(.3,.7,.2,1)' });
        });
      });
    });
  }

  /* ---------- 10. sayfa geçişi: dalga yükselir ---------- */
  const curtain = document.querySelector('.curtain');
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href]');
    if (!a || !curtain || reduce) return;
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    if (a.target === '_blank' || a.hasAttribute('download')) return;
    const url = new URL(a.href, location.href);
    if (url.origin !== location.origin || !/\.html?$|\/$/.test(url.pathname)) return;
    if (url.pathname === location.pathname && url.hash) return;
    e.preventDefault();
    curtain.classList.add('cover');
    setTimeout(() => { location.href = a.href; }, 620);
  });
  addEventListener('pageshow', (e) => { if (e.persisted && curtain) curtain.classList.remove('cover'); });

  /* ---------- 11. roketle mesaj ---------- */
  const form = document.querySelector('[data-form]');
  const bottle = document.querySelector('.bottle');
  if (form && bottle) {
    form.addEventListener('input', () => bottle.classList.toggle('filled', form.checkValidity()));
    form.addEventListener('submit', () => {
      bottle.classList.add('sent');
      setTimeout(() => { bottle.style.transition = 'none'; bottle.classList.remove('sent', 'filled'); void bottle.offsetWidth; bottle.style.transition = ''; }, 3200);
    });
  }
})();
