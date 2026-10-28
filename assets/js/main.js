'use strict';

/* Şevval Çikot — site davranışları
   Kaydırmaya bağlı arka plan, "inşa" sahnesi, menü, filtre, lightbox, form. */

const root = document.documentElement;
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* ---------- kaydırma: arka plan yakınlaşması ve kararma, inşa sahnesi ---------- */

const scrubs = [...document.querySelectorAll('[data-scrub]')];
let ticking = false;

function onScroll() {
  const vh = window.innerHeight;
  const y = window.scrollY;

  // derinlik (--d) artık sea.js tarafından hesaplanıyor

  scrubs.forEach((el) => {
    const r = el.getBoundingClientRect();
    const total = r.height - vh;
    const s = reduceMotion ? 1 : clamp(-r.top / total);
    el.style.setProperty('--s', s.toFixed(4));
    const steps = el.querySelectorAll('.scrub-steps p');
    const idx = Math.min(steps.length - 1, Math.floor(s * steps.length * 0.999));
    steps.forEach((p, i) => p.classList.toggle('on', i === idx));
  });

  ticking = false;
}

window.addEventListener('scroll', () => {
  if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
}, { passive: true });
window.addEventListener('resize', onScroll);
onScroll();

/* ---------- beliren öğeler ---------- */

const revealEls = document.querySelectorAll('.reveal');
if ('IntersectionObserver' in window && !reduceMotion) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  revealEls.forEach((el) => io.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('in'));
}

/* ---------- mobil menü ---------- */

const menuBtn = document.querySelector('[data-menu-btn]');
const mobileMenu = document.querySelector('[data-mobile-menu]');
if (menuBtn && mobileMenu) {
  menuBtn.addEventListener('click', () => {
    const open = mobileMenu.classList.toggle('open');
    menuBtn.setAttribute('aria-expanded', open);
  });
}

/* ---------- proje filtresi ---------- */

const filterBtns = document.querySelectorAll('[data-filter]');
const items = document.querySelectorAll('[data-category]');
filterBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    filterBtns.forEach((b) => b.setAttribute('aria-pressed', 'false'));
    btn.setAttribute('aria-pressed', 'true');
    const f = btn.dataset.filter;
    items.forEach((it) => { it.hidden = !(f === 'all' || it.dataset.category === f); });
  });
});

/* ---------- lightbox (öncesi / sonrası) ---------- */

const lb = document.querySelector('[data-lightbox]');
if (lb) {
  const media = lb.querySelector('.lb-media');
  const [fig1, fig2] = lb.querySelectorAll('figure');
  const title = lb.querySelector('[data-lb-title]');
  const text = lb.querySelector('[data-lb-text]');
  const closeBtn = lb.querySelector('.lb-close');
  let last = null;

  const fill = (fig, src, cap, alt) => {
    fig.querySelector('img').src = src;
    fig.querySelector('img').alt = alt;
    fig.querySelector('figcaption').textContent = cap || '';
  };

  const open = (t) => {
    last = t;
    const d = t.dataset;
    fill(fig1, d.img, d.cap, d.title + (d.cap ? ' – ' + d.cap : ''));
    if (d.img2) {
      fill(fig2, d.img2, d.cap2, d.title + ' – ' + (d.cap2 || ''));
      fig2.hidden = false;
      media.classList.add('pair');
    } else {
      fig2.hidden = true;
      media.classList.remove('pair');
    }
    title.textContent = d.title;
    text.textContent = d.text || '';
    lb.classList.add('open');
    lb.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    closeBtn.focus();
  };

  const close = () => {
    lb.classList.remove('open');
    lb.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (last) last.focus();
  };

  document.querySelectorAll('[data-lb]').forEach((t) => t.addEventListener('click', () => open(t)));
  closeBtn.addEventListener('click', close);
  lb.addEventListener('click', (e) => { if (e.target === lb) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && lb.classList.contains('open')) close(); });
}

/* ---------- iletişim formu ---------- */

const form = document.querySelector('[data-form]');
if (form) {
  const btn = form.querySelector('button[type="submit"]');
  const status = form.querySelector('[data-status]');
  form.addEventListener('input', () => { btn.disabled = !form.checkValidity(); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    status.textContent = form.dataset.success;
    form.reset();
    btn.disabled = true;
  });
}
