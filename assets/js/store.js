'use strict';

/* Veri katmanı: Supabase (online) ya da tarayıcı (demo).
   Site (cms.js) ve yönetim paneli (panel.js) aynı arayüzü kullanır. */

(() => {
  const SUPABASE_CDN = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.97.0';
  const cfg = window.SITE_CONFIG || {};
  const online = !!(cfg.supabaseUrl && cfg.supabaseKey);
  const ROOT = new URL('../../', document.currentScript.src).href;   // sitenin kök klasörü
  const LS = 'sevval-cms:';

  const ls = {
    get(k, d) { try { const v = localStorage.getItem(LS + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(LS + k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  };
  const uid = () => (crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2));

  const loadScript = (src) => new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = src; s.onload = res; s.onerror = () => rej(new Error('Betik yüklenemedi: ' + src));
    document.head.appendChild(s);
  });

  /* görseli küçült (en uzun kenar 1400px, JPEG) — hem yükleme hem depolama için */
  const shrink = (file, max = 1400, q = 0.82) => new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => (b ? res(b) : rej(new Error('Görsel işlenemedi'))), 'image/jpeg', q);
      URL.revokeObjectURL(img.src);
    };
    img.onerror = () => rej(new Error('Bu dosya görsel olarak açılamadı'));
    img.src = URL.createObjectURL(file);
  });
  const blobToDataURL = (b) => new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(b); });

  let sb = null;
  let seedCache = null;

  const Store = {
    online,
    root: ROOT,

    /* görsel yolu → tam adres ("projeler/x.jpg", "https://...", "data:...") */
    imageUrl(p) {
      if (!p) return '';
      if (/^(https?:|data:|blob:)/.test(p)) return p;
      return ROOT + 'assets/images/' + p;
    },

    async init() {
      if (!online || sb) return this;
      if (!window.supabase) await loadScript(SUPABASE_CDN);
      sb = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseKey);
      return this;
    },

    async seed() {
      if (seedCache) return seedCache;
      if (window.SITE_SEED) { seedCache = window.SITE_SEED; return seedCache; }
      const r = await fetch(ROOT + 'assets/data/content.json');
      seedCache = await r.json();
      return seedCache;
    },

    /* ---------- site içeriği ---------- */
    async getAllContent() {
      if (!online) return ls.get('content', {});
      await this.init();
      const { data, error } = await sb.from('site_content').select('key,data');
      if (error) throw error;
      const out = {};
      (data || []).forEach((r) => { out[r.key] = r.data; });
      return out;
    },
    async getContentMerged() {     // kayıtlı içerik + eksik anahtarlar için başlangıç verisi
      const [seed, saved] = await Promise.all([this.seed(), this.getAllContent().catch(() => ({}))]);
      return Object.assign({}, seed, saved);
    },
    async setContent(key, data) {
      if (!online) {
        const all = ls.get('content', {}); all[key] = data;
        if (!ls.set('content', all)) throw new Error('Tarayıcı depolama alanı doldu. Daha küçük görseller kullan ya da Supabase kur.');
        return;
      }
      await this.init();
      const { error } = await sb.from('site_content').upsert({ key, data, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    async resetContent(key) {
      if (!online) { const all = ls.get('content', {}); delete all[key]; ls.set('content', all); return; }
      await this.init();
      const { error } = await sb.from('site_content').delete().eq('key', key);
      if (error) throw error;
    },

    /* ---------- ajanda tabloları: events, tasks, notes ---------- */
    async list(table) {
      if (!online) return ls.get(table, []);
      await this.init();
      const { data, error } = await sb.from(table).select('*').order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    async insert(table, row) {
      const rec = Object.assign({ id: uid(), created_at: new Date().toISOString() }, row);
      if (!online) { const a = ls.get(table, []); a.push(rec); ls.set(table, a); return rec; }
      await this.init();
      delete rec.id; delete rec.created_at;
      const { data, error } = await sb.from(table).insert(rec).select().single();
      if (error) throw error;
      return data;
    },
    async update(table, id, patch) {
      if (!online) { const a = ls.get(table, []).map((r) => (r.id === id ? Object.assign({}, r, patch) : r)); ls.set(table, a); return; }
      await this.init();
      const { error } = await sb.from(table).update(patch).eq('id', id);
      if (error) throw error;
    },
    async remove(table, id) {
      if (!online) { ls.set(table, ls.get(table, []).filter((r) => r.id !== id)); return; }
      await this.init();
      const { error } = await sb.from(table).delete().eq('id', id);
      if (error) throw error;
    },

    /* ---------- görsel yükleme ---------- */
    async upload(file) {
      const blob = await shrink(file);
      if (!online) return blobToDataURL(blob);
      await this.init();
      const path = `${new Date().getFullYear()}/${uid()}.jpg`;
      const { error } = await sb.storage.from('media').upload(path, blob, { contentType: 'image/jpeg', upsert: false });
      if (error) throw error;
      return sb.storage.from('media').getPublicUrl(path).data.publicUrl;
    },

    /* ---------- oturum ---------- */
    auth: {
      async user() {
        if (!online) return { email: 'demo' };
        await Store.init();
        const { data } = await sb.auth.getSession();
        return data.session ? data.session.user : null;
      },
      async signIn(email, password) {
        await Store.init();
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data.user;
      },
      async signOut() { if (online) { await Store.init(); await sb.auth.signOut(); } },
    },
  };

  window.Store = Store;
})();
