-- =========================================================
-- Şevval Çikot — web sitesi CMS + kişisel ajanda veritabanı
-- Supabase → SQL Editor → New query → bu dosyanın tamamını yapıştır → Run
-- =========================================================

-- 1) Site içeriği (projeler, galeri, hakkımda, yetenekler, söz...)
create table if not exists public.site_content (
  key        text primary key,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- 2) Ajanda: etkinlikler (sınav, ödev, etkinlik, kişisel)
create table if not exists public.events (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  date       date not null,
  time       text,
  end_time   text,
  type       text not null default 'etkinlik',
  note       text default '',
  created_at timestamptz not null default now()
);

-- 3) Ajanda: görevler
create table if not exists public.tasks (
  id         uuid primary key default gen_random_uuid(),
  title      text not null,
  done       boolean not null default false,
  priority   text not null default 'orta',
  due        date,
  created_at timestamptz not null default now()
);

-- 4) Ajanda: notlar
create table if not exists public.notes (
  id         uuid primary key default gen_random_uuid(),
  text       text not null default '',
  color      text,
  created_at timestamptz not null default now()
);

-- 5) Güvenlik (RLS): site içeriğini herkes OKUYABİLİR, yalnızca giriş yapan DEĞİŞTİREBİLİR.
--    Ajanda tablolarını yalnızca giriş yapan kullanıcı görebilir.
alter table public.site_content enable row level security;
alter table public.events       enable row level security;
alter table public.tasks        enable row level security;
alter table public.notes        enable row level security;

drop policy if exists "icerik herkese acik okunur" on public.site_content;
create policy "icerik herkese acik okunur" on public.site_content for select using (true);
drop policy if exists "icerigi giris yapan yazar" on public.site_content;
create policy "icerigi giris yapan yazar" on public.site_content for all to authenticated using (true) with check (true);

drop policy if exists "etkinlikler sadece giris" on public.events;
create policy "etkinlikler sadece giris" on public.events for all to authenticated using (true) with check (true);
drop policy if exists "gorevler sadece giris" on public.tasks;
create policy "gorevler sadece giris" on public.tasks for all to authenticated using (true) with check (true);
drop policy if exists "notlar sadece giris" on public.notes;
create policy "notlar sadece giris" on public.notes for all to authenticated using (true) with check (true);

-- Data API erişim izinleri ("Automatically expose new tables" kapalıysa da çalışsın diye)
grant usage on schema public to anon, authenticated;
grant select on public.site_content to anon;
grant select, insert, update, delete on public.site_content, public.events, public.tasks, public.notes to authenticated;

-- 6) Görseller için depolama alanı (panelden yüklenen fotoğraflar)
insert into storage.buckets (id, name, public) values ('media', 'media', true)
on conflict (id) do update set public = true;

drop policy if exists "medya herkese acik" on storage.objects;
create policy "medya herkese acik" on storage.objects for select using (bucket_id = 'media');
drop policy if exists "medya giris yapan yukler" on storage.objects;
create policy "medya giris yapan yukler" on storage.objects for insert to authenticated with check (bucket_id = 'media');
drop policy if exists "medya giris yapan siler" on storage.objects;
create policy "medya giris yapan siler" on storage.objects for delete to authenticated using (bucket_id = 'media');
