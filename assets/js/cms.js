'use strict';

/* Panelde (CMS) kaydedilen içeriği herkese açık sayfalara yerleştirir.
   Kayıtlı içerik yoksa sayfadaki hazır HTML olduğu gibi kalır.
   İş bitince (veya en geç 2,5 sn sonra) site etkileşim betiklerini yükler. */

(() => {
  const me = document.currentScript;
  const after = (me.dataset.after || '').split(/\s+/).filter(Boolean);
  const base = new URL('.', me.src).href;
  const lang = document.documentElement.lang === 'en' ? 'en' : 'tr';
  const T = (o) => (o && typeof o === 'object' && !Array.isArray(o) ? (o[lang] ?? o.tr ?? '') : (o ?? ''));

  const CATS = { photo: { tr: 'Fotoğraf Düzenleme', en: 'Photo Editing' }, design: { tr: 'Tasarım', en: 'Design' }, web: { tr: 'Web Arayüzü', en: 'Web UI' } };
  const PAIR = { before: { tr: 'Öncesi', en: 'Before' }, after: { tr: 'Sonrası', en: 'After' }, result: { tr: 'Sonuç', en: 'Result' }, layers: { tr: 'Katmanlar', en: 'Layers' } };
  const ARROW = '<svg class="arrow" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /* yalnızca güvenli birkaç etiket: strong, em, b, i, br, abbr[title], a[href] */
  const ALLOWED = { STRONG: [], EM: [], B: [], I: [], BR: [], ABBR: ['title'], A: ['href'] };
  const clean = (html) => {
    const doc = new DOMParser().parseFromString('<div>' + String(html ?? '') + '</div>', 'text/html');
    const walk = (node) => [...node.childNodes].map((n) => {
      if (n.nodeType === 3) return esc(n.textContent);
      if (n.nodeType !== 1) return '';
      const keep = ALLOWED[n.tagName];
      if (!keep) return walk(n);
      if (n.tagName === 'BR') return '<br>';
      const attrs = keep.map((a) => {
        const v = n.getAttribute(a);
        if (v == null) return '';
        if (a === 'href' && !/^(https?:|mailto:|tel:)/i.test(v)) return '';
        return ` ${a}="${esc(v)}"`;
      }).join('') + (n.tagName === 'A' ? ' target="_blank" rel="noopener"' : '');
      const tag = n.tagName.toLowerCase();
      return `<${tag}${attrs}>${walk(n)}</${tag}>`;
    }).join('');
    return walk(doc.body.firstChild);
  };

  const lbAttrs = (p, img) => {
    const main = img(p.img), other = img(p.img2);
    if (!p.img2) return `data-img="${esc(main)}"`;
    return p.pair === 'layers'
      ? `data-img="${esc(main)}" data-cap="${PAIR.result[lang]}" data-img2="${esc(other)}" data-cap2="${PAIR.layers[lang]}"`
      : `data-img="${esc(other)}" data-cap="${PAIR.before[lang]}" data-img2="${esc(main)}" data-cap2="${PAIR.after[lang]}"`;
  };

  const R = {
    'about-short': (el, c) => { if (c.about) el.innerHTML = T(c.about).slice(0, 2).map((p) => `<p>${clean(p)}</p>`).join(''); },
    'about-long': (el, c) => { if (c.about) el.innerHTML = T(c.about).map((p) => `<p>${clean(p)}</p>`).join(''); },
    interests: (el, c) => { if (c.interests) el.innerHTML = T(c.interests).map((i) => `<li>${esc(i)}</li>`).join(''); },
    'top-skills': (el, c) => {
      if (c.skills) el.innerHTML = [...c.skills].sort((a, b) => b.value - a.value).map((s) => `<li>${esc(s.name)}</li>`).join('');
    },
    skills: (el, c) => {
      if (!c.skills) return;
      el.innerHTML = c.skills.map((s) => {
        const v = Math.max(0, Math.min(100, Math.round(+s.value || 0)));
        return `<div class="skill-row"><div class="skill-top"><span>${esc(s.name)}</span><data value="${v}">%${v}</data></div>
          <div class="bar" role="progressbar" aria-valuenow="${v}" aria-valuemin="0" aria-valuemax="100" aria-label="${esc(s.name)}"><i style="--w:${v}%"></i></div></div>`;
      }).join('');
    },
    quote: (el, c) => { if (c.quote) el.innerHTML = `<p>“${esc(T(c.quote.text))}”</p><cite>— ${esc(c.quote.cite)}</cite>`; },
    'project-index': (el, c, img) => {
      if (!c.projects) return;
      el.innerHTML = c.projects.map((p, i) => `
        <li><button type="button" class="prow" data-lb data-preview="${esc(img(p.img))}" ${lbAttrs(p, img)} data-title="${esc(T(p.title))}" data-text="${esc(T(p.desc))}">
          <span class="pnum">${String(i + 1).padStart(2, '0')}</span><span class="pname">${esc(T(p.title))}</span><span class="pcat">${esc(T(CATS[p.cat]) || '')}</span>
          <img class="pthumb" src="${esc(img(p.img))}" alt="" loading="lazy"><span class="parr">${ARROW}</span>
        </button></li>`).join('');
    },
    'project-grid': (el, c, img) => {
      if (!c.projects) return;
      el.innerHTML = c.projects.map((p) => `
        <button type="button" class="project-card glass reveal" data-category="${esc(p.cat)}" data-lb ${lbAttrs(p, img)} data-title="${esc(T(p.title))}" data-text="${esc(T(p.desc))}">
          <span class="project-thumb"><img src="${esc(img(p.img))}" alt="${esc(T(p.title))}" loading="lazy"><span class="tag">${esc(T(CATS[p.cat]) || '')}</span></span>
          <span class="project-body"><span class="ptitle">${esc(T(p.title))}</span><span class="pdesc">${esc(T(p.desc))}</span></span>
        </button>`).join('');
    },
    gallery: (el, c, img) => {
      if (!c.gallery) return;
      el.innerHTML = c.gallery.map((g) => `
        <button type="button" class="gallery-item reveal" data-lb data-img="${esc(img(g.img))}" data-title="${esc(T(g.title))}" data-text="">
          <span class="gfig"><img src="${esc(img(g.img))}" alt="${esc(T(g.title))}" style="object-position:${esc(g.pos || 'center')}" loading="lazy"><span class="gcap">${esc(T(g.title))}</span></span>
        </button>`).join('');
    },
    strip: (el, c, img) => {
      if (!c.gallery) return;
      el.innerHTML = c.gallery.slice(0, 6).map((g) => `<figure class="strip-item"><img src="${esc(img(g.img))}" alt="${esc(T(g.title))}" style="object-position:${esc(g.pos || 'center')}" draggable="false"><figcaption>${esc(T(g.title))}</figcaption></figure>`).join('');
    },
  };

  let started = false;
  const start = () => {
    if (started) return; started = true;
    after.forEach((f) => { const s = document.createElement('script'); s.src = base + f; s.async = false; document.body.appendChild(s); });
  };
  setTimeout(start, 2500);

  (async () => {
    try {
      if (!window.Store) return;
      const saved = await window.Store.getAllContent();
      if (saved && Object.keys(saved).length) {
        const img = (p) => window.Store.imageUrl(p);
        document.querySelectorAll('[data-cms]').forEach((el) => {
          const fn = R[el.dataset.cms];
          try { if (fn) fn(el, saved, img); } catch (e) { console.warn('CMS', el.dataset.cms, e); }
        });
      }
    } catch (e) {
      console.warn('CMS içeriği alınamadı, hazır içerik gösteriliyor.', e);
    } finally {
      start();
    }
  })();
})();
