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
    'about-short': (el, c) => { if (c.about && T(c.about).length) el.innerHTML = T(c.about).slice(0, 2).map((p) => `<p>${clean(p)}</p>`).join(''); },
    'about-long': (el, c) => { if (c.about && T(c.about).length) el.innerHTML = T(c.about).map((p) => `<p>${clean(p)}</p>`).join(''); },
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
        <button type="button" class="gallery-item reveal" data-lb data-img="${esc(img(g.img))}" data-title="${esc(T(g.title))}" data-text="${esc(g.text ? T(g.text) : '')}">
          <span class="gfig"><img src="${esc(img(g.img))}" alt="${esc(T(g.title))}" style="object-position:${esc(g.pos || 'center')}" loading="lazy"><span class="gcap">${esc(T(g.title))}</span></span>${g.text && T(g.text) ? `<span class="gdesc">${esc(T(g.text))}</span>` : ''}
        </button>`).join('');
    },
    strip: (el, c, img) => {
      if (!c.gallery) return;
      el.innerHTML = c.gallery.slice(0, 6).map((g) => `<figure class="strip-item"><img src="${esc(img(g.img))}" alt="${esc(T(g.title))}" style="object-position:${esc(g.pos || 'center')}" draggable="false"><figcaption>${esc(T(g.title))}</figcaption></figure>`).join('');
    },
  };

  /* ---------- BLOG ---------- */
  const B = {
    tr: { read: 'Yazıyı oku', tags: 'Etiketler', cats: 'Kategoriler', all: 'Tümü', posts: 'Yazılar', back: 'Tüm yazılar', next: 'Sonraki yazı', filt: 'Kategoriye göre filtrele', locale: 'tr-TR' },
    en: { read: 'Read the post', tags: 'Tags', cats: 'Categories', all: 'All', posts: 'Posts', back: 'All posts', next: 'Next post', filt: 'Filter by category', locale: 'en-US' },
  }[lang];
  const fdate = (d) => { try { return new Date(d + 'T12:00:00').toLocaleDateString(B.locale, { day: 'numeric', month: 'long', year: 'numeric' }); } catch (e) { return d; } };
  const L = (o) => (Array.isArray(o) ? o : (o && (o[lang] || o.tr)) || []);
  const postHref = (p) => (p.static ? `blog-${p.slug}.html` : `yazi.html?s=${encodeURIComponent(p.slug)}`);
  const sortPosts = (arr) => [...arr].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const chips = (arr, cls = 'chip') => arr.map((x) => `<li class="${cls}">${esc(x)}</li>`).join('');
  const bodyHtml = (txt) => {
    const out = [];
    String(txt || '').trim().split(/\n\s*\n/).forEach((block) => {
      let lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return;
      if (lines.every((l) => /^\d+[.)]\s/.test(l))) { out.push('<ol>' + lines.map((l) => `<li>${esc(l.replace(/^\d+[.)]\s+/, ''))}</li>`).join('') + '</ol>'); return; }
      if (lines[0].startsWith('## ')) { out.push(`<h2>${esc(lines[0].slice(3))}</h2>`); lines = lines.slice(1); if (!lines.length) return; }
      out.push('<p>' + lines.map(esc).join('<br>') + '</p>');
    });
    return out.join('');
  };
  const blogCard = (p, img) => `<article class="blog-card glass reveal" data-bcats="${esc(L(p.cats).join('|'))}"><a class="blog-link" href="${postHref(p)}">`
    + `<span class="blog-thumb"><img src="${esc(img(p.img))}" alt="" loading="lazy"></span>`
    + `<span class="blog-body"><span class="blog-meta"><time datetime="${esc(p.date)}">${esc(fdate(p.date))}</time><span>${esc(L(p.cats).join(' · '))}</span></span>`
    + `<h3 class="blog-title">${esc(T(p.title))}</h3><span class="blog-excerpt">${esc(T(p.excerpt))}</span>`
    + `<span class="blog-more">${B.read} ${ARROW}</span></span></a>`
    + `<ul class="tags" aria-label="${B.tags}">${chips(L(p.tags).map((t) => '#' + t), 'tag-chip')}</ul></article>`;
  Object.assign(R, {
    'blog-list': (el, c, img) => {
      if (!c.blog) return;
      const posts = sortPosts(c.blog), cats = [];
      posts.forEach((p) => L(p.cats).forEach((x) => { if (!cats.includes(x)) cats.push(x); }));
      el.innerHTML = `<h2 class="display" style="font-size:clamp(26px,3.5vw,36px)">${B.posts}</h2>`
        + `<div class="filters" role="group" aria-label="${B.filt}" data-bfilters><button type="button" data-bf="all" aria-pressed="true">${B.all}</button>`
        + cats.map((x) => `<button type="button" data-bf="${esc(x)}" aria-pressed="false">${esc(x)}</button>`).join('') + '</div>'
        + `<div class="blog-grid">${posts.map((p) => blogCard(p, img)).join('')}</div>`;
    },
    'blog-latest': (el, c, img) => { if (c.blog) el.innerHTML = sortPosts(c.blog).slice(0, 3).map((p) => blogCard(p, img)).join(''); },
    'blog-post': (el, c, img) => {
      if (!c.blog) return;
      const slug = el.dataset.slug || new URLSearchParams(location.search).get('s') || '';
      const posts = sortPosts(c.blog), i = posts.findIndex((p) => p.slug === slug);
      if (i < 0) return;
      const p = posts[i], nxt = posts.length > 1 ? posts[(i + 1) % posts.length] : null;
      document.title = `${T(p.title)} | Şevval Çikot`;
      const md = document.querySelector('meta[name="description"]'); if (md) md.content = T(p.excerpt);
      el.innerHTML = `<header class="page-hero post-head"><span class="depth-tag">Blog · <time datetime="${esc(p.date)}">${esc(fdate(p.date))}</time></span>`
        + `<h1 class="display">${esc(T(p.title))}</h1><p class="lead">${esc(T(p.excerpt))}</p>`
        + `<dl class="post-taxo"><div><dt>${B.cats}</dt><dd><ul class="chips">${chips(L(p.cats))}</ul></dd></div>`
        + `<div><dt>${B.tags}</dt><dd><ul class="tags">${chips(L(p.tags).map((t) => '#' + t), 'tag-chip')}</ul></dd></div></dl></header>`
        + (p.img ? `<figure class="post-cover glass"><img src="${esc(img(p.img))}" alt="${esc(T(p.title))}"></figure>` : '')
        + `<div class="post-body glass prose">${bodyHtml(T(p.body))}</div>`
        + `<nav class="post-nav" aria-label="Blog"><a class="btn btn-ghost" href="blog.html">← ${B.back}</a>`
        + (nxt ? `<a class="link-more" href="${postHref(nxt)}">${B.next}: ${esc(T(nxt.title))} ${ARROW}</a>` : '') + '</nav>';
    },
  });

  let started = false;
  const start = () => {
    if (started) return; started = true;
    after.forEach((f) => { const s = document.createElement('script'); s.src = base + f; s.async = false; document.body.appendChild(s); });
  };
  setTimeout(start, 2500);

  (async () => {
    try {
      if (!window.Store) return;
      let saved = await window.Store.getAllContent();
      if (document.querySelector('[data-cms="blog-post"][data-slug=""]') && !(saved && saved.blog)) saved = Object.assign({}, saved, { blog: (await window.Store.seed()).blog });
      const img = (p) => window.Store.imageUrl(p);
      /* sayfa içeriği sonradan değişirse (ör. 3D oda) tekrar uygulamak için */
      window.cmsApply = (root = document) => {
        if (!saved || !Object.keys(saved).length) return;
        root.querySelectorAll('[data-cms]').forEach((el) => {
          const fn = R[el.dataset.cms];
          try { if (fn) fn(el, saved, img); } catch (e) { console.warn('CMS', el.dataset.cms, e); }
        });
      };
      window.cmsApply();
      window.cmsContent = saved || {};
      document.dispatchEvent(new CustomEvent('cms:ready'));
    } catch (e) {
      console.warn('CMS içeriği alınamadı, hazır içerik gösteriliyor.', e);
    } finally {
      start();
    }
  })();
})();
