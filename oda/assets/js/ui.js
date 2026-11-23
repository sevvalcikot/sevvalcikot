'use strict';

/* Oda arayüzü: yan panel (sayfa içeriği), sayfalar arası geçiş, menü,
   proje filtresi, lightbox, iletişim formu. Sayfa içeriği her zaman
   gerçek HTML sayfalarından gelir; JavaScript yoksa bağlantılar normal çalışır. */

(() => {
  const doc = document.documentElement;
  const sheet = document.querySelector('[data-sheet]');
  const body = sheet.querySelector('[data-sheet-body]');
  const intro = document.querySelector('[data-intro]');
  const cap = document.querySelector('[data-caption]');
  const local = (a) => a && a.origin === location.origin && /\.html$/.test(a.pathname) && !a.hasAttribute('download') && a.target !== '_blank'
    && a.pathname.replace(/[^/]+$/, '') === location.pathname.replace(/[^/]+$/, '') && !/panel\.html$/.test(a.pathname);

  const setOpen = (open) => {
    sheet.classList.toggle('open', open);
    sheet.setAttribute('aria-hidden', String(!open));
    doc.classList.toggle('sheet-open', open);
    if (intro) intro.hidden = open;
    window.RoomScene && window.RoomScene.setSheet(open);
  };

  /* menü bağlantılarını işaretle */
  const markNav = (file) => {
    document.querySelectorAll('.nav-links a, .mobile-menu a').forEach((a) => {
      const f = a.getAttribute('href');
      const cur = f === file || (f === 'blog.html' && /^(blog-|yazi)/.test(file));
      if (cur) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  };

  async function load(href, push = true, focus = true) {
    const url = new URL(href, location.href);
    const file = url.pathname.split('/').pop() || 'index.html';
    if (focus && window.RoomScene) window.RoomScene.focus(file);
    if (file === 'index.html') {
      setOpen(false);
      document.title = document.querySelector('meta[name="home-title"]')?.content || document.title;
      if (push) history.pushState({}, '', url);
      markNav(file); swapLang(document.querySelector('meta[name="home-alt"]')?.content);
      return;
    }
    try {
      const html = await (await fetch(url, { credentials: 'same-origin' })).text();
      const d = new DOMParser().parseFromString(html, 'text/html');
      const main = d.querySelector('[data-sheet-body]');
      if (!main) { location.href = url; return; }
      body.innerHTML = main.innerHTML;
      document.title = d.title;
      const md = d.querySelector('meta[name="description"]'); if (md) document.querySelector('meta[name="description"]').content = md.content;
      swapLang(d.querySelector('[data-lang-link]')?.getAttribute('href'));
      if (push) history.pushState({}, '', url);
      markNav(file);
      if (window.cmsApply) window.cmsApply(body);
      sheet.scrollTop = 0; body.scrollTop = 0;
      setOpen(true);
      sheet.querySelector('h1')?.focus({ preventScroll: true });
    } catch (e) { location.href = url; }
  }
  const swapLang = (href) => { const l = document.querySelector('[data-lang-link]'); if (l && href) l.setAttribute('href', href); };

  window.RoomUI = {
    open: (href) => load(href),
    caption: (txt) => { cap.textContent = txt; cap.hidden = !txt; },
  };

  document.addEventListener('click', (e) => {
    const a = e.target.closest('a');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    if (doc.classList.contains('no-webgl')) return;
    if (a.matches('[data-lang-link]')) return;
    if (local(a)) { e.preventDefault(); closeMenu(); load(a.href); }
  });
  addEventListener('popstate', () => load(location.href, false));
  document.querySelector('[data-sheet-close]').addEventListener('click', () => load('index.html'));
  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    if (document.querySelector('.lightbox.open')) return;
    if (sheet.classList.contains('open')) load('index.html');
  });

  /* odayı gezmeye başlayınca karşılama kartını küçült */
  const canvasEl = document.querySelector('canvas.room');
  if (intro && canvasEl) {
    canvasEl.addEventListener('pointerdown', () => intro.classList.add('mini'), { once: false });
    intro.addEventListener('click', (e) => { if (intro.classList.contains('mini') && !e.target.closest('a, button')) intro.classList.remove('mini'); });
  }

  /* tur düğmesi */
  document.querySelectorAll('[data-tour]').forEach((b) => b.addEventListener('click', () => window.RoomScene && window.RoomScene.tour(b)));
  document.querySelectorAll('[data-home-view]').forEach((b) => b.addEventListener('click', () => window.RoomScene && window.RoomScene.home()));

  /* mobil menü */
  const menuBtn = document.querySelector('[data-menu-btn]'), menu = document.querySelector('[data-mobile-menu]');
  const closeMenu = () => { menu.classList.remove('open'); menuBtn.setAttribute('aria-expanded', 'false'); };
  menuBtn.addEventListener('click', () => { const o = menu.classList.toggle('open'); menuBtn.setAttribute('aria-expanded', String(o)); });

  /* proje filtresi (panel içeriği değişse de çalışır) */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-filter]'); if (!b) return;
    const box = b.closest('section') || body;
    box.querySelectorAll('[data-filter]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
    box.querySelectorAll('[data-category]').forEach((it) => { it.hidden = !(b.dataset.filter === 'all' || it.dataset.category === b.dataset.filter); });
  });

  /* lightbox */
  let last = null;
  document.addEventListener('click', (e) => {
    const tr = e.target.closest('[data-lb]');
    const lb = document.querySelector('[data-lightbox]');
    if (tr && lb) {
      last = tr; const d = tr.dataset, [f1, f2] = lb.querySelectorAll('figure');
      const fill = (f, src, c, alt) => { f.querySelector('img').src = src; f.querySelector('img').alt = alt; f.querySelector('figcaption').textContent = c || ''; };
      fill(f1, d.img, d.cap, d.title);
      if (d.img2) { fill(f2, d.img2, d.cap2, d.title + ' – ' + (d.cap2 || '')); f2.hidden = false; lb.querySelector('.lb-media').classList.add('pair'); }
      else { f2.hidden = true; lb.querySelector('.lb-media').classList.remove('pair'); }
      lb.querySelector('[data-lb-title]').textContent = d.title; lb.querySelector('[data-lb-text]').textContent = d.text || '';
      document.body.appendChild(lb); lb.classList.add('open'); lb.setAttribute('aria-hidden', 'false');
      lb.querySelector('.lb-close').focus();
      return;
    }
    if (lb && lb.classList.contains('open') && (e.target === lb || e.target.closest('.lb-close'))) closeLb(lb);
  });
  const closeLb = (lb) => { lb.classList.remove("open"); lb.setAttribute("aria-hidden", "true"); if (last) last.focus(); };
  document.addEventListener('keydown', (e) => { const lb = document.querySelector('.lightbox.open'); if (e.key === 'Escape' && lb) closeLb(lb); });

  /* iletişim formu */
  document.addEventListener('input', (e) => { const f = e.target.closest('[data-form]'); if (f) f.querySelector('button[type="submit"]').disabled = !f.checkValidity(); });
  document.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form]'); if (!f) return;
    e.preventDefault(); f.querySelector('[data-status]').textContent = f.dataset.success; f.reset(); f.querySelector('button[type="submit"]').disabled = true;
  });

  /* ilk açılış */
  const file = location.pathname.split('/').pop() || 'index.html';
  markNav(file);
  const start = () => { if (window.RoomScene) window.RoomScene.focus(file); setOpen(file !== 'index.html'); };
  if (window.RoomScene) start(); else addEventListener('room:ready', start, { once: true });
  if (file !== 'index.html') setOpen(true);
})();
