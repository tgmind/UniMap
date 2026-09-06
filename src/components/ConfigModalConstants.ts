export const SUPABASE_SQL_SETUP = `-- ==========================================
-- UNIMAP COMPLETE DATABASE SCHEMA
-- Run in Supabase Dashboard -> SQL Editor
-- ==========================================

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  preferred_theme text default 'dark',
  storage_bytes_used bigint default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Registered Devices Fleet Table
create table if not exists public.devices (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users on delete cascade not null,
  device_token text not null,
  device_name text not null,
  device_type text not null,
  os text not null,
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
  content text,
  file_url text,
  file_name text,
  file_size bigint default 0,
  mime_type text,
  metadata jsonb default '{}'::jsonb,
  canvas_x float default 0,
  canvas_y float default 0,
  is_pinned boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;
alter table public.devices enable row level security;
alter table public.items enable row level security;

-- Policies for Profiles
create policy "Users can manage own profile" on public.profiles for all using (auth.uid() = id);

-- Policies for Devices
create policy "Users can manage own devices" on public.devices for all using (auth.uid() = user_id);

-- Policies for Items
create policy "Users can manage own items" on public.items for all using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.devices;
`;
