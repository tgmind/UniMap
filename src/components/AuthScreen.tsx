import React, { useState } from 'react';
import {
  Lock,
  Mail,
  User,
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
  Compass,
  Moon,
  Sun,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

interface AuthScreenProps {}

export const AuthScreen: React.FC<AuthScreenProps> = () => {
  const { signIn, signUp } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          setSuccessMsg('Account created successfully! Check your email to confirm or sign in.');
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
    <div className="min-h-screen bg-background text-text-main flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer select-none">
          <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-text shadow-sm">
            <Compass className="w-4 h-4" />
          </div>
          <span className="font-semibold text-base tracking-tight text-text-main">
            UniMap
          </span>
        </div>

        {/* Theme Toggle (1-Click Dark/Light Mode) */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to Light Mode (Editorial Canvas)' : 'Switch to Dark Mode (Grey)'}
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-xs font-medium text-text-muted hover:text-text-main transition-colors group"
        >
          {theme === 'dark' ? (
            <>
              <Moon className="w-3.5 h-3.5 text-accent transition-transform group-hover:scale-110" />
              <span className="hidden sm:inline">Dark Mode</span>
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-500 transition-transform group-hover:scale-110" />
              <span className="hidden sm:inline">Editorial Canvas</span>
            </>
          )}
        </button>
      </header>

      {/* Main Grid */}
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-8 sm:py-16 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center flex-1">
        {/* Left Hero */}
        <div className="lg:col-span-7 space-y-6">
          <div className="space-y-3">
            <span className="text-xs font-medium uppercase tracking-wider text-text-faint font-mono">
              Universal Study Sync
            </span>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-text-main text-wrap-balance leading-tight">
              A unified workspace for all your devices and study materials.
            </h1>
            <p className="text-sm sm:text-base text-text-muted max-w-lg leading-relaxed pt-1">
              Synchronize lecture notes, textbook equations, code snippets, bookmarks, and interactive HTML files in real time across Windows, Linux, Android tablets, and mobile phones.
            </p>
          </div>

          {/* Clean 4-Grid Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
              <div className="flex items-center gap-2 text-text-main font-semibold text-xs">
                <Globe className="w-4 h-4 text-accent" />
                <span>Click-to-Run HTML</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Run HTML documents and calculators directly in your browser.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
              <div className="flex items-center gap-2 text-text-main font-semibold text-xs">
                <HardDrive className="w-4 h-4 text-primary" />
                <span>Zero-Blur SmartCompress</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                2.5K high-res clarity for textbook equations with 95% space savings.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
              <div className="flex items-center gap-2 text-text-main font-semibold text-xs">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Sub-30ms Realtime Sync</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Edits on your tablet appear instantly on your desktop.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-surface border border-border space-y-1">
              <div className="flex items-center gap-2 text-text-main font-semibold text-xs">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span>Device Fleet & QR Login</span>
              </div>
              <p className="text-xs text-text-muted leading-relaxed">
                Manage all hardware sessions and log in via 1-tap QR codes.
              </p>
            </div>
          </div>

          {/* Supported Hardware Bar */}
          <div className="flex items-center gap-5 pt-3 text-xs text-text-faint">
            <span className="flex items-center gap-1.5">
              <Laptop className="w-4 h-4" /> Windows & Linux
            </span>
            <span className="flex items-center gap-1.5">
              <Tablet className="w-4 h-4" /> Tablets & iPads
            </span>
            <span className="flex items-center gap-1.5">
              <Smartphone className="w-4 h-4" /> Mobile PWA
            </span>
          </div>
        </div>

        {/* Right Form */}
        <div className="lg:col-span-5">
          <div className="p-7 sm:p-8 rounded-2xl bg-surface border border-border shadow-card space-y-6">
            <div>
              <h2 className="text-lg font-bold text-text-main">
                {isSignUp ? 'Create your Account' : 'Sign In'}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {isSignUp ? 'Sign up once to access your study vault anywhere.' : 'Enter your credentials to access your map.'}
              </p>
            </div>

            {/* Segmented Mode Selector */}
            <div className="flex p-1 rounded-xl bg-surface-elevated border border-border">
              <button
                type="button"
                onClick={() => { setIsSignUp(false); setErrorMsg(''); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  !isSignUp ? 'bg-surface text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setIsSignUp(true); setErrorMsg(''); }}
                className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  isSignUp ? 'bg-surface text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
                }`}
              >
                Sign Up
              </button>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-break-word">{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="flex-1 text-break-word">{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isSignUp && (
                <div>
                  <label className="block text-xs font-medium text-text-main mb-1.5">
                    Your Name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="e.g. Alex"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-surface-elevated border border-border focus:border-primary rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-text-main mb-1.5">
                  Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    placeholder="student@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-surface-elevated border border-border focus:border-primary rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-main mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-text-faint absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-surface-elevated border border-border focus:border-primary rounded-xl pl-10 pr-3.5 py-2.5 text-xs text-text-main placeholder-text-faint focus:outline-none transition-colors"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-primary-text text-xs font-semibold shadow-sm transition-all active:scale-[0.99] disabled:opacity-50 flex items-center justify-center gap-2 pt-2.5"
              >
                <span>{isSubmitting ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-5 text-center text-xs text-text-faint">
        UniMap • Universal Cross-Device Data Map
      </footer>
    </div>
  );
};
