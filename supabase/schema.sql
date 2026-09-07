-- ================================================================
-- UNIMAP (Universal Cross-Device Knowledge Map & Study Vault)
-- 100% Free Lifetime Tier PostgreSQL Schema with Row-Level Security
-- ================================================================

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  preferred_theme text default 'dark',
  storage_bytes_used bigint default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Connected Devices Fleet Table
create table if not exists public.devices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  device_token text not null,
  device_name text not null,
  device_type text not null, -- 'desktop', 'tablet', 'mobile'
  os text not null,          -- 'windows', 'linux', 'android', 'ios', 'macos'
  browser text,
  last_active_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_revoked boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, device_token)
);

-- 3. Saved Items (Snippets, Links, Media, HTML files)
create table if not exists public.items (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  device_id uuid references public.devices on delete set null,
  device_name text not null,
  device_os text not null,
  type text not null check (type in ('text', 'link', 'media', 'html', 'code')),
  title text,
  content text,              -- Text content, markdown, raw code, HTML body, or URL
  file_url text,             -- Storage public/signed URL (if uploaded media or html file)
  file_name text,            -- e.g. "physics_revision.html", "lecture_diagram.png"
  file_size bigint default 0, -- In bytes for live quota calculation
  mime_type text,            -- e.g. "text/html", "image/png", "audio/webm"
  metadata jsonb default '{}'::jsonb, -- Dimensions, tags, preview thumbnail, color, etc.
  canvas_x float default 0,  -- For Spatial Map positioning
  canvas_y float default 0,
  is_pinned boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Storage Counter Trigger
create or replace function public.update_user_storage_bytes()
returns trigger as $$
begin
  if (TG_OP = 'INSERT') then
    update public.profiles
    set storage_bytes_used = coalesce(storage_bytes_used, 0) + coalesce(NEW.file_size, 0)
    where id = NEW.user_id;
  elsif (TG_OP = 'DELETE') then
    update public.profiles
    set storage_bytes_used = greatest(0, coalesce(storage_bytes_used, 0) - coalesce(OLD.file_size, 0))
    where id = OLD.user_id;
  end if;
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists trigger_update_storage on public.items;
create trigger trigger_update_storage
after insert or delete on public.items
for each row execute function public.update_user_storage_bytes();

-- 5. Row-Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.items enable row level security;

-- Policies for Profiles
drop policy if exists "Users can manage own profile" on public.profiles;
create policy "Users can manage own profile" on public.profiles for all using (auth.uid() = id);

-- Policies for Devices
drop policy if exists "Users can manage own devices" on public.devices;
create policy "Users can manage own devices" on public.devices for all using (auth.uid() = user_id);

-- Policies for Items
drop policy if exists "Users can manage own items" on public.items;
create policy "Users can manage own items" on public.items for all using (auth.uid() = user_id);

-- 6. Enable Realtime Publications (Idempotent: safely checks if already added)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'items'
  ) then
    alter publication supabase_realtime add table public.items;
  end if;

  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'devices'
  ) then
    alter publication supabase_realtime add table public.devices;
  end if;
end $$;

-- 7. Storage Bucket & Policies for 'user-media' (100% Free Tier Media Storage)
insert into storage.buckets (id, name, public, file_size_limit)
values ('user-media', 'user-media', true, 52428800)
on conflict (id) do update set public = true;

drop policy if exists "Authenticated users can upload media" on storage.objects;
create policy "Authenticated users can upload media"
on storage.objects for insert
to authenticated
with check (bucket_id = 'user-media');

drop policy if exists "Anyone can read user-media" on storage.objects;
create policy "Anyone can read user-media"
on storage.objects for select
using (bucket_id = 'user-media');

drop policy if exists "Users can update own media" on storage.objects;
create policy "Users can update own media"
on storage.objects for update
to authenticated
using (bucket_id = 'user-media');

drop policy if exists "Users can delete own media" on storage.objects;
create policy "Users can delete own media"
on storage.objects for delete
to authenticated
using (bucket_id = 'user-media');

-- ================================================================
-- 8. Native Android Push Notification Tokens
-- ================================================================
create table if not exists public.user_push_tokens (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  fcm_token text not null,
  platform text default 'android' not null,
  device_name text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, fcm_token)
);

create index if not exists idx_push_tokens_user_id on public.user_push_tokens (user_id);

alter table public.user_push_tokens enable row level security;

drop policy if exists "Users can view and manage own push tokens" on public.user_push_tokens;
create policy "Users can view and manage own push tokens"
on public.user_push_tokens for all
using (auth.uid() = user_id);

-- ================================================================
-- 9. Notifications Table (Triggers FCM Edge Function Webhook)
-- ================================================================
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  title text not null,
  body text not null,
  data jsonb default '{}'::jsonb,
  is_read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

create index if not exists idx_notifications_user_id on public.notifications (user_id);

alter table public.notifications enable row level security;

drop policy if exists "Users can view and manage own notifications" on public.notifications;
create policy "Users can view and manage own notifications"
on public.notifications for all
using (auth.uid() = user_id);

-- Realtime publication for in-app notifications
do $$
begin
  if not exists (
    select 1 from pg_publication_tables 
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;

-- ================================================================
-- 10. Native App Version Control Table
-- ================================================================
create table if not exists public.app_versions (
  id uuid default gen_random_uuid() primary key,
  platform text default 'android' not null,
  latest_version text not null,            -- e.g. '1.1.0'
  min_supported_version text not null,     -- e.g. '1.0.0'
  apk_url text not null,                   -- Direct download link to new APK
  title text default 'Critical Native Update Required',
  release_notes text,
  is_critical boolean default true not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.app_versions enable row level security;

-- Public read access so native apps can verify version status before or after login
drop policy if exists "Anyone can check app versions" on public.app_versions;
create policy "Anyone can check app versions"
on public.app_versions for select
using (true);

-- Seed initial 1.0.0 entry
insert into public.app_versions (platform, latest_version, min_supported_version, apk_url, title, release_notes, is_critical)
values (
  'android',
  '1.0.0',
  '1.0.0',
  'https://github.com/tgmind/UniMap/releases/latest',
  'Welcome to UniMap Android',
  'Initial native Android release with real-time sync, offline caching, and push notifications.',
  false
)
on conflict do nothing;


