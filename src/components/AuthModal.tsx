import React, { useState } from 'react';
import { X, Lock, Mail, User, Sparkles, QrCode, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { QRCodeSVG } from 'qrcode.react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenConfigModal: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onOpenConfigModal }) => {
  const { signIn, signUp, isConfigured } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup' | 'qr'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isConfigured) {
      setErrorMsg('Supabase credentials not configured yet. Please configure in Cloud Settings first.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (mode === 'signin') {
        const res = await signIn(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg('Logged in successfully!');
          setTimeout(onClose, 800);
        }
      } else if (mode === 'signup') {
        const res = await signUp(email, password, displayName);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg('Account created! Check your email for confirmation or sign in.');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-2xl overflow-hidden relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-text-muted hover:text-text-main hover:bg-surface-hover transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 mx-auto mb-3 shadow-glow-sm">
            <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
              <img src="/logo.svg" alt="UniMap" className="w-7 h-7" />
            </div>
          </div>
          <h2 className="text-lg font-bold text-text-main">
            {mode === 'signin' ? 'Sign In to UniMap' : mode === 'signup' ? 'Create UniMap Account' : 'QR Quick Connect'}
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Synchronize exam notes across Windows, Linux, Android & iPad
          </p>
        </div>

        {/* Tabs */}
        <div className="flex p-1 rounded-xl bg-surface-elevated border border-border mb-5">
          <button
            onClick={() => { setMode('signin'); setErrorMsg(''); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'signin' ? 'bg-primary text-primary-text shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              mode === 'signup' ? 'bg-primary text-primary-text shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            Sign Up
          </button>
          <button
            onClick={() => { setMode('qr'); setErrorMsg(''); }}
            className={`flex-1 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
              mode === 'qr' ? 'bg-primary text-primary-text shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <QrCode className="w-3 h-3" />
            QR Login
          </button>
        </div>

        {/* Alerts */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span className="flex-1">{successMsg}</span>
          </div>
        )}

        {/* Supabase Not Configured Notice */}
        {!isConfigured && (
          <div className="mb-4 p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1.5">
            <p className="font-semibold flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              Supabase Not Configured
            </p>
            <p className="text-[11px] opacity-90">
              You are currently running in <strong>Offline Local Vault Mode</strong>. To enable cross-device cloud sync, add your free Supabase keys.
            </p>
            <button
              type="button"
              onClick={() => { onClose(); onOpenConfigModal(); }}
              className="text-[11px] font-bold text-accent hover:underline block"
            >
              Open Supabase Cloud Config →
            </button>
          </div>
        )}

        {/* Form */}
        {mode !== 'qr' ? (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-text-main mb-1">
                  Full Name / Nickname
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. Alex (Scholar)"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl pl-9 pr-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-main mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl pl-9 pr-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-main mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-surface-elevated border border-border rounded-xl pl-9 pr-3.5 py-2 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold shadow-glow-sm transition-all disabled:opacity-50 mt-2"
            >
              {isSubmitting ? 'Authenticating...' : mode === 'signin' ? 'Sign In & Connect' : 'Create Account'}
            </button>
          </form>
        ) : (
          <div className="text-center p-4 rounded-2xl bg-surface-elevated border border-border space-y-3">
            <p className="text-xs text-text-main font-semibold">
              Scan from an already logged-in phone or tablet:
            </p>
            <div className="inline-block p-3 rounded-2xl bg-white shadow-xl">
              <QRCodeSVG value="unimap_quick_auth_nonce" size={170} />
            </div>
            <p className="text-[11px] text-text-muted">
              Open UniMap on your mobile → Tap Fleet Hub → Tap Scan QR Code to authenticate this computer in 1 second.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
