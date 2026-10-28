'use strict';

/* Kişisel asistan: tarih yardımcıları + kural tabanlı Türkçe komut anlama.
   Harici yapay zekâ servisi kullanmaz; her şey tarayıcıda çalışır. */

(() => {
  const MONTHS = ['ocak', 'şubat', 'mart', 'nisan', 'mayıs', 'haziran', 'temmuz', 'ağustos', 'eylül', 'ekim', 'kasım', 'aralık'];
  const MONTHS_UP = MONTHS.map((m) => m[0].toLocaleUpperCase('tr') + m.slice(1));
  const DAYS = ['pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi', 'pazar'];          // 0 = pazartesi
  const DAYS_UP = DAYS.map((d) => d[0].toLocaleUpperCase('tr') + d.slice(1));
  const TYPES = { sinav: 'Sınav', odev: 'Ödev', etkinlik: 'Etkinlik', kisisel: 'Kişisel' };

  /* Türkçe harfleri de tanıyan kelime sınırı (JS'teki \b yalnızca İngilizce harfleri tanır) */
  const BOUND = '(?:(?<![\\p{L}\\d])(?=[\\p{L}\\d])|(?<=[\\p{L}\\d])(?![\\p{L}\\d]))';
  const W = (src, flags = '') => new RegExp(src.replace(/\\b/g, BOUND), flags + 'u');

  const pad = (n) => String(n).padStart(2, '0');
  const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const today = () => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; };
  const dow = (d) => (d.getDay() + 6) % 7;                     // pazartesi = 0
  const daysUntil = (s) => Math.round((parse(s) - today()) / 864e5);
  const fmt = (s, withDay = true) => {
    const d = parse(s);
    return `${d.getDate()} ${MONTHS_UP[d.getMonth()]}${withDay ? ' ' + DAYS_UP[dow(d)] : ''}`;
  };
  const rel = (s) => {
    const n = daysUntil(s);
    if (n === 0) return 'bugün'; if (n === 1) return 'yarın'; if (n === -1) return 'dün';
    if (n > 1 && n < 7) return DAYS_UP[dow(parse(s))];
    return fmt(s, false);
  };
  const label = (s) => {
    const n = daysUntil(s);
    return n === 0 ? `Bugün, ${fmt(s)}` : n === 1 ? `Yarın, ${fmt(s)}` : n === -1 ? `Dün, ${fmt(s)}` : fmt(s);
  };
  const toMin = (t) => { if (!t) return 9999; const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const classesOn = (date, schedule) => {
    const i = dow(date);
    return i > 4 ? [] : (schedule || []).filter((c) => c.day === i).sort((a, b) => toMin(a.start) - toMin(b.start));
  };
  const sortEv = (a, b) => (a.date === b.date ? toMin(a.time) - toMin(b.time) : a.date < b.date ? -1 : 1);

  /* ---------- metinden tarih / saat ---------- */
  const low = (s) => s.toLocaleLowerCase('tr');
  function findDate(text) {
    const t = low(text);
    const base = today();
    let m;
    if (W(String.raw`\bbugün\b`).test(t)) return { date: ymd(base), match: 'bugün' };
    if (W(String.raw`\b(öbür gün|ertesi gün)\b`).test(t)) return { date: ymd(addDays(base, 2)), match: t.match(W(String.raw`\b(öbür gün|ertesi gün)\b`))[0] };
    if (W(String.raw`\byarın\b`).test(t)) return { date: ymd(addDays(base, 1)), match: 'yarın' };
    if ((m = t.match(/\b(\d{1,2})[./](\d{1,2})(?:[./](\d{2,4}))?\b/))) {
      let y = m[3] ? +m[3] : base.getFullYear(); if (y < 100) y += 2000;
      const d = new Date(y, +m[2] - 1, +m[1]);
      if (!m[3] && d < base) d.setFullYear(y + 1);
      if (!isNaN(d)) return { date: ymd(d), match: m[0] };
    }
    const mre = W(`\\b(\\d{1,2})\\s+(${MONTHS.join('|')})(?:\\s+(\\d{4}))?`);
    if ((m = t.match(mre))) {
      let y = m[3] ? +m[3] : base.getFullYear();
      const d = new Date(y, MONTHS.indexOf(m[2]), +m[1]);
      if (!m[3] && d < base) d.setFullYear(y + 1);
      return { date: ymd(d), match: m[0] };
    }
    const dre = W(`\\b(haftaya\\s+)?(${DAYS.join('|')})(?:ya|ye|a|e|ı|i|u|ü)?\\b`);
    if ((m = t.match(dre))) {
      const target = DAYS.indexOf(m[2]);
      let diff = (target - dow(base) + 7) % 7;
      if (m[1]) diff += diff === 0 ? 7 : 7;
      return { date: ymd(addDays(base, diff)), match: m[0] };
    }
    if (W(String.raw`\bbu hafta\b`).test(t)) return { week: true, match: 'bu hafta' };
    return null;
  }
  function findTime(text) {
    const t = low(text);
    let m = t.match(W(String.raw`\b([01]?\d|2[0-3])[:.]([0-5]\d)\b`));
    if (m) return { time: `${pad(m[1])}:${m[2]}`, match: m[0] };
    m = t.match(W(String.raw`\bsaat\s+([01]?\d|2[0-3])\b`));
    if (m) return { time: `${pad(m[1])}:00`, match: m[0] };
    return null;
  }
  function guessType(text) {
    const t = low(text);
    if (/(sınav|vize|final|quiz|bütünleme)/.test(t)) return 'sinav';
    if (/(ödev|teslim|rapor|proje)/.test(t)) return 'odev';
    if (/(doğum günü|buluşma|randevu|doktor|kahve|yemek|aile)/.test(t)) return 'kisisel';
    return 'etkinlik';
  }
  const cleanTitle = (text, ...parts) => {
    let s = text;
    parts.filter(Boolean).forEach((p) => { s = s.replace(new RegExp(p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), ' '); });
    s = s.replace(W(String.raw`\b(etkinlik|hatırlatıcı|hatırlat|ekle|kaydet|oluştur|için|da|de|saat)\b`, 'gi'), ' ').replace(/^[\s:,-]+|[\s:,-]+$/g, '').replace(/\s{2,}/g, ' ');
    return s ? s[0].toLocaleUpperCase('tr') + s.slice(1) : s;
  };

  /* ---------- cevap üretici ---------- */
  const QUOTES = [
    '“Ders alınmış başarısızlık, aslında bir başarıdır.” — Edwin Land',
    'Küçük adımlar da ilerlemedir. Bugün sadece bir görevi bitirsen bile kazandın. 🌊',
    'Derin bir nefes al: 25 dakikalık bir odak oturumu başlatmaya ne dersin? (Odak sekmesi)',
    '“Başlamak için mükemmel olmak zorunda değilsin; mükemmel olmak için başlamak zorundasın.”',
  ];
  const line = (e) => `• ${e.time ? e.time + ' ' : ''}${e.title}${e.type ? ' (' + (TYPES[e.type] || e.type) + ')' : ''}`;

  function daySummary(date, ctx) {
    const s = ymd(date);
    const cls = classesOn(date, ctx.schedule);
    const evs = ctx.events.filter((e) => e.date === s).sort(sortEv);
    const tks = ctx.tasks.filter((t) => !t.done && t.due === s);
    const head = `${label(s)}:`;
    const parts = [head];
    parts.push(cls.length ? '📚 Dersler:\n' + cls.map((c) => `• ${c.start}–${c.end} ${c.name} · ${c.room}`).join('\n') : '📚 Ders yok.');
    parts.push(evs.length ? '📅 Etkinlikler:\n' + evs.map(line).join('\n') : '📅 Etkinlik yok.');
    if (tks.length) parts.push('✅ Son günü olan görevler:\n' + tks.map((t) => `• ${t.title}`).join('\n'));
    return parts.join('\n\n');
  }

  function nextClass(ctx) {
    const now = new Date(); const mins = now.getHours() * 60 + now.getMinutes();
    const todays = classesOn(now, ctx.schedule);
    const cur = todays.find((c) => toMin(c.start) <= mins && mins < toMin(c.end));
    if (cur) return `Şu an dersteysin: ${cur.name} · ${cur.room}, ${cur.end}'de bitiyor.`;
    const nxt = todays.find((c) => toMin(c.start) > mins);
    if (nxt) return `Sıradaki dersin bugün ${nxt.start}'de: ${nxt.name} · ${nxt.room}.`;
    for (let i = 1; i <= 7; i++) {
      const d = addDays(today(), i); const c = classesOn(d, ctx.schedule)[0];
      if (c) return `Bugün başka dersin yok. Sıradaki: ${rel(ymd(d))} ${c.start}'de ${c.name} · ${c.room}.`;
    }
    return 'Ders programında ders bulamadım.';
  }

  async function reply(input, ctx) {
    const raw = input.trim();
    const t = low(raw);
    if (!t) return 'Bir şey yazmadın. 🙂 "yardım" yazarak neler yapabileceğimi görebilirsin.';

    // --- eylemler ---
    let m;
    if ((m = raw.match(/^(görev ekle|yapılacak ekle|todo)\s*[:\-]?\s*(.+)$/i)) || (m = raw.match(/^(görev|yapılacak)\s*[:\-]\s*(.+)$/i))) {
      const d = findDate(m[2]);
      const title = cleanTitle(m[2], d && d.match);
      await ctx.actions.addTask({ title, due: d && d.date ? d.date : null, priority: /(acil|önemli)/i.test(m[2]) ? 'yuksek' : 'orta' });
      return `Tamam, görevlerine ekledim: “${title}”${d && d.date ? ` (son gün: ${rel(d.date)})` : ''}. ✅`;
    }
    if ((m = raw.match(/^(not al|not ekle|not)\s*[:\-]\s*(.+)$/i)) || (m = raw.match(/^(not al)\s+(.+)$/i))) {
      await ctx.actions.addNote({ text: m[2] });
      return 'Notunu aldım. 📝 Notlar sekmesinde görebilirsin.';
    }
    const wantsAdd = W(String.raw`\b(ekle|kaydet|hatırlat|oluştur)\b`).test(t);
    if (wantsAdd) {
      const d = findDate(raw); const tm = findTime(d && d.match ? low(raw).replace(d.match, ' ') : raw);
      if (!d || !d.date) return 'Hangi gün olduğunu anlayamadım. Örnek: “cuma 14:00 matematik sınavı ekle” ya da “5 Kasım ödev teslimi ekle”.';
      const title = cleanTitle(raw, d.match, tm && tm.match) || 'Etkinlik';
      const type = guessType(raw);
      await ctx.actions.addEvent({ title, date: d.date, time: tm ? tm.time : null, type });
      return `Takvimine ekledim: ${label(d.date)}${tm ? ', ' + tm.time : ''} — ${title} [${TYPES[type]}]. 📅`;
    }

    // --- sorular ---
    if (/(yardım|neler yapabilirsin|komut|nasıl kullan)/.test(t)) {
      return [
        'Şunları yapabilirim:',
        '• “bugün” / “yarın” / “cuma” / “5 kasım” → o günün dersleri, etkinlikleri ve görevleri',
        '• “bu hafta” → önümüzdeki 7 gün',
        '• “sıradaki ders” → şu anki ya da sıradaki dersin',
        '• “sınavlarım” / “ödevlerim” → yaklaşanlar ve kalan gün',
        '• “görevlerim” → açık görevler',
        '• “görev ekle: sunumu hazırla yarın”',
        '• “not al: kütüphaneden kitabı al”',
        '• “cuma 14:00 matematik sınavı ekle”',
        '• “motivasyon” → biraz moral 🌊',
      ].join('\n');
    }
    if (/^(merhaba|selam|hey|günaydın|iyi akşamlar|iyi geceler)/.test(t)) {
      const h = new Date().getHours();
      const g = h < 11 ? 'Günaydın' : h < 18 ? 'Merhaba' : 'İyi akşamlar';
      return `${g} ${ctx.name}! 🌊 Bugün için özet istersen “bugün” yaz.`;
    }
    if (/(teşekkür|sağ ol|eyvallah|thanks)/.test(t)) return 'Rica ederim! Başka bir şey olursa buradayım. 🐠';
    if (/(motivasyon|moral|sıkıldım|yoruldum|stres)/.test(t)) return QUOTES[Math.floor(Math.random() * QUOTES.length)];
    if (W(String.raw`\bsaat kaç\b`).test(t)) return `Saat ${new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}.`;
    if (/(sıradaki ders|şimdi.*ders|ders.*şimdi|hangi dersteyim)/.test(t)) return nextClass(ctx);

    if (/sınav/.test(t)) {
      const ex = ctx.events.filter((e) => e.type === 'sinav' && daysUntil(e.date) >= 0).sort(sortEv);
      if (!ex.length) return 'Yaklaşan sınav görünmüyor. 🎉 Eklemek için: “12 kasım 10:00 web tasarım vizesi ekle”.';
      return 'Yaklaşan sınavların:\n' + ex.map((e) => `• ${fmt(e.date)}${e.time ? ' ' + e.time : ''} — ${e.title} (${daysUntil(e.date) === 0 ? 'bugün!' : daysUntil(e.date) + ' gün kaldı'})`).join('\n');
    }
    if (/ödev/.test(t)) {
      const ev = ctx.events.filter((e) => e.type === 'odev' && daysUntil(e.date) >= 0).sort(sortEv);
      const tk = ctx.tasks.filter((x) => !x.done && /ödev/i.test(x.title));
      if (!ev.length && !tk.length) return 'Görünen bir ödevin yok. 👏';
      return [ev.length ? 'Teslim tarihleri:\n' + ev.map((e) => `• ${fmt(e.date)} — ${e.title} (${daysUntil(e.date)} gün)`).join('\n') : '',
        tk.length ? 'Ödev görevleri:\n' + tk.map((x) => `• ${x.title}`).join('\n') : ''].filter(Boolean).join('\n\n');
    }
    if (/(görev|yapılacak)/.test(t)) {
      const open = ctx.tasks.filter((x) => !x.done).sort((a, b) => (a.due || '9') < (b.due || '9') ? -1 : 1);
      if (!open.length) return 'Açık görevin yok, harika! ✨';
      return `${open.length} açık görevin var:\n` + open.slice(0, 10).map((x) => `• ${x.title}${x.due ? ' — ' + rel(x.due) + (daysUntil(x.due) < 0 ? ' (gecikti)' : '') : ''}`).join('\n');
    }
    if (W(String.raw`\bnot(lar|larım|larımı)?\b`).test(t)) {
      if (!ctx.notes.length) return 'Henüz notun yok. “not al: …” yazarak ekleyebilirsin.';
      return 'Son notların:\n' + ctx.notes.slice(-5).reverse().map((n) => '• ' + n.text.split('\n')[0].slice(0, 80)).join('\n');
    }

    const d = findDate(raw);
    if (d && d.week) {
      const end = ymd(addDays(today(), 7));
      const evs = ctx.events.filter((e) => e.date >= ymd(today()) && e.date <= end).sort(sortEv);
      const tks = ctx.tasks.filter((x) => !x.done && x.due && x.due <= end);
      if (!evs.length && !tks.length) return 'Önümüzdeki 7 gün sakin görünüyor. 🌤';
      return 'Önümüzdeki 7 gün:\n' + evs.map((e) => `• ${rel(e.date)} ${e.time || ''} ${e.title}`.replace(/\s+/g, ' ')).join('\n') +
        (tks.length ? '\n\nSon günü yaklaşan görevler:\n' + tks.map((x) => `• ${x.title} (${rel(x.due)})`).join('\n') : '');
    }
    if (d && d.date) return daySummary(parse(d.date), ctx);
    if (/(ne var|neyim var|program|ders)/.test(t)) return daySummary(today(), ctx);

    return 'Bunu tam anlayamadım. 🙈 “yardım” yazarak örnek komutları görebilirsin.';
  }

  window.AG = { label, MONTHS_UP, DAYS_UP, TYPES, ymd, parse, addDays, today, dow, daysUntil, fmt, rel, toMin, classesOn, sortEv, findDate, findTime, reply };
})();
