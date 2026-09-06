import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
  Sparkles,
  ArrowRight,
  Shield,
  Laptop,
  Smartphone,
  Tablet,
  Globe,
  HardDrive,
  Zap,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { ThemeSelector } from './ThemeSelector';

interface AuthScreenProps {
  onEnterGuestMode: () => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onEnterGuestMode }) => {
  const { signIn, signUp } = useAuth();
  const { activeThemeDef } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const res = await signUp(email, password, name);
        if (res.error) {
          setErrorMsg(res.error);
        } else {
          setSuccessMsg('Account created successfully! Check your email to confirm, or sign in.');
        }
      } else {
        const res = await signIn(email, password);
        if (res.error) {
          setErrorMsg(res.error);
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col justify-between selection:bg-primary selection:text-white relative overflow-hidden">
      {/* Subtle Background Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-[400px] h-[400px] bg-accent/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent p-0.5 shadow-glow-sm">
            <div className="w-full h-full bg-background rounded-[14px] flex items-center justify-center">
              <img src="/logo.svg" alt="UniMap" className="w-7 h-7" />
            </div>
          </div>
          <div>
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-text-main to-text-muted bg-clip-text text-transparent">
              UniMap
            </span>
            <span className="text-[10px] ml-2 font-mono uppercase px-2 py-0.5 rounded-full border border-border bg-surface text-accent font-semibold">
              Cross-Device
            </span>
          </div>
        </div>

        {/* Theme Picker */}
        <div className="relative">
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface border border-border text-xs font-semibold text-text-muted hover:text-text-main transition-colors"
          >
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: activeThemeDef.primaryColor }}
            />
            <span className="hidden sm:inline">{activeThemeDef.name}</span>
          </button>
          {showThemeMenu && <ThemeSelector onClose={() => setShowThemeMenu(false)} />}
        </div>
      </header>

      {/* Main Grid: Hero + Auth Card */}
      <main className="w-full max-w-7xl mx-auto px-4 sm:px-8 py-8 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center z-10 flex-1">
        {/* Left: Product Value & Hero */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-elevated border border-border text-xs text-text-muted">
            <Sparkles className="w-3.5 h-3.5 text-accent" />
            <span>Multi-device synchronization for students & scholars</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-text-main leading-[1.15]">
            One Universal Map for all your{' '}
            <span className="bg-gradient-to-r from-primary via-accent to-purple-400 bg-clip-text text-transparent">
              devices & study data.
            </span>
          </h1>

          <p className="text-sm sm:text-base text-text-muted max-w-xl leading-relaxed">
            Instantly sync lecture notes, textbook equations, rich bookmarks, code snippets, and live HTML calculators across Windows, Linux, Android tablets, and mobile phones.
          </p>

          {/* Feature Highlights Pill Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-main">Click-to-Run HTML</p>
                <p className="text-[11px] text-text-muted">Run HTML files directly in your browser with full scripts</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center shrink-0">
                <HardDrive className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-main">SmartCompress Zero-Blur</p>
                <p className="text-[11px] text-text-muted">2.5K high-res clarity for equations at 95% space saving</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-main">Realtime Sub-30ms Sync</p>
                <p className="text-[11px] text-text-muted">Updates on your tablet reflect immediately on your PC</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface/80 border border-border flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-main">Device Fleet & QR Login</p>
                <p className="text-[11px] text-text-muted">Manage all hardware sessions and log in via QR code</p>
              </div>
            </div>
          </div>

          {/* Supported Hardware Icons */}
          <div className="pt-2 flex items-center gap-6 text-xs text-text-muted">
            <span className="font-semibold text-text-main">Works everywhere:</span>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 hover:text-text-main transition-colors">
                <Laptop className="w-4 h-4 text-primary" /> Windows & Linux
              </span>
              <span className="flex items-center gap-1.5 hover:text-text-main transition-colors">
                <Tablet className="w-4 h-4 text-accent" /> Android Tablet & iPad
              </span>
              <span className="flex items-center gap-1.5 hover:text-text-main transition-colors">
                <Smartphone className="w-4 h-4 text-emerald-400" /> Mobile PWA
              </span>
            </div>
          </div>
        </div>

        {/* Right: Auth Card */}
        <div className="lg:col-span-5">
          <div className="p-6 sm:p-8 rounded-3xl bg-surface border border-border shadow-2xl backdrop-blur-xl relative">
            <div className="mb-6">
              <h2 className="text-xl font-bold text-text-main">
                {isSignUp ? 'Create your UniMap Account' : 'Welcome Back'}
              </h2>
              <p className="text-xs text-text-muted mt-1">
                {isSignUp
                  ? 'Sign up once to sync your data across all your devices.'
                  : 'Sign in to access your universal data map.'}
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex p-1 rounded-xl bg-surface-elevated border border-border mb-5">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  !isSignUp ? 'bg-primary text-primary-text shadow-sm' : 'text-text-muted hover:text-text-main'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isSignUp ? 'bg-primary text-primary-text shadow-sm' : 'text-text-muted hover:text-text-main'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* Error & Success Messages */}
            {errorMsg && (
              <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1">{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="flex-1">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1.5">
                    Your Name / Student ID
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Alex"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface-elevated border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-text-main mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-muted absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-elevated border border-border rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-text-main placeholder-text-faint focus:outline-none focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-bold shadow-glow-sm transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
              >
                <span>{isSubmitting ? 'Processing...' : isSignUp ? 'Create My Vault' : 'Sign In to UniMap'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Offline / Guest Mode Fallback */}
            <div className="mt-5 pt-5 border-t border-border/60 text-center">
              <button
                type="button"
                onClick={onEnterGuestMode}
                className="text-xs text-text-muted hover:text-text-main transition-colors"
              >
                Or continue in <span className="font-semibold text-accent underline">Local Offline Mode</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/50 py-4 text-center text-[11px] text-text-muted z-10">
        UniMap Universal Cross-Device Data Map • 100% Free Lifetime Infrastructure
      </footer>
    </div>
  );
};
