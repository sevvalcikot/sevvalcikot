'use strict';

/* Blog: kategoriye göre filtreleme (panelden gelen içerik yeniden çizilse de çalışır). */
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-bf]');
  if (!b) return;
  const box = b.closest('[data-bfilters]');
  box.querySelectorAll('[data-bf]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  const f = b.dataset.bf;
  const scope = box.parentElement;
  scope.querySelectorAll('[data-bcats]').forEach((card) => {
    card.hidden = !(f === 'all' || card.dataset.bcats.split('|').includes(f));
  });
});
