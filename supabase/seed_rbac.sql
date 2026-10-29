-- ==============================================================================
-- BEMS POLRESTA BANDAR LAMPUNG - DATABASE SEEDING & RBAC
-- Role: 
--   1. 'admin'  : Command Center SPKT Polresta (Akses Penuh: Tambah, Edit, Hapus)
--   2. 'polsek' : Kantor Polsek Wilayah (Akses Pantau/Operasional, TIDAK BISA HAPUS)
-- ==============================================================================

-- 1. Pastikan ekstensi pgcrypto aktif untuk enkripsi password
create extension if not exists pgcrypto;

-- 2. Buat tabel public.profiles untuk menyimpan role dan metadata RBAC
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null check (role in ('admin', 'polsek')),
  polsek_id text,
  polsek_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Aktifkan Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Policy: Pengguna yang telah login dapat membaca profilnya sendiri
drop policy if exists "Users can view own profile" on public.profiles;
create policy "Users can view own profile" 
on public.profiles for select 
using (auth.uid() = id);

-- Policy: Admin dapat melihat seluruh profil pengguna
drop policy if exists "Admins can view all profiles" on public.profiles;
create policy "Admins can view all profiles" 
on public.profiles for select 
using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'admin'
  )
);

-- Policy: Admin dapat memperbarui profil
drop policy if exists "Admins can update profiles" on public.profiles;
create policy "Admins can update profiles" 
on public.profiles for update 
using (
  exists (
    select 1 from public.profiles 
    where id = auth.uid() and role = 'admin'
  )
);

-- 3. Fungsi pembantu untuk membuat atau memperbarui akun auth dan profile secara idempotent
create or replace function public.seed_bems_user(
  p_email text,
  p_password text,
  p_name text,
  p_role text,
  p_polsek_id text default null,
  p_polsek_name text default null
) returns void as $$
declare
  v_user_id uuid;
  v_encrypted_pw text;
begin
  -- Hash password menggunakan bcrypt standard Supabase
  v_encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Cari apakah user sudah terdaftar di auth.users berdasarkan email
  select id into v_user_id from auth.users where email = p_email;

  if v_user_id is null then
    -- Generate ID baru jika belum ada
    v_user_id := gen_random_uuid();
    
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      aud,
      role,
      created_at,
      updated_at
    ) values (
      v_user_id,
      '00000000-0000-0000-0000-000000000000',
      p_email,
      v_encrypted_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object(
        'full_name', p_name,
        'role', p_role,
        'polsek_id', p_polsek_id,
        'polsek_name', p_polsek_name
      ),
      'authenticated',
      'authenticated',
      now(),
      now()
    );
  else
    -- Jika sudah ada, update password dan metadatanya
    update auth.users
    set 
      encrypted_password = v_encrypted_pw,
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      raw_user_meta_data = jsonb_build_object(
        'full_name', p_name,
        'role', p_role,
        'polsek_id', p_polsek_id,
        'polsek_name', p_polsek_name
      ),
      updated_at = now()
    where id = v_user_id;
  end if;

  -- Upsert ke tabel public.profiles
  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    polsek_id,
    polsek_name,
    updated_at
  ) values (
    v_user_id,
    p_email,
    p_name,
    p_role,
    p_polsek_id,
    p_polsek_name,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    polsek_id = excluded.polsek_id,
    polsek_name = excluded.polsek_name,
    updated_at = now();
end;
$$ language plpgsql security definer;

-- ==============================================================================
-- 4. EKSEKUSI SEEDING AKUN (Password Default: Polresta123!)
-- ==============================================================================

-- A. Akun Super Admin Command Center (Hak Akses Penuh: role = 'admin')
select public.seed_bems_user(
  'admin@polresta.id',
  'Polresta123!',
  'Admin Command Center SPKT',
  'admin'
);

-- B. Akun Polsek Jajaran (Hak Akses Sektor: role = 'polsek', TIDAK BISA HAPUS)

-- 1. Polsek Tanjung Karang Barat
select public.seed_bems_user(
  'polsek.tkb@polresta.id',
  'Polresta123!',
  'Piket Polsek Tanjung Karang Barat',
  'polsek',
  'polsek-tkb',
  'Polsek Tanjung Karang Barat'
);

-- 2. Polsek Tanjung Karang Timur
select public.seed_bems_user(
  'polsek.tkt@polresta.id',
  'Polresta123!',
  'Piket Polsek Tanjung Karang Timur',
  'polsek',
  'polsek-tkt',
  'Polsek Tanjung Karang Timur'
);

-- 3. Polsek Kedaton
select public.seed_bems_user(
  'polsek.kedaton@polresta.id',
  'Polresta123!',
  'Piket Polsek Kedaton',
  'polsek',
  'polsek-kdt',
  'Polsek Kedaton'
);

-- 4. Polsek Teluk Betung Selatan
select public.seed_bems_user(
  'polsek.tbs@polresta.id',
  'Polresta123!',
  'Piket Polsek Teluk Betung Selatan',
  'polsek',
  'polsek-tbs',
  'Polsek Teluk Betung Selatan'
);

-- 5. Polsek Teluk Betung Utara
select public.seed_bems_user(
  'polsek.tbu@polresta.id',
  'Polresta123!',
  'Piket Polsek Teluk Betung Utara',
  'polsek',
  'polsek-tbu',
  'Polsek Teluk Betung Utara'
);

-- 6. Polsek Sukarame
select public.seed_bems_user(
  'polsek.sukarame@polresta.id',
  'Polresta123!',
  'Piket Polsek Sukarame',
  'polsek',
  'polsek-skr',
  'Polsek Sukarame'
);

-- 7. Polsek Kemiling
select public.seed_bems_user(
  'polsek.kemiling@polresta.id',
  'Polresta123!',
  'Piket Polsek Kemiling',
  'polsek',
  'polsek-kml',
  'Polsek Kemiling'
);

-- 8. Polsek Panjang
select public.seed_bems_user(
  'polsek.panjang@polresta.id',
  'Polresta123!',
  'Piket Polsek Panjang',
  'polsek',
  'polsek-panjang',
  'Polsek Panjang'
);

-- ==============================================================================
-- 5. TRIGGER OTOMATIS: SINKRONISASI USER BARU KE PROFILES
-- ==============================================================================
create or replace function public.handle_new_user()
returns trigger as $$
declare
  v_role text;
  v_full_name text;
  v_polsek_id text;
  v_polsek_name text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'admin');
  v_full_name := coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1));
  v_polsek_id := new.raw_user_meta_data->>'polsek_id';
  v_polsek_name := new.raw_user_meta_data->>'polsek_name';

  -- Jika email diawali dengan polsek., otomatis assign role 'polsek'
  if new.email like 'polsek.%' then
    v_role := 'polsek';
  end if;

  insert into public.profiles (
    id,
    email,
    full_name,
    role,
    polsek_id,
    polsek_name,
    updated_at
  ) values (
    new.id,
    new.email,
    v_full_name,
    v_role,
    v_polsek_id,
    v_polsek_name,
    now()
  )
  on conflict (id) do update set
    email = excluded.email,
    full_name = excluded.full_name,
    role = excluded.role,
    polsek_id = excluded.polsek_id,
    polsek_name = excluded.polsek_name,
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

-- ==============================================================================
-- Verifikasi hasil seeding
-- ==============================================================================
select email, full_name, role, polsek_id, polsek_name, updated_at from public.profiles order by role, email;

