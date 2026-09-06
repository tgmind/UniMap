import React, { useState } from 'react';
import { X, Database, Check, Copy, Key, Globe, Shield, ExternalLink } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig } from '../lib/supabase';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const SUPABASE_SQL_SETUP = `-- ==========================================
-- UNIMAP COMPLETE ZERO-COST DATABASE SCHEMA
-- Run in Supabase Dashboard -> SQL Editor
-- ==========================================

-- 1. Profiles Table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  display_name text,
  preferred_theme text default 'midnight',
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

-- Enable Realtime on items & devices tables
alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.devices;

-- Storage Bucket Setup Instructions:
-- In Supabase Dashboard -> Storage -> Create new bucket named 'user-media' with Public access enabled.
`;

export const ConfigModal: React.FC<ConfigModalProps> = ({ isOpen, onClose }) => {
  const currentConfig = getSupabaseConfig();
  const [url, setUrl] = useState(currentConfig.url);
  const [key, setKey] = useState(currentConfig.key);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    saveSupabaseConfig(url, key);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      window.location.reload();
    }, 1000);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-2xl bg-surface border border-border rounded-3xl p-5 sm:p-7 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-text-main">
                Supabase Free Tier Configuration
              </h2>
              <p className="text-xs text-text-muted">
                Connect your 100% free Supabase cloud instance for cross-device real-time sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto py-5 space-y-6 flex-1 pr-1">
          {/* Form */}
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-text-main mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-accent" />
                Project URL
              </label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-main mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-primary" />
                Anon Public Key
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-surface-elevated border border-border rounded-xl px-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary font-mono transition-colors"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="submit"
                className="px-5 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-glow-sm transition-all flex items-center gap-1.5"
              >
                {saved ? <Check className="w-4 h-4 text-emerald-300" /> : null}
                <span>{saved ? 'Saved! Reloading...' : 'Save & Connect Cloud'}</span>
              </button>
            </div>
          </form>

          {/* SQL Setup Helper */}
          <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-text-main flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-emerald-400" />
                  Database SQL Setup Script
                </h3>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Paste into Supabase Dashboard → SQL Editor → Run
                </p>
              </div>

              <button
                type="button"
                onClick={handleCopySql}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface border border-border hover:border-primary text-xs text-text-main font-semibold transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'SQL Copied!' : 'Copy SQL'}</span>
              </button>
            </div>

            <div className="relative rounded-xl bg-surface border border-border/80 p-3 font-mono text-[11px] text-text-muted overflow-x-auto max-h-44">
              <pre className="whitespace-pre">{SUPABASE_SQL_SETUP}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-surface-elevated border border-border text-xs font-semibold text-text-main hover:bg-surface-hover transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
