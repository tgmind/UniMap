import React, { useState } from 'react';
import { Download, X, Smartphone, Bell, Zap, Share, PlusSquare, CheckCircle2, ShieldCheck } from 'lucide-react';

interface PwaInstallPromptProps {
  isOpen: boolean;
  isIOS: boolean;
  onInstall?: () => Promise<boolean>;
  onDismiss: () => void;
  apkUrl?: string;
  latestVersion?: string;
}

const DEFAULT_APK_URL = 'https://github.com/tgmind/UniMap/releases/latest/download/whitevault-release.apk';

export const PwaInstallPrompt: React.FC<PwaInstallPromptProps> = ({
  isOpen,
  isIOS,
  onDismiss,
  apkUrl = DEFAULT_APK_URL,
  latestVersion = '1.0.0',
}) => {
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [showIosGuide, setShowIosGuide] = useState(false);

  if (!isOpen) return null;

  const handleDownloadClick = () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }

    setDownloadStarted(true);
    const a = document.createElement('a');
    a.href = apkUrl || '/download';
    a.download = 'whitevault-release.apk';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      onDismiss();
    }, 6000);
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end sm:items-center justify-center p-3 sm:p-4 animate-fade-in">
      {/* Backdrop */}
      <div
        onClick={onDismiss}
        className="absolute inset-0 bg-black/40 backdrop-blur-xs pointer-events-auto transition-opacity"
      />

      {/* Modern Bottom Card */}
      <div className="relative pointer-events-auto w-full max-w-md bg-white dark:bg-[#18222D] rounded-3xl border border-slate-200/90 dark:border-white/10 shadow-[0_-8px_36px_rgba(0,0,0,0.14)] dark:shadow-[0_-8px_36px_rgba(0,0,0,0.6)] p-5 space-y-4 select-none animate-in slide-in-from-bottom duration-300">
        {/* Top Centered Drag Handle */}
        <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-600 mx-auto -mt-1 mb-2" />

        {/* Header with App Logo, Title & Close */}
        <div className="flex items-start gap-3.5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-400 p-0.5 shadow-md shadow-emerald-500/25 flex items-center justify-center shrink-0">
            <div className="w-full h-full bg-white dark:bg-[#18222D] rounded-[14px] flex items-center justify-center">
              <img src="/logo.svg" alt="White Vault" className="w-7 h-7" />
            </div>
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-base text-slate-900 dark:text-white tracking-tight">
                {isIOS ? 'Install White Vault' : 'White Vault for Android'}
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 font-mono">
                v{latestVersion}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 inline shrink-0" />
              <span>{isIOS ? 'Add to home screen' : 'Signed Native APK • Real-time Push'}</span>
            </p>
          </div>

          <button
            onClick={onDismiss}
            className="p-1.5 -mr-1 -mt-1 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid grid-cols-3 gap-2 py-1">
          <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <Bell className="w-4 h-4 text-emerald-500 mb-1 stroke-[2.2]" />
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Push Alerts</span>
            <span className="text-[9px] text-slate-400 leading-tight">Card notifications</span>
          </div>

          <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <Smartphone className="w-4 h-4 text-teal-500 mb-1 stroke-[2.2]" />
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Fullscreen</span>
            <span className="text-[9px] text-slate-400 leading-tight">Phone & tablet</span>
          </div>

          <div className="flex flex-col items-center text-center p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <Zap className="w-4 h-4 text-amber-500 mb-1 stroke-[2.2]" />
            <span className="text-[11px] font-semibold text-slate-800 dark:text-slate-200">Offline Vault</span>
            <span className="text-[9px] text-slate-400 leading-tight">0ms instant speed</span>
          </div>
        </div>

        {/* Download Feedback / Install Tips */}
        {downloadStarted && (
          <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-slate-700 dark:text-slate-200 text-xs space-y-1 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Download started!</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Tap the download notification on your phone and choose <strong>Install</strong>.
            </p>
          </div>
        )}

        {/* iOS Step-by-Step Guide */}
        {showIosGuide && (
          <div className="p-3 rounded-2xl bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-900/50 text-xs space-y-2 animate-fade-in">
            <p className="font-semibold text-blue-900 dark:text-blue-200">
              Install on iOS Safari:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-300 text-[11px] leading-relaxed">
              <li>
                Tap the <Share className="inline w-3.5 h-3.5 text-[#2481CC] mx-1 -translate-y-0.5" /> <strong>Share</strong> button in Safari toolbar.
              </li>
              <li>
                Scroll down and select <PlusSquare className="inline w-3.5 h-3.5 text-[#2481CC] mx-1 -translate-y-0.5" /> <strong>Add to Home Screen</strong>.
              </li>
            </ol>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={onDismiss}
            className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Not Now
          </button>

          <button
            onClick={handleDownloadClick}
            className="flex-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-xs font-bold shadow-md shadow-emerald-500/25 flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            {downloadStarted ? (
              <>
                <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
                <span>Downloading...</span>
              </>
            ) : isIOS ? (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>How to Install</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Download APK (4.6 MB)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
