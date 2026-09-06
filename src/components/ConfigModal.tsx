import React, { useState } from 'react';
import { X, Database, Check, Copy, Key, Globe, Shield } from 'lucide-react';
import { getSupabaseConfig, saveSupabaseConfig } from '../lib/supabase';
import { SUPABASE_SQL_SETUP } from './ConfigModalConstants';

interface ConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

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
    }, 800);
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl p-6 shadow-xl overflow-hidden max-h-[90vh] flex flex-col space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border/60">
          <div>
            <h2 className="text-base font-semibold text-text-main">Backend Configuration</h2>
            <p className="text-xs text-text-muted mt-0.5">Admin setup for central Supabase database</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-faint hover:text-text-main hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto flex-1 space-y-4 pr-1">
          <form onSubmit={handleSave} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-main mb-1 flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-text-faint" />
                <span>Project URL</span>
              </label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full bg-surface-elevated/70 border border-border focus:border-border-strong rounded-xl px-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none font-mono transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-text-main mb-1 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-text-faint" />
                <span>Anon Public Key</span>
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOi..."
                value={key}
                onChange={(e) => setKey(e.target.value)}
                className="w-full bg-surface-elevated/70 border border-border focus:border-border-strong rounded-xl px-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none font-mono transition-colors"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-sm transition-all"
              >
                {saved ? 'Saved!' : 'Save & Connect'}
              </button>
            </div>
          </form>

          {/* SQL Setup Script */}
          <div className="p-4 rounded-xl bg-surface-elevated/50 border border-border space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-text-main flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-text-muted" />
                Database SQL Schema
              </span>
              <button
                type="button"
                onClick={handleCopySql}
                className="text-xs text-text-muted hover:text-text-main flex items-center gap-1 transition-colors"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy Script'}</span>
              </button>
            </div>

            <div className="rounded-lg bg-surface border border-border p-3 font-mono text-[11px] text-text-muted overflow-x-auto max-h-36">
              <pre className="whitespace-pre">{SUPABASE_SQL_SETUP}</pre>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-border/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-xs font-medium text-text-main transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
