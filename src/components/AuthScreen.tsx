import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  QrCode,
  KeyRound,
  RefreshCw,
  Loader2,
  Sparkles,
  Moon,
  Sun,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import confetti from 'canvas-confetti';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { UniMapLogo } from './UniMapLogo';
import {
  generateQrSessionId,
  generatePairingCode,
  createQrAuthPayload,
  subscribeToQrAuthSession,
  claimPairingKey,
  normalizePairingKey,
} from '../lib/qrAuth';
import { detectBrowser, detectDeviceOS, generateDefaultDeviceName } from '../lib/deviceDetector';

interface AuthScreenProps {}

export const AuthScreen: React.FC<AuthScreenProps> = () => {
  const { signIn, signUp, signInWithSession } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Desktop defaults to QR code login (like Telegram Web & WhatsApp Web)
  const isDesktop = typeof window !== 'undefined' && window.innerWidth >= 768;
  const [authMode, setAuthMode] = useState<'qr' | 'pairing' | 'signin' | 'signup'>(
    isDesktop ? 'qr' : 'signin'
  );

  // QR Login State
  const [qrSessionId, setQrSessionId] = useState<string>('');
  const [qrStatus, setQrStatus] = useState<'waiting' | 'scanned' | 'authorizing' | 'success' | 'expired'>('waiting');
  const [scannedDeviceName, setScannedDeviceName] = useState<string>('');
  const [countdown, setCountdown] = useState<number>(120);
  const [pairingCode, setPairingCode] = useState<string>('');

  // Pairing Key Login State
  const [pairingKeyInput, setPairingKeyInput] = useState<string>('');
  const [isClaimingPairing, setIsClaimingPairing] = useState<boolean>(false);

  // Email/Password Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Refresh QR Session
  const refreshQrSession = useCallback(() => {
    const newId = generateQrSessionId();
    const newCode = generatePairingCode();
    setQrSessionId(newId);
    setPairingCode(newCode);
    setQrStatus('waiting');
    setScannedDeviceName('');
    setCountdown(120);
    setErrorMsg('');
  }, []);

  // Initialize QR on mount or when switching to 'qr' mode
  useEffect(() => {
    if (authMode === 'qr') {
      refreshQrSession();
    }
  }, [authMode, refreshQrSession]);

  // Countdown timer for QR code validity (120 seconds)
  useEffect(() => {
    if (authMode !== 'qr' || qrStatus === 'expired' || qrStatus === 'success') return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setQrStatus('expired');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [authMode, qrStatus]);

  // Supabase Realtime Broadcast Listener for instant QR cross-device login
  useEffect(() => {
    if (authMode !== 'qr' || !qrSessionId || qrStatus === 'expired' || qrStatus === 'success') {
      return;
    }

    const unsubscribe = subscribeToQrAuthSession(qrSessionId, pairingCode, {
      onScanned: ({ deviceName }) => {
        setQrStatus('scanned');
        if (deviceName) setScannedDeviceName(deviceName);
      },
      onAuthorized: async (payload) => {
        setQrStatus('authorizing');
        try {
          const res = await signInWithSession(
            payload.access_token,
            payload.refresh_token,
            payload.user,
            {
              expires_at: payload.expires_at,
              expires_in: payload.expires_in,
              token_type: payload.token_type,
              credentials: payload.credentials,
            }
          );
          if (res.error) {
            setErrorMsg(res.error);
            setQrStatus('waiting');
          } else {
            setQrStatus('success');
            try {
              confetti({
                particleCount: 70,
                spread: 75,
                origin: { y: 0.6 },
              });
            } catch (e) {
              // Ignore confetti err if canvas unsupported
            }
          }
        } catch (err: any) {
          setErrorMsg(err.message || 'Authorization failed');
          setQrStatus('waiting');
        }
      },
      onError: (err) => {
        console.warn('QR Realtime listener warning:', err);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [authMode, qrSessionId, pairingCode, qrStatus, signInWithSession]);

  const qrPayload = useMemo(() => {
    if (!qrSessionId) return '';
    return createQrAuthPayload(qrSessionId, pairingCode, {
      browser: detectBrowser(),
      os: detectDeviceOS(),
    });
  }, [qrSessionId, pairingCode]);

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const formattedCountdown = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      if (authMode === 'signup') {
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

  const handleClaimPairingKey = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalized = normalizePairingKey(pairingKeyInput);
    if (!normalized || normalized.length < 6) {
      setErrorMsg('Please enter a valid pairing key (e.g. UNI-849201 or 6-digit code).');
      return;
    }

    setErrorMsg('');
    setSuccessMsg('');
    setIsClaimingPairing(true);

    const devName = generateDefaultDeviceName();

    try {
      await claimPairingKey(normalized, devName, {
        onAuthorized: async (payload) => {
          try {
            const res = await signInWithSession(
              payload.access_token,
              payload.refresh_token,
              payload.user,
              {
                expires_at: payload.expires_at,
                expires_in: payload.expires_in,
                token_type: payload.token_type,
                credentials: payload.credentials,
              }
            );
            if (res.error) {
              setErrorMsg(res.error);
              setIsClaimingPairing(false);
            } else {
              setSuccessMsg('Authenticated! Opening study vault...');
              try {
                confetti({
                  particleCount: 70,
                  spread: 75,
                  origin: { y: 0.6 },
                });
              } catch (e) {}
            }
          } catch (err: any) {
            setErrorMsg(err.message || 'Authorization failed');
            setIsClaimingPairing(false);
          }
        },
        onError: (err) => {
          setErrorMsg(err.message || 'Could not connect with pairing key. Ensure the other device is still showing the key.');
          setIsClaimingPairing(false);
        },
      });
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to claim pairing key');
      setIsClaimingPairing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text-main flex flex-col justify-between selection:bg-primary selection:text-white">
      {/* Top Header */}
      <header className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5 cursor-pointer select-none">
          <UniMapLogo size={36} />
          <span className="font-semibold text-base tracking-tight text-text-main">
            White Vault
          </span>
        </div>

        {/* Theme Toggle */}
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
      <main className="w-full max-w-6xl mx-auto px-4 sm:px-8 py-6 sm:py-12 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center flex-1">
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
                Log in via 1-tap QR codes and manage all active hardware sessions.
              </p>
            </div>
          </div>

          {/* Supported Hardware Bar */}
          <div className="flex items-center gap-5 pt-2 text-xs text-text-faint">
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

        {/* Right Authentication Panel */}
        <div className="lg:col-span-5">
          <div className="p-6 sm:p-8 rounded-2xl bg-surface border border-border shadow-card space-y-6">
            <div>
              <h2 className="text-lg font-bold text-text-main flex items-center gap-2">
                {authMode === 'qr' && (
                  <>
                    <span>Instant QR Sign-In</span>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      Recommended
                    </span>
                  </>
                )}
                {authMode === 'pairing' && (
                  <>
                    <span>Unique Pairing Key</span>
                    <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Cross-Device
                    </span>
                  </>
                )}
                {authMode === 'signin' && 'Sign In to White Vault'}
                {authMode === 'signup' && 'Create your Account'}
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                {authMode === 'qr' && 'Scan with your logged-in mobile app to sign in immediately.'}
                {authMode === 'pairing' && 'Enter the unique pairing key from your logged-in device to connect instantly.'}
                {authMode === 'signin' && 'Enter your account credentials to access your map.'}
                {authMode === 'signup' && 'Sign up once to access your study vault across all devices.'}
              </p>
            </div>

            {/* 4-Mode Modern Responsive Segmented Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 p-1 rounded-xl bg-surface-elevated border border-border gap-1">
              <button
                type="button"
                onClick={() => { setAuthMode('qr'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  authMode === 'qr'
                    ? 'bg-surface text-text-main shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 shrink-0 text-emerald-500" />
                <span className="truncate">QR Login</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('pairing'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  authMode === 'pairing'
                    ? 'bg-surface text-text-main shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5 shrink-0 text-amber-500" />
                <span className="truncate">Pairing Key</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  authMode === 'signin'
                    ? 'bg-surface text-text-main shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <Mail className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Password</span>
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMsg(''); setSuccessMsg(''); }}
                className={`py-2 px-1.5 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  authMode === 'signup'
                    ? 'bg-surface text-text-main shadow-xs font-semibold'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <User className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Sign Up</span>
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

            {/* MODE 1: AUTOMATIC UNIQUE QR CODE LOGIN */}
            {authMode === 'qr' && (
              <div className="flex flex-col items-center text-center space-y-5">
                {/* QR Code Container with High-Res SVG & Viewfinder Corner Frames */}
                <div className="relative inline-block p-4 sm:p-5 rounded-2xl bg-white shadow-lg border border-slate-200/90 select-none group max-w-full">
                  {/* Subtle Viewfinder Frame Accents */}
                  <div className="absolute top-2 left-2 w-3.5 h-3.5 border-t-2 border-l-2 border-slate-400/80 rounded-tl-sm pointer-events-none" />
                  <div className="absolute top-2 right-2 w-3.5 h-3.5 border-t-2 border-r-2 border-slate-400/80 rounded-tr-sm pointer-events-none" />
                  <div className="absolute bottom-2 left-2 w-3.5 h-3.5 border-b-2 border-l-2 border-slate-400/80 rounded-bl-sm pointer-events-none" />
                  <div className="absolute bottom-2 right-2 w-3.5 h-3.5 border-b-2 border-r-2 border-slate-400/80 rounded-br-sm pointer-events-none" />

                  {/* QR SVG */}
                  <div className="w-[160px] h-[160px] sm:w-[190px] sm:h-[190px] flex items-center justify-center overflow-hidden">
                    {qrPayload ? (
                      <QRCodeSVG
                        value={qrPayload}
                        size={175}
                        level="H"
                        marginSize={1}
                        className="w-full h-full max-w-full max-h-full"
                        imageSettings={{
                          src: '/logo.svg',
                          x: undefined,
                          y: undefined,
                          height: 36,
                          width: 36,
                          excavate: true,
                        }}
                      />
                    ) : (
                      <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                    )}
                  </div>

                  {/* Animated Cyan/Indigo Scanner Laser Bar */}
                  {qrStatus === 'waiting' && (
                    <div className="absolute inset-x-4 h-0.5 bg-gradient-to-r from-transparent via-cyan-500 to-transparent shadow-[0_0_10px_#06b6d4] top-1/2 -translate-y-1/2 animate-pulse pointer-events-none" />
                  )}

                  {/* Expired Overlay */}
                  {qrStatus === 'expired' && (
                    <div
                      onClick={refreshQrSession}
                      className="absolute inset-0 bg-slate-900/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center p-4 cursor-pointer text-white animate-fade-in"
                    >
                      <RefreshCw className="w-8 h-8 text-white mb-2" />
                      <p className="text-xs font-semibold">QR Code Expired</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">Click to refresh</p>
                    </div>
                  )}
                </div>

                {/* Status Indicator & Live Countdown */}
                <div className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-surface-elevated border border-border text-xs">
                  <div className="flex items-center gap-2 min-w-0 flex-1 text-left">
                    {qrStatus === 'waiting' && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
                        <span className="text-text-muted truncate">Waiting for phone scan...</span>
                      </>
                    )}
                    {qrStatus === 'scanned' && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 animate-ping" />
                        <span className="text-amber-400 font-medium truncate">
                          Captured by {scannedDeviceName || 'mobile'}! Tap Approve on phone...
                        </span>
                      </>
                    )}
                    {qrStatus === 'authorizing' && (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-accent shrink-0" />
                        <span className="text-accent font-medium truncate">Authorizing & opening workspace...</span>
                      </>
                    )}
                    {qrStatus === 'success' && (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="text-emerald-400 font-semibold truncate">Authorized! Signing in...</span>
                      </>
                    )}
                    {qrStatus === 'expired' && (
                      <>
                        <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                        <span className="text-red-400 truncate">Expired</span>
                      </>
                    )}
                  </div>

                  {/* Countdown Timer & Manual Refresh */}
                  <div className="flex items-center gap-1.5 shrink-0 pl-2">
                    <span className="font-mono text-[11px] text-text-faint">
                      {qrStatus === 'expired' ? '00:00' : formattedCountdown}
                    </span>
                    <button
                      onClick={refreshQrSession}
                      title="Generate new QR session"
                      className="p-1 rounded-lg text-text-faint hover:text-text-main hover:bg-surface-hover transition-colors"
                    >
                      <RefreshCw className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                {/* Quick 6-Digit Pairing Code Display */}
                {pairingCode && (
                  <div className="w-full p-2.5 rounded-xl bg-surface-elevated/80 border border-border/80 flex items-center justify-between gap-2 text-xs">
                    <div className="text-left min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-text-main">Pairing Code</p>
                      <p className="text-[10px] text-text-muted truncate">Enter on phone if camera unavailable</p>
                    </div>
                    <div className="flex items-center gap-1.5 font-mono text-sm tracking-widest font-bold px-3 py-1 rounded-lg bg-surface border border-border text-text-main shadow-2xs shrink-0">
                      <span>{pairingCode.slice(0, 3)}</span>
                      <span className="text-text-faint">-</span>
                      <span>{pairingCode.slice(3, 6)}</span>
                    </div>
                  </div>
                )}

                {/* 3-Step Clear Visual Instructions */}
                <div className="w-full space-y-2 pt-2 border-t border-border/60 text-left">
                  <div className="flex items-start gap-2.5 text-xs text-text-muted">
                    <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[10px] font-bold text-text-main shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Open <strong className="text-text-main">White Vault</strong> on your logged-in mobile device
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-text-muted">
                    <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[10px] font-bold text-text-main shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Tap <strong className="text-text-main">Fleet</strong> at the bottom bar and select <strong className="text-text-main">Scan QR</strong>
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-text-muted">
                    <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[10px] font-bold text-text-main shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Point your camera at this QR code to log in instantly without passwords
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* MODE 2: UNIQUE PAIRING KEY SIGN-IN */}
            {authMode === 'pairing' && (
              <form onSubmit={handleClaimPairingKey} className="space-y-4 animate-fade-in">
                <div className="p-4 sm:p-5 rounded-2xl bg-surface-elevated/60 border border-border space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-text-main">
                      <KeyRound className="w-4 h-4 text-amber-500 shrink-0" />
                      <span>Enter Device Pairing Key</span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">
                      Cross-Device
                    </span>
                  </div>

                  <p className="text-xs text-text-muted leading-relaxed">
                    Open <strong className="text-text-main">Fleet &rarr; Pairing Key</strong> on your already logged-in phone or computer, and enter the unique key generated there.
                  </p>

                  <div className="relative pt-1">
                    <input
                      type="text"
                      placeholder="UNI-849201"
                      value={pairingKeyInput}
                      onChange={(e) => setPairingKeyInput(e.target.value.toUpperCase())}
                      className="w-full bg-surface border-2 border-border focus:border-amber-500 rounded-xl px-4 py-3 text-center text-lg sm:text-xl font-mono font-bold tracking-widest text-text-main placeholder:text-text-faint placeholder:font-normal placeholder:tracking-normal focus:outline-none transition-all shadow-inner"
                      autoFocus
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isClaimingPairing || !pairingKeyInput.trim()}
                  className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white text-xs sm:text-sm font-semibold shadow-md shadow-amber-500/20 transition-all active:scale-[0.99] flex items-center justify-center gap-2"
                >
                  {isClaimingPairing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                      <span>Connecting with your device...</span>
                    </>
                  ) : (
                    <>
                      <KeyRound className="w-4 h-4 shrink-0" />
                      <span>Connect & Sign In</span>
                      <ArrowRight className="w-4 h-4 shrink-0" />
                    </>
                  )}
                </button>

                {/* 3-Step Clear Visual Instructions */}
                <div className="w-full space-y-2.5 pt-3 border-t border-border/60 text-left">
                  <div className="flex items-start gap-2.5 text-xs text-text-muted">
                    <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[10px] font-bold text-text-main shrink-0 mt-0.5">
                      1
                    </span>
                    <span>
                      Open <strong className="text-text-main">White Vault</strong> on any device where your account is currently signed in.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-text-muted">
                    <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[10px] font-bold text-text-main shrink-0 mt-0.5">
                      2
                    </span>
                    <span>
                      Tap <strong className="text-text-main">Fleet</strong> at the bottom bar and click <strong className="text-text-main">Pairing Key</strong>.
                    </span>
                  </div>

                  <div className="flex items-start gap-2.5 text-xs text-text-muted">
                    <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[10px] font-bold text-text-main shrink-0 mt-0.5">
                      3
                    </span>
                    <span>
                      Enter the key above and click <strong className="text-text-main">Connect & Sign In</strong>. Your session links instantly.
                    </span>
                  </div>
                </div>
              </form>
            )}

            {/* MODE 3 & 4: EMAIL / PASSWORD SIGN IN OR SIGN UP */}
            {(authMode === 'signin' || authMode === 'signup') && (
              <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'signup' && (
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
                      placeholder="scholar@example.com"
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
                  <span>{isSubmitting ? 'Processing...' : authMode === 'signup' ? 'Create Account' : 'Sign In'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-border/40 py-5 text-center text-xs text-text-faint">
        White Vault • Universal Cross-Device Data Map
      </footer>
    </div>
  );
};
