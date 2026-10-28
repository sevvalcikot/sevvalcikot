'use strict';

/* Yönetim paneli (CMS) + kişisel asistan / ajanda */

(() => {
  const S = window.Store, A = window.AG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const NAME = 'Şevval';

  const TITLES = { today: 'Bugün', calendar: 'Takvim', tasks: 'Görevler', notes: 'Notlar', focus: 'Odak', assistant: 'Asistan',
    projects: 'Projeler', gallery: 'Galeri', about: 'Hakkımda', skills: 'Yetenekler ve ilgi alanları', quote: 'Sevdiğim söz' };
  const CATS = { photo: 'Fotoğraf Düzenleme', design: 'Tasarım', web: 'Web Arayüzü' };
  const PRIO = { yuksek: 'Yüksek', orta: 'Orta', dusuk: 'Düşük' };
  const NOTE_COLORS = ['#f1d39a', '#9fe6d8', '#ffc2ad', '#cfc4ff', '#bfe3ff'];

  const st = {
    content: {}, events: [], tasks: [], notes: [], view: 'today',
    calMonth: null, selDay: A.ymd(A.today()), taskFilter: 'open',
    draft: {}, dirty: {}, chat: [],
  };

  /* ---------- yardımcılar ---------- */
  let toastT;
  const toast = (msg, err = false) => {
    const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (err ? ' err' : '');
    clearTimeout(toastT); toastT = setTimeout(() => { t.className = 'toast' + (err ? ' err' : ''); }, err ? 4500 : 2400);
  };
  const safe = (fn) => async (...a) => {
    try { return await fn(...a); } catch (e) { console.error(e); toast(e.message || 'Bir hata oluştu', true); }
  };
  const modal = (title, body, onSubmit, { submit = 'Kaydet', danger = false } = {}) => {
    const dlg = $('#modal'), form = $('#modal-form');
    form.innerHTML = `<h2>${esc(title)}</h2>${body}
      <p class="form-error" data-err></p>
      <div class="modal-foot"><button type="button" class="btn" data-cancel>Vazgeç</button>
      <button type="submit" class="btn ${danger ? 'danger' : 'primary'}">${esc(submit)}</button></div>`;
    form.onsubmit = async (e) => {
      e.preventDefault();
      const btn = form.querySelector('[type=submit]'); btn.disabled = true;
      try { await onSubmit(new FormData(form), form); dlg.close(); } catch (err) { form.querySelector('[data-err]').textContent = err.message || String(err); } finally { btn.disabled = false; }
    };
    form.querySelector('[data-cancel]').onclick = () => dlg.close();
    dlg.showModal();
    const first = form.querySelector('input:not([type=hidden]), textarea, select'); if (first) first.focus();
    return form;
  };
  const confirmBox = (text, onYes, yes = 'Evet, sil') => modal('Emin misin?', `<p class="muted">${esc(text)}</p>`, onYes, { submit: yes, danger: true });
  const markDirty = (key) => { st.dirty[key] = true; const d = $('[data-dirty]'); if (d) d.hidden = false; };
  addEventListener('beforeunload', (e) => { if (Object.values(st.dirty).some(Boolean)) { e.preventDefault(); e.returnValue = ''; } });

  /* ---------- veri eylemleri (asistan da kullanır) ---------- */
  const actions = {
    async addTask({ title, due = null, priority = 'orta' }) {
      const r = await S.insert('tasks', { title, due: due || null, priority, done: false }); st.tasks.push(r); return r;
    },
    async addNote({ text, color = NOTE_COLORS[st.notes.length % NOTE_COLORS.length] }) {
      const r = await S.insert('notes', { text, color }); st.notes.push(r); return r;
    },
    async addEvent({ title, date, time = null, end_time = null, type = 'etkinlik', note = '' }) {
      const r = await S.insert('events', { title, date, time: time || null, end_time: end_time || null, type, note }); st.events.push(r); return r;
    },
  };
  const schedule = () => st.content.schedule || [];

  /* ---------- görünümler ---------- */
  const V = {};

  /* BUGÜN */
  V.today = () => {
    const now = new Date(), t = A.today(), ts = A.ymd(t);
    const h = now.getHours();
    const greet = h < 6 ? 'İyi geceler' : h < 11 ? 'Günaydın' : h < 18 ? 'Merhaba' : 'İyi akşamlar';
    const classes = A.classesOn(now, schedule());
    const mins = h * 60 + now.getMinutes();
    const weekEnd = A.ymd(A.addDays(t, 7));
    const upcoming = st.events.filter((e) => e.date >= ts && e.date <= weekEnd).sort(A.sortEv);
    const open = st.tasks.filter((x) => !x.done);
    const focusTasks = open.filter((x) => x.due && x.due <= A.ymd(A.addDays(t, 2))).concat(open.filter((x) => !x.due || x.due > A.ymd(A.addDays(t, 2)))).slice(0, 6);
    const exams = st.events.filter((e) => e.type === 'sinav' && e.date >= ts).sort(A.sortEv);
    const nextExam = exams[0];
    return `
    <div class="grid dash">
      <div class="card hello wide">
        <h2>${greet}, ${NAME}.</h2>
        <p class="muted">${A.fmt(ts)} · ${classes.length ? classes.length + ' dersin var' : 'bugün dersin yok'}${upcoming.filter((e) => e.date === ts).length ? ' · ' + upcoming.filter((e) => e.date === ts).length + ' etkinlik' : ''}</p>
        <div class="stats">
          <div class="stat"><b>${open.length}</b><span>açık görev</span></div>
          <div class="stat"><b>${upcoming.length}</b><span>7 gün içinde etkinlik</span></div>
          <div class="stat"><b>${nextExam ? A.daysUntil(nextExam.date) : '–'}</b><span>${nextExam ? 'gün: ' + esc(nextExam.title) : 'yaklaşan sınav yok'}</span></div>
        </div>
        <form class="quick" data-quick><input type="text" name="q" placeholder="Asistana yaz: “cuma 14:00 matematik sınavı ekle”, “yarın neyim var?”" autocomplete="off"><button class="btn primary">Gönder</button></form>
        <p class="muted small" data-quick-out style="white-space:pre-line;margin-top:10px"></p>
      </div>
      <div class="card">
        <h2>Bugünkü derslerim <small>${A.DAYS_UP[A.dow(now)]}</small></h2>
        <div class="list">${classes.length ? classes.map((c) => {
          const isNow = A.toMin(c.start) <= mins && mins < A.toMin(c.end), done = mins >= A.toMin(c.end);
          return `<div class="item ${isNow ? 'now' : ''} ${done ? 'done' : ''}"><span class="time">${c.start}–${c.end}</span><div class="grow"><div class="title">${esc(c.name)}</div><div class="meta">${esc(c.code)} · ${esc(c.room)}${isNow ? ' · şu an' : ''}</div></div></div>`;
        }).join('') : '<p class="empty">Bugün ders yok. Dinlenmek de bir görev. 🌊</p>'}</div>
      </div>
      <div class="card">
        <h2>Görevler <button class="btn small" data-go="tasks">Tümü</button></h2>
        <div class="list">${focusTasks.length ? focusTasks.map(taskRow).join('') : '<p class="empty">Açık görev yok. ✨</p>'}</div>
      </div>
      <div class="card">
        <h2>Önümüzdeki 7 gün <button class="btn small" data-go="calendar">Takvim</button></h2>
        <div class="list">${upcoming.length ? upcoming.map(eventRow).join('') : '<p class="empty">Planlanmış etkinlik yok.</p>'}</div>
      </div>
      <div class="card">
        <h2>Yaklaşan sınavlar</h2>
        <div class="list">${exams.length ? exams.slice(0, 5).map((e) => `<div class="item t-sinav"><span class="dot"></span><div class="grow"><div class="title">${esc(e.title)}</div><div class="meta">${A.fmt(e.date)}${e.time ? ' · ' + e.time : ''}</div></div><span class="chip t-sinav">${A.daysUntil(e.date) === 0 ? 'bugün' : A.daysUntil(e.date) + ' gün'}</span></div>`).join('') : '<p class="empty">Sınav eklenmemiş. Takvimden ya da asistandan ekleyebilirsin.</p>'}</div>
      </div>
    </div>`;
  };
  V.today.bind = (root) => {
    const f = $('[data-quick]', root);
    f.onsubmit = safe(async (e) => {
      e.preventDefault(); const q = f.q.value.trim(); if (!q) return;
      const out = await A.reply(q, ctx()); f.q.value = '';
      render(); $('[data-quick-out]').textContent = out;
    });
    bindTaskRows(root); bindEventRows(root);
  };

  const taskRow = (x) => {
    const od = x.due && !x.done && A.daysUntil(x.due) < 0;
    return `<div class="item ${x.done ? 'done' : ''} ${od ? 'overdue' : ''}" data-task="${esc(x.id)}">
      <span class="prio p-${esc(x.priority || 'orta')}"></span>
      <input type="checkbox" ${x.done ? 'checked' : ''} aria-label="Tamamlandı">
      <div class="grow"><div class="title">${esc(x.title)}</div><div class="meta">${x.due ? (od ? 'Gecikti · ' : '') + A.label(x.due) : 'Tarih yok'} · ${PRIO[x.priority] || 'Orta'} öncelik</div></div>
      <button class="icon-btn" data-edit title="Düzenle">✎</button><button class="icon-btn" data-del title="Sil">✕</button></div>`;
  };
  const eventRow = (e) => `<div class="item t-${esc(e.type)}" data-event="${esc(e.id)}"><span class="dot"></span>
      <div class="grow"><div class="title">${esc(e.title)}</div><div class="meta">${A.label(e.date)}${e.time ? ' · ' + e.time + (e.end_time ? '–' + e.end_time : '') : ''}${e.note ? ' · ' + esc(e.note) : ''}</div></div>
      <span class="chip t-${esc(e.type)}">${A.TYPES[e.type] || e.type}</span>
      <button class="icon-btn" data-edit title="Düzenle">✎</button><button class="icon-btn" data-del title="Sil">✕</button></div>`;

  const bindTaskRows = (root) => {
    $$('[data-task]', root).forEach((row) => {
      const x = st.tasks.find((t) => t.id === row.dataset.task);
      row.querySelector('input[type=checkbox]').onchange = safe(async (e) => { await S.update('tasks', x.id, { done: e.target.checked }); x.done = e.target.checked; render(); if (x.done) toast('Görev tamamlandı ✓'); });
      row.querySelector('[data-del]').onclick = () => confirmBox(`“${x.title}” silinsin mi?`, async () => { await S.remove('tasks', x.id); st.tasks = st.tasks.filter((t) => t !== x); render(); toast('Görev silindi'); });
      row.querySelector('[data-edit]').onclick = () => taskModal(x);
    });
  };
  const bindEventRows = (root) => {
    $$('[data-event]', root).forEach((row) => {
      const ev = st.events.find((t) => t.id === row.dataset.event);
      row.querySelector('[data-del]').onclick = () => confirmBox(`“${ev.title}” silinsin mi?`, async () => { await S.remove('events', ev.id); st.events = st.events.filter((t) => t !== ev); render(); toast('Etkinlik silindi'); });
      row.querySelector('[data-edit]').onclick = () => eventModal(ev);
    });
  };

  const taskModal = (x = {}) => modal(x.id ? 'Görevi düzenle' : 'Yeni görev', `
    <div class="form-grid">
      <label>Görev<input type="text" name="title" required value="${esc(x.title)}"></label>
      <div class="two"><label>Son gün<input type="date" name="due" value="${esc(x.due || '')}"></label>
      <label>Öncelik<select name="priority">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${(x.priority || 'orta') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
    </div>`, async (fd) => {
    const data = { title: fd.get('title').trim(), due: fd.get('due') || null, priority: fd.get('priority') };
    if (!data.title) throw new Error('Görev adı boş olamaz.');
    if (x.id) { await S.update('tasks', x.id, data); Object.assign(x, data); } else await actions.addTask(data);
    render(); toast('Görev kaydedildi');
  });

  const eventModal = (ev = {}) => modal(ev.id ? 'Etkinliği düzenle' : 'Yeni etkinlik', `
    <div class="form-grid">
      <label>Başlık<input type="text" name="title" required value="${esc(ev.title)}" placeholder="ör. Web Tasarım vizesi"></label>
      <div class="two"><label>Tarih<input type="date" name="date" required value="${esc(ev.date || st.selDay)}"></label>
      <label>Tür<select name="type">${Object.entries(A.TYPES).map(([k, v]) => `<option value="${k}" ${(ev.type || 'etkinlik') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label></div>
      <div class="two"><label>Başlangıç saati<input type="time" name="time" value="${esc(ev.time || '')}"></label>
      <label>Bitiş saati<input type="time" name="end_time" value="${esc(ev.end_time || '')}"></label></div>
      <label>Not<input type="text" name="note" value="${esc(ev.note || '')}" placeholder="ör. derslik 303, 1-5. haftalar"></label>
    </div>`, async (fd) => {
    const data = { title: fd.get('title').trim(), date: fd.get('date'), type: fd.get('type'), time: fd.get('time') || null, end_time: fd.get('end_time') || null, note: fd.get('note').trim() };
    if (!data.title || !data.date) throw new Error('Başlık ve tarih gerekli.');
    if (ev.id) { await S.update('events', ev.id, data); Object.assign(ev, data); } else await actions.addEvent(data);
    st.selDay = data.date; render(); toast('Etkinlik kaydedildi');
  });

  /* TAKVİM */
  V.calendar = () => {
    const sel = A.parse(st.selDay);
    if (!st.calMonth) st.calMonth = new Date(sel.getFullYear(), sel.getMonth(), 1);
    const m = st.calMonth, first = new Date(m.getFullYear(), m.getMonth(), 1);
    const start = A.addDays(first, -A.dow(first));
    const todayS = A.ymd(A.today());
    let cells = '';
    for (let i = 0; i < 42; i++) {
      const d = A.addDays(start, i), s = A.ymd(d);
      const evs = st.events.filter((e) => e.date === s).sort(A.sortEv);
      cells += `<button class="day ${d.getMonth() !== m.getMonth() ? 'out' : ''} ${s === todayS ? 'today' : ''} ${s === st.selDay ? 'sel' : ''}" data-day="${s}" aria-label="${A.fmt(s)}${evs.length ? ', ' + evs.length + ' etkinlik' : ''}">
        <span class="n">${d.getDate()}</span>
        ${evs.slice(0, 3).map((e) => `<span class="ev t-${esc(e.type)}">${e.time ? e.time + ' ' : ''}${esc(e.title)}</span>`).join('')}
        ${evs.length > 3 ? `<span class="ev" style="--c:var(--muted)">+${evs.length - 3}</span>` : ''}
        <span class="dots">${evs.slice(0, 4).map((e) => `<span class="dot t-${esc(e.type)}"></span>`).join('')}</span>
      </button>`;
    }
    const classes = A.classesOn(sel, schedule());
    const dayEvents = st.events.filter((e) => e.date === st.selDay).sort(A.sortEv);
    const dayTasks = st.tasks.filter((t) => t.due === st.selDay);
    return `
    <div class="grid cal-wrap">
      <div class="card">
        <div class="cal-head">
          <h2>${A.MONTHS_UP[m.getMonth()]} ${m.getFullYear()}</h2>
          <button class="icon-btn" data-mon="-1" aria-label="Önceki ay">‹</button>
          <button class="btn small" data-mon="0">Bugün</button>
          <button class="icon-btn" data-mon="1" aria-label="Sonraki ay">›</button>
        </div>
        <div class="cal">${['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'].map((d) => `<span class="dow">${d}</span>`).join('')}${cells}</div>
        <p class="hint" style="margin-top:10px"><span class="chip t-sinav">Sınav</span> <span class="chip t-odev">Ödev</span> <span class="chip t-etkinlik">Etkinlik</span> <span class="chip t-kisisel">Kişisel</span></p>
      </div>
      <div class="card">
        <h2>${A.label(st.selDay)} <button class="btn small primary" data-add-event>+ Ekle</button></h2>
        <div class="list">
          ${classes.map((c) => `<div class="item t-ders"><span class="dot"></span><div class="grow"><div class="title">${esc(c.name)}</div><div class="meta">${c.start}–${c.end} · ${esc(c.room)}</div></div><span class="chip t-ders">Ders</span></div>`).join('')}
          ${dayEvents.map(eventRow).join('')}
          ${dayTasks.map(taskRow).join('')}
          ${!classes.length && !dayEvents.length && !dayTasks.length ? '<p class="empty">Bu gün boş.</p>' : ''}
        </div>
      </div>
    </div>`;
  };
  V.calendar.bind = (root) => {
    $$('[data-mon]', root).forEach((b) => b.onclick = () => {
      const k = +b.dataset.mon;
      if (k === 0) { const t = A.today(); st.calMonth = new Date(t.getFullYear(), t.getMonth(), 1); st.selDay = A.ymd(t); } else st.calMonth = new Date(st.calMonth.getFullYear(), st.calMonth.getMonth() + k, 1);
      render();
    });
    $$('[data-day]', root).forEach((b) => {
      b.onclick = () => { st.selDay = b.dataset.day; render(); };
      b.ondblclick = () => { st.selDay = b.dataset.day; eventModal(); };
    });
    $('[data-add-event]', root).onclick = () => eventModal();
    bindEventRows(root); bindTaskRows(root);
  };

  /* GÖREVLER */
  V.tasks = () => {
    const f = st.taskFilter;
    const po = { yuksek: 0, orta: 1, dusuk: 2 };
    const list = st.tasks.filter((x) => (f === 'open' ? !x.done : f === 'done' ? x.done : true))
      .sort((a, b) => (a.done - b.done) || ((a.due || '9999') < (b.due || '9999') ? -1 : (a.due || '9999') > (b.due || '9999') ? 1 : 0) || (po[a.priority] - po[b.priority]));
    const doneN = st.tasks.filter((x) => x.done).length;
    return `
    <div class="grid">
      <form class="card" data-add-task>
        <div class="row">
          <input type="text" name="title" placeholder="Yeni görev… (ör. Multimedya ödevini bitir)" required style="flex:2;min-width:200px">
          <input type="date" name="due" style="flex:1;min-width:140px" aria-label="Son gün">
          <select name="priority" style="flex:1;min-width:120px" aria-label="Öncelik">${Object.entries(PRIO).map(([k, v]) => `<option value="${k}" ${k === 'orta' ? 'selected' : ''}>${v} öncelik</option>`).join('')}</select>
          <button class="btn primary">Ekle</button>
        </div>
      </form>
      <div class="card">
        <h2><span class="seg" role="group" aria-label="Filtre">
          <button data-f="open" aria-pressed="${f === 'open'}">Açık (${st.tasks.length - doneN})</button>
          <button data-f="done" aria-pressed="${f === 'done'}">Tamamlanan (${doneN})</button>
          <button data-f="all" aria-pressed="${f === 'all'}">Tümü</button></span>
          ${doneN ? '<button class="btn small" data-clear>Tamamlananları temizle</button>' : ''}</h2>
        <div class="list">${list.length ? list.map(taskRow).join('') : '<p class="empty">Burada görev yok.</p>'}</div>
      </div>
    </div>`;
  };
  V.tasks.bind = (root) => {
    const f = $('[data-add-task]', root);
    f.onsubmit = safe(async (e) => {
      e.preventDefault();
      await actions.addTask({ title: f.title.value.trim(), due: f.due.value || null, priority: f.priority.value });
      render(); toast('Görev eklendi'); $('[data-add-task] input[name=title]').focus();
    });
    $$('[data-f]', root).forEach((b) => b.onclick = () => { st.taskFilter = b.dataset.f; render(); });
    const c = $('[data-clear]', root);
    if (c) c.onclick = () => confirmBox('Tamamlanan tüm görevler silinsin mi?', async () => {
      for (const x of st.tasks.filter((t) => t.done)) await S.remove('tasks', x.id);
      st.tasks = st.tasks.filter((t) => !t.done); render(); toast('Temizlendi');
    }, 'Temizle');
    bindTaskRows(root);
  };

  /* NOTLAR */
  V.notes = () => `
    <div class="row" style="margin-bottom:14px"><button class="btn primary" data-new-note>+ Yeni not</button><span class="hint">Yazdıkların otomatik kaydedilir.</span></div>
    <div class="notes">${st.notes.length ? [...st.notes].reverse().map((n, i) => `
      <div class="note" data-note="${esc(n.id)}" style="--c:${esc(n.color || NOTE_COLORS[0])};--rot:${((i * 37) % 5) - 2}deg">
        <textarea aria-label="Not" placeholder="Bir şeyler yaz…">${esc(n.text)}</textarea>
        <div class="note-bar">${NOTE_COLORS.map((c) => `<button class="sw" style="--c:${c}" data-color="${c}" aria-label="Renk"></button>`).join('')}<button class="del" data-del>Sil</button></div>
      </div>`).join('') : '<p class="empty">Henüz not yok. Asistana “not al: …” da yazabilirsin.</p>'}</div>`;
  V.notes.bind = (root) => {
    $('[data-new-note]', root).onclick = safe(async () => { await actions.addNote({ text: '' }); render(); const t = $('.note textarea'); if (t) t.focus(); });
    $$('[data-note]', root).forEach((el) => {
      const n = st.notes.find((x) => x.id === el.dataset.note);
      const ta = el.querySelector('textarea'); let tmr;
      const save = safe(async () => { if (ta.value !== n.text) { await S.update('notes', n.id, { text: ta.value }); n.text = ta.value; } });
      ta.oninput = () => { clearTimeout(tmr); tmr = setTimeout(save, 700); };
      ta.onblur = save;
      $$('[data-color]', el).forEach((b) => b.onclick = safe(async () => { await S.update('notes', n.id, { color: b.dataset.color }); n.color = b.dataset.color; el.style.setProperty('--c', n.color); }));
      el.querySelector('[data-del]').onclick = () => confirmBox('Bu not silinsin mi?', async () => { await S.remove('notes', n.id); st.notes = st.notes.filter((x) => x !== n); render(); });
    });
  };

  /* ODAK (pomodoro) */
  const focus = { mode: 'focus', total: 25 * 60, left: 25 * 60, running: false, tmr: null };
  const MODES = { focus: ['Odak', 25], short: ['Kısa mola', 5], long: ['Uzun mola', 15] };
  const sessKey = () => 'focus-' + A.ymd(A.today());
  const sessions = () => { try { return +localStorage.getItem(sessKey()) || 0; } catch (e) { return 0; } };
  const beep = () => {
    try {
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      [0, 0.25, 0.5].forEach((t) => { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.value = 660 + t * 400; o.connect(g); g.connect(ac.destination); g.gain.setValueAtTime(0.0001, ac.currentTime + t); g.gain.exponentialRampToValueAtTime(0.3, ac.currentTime + t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + t + 0.22); o.start(ac.currentTime + t); o.stop(ac.currentTime + t + 0.25); });
    } catch (e) { /* ses desteklenmiyor */ }
  };
  const focusTick = () => {
    focus.left -= 1;
    if (focus.left <= 0) {
      clearInterval(focus.tmr); focus.running = false; focus.left = 0; beep();
      if (focus.mode === 'focus') { try { localStorage.setItem(sessKey(), sessions() + 1); } catch (e) { /* */ } }
      const msg = focus.mode === 'focus' ? 'Odak oturumu bitti! Biraz mola ver. 🌊' : 'Mola bitti, hadi devam! 💪';
      toast(msg); notify(msg);
    }
    paintFocus();
  };
  const paintFocus = () => {
    const r = $('.ring'); if (!r) return;
    const m = Math.floor(focus.left / 60), s = focus.left % 60;
    r.querySelector('b').textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    r.querySelector('.fg').style.strokeDashoffset = String(565.5 * (1 - focus.left / focus.total));
    r.classList.toggle('break', focus.mode !== 'focus');
    const b = $('[data-start]'); if (b) b.textContent = focus.running ? 'Duraklat' : focus.left === focus.total ? 'Başlat' : 'Devam et';
    document.title = focus.running ? `${r.querySelector('b').textContent} · ${MODES[focus.mode][0]}` : 'Panel | Şevval Çikot';
  };
  V.focus = () => `
    <div class="card focus-wrap">
      <span class="seg">${Object.entries(MODES).map(([k, [n, mn]]) => `<button data-mode="${k}" aria-pressed="${focus.mode === k}">${n} · ${mn} dk</button>`).join('')}</span>
      <div class="ring"><svg viewBox="0 0 200 200"><circle class="bg" cx="100" cy="100" r="90"/><circle class="fg" cx="100" cy="100" r="90" stroke-dasharray="565.5"/></svg>
        <div class="read"><b>25:00</b><span>${MODES[focus.mode][0]}</span></div></div>
      <div class="row" style="justify-content:center"><button class="btn primary" data-start>Başlat</button><button class="btn" data-reset>Sıfırla</button></div>
      <p class="muted">Bugün tamamlanan odak oturumu: <b>${sessions()}</b> 🍅</p>
    </div>`;
  V.focus.bind = (root) => {
    $$('[data-mode]', root).forEach((b) => b.onclick = () => {
      clearInterval(focus.tmr); focus.running = false; focus.mode = b.dataset.mode; focus.total = focus.left = MODES[focus.mode][1] * 60; render();
    });
    $('[data-start]', root).onclick = () => {
      if (focus.running) { clearInterval(focus.tmr); focus.running = false; } else { if (focus.left <= 0) focus.left = focus.total; focus.tmr = setInterval(focusTick, 1000); focus.running = true; }
      paintFocus();
    };
    $('[data-reset]', root).onclick = () => { clearInterval(focus.tmr); focus.running = false; focus.left = focus.total; paintFocus(); };
    paintFocus();
  };

  /* ASİSTAN */
  const ctx = () => ({ name: NAME, events: st.events, tasks: st.tasks, notes: st.notes, schedule: schedule(), actions });
  V.assistant = () => {
    if (!st.chat.length) st.chat.push({ me: false, text: `Merhaba ${NAME}! 🐠 Ben kişisel asistanın. Bana günlerini sorabilir, sınav ya da görev ekletebilirsin. Örnekler için aşağıdaki kısayollara dokun ya da “yardım” yaz.` });
    return `
    <div class="card chat">
      <div class="msgs" data-msgs>${st.chat.map((m) => `<div class="msg ${m.me ? 'me' : 'bot'}">${esc(m.text)}</div>`).join('')}</div>
      <div class="sugg">${['Bugün neyim var?', 'Yarın', 'Bu hafta', 'Sıradaki ders', 'Sınavlarım', 'Görevlerim', 'Motivasyon', 'Yardım'].map((s) => `<button type="button" data-s="${s}">${s}</button>`).join('')}</div>
      <form data-chat><input type="text" name="q" placeholder="Bir şey sor ya da ekle… (ör. salı 10:00 vize ekle)" autocomplete="off" aria-label="Mesaj"><button class="btn primary">Gönder</button></form>
    </div>`;
  };
  V.assistant.bind = (root) => {
    const box = $('[data-msgs]', root); box.scrollTop = box.scrollHeight;
    const send = safe(async (q) => {
      if (!q.trim()) return;
      st.chat.push({ me: true, text: q }); render();
      const a = await A.reply(q, ctx()); st.chat.push({ me: false, text: a }); render();
      $('[data-chat] input').focus();
    });
    const f = $('[data-chat]', root);
    f.onsubmit = (e) => { e.preventDefault(); const q = f.q.value; f.q.value = ''; send(q); };
    $$('[data-s]', root).forEach((b) => b.onclick = () => send(b.dataset.s));
    f.q.focus();
  };

  /* ---------- CMS: ortak ---------- */
  const draft = (key) => { if (!st.draft[key]) st.draft[key] = clone(st.content[key] ?? null); return st.draft[key]; };
  const cmsBar = (key, note) => `
    <div class="card" style="margin-bottom:16px"><div class="row">
      <span class="hint" style="flex:1">${note}</span>
      <span class="dirty" data-dirty ${st.dirty[key] ? '' : 'hidden'}>● Kaydedilmemiş değişiklik</span>
      <button class="btn small" data-reset-content>Varsayılana dön</button>
      <button class="btn primary" data-save>Kaydet ve yayınla</button>
    </div></div>`;
  const bindCmsBar = (root, key, getData) => {
    $('[data-save]', root).onclick = safe(async () => {
      const data = getData ? getData() : st.draft[key];
      await S.setContent(key, data);
      st.content[key] = clone(data); st.draft[key] = null; st.dirty[key] = false;
      render(); toast('Kaydedildi — site güncellendi ✓');
    });
    $('[data-reset-content]', root).onclick = () => confirmBox('Bu bölüm, sitenin ilk hâline döndürülsün mü? Yaptığın değişiklikler silinir.', async () => {
      await S.resetContent(key); const seed = await S.seed();
      st.content[key] = clone(seed[key]); st.draft[key] = null; st.dirty[key] = false; render(); toast('Varsayılan içerik geri yüklendi');
    }, 'Varsayılana dön');
  };
  const imgPick = (name, value, label) => `
    <label>${label}<div class="img-pick"><img src="${esc(S.imageUrl(value))}" alt="" data-prev="${name}" ${value ? '' : 'style="opacity:.3"'}>
      <div style="flex:1;display:grid;gap:6px"><input type="file" accept="image/*" data-file="${name}"><span class="hint" data-st="${name}">${value ? 'Mevcut görsel kullanılıyor' : 'Görsel seç'}</span></div></div>
      <input type="hidden" name="${name}" value="${esc(value || '')}"></label>`;
  const bindImgPick = (form) => {
    $$('[data-file]', form).forEach((inp) => inp.onchange = async () => {
      const f = inp.files[0]; if (!f) return;
      const name = inp.dataset.file, stEl = form.querySelector(`[data-st="${name}"]`), sub = form.querySelector('[type=submit]');
      stEl.textContent = 'Yükleniyor…'; sub.disabled = true;
      try {
        const url = await S.upload(f);
        form.querySelector(`[name="${name}"]`).value = url;
        const p = form.querySelector(`[data-prev="${name}"]`); p.src = S.imageUrl(url); p.style.opacity = 1;
        stEl.textContent = 'Yüklendi ✓';
      } catch (e) { stEl.textContent = 'Hata: ' + e.message; } finally { sub.disabled = false; }
    });
  };
  const listItem = (img, title, meta, i, n) => `
    <div class="cms-item" data-i="${i}"><img src="${esc(S.imageUrl(img))}" alt="">
      <div class="grow"><div class="title">${esc(title)}</div><div class="meta">${esc(meta)}</div></div>
      <div class="cms-actions"><button class="icon-btn" data-up ${i === 0 ? 'disabled' : ''} title="Yukarı">↑</button><button class="icon-btn" data-down ${i === n - 1 ? 'disabled' : ''} title="Aşağı">↓</button>
      <button class="icon-btn" data-edit title="Düzenle">✎</button><button class="icon-btn" data-del title="Sil">✕</button></div></div>`;
  const bindList = (root, key, arr, edit, label) => {
    $$('[data-i]', root).forEach((row) => {
      const i = +row.dataset.i;
      row.querySelector('[data-up]').onclick = () => { [arr[i - 1], arr[i]] = [arr[i], arr[i - 1]]; markDirty(key); render(); };
      row.querySelector('[data-down]').onclick = () => { [arr[i + 1], arr[i]] = [arr[i], arr[i + 1]]; markDirty(key); render(); };
      row.querySelector('[data-edit]').onclick = () => edit(arr[i], i);
      row.querySelector('[data-del]').onclick = () => confirmBox(`“${label(arr[i])}” silinsin mi? (Kaydet'e basınca sitede de silinir.)`, async () => { arr.splice(i, 1); markDirty(key); render(); });
    });
  };

  /* PROJELER */
  V.projects = () => {
    const arr = draft('projects') || [];
    return `${cmsBar('projects', 'Projeler sitede Anasayfa ve Projeler sayfasında görünür. Sırayı oklarla değiştirebilirsin.')}
      <div class="card"><h2>Projeler <small>${arr.length} proje</small><button class="btn small primary" data-new>+ Yeni proje</button></h2>
      <div class="cms-list">${arr.map((p, i) => listItem(p.img, p.title.tr, `${CATS[p.cat] || p.cat} · ${p.desc.tr}`, i, arr.length)).join('') || '<p class="empty">Proje yok.</p>'}</div></div>`;
  };
  const projectModal = (p, i) => {
    const arr = draft('projects');
    const x = p || { id: 'p' + Date.now().toString(36), title: { tr: '', en: '' }, desc: { tr: '', en: '' }, cat: 'design', img: '', img2: '', pair: 'before' };
    const form = modal(p ? 'Projeyi düzenle' : 'Yeni proje', `
      <div class="form-grid">
        <div class="two"><label>Başlık (TR)<input type="text" name="ttr" required value="${esc(x.title.tr)}"></label><label>Başlık (EN)<input type="text" name="ten" value="${esc(x.title.en)}"></label></div>
        <label>Açıklama (TR)<textarea name="dtr" required>${esc(x.desc.tr)}</textarea></label>
        <label>Açıklama (EN)<textarea name="den">${esc(x.desc.en)}</textarea></label>
        <label>Kategori<select name="cat">${Object.entries(CATS).map(([k, v]) => `<option value="${k}" ${x.cat === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        ${imgPick('img', x.img, 'Ana görsel (sonuç)')}
        ${imgPick('img2', x.img2, 'İkinci görsel (isteğe bağlı)')}
        <label>İkinci görsel ne?<select name="pair"><option value="before" ${x.pair !== 'layers' ? 'selected' : ''}>Öncesi (yan yana: Öncesi | Sonrası)</option><option value="layers" ${x.pair === 'layers' ? 'selected' : ''}>Katmanlar ekran görüntüsü</option></select></label>
      </div>`, async (fd) => {
      if (!fd.get('img')) throw new Error('Ana görsel gerekli.');
      Object.assign(x, { title: { tr: fd.get('ttr').trim(), en: fd.get('ten').trim() || fd.get('ttr').trim() },
        desc: { tr: fd.get('dtr').trim(), en: fd.get('den').trim() || fd.get('dtr').trim() }, cat: fd.get('cat'), img: fd.get('img'), img2: fd.get('img2'), pair: fd.get('pair') });
      if (!p) arr.push(x);
      markDirty('projects'); render();
    }, { submit: p ? 'Tamam' : 'Ekle' });
    bindImgPick(form);
  };
  V.projects.bind = (root) => {
    bindCmsBar(root, 'projects');
    $('[data-new]', root).onclick = () => projectModal();
    bindList(root, 'projects', draft('projects'), projectModal, (p) => p.title.tr);
  };

  /* GALERİ */
  const POS = { center: 'Ortala', 'center 20%': 'Üst kısım', 'center 80%': 'Alt kısım' };
  V.gallery = () => {
    const arr = draft('gallery') || [];
    return `${cmsBar('gallery', 'Galeri fotoğrafları. İlk fotoğraflar Anasayfadaki kayan şeritte de görünür.')}
      <div class="card"><h2>Fotoğraflar <small>${arr.length} fotoğraf</small><button class="btn small primary" data-new>+ Fotoğraf ekle</button></h2>
      <div class="cms-list">${arr.map((g, i) => listItem(g.img, g.title.tr, g.title.en, i, arr.length)).join('') || '<p class="empty">Fotoğraf yok.</p>'}</div></div>`;
  };
  const galleryModal = (g, i) => {
    const arr = draft('gallery');
    const x = g || { id: 'g' + Date.now().toString(36), img: '', title: { tr: '', en: '' }, pos: 'center' };
    const form = modal(g ? 'Fotoğrafı düzenle' : 'Fotoğraf ekle', `
      <div class="form-grid">
        ${imgPick('img', x.img, 'Fotoğraf')}
        <div class="two"><label>Başlık (TR)<input type="text" name="ttr" required value="${esc(x.title.tr)}"></label><label>Başlık (EN)<input type="text" name="ten" value="${esc(x.title.en)}"></label></div>
        <label>Kartta hangi kısım görünsün?<select name="pos">${Object.entries(POS).map(([k, v]) => `<option value="${k}" ${(x.pos || 'center') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
      </div>`, async (fd) => {
      if (!fd.get('img')) throw new Error('Fotoğraf seçmelisin.');
      Object.assign(x, { img: fd.get('img'), title: { tr: fd.get('ttr').trim(), en: fd.get('ten').trim() || fd.get('ttr').trim() }, pos: fd.get('pos') });
      if (!g) arr.push(x);
      markDirty('gallery'); render();
    }, { submit: g ? 'Tamam' : 'Ekle' });
    bindImgPick(form);
  };
  V.gallery.bind = (root) => {
    bindCmsBar(root, 'gallery');
    $('[data-new]', root).onclick = () => galleryModal();
    bindList(root, 'gallery', draft('gallery'), galleryModal, (g) => g.title.tr);
  };

  /* HAKKIMDA */
  V.about = () => {
    const a = draft('about') || { tr: [], en: [] };
    return `${cmsBar('about', 'Paragrafları boş bir satırla ayır. İlk iki paragraf Anasayfada da görünür.')}
      <div class="grid two">
        <div class="card"><h2>Türkçe</h2><textarea data-lang="tr" style="min-height:360px">${esc(a.tr.join('\n\n'))}</textarea></div>
        <div class="card"><h2>English</h2><textarea data-lang="en" style="min-height:360px">${esc(a.en.join('\n\n'))}</textarea></div>
      </div>
      <p class="hint" style="margin-top:10px">İzin verilen biçimler: &lt;strong&gt;kalın&lt;/strong&gt;, &lt;em&gt;eğik&lt;/em&gt;, &lt;abbr title="..."&gt;kısaltma&lt;/abbr&gt;, &lt;a href="https://..."&gt;bağlantı&lt;/a&gt;. Diğer etiketler sitede gösterilmez.</p>`;
  };
  V.about.bind = (root) => {
    const read = () => ({ tr: $('[data-lang=tr]', root).value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean),
      en: $('[data-lang=en]', root).value.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean) });
    $$('textarea', root).forEach((t) => t.oninput = () => { st.draft.about = read(); markDirty('about'); });
    bindCmsBar(root, 'about', read);
  };

  /* YETENEKLER + İLGİ ALANLARI */
  V.skills = () => {
    const sk = draft('skills') || [], it = draft('interests') || { tr: [], en: [] };
    return `${cmsBar('skills', 'Yetenek yüzdeleri Hakkımda sayfasındaki çubuklarda, en yüksek olanlar da “En güçlü yeteneklerim” listesinde görünür.')}
      <div class="grid">
        <div class="card"><h2>Yetenekler <button class="btn small primary" data-new>+ Yetenek</button></h2>
          <div class="list">${sk.map((s, i) => `<div class="skill-edit" data-i="${i}"><input type="text" value="${esc(s.name)}" data-name aria-label="Yetenek adı">
            <input type="range" min="0" max="100" step="5" value="${+s.value}" data-val aria-label="Seviye"><output>%${+s.value}</output>
            <button class="icon-btn" data-del title="Sil">✕</button></div>`).join('') || '<p class="empty">Yetenek yok.</p>'}</div></div>
        <div class="grid two">
          <div class="card"><h2>İlgi alanları (TR)</h2><textarea data-int="tr" placeholder="Her satıra bir tane">${esc(it.tr.join('\n'))}</textarea></div>
          <div class="card"><h2>Interests (EN)</h2><textarea data-int="en" placeholder="One per line">${esc(it.en.join('\n'))}</textarea></div>
        </div>
      </div>`;
  };
  V.skills.bind = (root) => {
    const sk = draft('skills'), it = draft('interests');
    $$('[data-i]', root).forEach((row) => {
      const s = sk[+row.dataset.i];
      row.querySelector('[data-name]').oninput = (e) => { s.name = e.target.value; markDirty('skills'); };
      row.querySelector('[data-val]').oninput = (e) => { s.value = +e.target.value; row.querySelector('output').textContent = '%' + s.value; markDirty('skills'); };
      row.querySelector('[data-del]').onclick = () => { sk.splice(+row.dataset.i, 1); markDirty('skills'); render(); };
    });
    $('[data-new]', root).onclick = () => { sk.push({ name: 'Yeni yetenek', value: 50 }); markDirty('skills'); render(); };
    $$('[data-int]', root).forEach((t) => t.oninput = () => { it[t.dataset.int] = t.value.split('\n').map((x) => x.trim()).filter(Boolean); markDirty('skills'); });
    // tek "Kaydet" iki anahtarı birden kaydeder
    $('[data-save]', root).onclick = safe(async () => {
      const skills = sk.filter((s) => s.name.trim()).map((s) => ({ name: s.name.trim(), value: Math.max(0, Math.min(100, +s.value || 0)) }));
      await S.setContent('skills', skills); await S.setContent('interests', it);
      st.content.skills = clone(skills); st.content.interests = clone(it); st.draft.skills = st.draft.interests = null; st.dirty.skills = false;
      render(); toast('Kaydedildi — site güncellendi ✓');
    });
    $('[data-reset-content]', root).onclick = () => confirmBox('Yetenekler ve ilgi alanları ilk hâline dönsün mü?', async () => {
      await S.resetContent('skills'); await S.resetContent('interests'); const seed = await S.seed();
      st.content.skills = clone(seed.skills); st.content.interests = clone(seed.interests); st.draft.skills = st.draft.interests = null; st.dirty.skills = false; render();
    }, 'Varsayılana dön');
  };

  /* SÖZ */
  V.quote = () => {
    const q = draft('quote') || { text: { tr: '', en: '' }, cite: '' };
    return `${cmsBar('quote', 'Hakkımda sayfasının sonundaki “Sevdiğim bir söz” bölümü.')}
      <div class="card form-grid">
        <label>Söz (TR)<textarea data-q="tr">${esc(q.text.tr)}</textarea></label>
        <label>Quote (EN)<textarea data-q="en">${esc(q.text.en)}</textarea></label>
        <label>Kimin sözü<input type="text" data-q="cite" value="${esc(q.cite)}"></label>
      </div>`;
  };
  V.quote.bind = (root) => {
    const q = draft('quote');
    $$('[data-q]', root).forEach((el) => el.oninput = () => { if (el.dataset.q === 'cite') q.cite = el.value; else q.text[el.dataset.q] = el.value; markDirty('quote'); });
    bindCmsBar(root, 'quote');
  };

  /* ---------- çatı ---------- */
  function render() {
    const v = st.view, root = $('#view');
    $('#view-title').textContent = TITLES[v];
    $$('.side nav button').forEach((b) => b.classList.toggle('active', b.dataset.view === v));
    const y = scrollY;
    root.innerHTML = V[v]();
    if (V[v].bind) V[v].bind(root);
    $$('[data-go]', root).forEach((b) => b.onclick = () => go(b.dataset.go));
    scrollTo(0, y);
  }
  function go(v) {
    if (!V[v]) v = 'today';
    st.view = v; if (location.hash !== '#' + v) history.replaceState(null, '', '#' + v);
    $('#side').classList.remove('open'); $('#menu').setAttribute('aria-expanded', 'false');
    scrollTo(0, 0); render();
  }

  /* hatırlatıcılar: 15 dk kala bildirim (sayfa açıkken) */
  const notified = new Set();
  const notify = (msg) => { try { if ('Notification' in window && Notification.permission === 'granted') new Notification('Şevval\'in Ajandası', { body: msg, icon: 'assets/images/avatar.jpg' }); } catch (e) { /* */ } };
  const checkReminders = () => {
    const now = new Date(), ts = A.ymd(now), mins = now.getHours() * 60 + now.getMinutes();
    st.events.filter((e) => e.date === ts && e.time).forEach((e) => {
      const diff = A.toMin(e.time) - mins;
      if (diff >= 0 && diff <= 15 && !notified.has(e.id)) { notified.add(e.id); const m = `${e.time} — ${e.title} (${diff} dk kaldı)`; toast('⏰ ' + m); notify(m); }
    });
    const c = A.classesOn(now, schedule()).find((x) => { const d = A.toMin(x.start) - mins; return d >= 0 && d <= 10; });
    if (c && !notified.has('c' + ts + c.start)) { notified.add('c' + ts + c.start); const m = `${c.start} — ${c.name} · ${c.room}`; toast('📚 ' + m); notify('Ders yaklaşıyor: ' + m); }
  };

  async function loadAll() {
    const [content, events, tasks, notes] = await Promise.all([S.getContentMerged(), S.list('events'), S.list('tasks'), S.list('notes')]);
    Object.assign(st, { content, events, tasks, notes });
  }

  async function showApp() {
    $('#login').hidden = true; $('#app').hidden = false;
    const mode = $('#mode');
    mode.textContent = S.online ? 'Supabase bağlı' : 'Demo modu (bu tarayıcı)';
    mode.classList.toggle('online', S.online);
    $('#demo-banner').hidden = S.online;
    $('#logout').hidden = !S.online;
    $('#view').innerHTML = '<p class="empty">Yükleniyor…</p>';
    await loadAll();
    go(location.hash.slice(1) || 'today');
    const tick = () => { $('#clock').textContent = new Date().toLocaleString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }); };
    tick(); setInterval(tick, 15000);
    checkReminders(); setInterval(checkReminders, 60000);
    if ('Notification' in window && Notification.permission === 'default') {
      setTimeout(() => toast('İpucu: Takvim hatırlatıcıları için tarayıcı bildirimlerine izin verebilirsin.'), 1500);
      document.addEventListener('click', function ask() { try { Notification.requestPermission(); } catch (e) { /* */ } document.removeEventListener('click', ask); }, { once: true });
    }
  }

  /* ---------- açılış ---------- */
  $('#menu').onclick = () => { const o = $('#side').classList.toggle('open'); $('#menu').setAttribute('aria-expanded', o); };
  document.addEventListener('click', (e) => { const sd = $('#side'); if (sd.classList.contains('open') && !sd.contains(e.target) && e.target !== $('#menu')) sd.classList.remove('open'); });
  $$('.side nav button').forEach((b) => b.onclick = () => go(b.dataset.view));
  addEventListener('hashchange', () => { const v = location.hash.slice(1); if (v && v !== st.view) go(v); });
  $('#logout').onclick = safe(async () => { await S.auth.signOut(); location.reload(); });
  $('#login-form').onsubmit = async (e) => {
    e.preventDefault();
    const f = e.target, err = $('#login-error'), btn = f.querySelector('button'); err.textContent = ''; btn.disabled = true;
    try { await S.auth.signIn(f.email.value.trim(), f.password.value); await showApp(); }
    catch (x) { err.textContent = /invalid/i.test(x.message) ? 'E-posta ya da şifre hatalı.' : x.message; }
    finally { btn.disabled = false; }
  };

  (async () => {
    try {
      const user = await S.auth.user();
      if (user) await showApp(); else { $('#login').hidden = false; $('#login-form').email.focus(); }
    } catch (e) {
      console.error(e);
      $('#login').hidden = false;
      $('#login-error').textContent = 'Veritabanına bağlanılamadı: ' + e.message;
    }
  })();
})();
