import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Download,
  X,
  Smartphone,
  Bell,
  Zap,
  CheckCircle2,
  AlertTriangle,
  QrCode,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { detectDeviceOS } from '../lib/deviceDetector';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  latestVersion?: string;
  apkUrl?: string;
}

const DEFAULT_APK_URL =
  'https://github.com/tgmind/UniMap/releases/latest/download/whitevault-release.apk';

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  latestVersion = '1.0.0',
  apkUrl = DEFAULT_APK_URL,
}) => {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const os = detectDeviceOS();
  const isAndroid = os === 'android';
  const isMobile = isAndroid || os === 'ios';

  if (!isOpen) return null;

  // Direct download link via Netlify redirect or GitHub Release
  const downloadLink = apkUrl || '/download';
  // Scan URL for desktop users to open on mobile
  const scanUrl = typeof window !== 'undefined' ? `${window.location.origin}/download` : downloadLink;

  const handleDownloadClick = () => {
    setDownloadStarted(true);
    // Trigger download
    const a = document.createElement('a');
    a.href = downloadLink;
    a.download = 'whitevault-release.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white dark:bg-[#151c24] rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl p-5 sm:p-6 space-y-5 select-none animate-in zoom-in-95 duration-200 overflow-hidden">
        {/* Glow Accent */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-start justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-lg shadow-emerald-500/25 flex items-center justify-center shrink-0">
              <div className="w-full h-full bg-white dark:bg-[#151c24] rounded-[14px] flex items-center justify-center">
                <img src="/logo.svg" alt="White Vault" className="w-6 h-6" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white tracking-tight">
                  White Vault for Android
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 font-mono">
                  v{latestVersion}
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                <span>Signed Release APK • 4.6 MB • Zero Tracking</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 -mr-1 -mt-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feature Highlights Grid */}
        <div className="grid grid-cols-3 gap-2.5 relative z-10">
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center text-center">
            <Bell className="w-4 h-4 text-emerald-500 mb-1.5 stroke-[2.2]" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Push Alerts</span>
            <span className="text-[10px] text-slate-400">Card sync notifications</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center text-center">
            <Smartphone className="w-4 h-4 text-teal-500 mb-1.5 stroke-[2.2]" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Full Screen</span>
            <span className="text-[10px] text-slate-400">Auto-rotate phone/tablet</span>
          </div>

          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 flex flex-col items-center text-center">
            <Zap className="w-4 h-4 text-amber-500 mb-1.5 stroke-[2.2]" />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Offline Vault</span>
            <span className="text-[10px] text-slate-400">0ms instant access</span>
          </div>
        </div>

        {/* Desktop QR Code Option */}
        {!isMobile && (
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200/80 dark:border-slate-800 flex items-center gap-4 relative z-10">
            <div className="p-2 bg-white rounded-xl shadow-xs shrink-0 border border-slate-100">
              <QRCodeSVG value={scanUrl} size={84} level="M" />
            </div>
            <div className="space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                <span>Scan with Phone Camera</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                Scan this QR code with your Android phone to download directly to your mobile device.
              </p>
            </div>
          </div>
        )}

        {/* Main Download Button */}
        <div className="space-y-3 relative z-10">
          <button
            onClick={handleDownloadClick}
            className="w-full flex items-center justify-center gap-2.5 py-3.5 px-5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-semibold text-sm shadow-lg shadow-emerald-600/25 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isMobile ? 'Download APK (whitevault-release.apk)' : 'Download APK to Computer'}</span>
          </button>

          {/* Quick Installation Tips on Android */}
          {downloadStarted && (
            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-800 dark:text-slate-200 space-y-2 text-left animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Download started! Quick install steps:</span>
              </div>
              <ol className="text-[11px] space-y-1.5 text-slate-600 dark:text-slate-300 list-decimal list-inside pl-1">
                <li>
                  If Android warns <em>"File might be harmful"</em>, tap <strong>Download anyway</strong> (it is safe and signed).
                </li>
                <li>Tap the download completion notification or find it in your <strong>Downloads</strong> folder.</li>
                <li>Tap <strong>Install</strong>, then launch White Vault!</li>
              </ol>
            </div>
          )}

          {!downloadStarted && isAndroid && (
            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400 px-1">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Direct install APK — no Google Play account required.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
