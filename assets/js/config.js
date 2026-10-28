/* ============================================================
   SİTE AYARLARI
   Supabase projesini kurduktan sonra aşağıdaki iki değeri doldur.
   (Supabase → Project Settings → API / Data API)
   - supabaseUrl : "Project URL"            ör. https://abcdxyz.supabase.co
   - supabaseKey : "anon public" veya "publishable" anahtar (sb_publishable_... ya da eyJ... ile başlar)

   Bu anahtar herkese açık olacak şekilde tasarlanmıştır; güvenliği
   veritabanındaki RLS kuralları (supabase-kurulum.sql) sağlar.
   "service_role" / "secret" anahtarını ASLA buraya yazma.

   Boş bırakılırsa panel "Demo modu"nda çalışır: veriler yalnızca
   o tarayıcıda saklanır, başka cihazda görünmez.
   ============================================================ */
window.SITE_CONFIG = {
  supabaseUrl: "https://ncjisnkgqdhjefdgghwy.supabase.co",
  supabaseKey: "sb_publishable_4qotW4Ljqt6KvRbpi9mccA_WV-y3iz2",
};
