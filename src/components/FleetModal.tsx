import React, { useState, useEffect, useRef } from 'react';
import {
  Laptop,
  Smartphone,
  Tablet,
  X,
  QrCode,
  Trash2,
  Edit2,
  Check,
  Camera,
  Shield,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  StopCircle,
  Video,
  KeyRound,
  Sparkles,
  Copy,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode } from 'html5-qrcode';
import { useAuth } from '../context/AuthContext';
import { DeviceOS, DeviceType } from '../types';
import { generateUUID } from '../lib/uuid';
import {
  parseQrAuthPayload,
  notifyQrScanned,
  authorizeQrSession,
  authorizeWithPairCode,
  generateUniquePairingKey,
  listenForPairingKeyClaims,
  normalizePairingKey,
  TransferableSession,
} from '../lib/qrAuth';
import { getSupabaseClient } from '../lib/supabase';
import { generateDefaultDeviceName } from '../lib/deviceDetector';

interface FleetModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'devices' | 'qr_generate' | 'qr_scan';
}

export const FleetModal: React.FC<FleetModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'devices',
}) => {
  const { user, devices, revokeDevice, renameDevice, refreshDevices, currentDeviceToken } = useAuth();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [activeTab, setActiveTab] = useState<'devices' | 'qr_generate' | 'qr_scan'>(initialTab);
  const [qrToken, setQrToken] = useState<string>('');

  // Robust session extractor for transferring auth credentials to other devices
  const getTransferableSession = async (): Promise<TransferableSession | null> => {
    const client = getSupabaseClient();
    let accessToken = '';
    let refreshToken = '';
    let sessionUser: any = user;
    let expiresAt: number | undefined;
    let expiresIn: number | undefined;
    let tokenType: string | undefined;

    // 1. Check live Supabase client session
    if (client) {
      try {
        const { data: { session } } = await client.auth.getSession();
        if (session) {
          if (session.access_token) accessToken = session.access_token;
          if (session.refresh_token) refreshToken = session.refresh_token;
          if (session.user) sessionUser = session.user;
          if (session.expires_at) expiresAt = session.expires_at;
          if (session.expires_in) expiresIn = session.expires_in;
          if (session.token_type) tokenType = session.token_type;
        }
      } catch (e) {
        console.warn('Error fetching supabase session:', e);
      }
    }

    // 2. Check local storage unimap_auth_token
    if (!accessToken || !refreshToken || !sessionUser) {
      try {
        const stored = localStorage.getItem('unimap_auth_token');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (!accessToken && parsed.access_token) accessToken = parsed.access_token;
          if (!refreshToken && parsed.refresh_token) refreshToken = parsed.refresh_token;
          if (!sessionUser && parsed.user) sessionUser = parsed.user;
          if (!expiresAt && parsed.expires_at) expiresAt = parsed.expires_at;
          if (!expiresIn && parsed.expires_in) expiresIn = parsed.expires_in;
          if (!tokenType && parsed.token_type) tokenType = parsed.token_type;
        }
      } catch (e) {
        console.warn('Error reading stored session:', e);
      }
    }

    if (!accessToken) {
      return null;
    }

    // Ensure refresh_token is never empty/undefined so setSession never throws AuthSessionMissingError
    if (!refreshToken) {
      refreshToken = accessToken;
    }

    let credentials: { email: string; pass: string } | undefined;
    try {
      const rawVault = localStorage.getItem('unimap_vault_cred');
      if (rawVault) {
        credentials = JSON.parse(atob(rawVault));
      }
    } catch (e) {}

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      user: sessionUser || {
        id: user?.id,
        email: user?.email,
        user_metadata: { display_name: user?.display_name },
      },
      expires_at: expiresAt || Math.floor(Date.now() / 1000) + 3600,
      expires_in: expiresIn || 3600,
      token_type: tokenType || 'bearer',
      credentials,
    };
  };

  // Pairing Key Generation & Broadcast States
  const [pairingKey, setPairingKey] = useState<string>('');
  const [pairingCountdown, setPairingCountdown] = useState<number>(300);
  const [copiedKey, setCopiedKey] = useState<boolean>(false);
  const [remoteDeviceClaimed, setRemoteDeviceClaimed] = useState<string | null>(null);

  // Native camera file input ref
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Scanner states
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessingImage, setIsProcessingImage] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [isSubmittingCode, setIsSubmittingCode] = useState(false);

  const [scannedSession, setScannedSession] = useState<{
    sessionId: string;
    code?: string;
    clientInfo?: { browser?: string; os?: string };
    timestamp: number;
  } | null>(null);
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [authSuccess, setAuthSuccess] = useState(false);

  const hasMediaDevices = typeof navigator !== 'undefined' && Boolean(navigator?.mediaDevices?.getUserMedia);
  const isSecureOrigin = typeof window !== 'undefined' && (
    window.isSecureContext ||
    location.protocol === 'https:' ||
    location.hostname === 'localhost' ||
    location.hostname === '127.0.0.1'
  );

  // Stop camera helper
  const stopCameraScanner = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        // Ignore if already stopped
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  // Process decoded QR text
  const handleQrDecoded = (decodedText: string) => {
    const parsed = parseQrAuthPayload(decodedText);
    if (parsed && parsed.sid) {
      stopCameraScanner();

      // Subtle vibration feedback
      try {
        if (navigator.vibrate) navigator.vibrate([40, 50, 40]);
      } catch (e) {}

      // Send notification to laptop that its QR was captured
      const devName = localStorage.getItem('unimap_custom_device_name') || generateDefaultDeviceName();
      notifyQrScanned(parsed.sid, devName);

      setScannedSession({
        sessionId: parsed.sid,
        code: parsed.code,
        clientInfo: parsed.clientInfo,
        timestamp: parsed.createdAt,
      });
      setScanError(null);
    } else {
      setScanError('Recognized a QR code, but it was not an authorized UniMap login code.');
    }
  };

  // Launch Native Camera Capture (Works on 100% of mobile devices & HTTP PWAs)
  const handleLaunchNativeCamera = () => {
    setScanError(null);
    fileInputRef.current?.click();
  };

  // Process Image File from Camera
  const handleImageFileCaptured = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setScanError(null);

    try {
      let scanner = scannerRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode('unimap-qr-scanner-box');
        scannerRef.current = scanner;
      }
      const decodedText = await scanner.scanFile(file, false);
      handleQrDecoded(decodedText);
    } catch (err: any) {
      console.warn('Native photo QR decode error:', err);
      setScanError('Could not clearly detect the QR code in that photo. Please position the camera closer to the laptop screen and snap again.');
    } finally {
      setIsProcessingImage(false);
      if (e.target) e.target.value = '';
    }
  };

  // Start Live WebRTC Video Camera Stream (if supported)
  const startLiveCameraScanner = async () => {
    setScanError(null);
    setScannedSession(null);
    setAuthSuccess(false);

    if (!hasMediaDevices || !isSecureOrigin) {
      setScanError('Live video requires HTTPS on mobile networks. Launching your camera photo scanner instead...');
      setTimeout(() => {
        handleLaunchNativeCamera();
      }, 400);
      return;
    }

    setIsScanning(true);

    try {
      await new Promise((r) => setTimeout(r, 120));
      const box = document.getElementById('unimap-qr-scanner-box');
      if (!box) {
        setIsScanning(false);
        return;
      }

      if (scannerRef.current) {
        try {
          await scannerRef.current.stop();
        } catch (e) {}
      }

      const scanner = new Html5Qrcode('unimap-qr-scanner-box');
      scannerRef.current = scanner;

      let cameraConfig: any = { facingMode: { ideal: 'environment' } };
      try {
        const cameras = await Html5Qrcode.getCameras();
        if (cameras && cameras.length > 0) {
          const backCam = cameras.find((c) =>
            c.label.toLowerCase().includes('back') || c.label.toLowerCase().includes('rear')
          ) || cameras[cameras.length - 1];
          cameraConfig = backCam.id;
        }
      } catch (e) {
        // Fallback to constraint object
      }

      await scanner.start(
        cameraConfig,
        {
          fps: 12,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleQrDecoded(decodedText);
        },
        () => {}
      );
    } catch (err: any) {
      console.warn('Camera scanner start error:', err);
      setScanError('Live camera stream not supported: ' + (err.message || 'Permission denied') + '. Use the "Take Photo of QR" button below.');
      setIsScanning(false);
    }
  };

  // Authorize using Scanned Session
  const handleAuthorizeLogin = async () => {
    if (!scannedSession) return;
    setIsAuthorizing(true);
    setScanError(null);

    try {
      const transferable = await getTransferableSession();
      if (!transferable) throw new Error('No active user credentials found to transfer. Please ensure you are logged in.');

      const devName = localStorage.getItem('unimap_custom_device_name') || generateDefaultDeviceName();
      const ok = await authorizeQrSession(
        scannedSession.sessionId,
        transferable,
        devName
      );

      if (ok) {
        setAuthSuccess(true);
        await refreshDevices();
        setTimeout(() => {
          setAuthSuccess(false);
          setScannedSession(null);
          setActiveTab('devices');
        }, 2200);
      } else {
        throw new Error('Connection timed out. Please verify laptop is showing this session and try again.');
      }
    } catch (err: any) {
      setScanError(err.message || 'Failed to authorize device');
    } finally {
      setIsAuthorizing(false);
    }
  };

  // Authorize using 6-Digit Manual Pairing Code
  const handleAuthorizeWithCode = async () => {
    const cleanCode = manualCode.replace(/\D/g, '').trim();
    if (cleanCode.length !== 6) {
      setScanError('Please enter all 6 digits shown on the laptop screen.');
      return;
    }

    setIsSubmittingCode(true);
    setScanError(null);

    try {
      const transferable = await getTransferableSession();
      if (!transferable) throw new Error('No active user credentials found to transfer. Please ensure you are logged in.');

      const devName = localStorage.getItem('unimap_custom_device_name') || generateDefaultDeviceName();
      const ok = await authorizeWithPairCode(
        cleanCode,
        transferable,
        devName
      );

      if (ok) {
        setAuthSuccess(true);
        setManualCode('');
        await refreshDevices();
        setTimeout(() => {
          setAuthSuccess(false);
          setActiveTab('devices');
        }, 2200);
      } else {
        throw new Error('Could not pair with code. Please check that your laptop screen is displaying this exact code.');
      }
    } catch (err: any) {
      setScanError(err.message || 'Pairing failed');
    } finally {
      setIsSubmittingCode(false);
    }
  };

  // Generate a new Pairing Key
  const handleRegeneratePairingKey = () => {
    const newKey = generateUniquePairingKey();
    setPairingKey(newKey);
    setPairingCountdown(300);
    setRemoteDeviceClaimed(null);
  };

  const handleCopyPairingKey = async () => {
    if (!pairingKey) return;
    try {
      await navigator.clipboard.writeText(pairingKey);
      setCopiedKey(true);
      setTimeout(() => setCopiedKey(false), 2000);
    } catch (e) {
      console.warn('Clipboard write error:', e);
    }
  };

  // Countdown for pairing key (5 min)
  useEffect(() => {
    if (!isOpen || activeTab !== 'qr_generate' || !pairingKey || remoteDeviceClaimed) return;

    const timer = setInterval(() => {
      setPairingCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, activeTab, pairingKey, remoteDeviceClaimed]);

  // Realtime Broadcast Listener for Pairing Key Claims
  useEffect(() => {
    if (!isOpen || activeTab !== 'qr_generate' || !pairingKey || pairingCountdown <= 0 || remoteDeviceClaimed) {
      return;
    }

    let unsubscribe: (() => void) | undefined;

    const setupListener = async () => {
      const transferable = await getTransferableSession();
      if (!transferable) return;

      const devName = localStorage.getItem('unimap_custom_device_name') || generateDefaultDeviceName();

      unsubscribe = listenForPairingKeyClaims(
        pairingKey,
        transferable,
        devName,
        async (remoteName) => {
          setRemoteDeviceClaimed(remoteName);
          await refreshDevices();
        }
      );
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [isOpen, activeTab, pairingKey, pairingCountdown, remoteDeviceClaimed, refreshDevices]);

  // Automatically generate key on tab open if empty
  useEffect(() => {
    if (isOpen && activeTab === 'qr_generate' && !pairingKey) {
      handleRegeneratePairingKey();
    }
  }, [isOpen, activeTab, pairingKey]);

  // Lifecycle when modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setQrToken('unimap_sync_' + generateUUID());
      refreshDevices();
      setScannedSession(null);
      setAuthSuccess(false);
      setScanError(null);
      setManualCode('');
      setRemoteDeviceClaimed(null);
      if (initialTab === 'qr_generate') {
        handleRegeneratePairingKey();
      }
    } else {
      stopCameraScanner();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialTab]);

  // Stop camera when leaving qr_scan tab
  useEffect(() => {
    if (activeTab !== 'qr_scan') {
      stopCameraScanner();
      setScannedSession(null);
      setAuthSuccess(false);
      setScanError(null);
    }
  }, [activeTab]);

  // Clean up scanner on unmount
  useEffect(() => {
    return () => {
      stopCameraScanner();
    };
  }, []);

  if (!isOpen) return null;

  const getDeviceIcon = (type: DeviceType) => {
    if (type === 'mobile') return <Smartphone className="w-4 h-4 text-accent" />;
    if (type === 'tablet') return <Tablet className="w-4 h-4 text-purple-400" />;
    return <Laptop className="w-4 h-4 text-primary" />;
  };

  const handleStartEdit = (id: string, currentName: string) => {
    setEditingId(id);
    setEditingName(currentName);
  };

  const handleSaveEdit = async (id: string) => {
    if (editingName.trim()) {
      await renameDevice(id, editingName.trim());
    }
    setEditingId(null);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2.5 sm:p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-surface border border-border rounded-2xl p-4 sm:p-6 shadow-xl overflow-hidden max-h-[92vh] flex flex-col space-y-3 sm:space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hidden Native Camera Input for 100% mobile compatibility */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleImageFileCaptured}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-border/60">
          <div>
            <h2 className="text-base font-semibold text-text-main">Connected Devices</h2>
            <p className="text-xs text-text-muted mt-0.5">Manage hardware sessions across your computers and mobile devices</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-text-faint hover:text-text-main hover:bg-surface-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modern 3-Tab Responsive Switcher */}
        <div className="grid grid-cols-3 p-1 rounded-xl bg-surface-elevated border border-border gap-1">
          <button
            onClick={() => setActiveTab('devices')}
            className={`py-1.5 sm:py-2 px-1 rounded-lg text-[11px] sm:text-xs font-medium transition-all ${
              activeTab === 'devices' ? 'bg-surface text-text-main shadow-xs font-semibold' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <span>Devices</span>
            <span className="opacity-70 ml-1">({devices.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('qr_scan')}
            className={`py-1.5 sm:py-2 px-1 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
              activeTab === 'qr_scan' ? 'bg-surface text-text-main shadow-xs font-semibold' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Camera className="w-3.5 h-3.5 shrink-0 text-accent" />
            <span className="truncate">Scan QR</span>
          </button>
          <button
            onClick={() => setActiveTab('qr_generate')}
            className={`py-1.5 sm:py-2 px-1 rounded-lg text-[11px] sm:text-xs font-medium flex items-center justify-center gap-1 sm:gap-1.5 transition-all ${
              activeTab === 'qr_generate' ? 'bg-surface text-text-main shadow-xs font-semibold' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 shrink-0 text-amber-500" />
            <span className="truncate">Pair Key</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="overflow-y-auto flex-1 space-y-3 pr-1">
          {/* TAB 1: DEVICES LIST */}
          {activeTab === 'devices' && (
            <div className="space-y-3">
              {/* Quick Action Banner: Link Another Device (Scan QR or Generate Key) */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-accent/15 via-primary/10 to-transparent border border-accent/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-accent/20 flex items-center justify-center text-accent shrink-0">
                    <Laptop className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-text-main">Connect Another Screen</p>
                    <p className="text-[11px] text-text-muted truncate">
                      Point camera at computer QR or generate a pairing key
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                  <button
                    onClick={() => setActiveTab('qr_scan')}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-accent hover:bg-accent/90 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <Camera className="w-3 h-3" />
                    <span>Scan QR</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('qr_generate')}
                    className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-3 h-3" />
                    <span>Pairing Key</span>
                  </button>
                </div>
              </div>

              {/* Devices Card List */}
              <div className="rounded-xl border border-border bg-surface-elevated/40 divide-y divide-border/60 overflow-hidden">
                {devices.map((dev) => {
                  const isCurrent = dev.device_token === currentDeviceToken || dev.is_current;
                  return (
                    <div key={dev.id} className="p-3.5 flex items-center justify-between gap-3 text-xs hover:bg-surface-elevated transition-colors">
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-lg bg-surface border border-border flex items-center justify-center shrink-0">
                          {getDeviceIcon(dev.device_type)}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            {editingId === dev.id ? (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="bg-surface border border-primary text-text-main text-xs px-2 py-0.5 rounded focus:outline-none"
                                />
                                <button
                                  onClick={() => handleSaveEdit(dev.id)}
                                  className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <span className="font-semibold text-text-main text-break-word">
                                  {dev.device_name}
                                </span>
                                <button
                                  onClick={() => handleStartEdit(dev.id, dev.device_name)}
                                  className="text-text-faint hover:text-text-muted p-0.5"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                              </>
                            )}

                            {isCurrent && (
                              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-primary/10 text-primary border border-primary/20">
                                This Device
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-text-faint flex items-center gap-1.5 mt-0.5">
                            <span className="capitalize">{dev.os}</span>
                            <span>•</span>
                            <span>{dev.browser}</span>
                            <span>•</span>
                            <span className="flex items-center gap-1 text-emerald-400">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                              Online
                            </span>
                          </p>
                        </div>
                      </div>

                      {!isCurrent && (
                        <button
                          onClick={() => revokeDevice(dev.id)}
                          className="text-xs text-text-faint hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 transition-colors"
                        >
                          Revoke
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: ROBUST SCANNER & AUTHORIZATION */}
          {activeTab === 'qr_scan' && (
            <div className="space-y-4">
              {/* Error Notice */}
              {scanError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2 animate-fade-in">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="flex-1 text-break-word">{scanError}</span>
                </div>
              )}

              {/* State A: Authorized Success */}
              {authSuccess && (
                <div className="p-8 rounded-2xl bg-surface-elevated/70 border border-border text-center space-y-3 animate-scale-up">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-text-main">Laptop Authorized!</h3>
                  <p className="text-xs text-text-muted max-w-xs mx-auto">
                    Your computer is now securely logged in to your UniMap study vault.
                  </p>
                </div>
              )}

              {/* State B: Scanned & Awaiting Mobile Authorization Confirmation */}
              {!authSuccess && scannedSession && (
                <div className="p-6 rounded-2xl bg-surface-elevated/70 border border-border text-center space-y-4 animate-scale-up">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center mx-auto shadow-sm">
                    <Laptop className="w-6 h-6" />
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-text-main">Authorize Laptop Sign-In?</h3>
                    <p className="text-xs text-text-muted mt-1">
                      A computer is requesting to access your UniMap vault.
                    </p>
                  </div>

                  {/* Device Info Badge */}
                  <div className="p-3.5 rounded-xl bg-surface border border-border/80 text-left space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-text-main">
                      <span className="text-text-muted">Target Screen:</span>
                      <span className="font-semibold text-text-main">
                        {scannedSession.clientInfo?.browser || 'Web Browser'} • {scannedSession.clientInfo?.os || 'Computer'}
                      </span>
                    </div>
                    {scannedSession.code && (
                      <div className="flex items-center justify-between text-text-main">
                        <span className="text-text-muted">Pairing Code:</span>
                        <span className="font-mono text-xs font-semibold">{scannedSession.code}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between text-text-main">
                      <span className="text-text-muted">Time:</span>
                      <span className="font-mono text-[11px] text-text-faint">Just now</span>
                    </div>
                    <div className="flex items-center justify-between text-emerald-500">
                      <span className="text-text-muted">Access Level:</span>
                      <span className="font-medium flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> Full Vault Sync
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-text-faint">
                    Only approve if you recognize the laptop screen in front of you.
                  </p>

                  {/* Action Buttons */}
                  <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3 pt-2">
                    <button
                      onClick={() => {
                        setScannedSession(null);
                        setScanError(null);
                      }}
                      disabled={isAuthorizing}
                      className="w-full sm:flex-1 py-2.5 rounded-xl bg-surface-hover hover:bg-surface-elevated border border-border text-xs font-semibold text-text-muted transition-all"
                    >
                      Cancel
                    </button>

                    <button
                      onClick={handleAuthorizeLogin}
                      disabled={isAuthorizing}
                      className="w-full sm:flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-md shadow-emerald-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95"
                    >
                      {isAuthorizing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Authorizing...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-4 h-4" />
                          <span>Approve & Sign In</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* State C: Main Scanner Interface with Camera & 6-Digit Pin */}
              {!authSuccess && !scannedSession && (
                <div className="space-y-4">
                  {/* Container for Html5Qrcode element (always present in DOM for file decode and live stream) */}
                  <div className={`${isScanning ? 'block' : 'hidden'} relative max-w-[260px] mx-auto rounded-2xl overflow-hidden aspect-square bg-black shadow-inner border border-border mb-3`}>
                    <div id="unimap-qr-scanner-box" className="w-full h-full" />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-accent/70 rounded-xl relative">
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-white" />
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-white" />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-white" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-white" />
                      </div>
                    </div>
                  </div>

                  {/* Hidden scanner box when not in live mode so Html5Qrcode instance can initialize */}
                  {!isScanning && (
                    <div id="unimap-qr-scanner-box" className="hidden w-1 h-1" />
                  )}

                  {/* Processing photo indicator */}
                  {isProcessingImage && (
                    <div className="p-4 rounded-xl bg-surface-elevated border border-border text-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" />
                      <p className="text-xs font-semibold text-text-main">Analyzing QR Code photo...</p>
                    </div>
                  )}

                  {/* Option 1: Native Phone Camera Snap (100% Reliable across all PWAs & HTTP) */}
                  <div className="p-4 rounded-2xl bg-surface-elevated/60 border border-border space-y-3">
                    <div className="text-center">
                      <h4 className="text-xs font-bold text-text-main flex items-center justify-center gap-1.5">
                        <Camera className="w-4 h-4 text-accent" />
                        <span>Scan with Mobile Camera</span>
                      </h4>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        Snap a quick photo of the QR code on your laptop screen to log in immediately.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        onClick={handleLaunchNativeCamera}
                        disabled={isProcessingImage}
                        className="w-full py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-sm flex items-center justify-center gap-2 active:scale-98 transition-all"
                      >
                        <Camera className="w-4 h-4" />
                        <span>Take Photo of QR Code</span>
                      </button>

                      <button
                        onClick={isScanning ? stopCameraScanner : startLiveCameraScanner}
                        disabled={isProcessingImage}
                        className="w-full py-2 rounded-xl bg-surface border border-border hover:bg-surface-elevated text-text-muted hover:text-text-main text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        {isScanning ? (
                          <>
                            <StopCircle className="w-3.5 h-3.5 text-red-400" />
                            <span>Stop Live Viewfinder</span>
                          </>
                        ) : (
                          <>
                            <Video className="w-3.5 h-3.5 text-text-faint" />
                            <span>Toggle Live Video Stream</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 py-0.5">
                    <div className="h-px bg-border flex-1" />
                    <span className="text-[10px] uppercase font-mono text-text-faint tracking-wider">
                      Or enter 6-digit code
                    </span>
                    <div className="h-px bg-border flex-1" />
                  </div>

                  {/* Option 2: Direct 6-Digit Pairing Code (100% Guaranteed Backup) */}
                  <div className="p-4 rounded-2xl bg-surface-elevated/60 border border-border space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-text-main">
                        <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                        <span>Pair via 6-Digit Code</span>
                      </div>
                      <span className="text-[10px] text-text-faint">Instant</span>
                    </div>
                    <p className="text-[11px] text-text-muted">
                      Type the 6-digit pairing code shown right beneath the QR code on your computer screen.
                    </p>

                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={6}
                        placeholder="e.g. 849201"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full sm:flex-1 bg-surface border border-border focus:border-primary rounded-xl px-3 py-2.5 sm:py-2 text-center text-base sm:text-sm font-mono tracking-widest font-bold text-text-main placeholder-text-faint focus:outline-none transition-colors shadow-2xs"
                      />

                      <button
                        onClick={handleAuthorizeWithCode}
                        disabled={manualCode.replace(/\D/g, '').length !== 6 || isSubmittingCode}
                        className="w-full sm:w-auto px-4 py-2.5 sm:py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 text-white text-xs font-semibold shadow-xs flex items-center justify-center gap-1.5 active:scale-95 transition-all shrink-0"
                      >
                        {isSubmittingCode ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Authorizing...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4" />
                            <span>Authorize Laptop</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UNIQUE PAIRING KEY GENERATION & BROADCAST */}
          {activeTab === 'qr_generate' && (
            <div className="space-y-4 animate-fade-in">
              {/* State A: Remote Device Claimed Successfully */}
              {remoteDeviceClaimed ? (
                <div className="p-6 sm:p-8 rounded-2xl bg-surface-elevated/70 border border-emerald-500/30 text-center space-y-4 animate-scale-up">
                  <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-sm">
                    <CheckCircle2 className="w-7 h-7" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-text-main">Device Linked Successfully!</h3>
                    <p className="text-xs text-emerald-400 font-medium mt-0.5">
                      {remoteDeviceClaimed} has connected to your UniMap vault
                    </p>
                    <p className="text-[11px] text-text-muted mt-2 max-w-xs mx-auto">
                      All your lecture notes, equations, and canvas cards are now synced in real-time.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={handleRegeneratePairingKey}
                      className="px-4 py-2 rounded-xl bg-surface hover:bg-surface-hover border border-border text-xs font-semibold text-text-main transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Link Another Device</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('devices')}
                      className="px-4 py-2 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <Laptop className="w-3.5 h-3.5" />
                      <span>View Devices</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* State B: Active Pairing Key Card with Realtime Listener */
                <div className="space-y-4">
                  <div className="p-4 sm:p-6 rounded-2xl bg-surface-elevated/60 border border-border text-center space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-text-main">
                        <KeyRound className="w-4 h-4 text-amber-500" />
                        <span>Unique Pairing Key</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          pairingCountdown <= 30
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        }`}>
                          {pairingCountdown <= 0 ? 'Expired' : `${Math.floor(pairingCountdown / 60)}:${String(pairingCountdown % 60).padStart(2, '0')}`}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-text-muted text-left sm:text-center">
                      Enter this key on your other device's sign-in screen to authenticate instantly without typing passwords.
                    </p>

                    {/* Key Display Card with Copy & Regenerate Buttons */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-surface border-2 border-amber-500/30 shadow-inner flex flex-col sm:flex-row items-center justify-between gap-3">
                      <div className="font-mono text-2xl sm:text-3xl font-black tracking-widest text-text-main select-all py-1">
                        {pairingKey || 'GENERATING...'}
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        <button
                          onClick={handleCopyPairingKey}
                          className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold shadow-xs active:scale-95 transition-all flex items-center justify-center gap-1.5"
                          title="Copy pairing key"
                        >
                          {copiedKey ? (
                            <>
                              <Check className="w-3.5 h-3.5" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Key</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={handleRegeneratePairingKey}
                          className="p-2 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-text-muted hover:text-text-main transition-colors"
                          title="Generate a new key"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Realtime Broadcast Status */}
                    <div className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-surface border border-border text-xs">
                      {pairingCountdown > 0 ? (
                        <>
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                          <span className="text-text-muted text-[11px] truncate">
                            Listening for connections... Enter key on other screen
                          </span>
                        </>
                      ) : (
                        <>
                          <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                          <span className="text-red-400 text-[11px]">
                            Key expired. Click refresh above to generate a new key.
                          </span>
                        </>
                      )}
                    </div>

                    {/* QR Code Alternative for quick scanning */}
                    <div className="pt-2 border-t border-border/60 flex flex-col items-center">
                      <p className="text-[11px] text-text-muted mb-2.5">
                        Or scan directly from another mobile camera:
                      </p>
                      <div className="p-3 rounded-2xl bg-white shadow-sm border border-slate-200 inline-block">
                        <QRCodeSVG
                          value={JSON.stringify({ type: 'unimap_pair_key', key: pairingKey })}
                          size={140}
                          level="H"
                          marginSize={1}
                        />
                      </div>
                    </div>

                    {/* 3-Step Guide */}
                    <div className="w-full space-y-2 pt-2 border-t border-border/60 text-left">
                      <div className="flex items-start gap-2.5 text-xs text-text-muted">
                        <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[10px] font-bold text-text-main shrink-0 mt-0.5">
                          1
                        </span>
                        <span>
                          Open <strong className="text-text-main">UniMap</strong> on the computer or phone you want to sign in to.
                        </span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-text-muted">
                        <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[10px] font-bold text-text-main shrink-0 mt-0.5">
                          2
                        </span>
                        <span>
                          Click the <strong className="text-text-main">Pairing Key</strong> tab on the sign-in screen.
                        </span>
                      </div>
                      <div className="flex items-start gap-2.5 text-xs text-text-muted">
                        <span className="w-5 h-5 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-[10px] font-bold text-text-main shrink-0 mt-0.5">
                          3
                        </span>
                        <span>
                          Enter <strong className="text-amber-500 font-mono">{pairingKey}</strong> and tap <strong className="text-text-main">Connect & Sign In</strong>.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-border/60 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-surface-elevated hover:bg-surface-hover border border-border text-xs font-medium text-text-main transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
