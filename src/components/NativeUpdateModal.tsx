import React from 'react';
import { Download, AlertTriangle, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { AppVersionInfo } from '../lib/appVersionService';

interface NativeUpdateModalProps {
  isOpen: boolean;
  isCritical: boolean;
  currentVersion: string;
  versionInfo?: AppVersionInfo;
  onDismiss?: () => void;
}

export const NativeUpdateModal: React.FC<NativeUpdateModalProps> = ({
  isOpen,
  isCritical,
  currentVersion,
  versionInfo,
  onDismiss,
}) => {
  if (!isOpen || !versionInfo) return null;

  const handleDownload = () => {
    if (versionInfo.apk_url) {
      // Direct APK download triggers Android system package installer prompt
      window.open(versionInfo.apk_url, '_system');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="update-modal-title"
    >
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-[#0E1621] border border-white/10 shadow-2xl shadow-black/80 text-slate-100 p-6 sm:p-8 animate-scale-up">
        {/* Glow ambient accent behind icon */}
        <div className="absolute -top-16 -left-16 w-36 h-36 bg-[#2481CC]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -right-16 w-36 h-36 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Icon & Badge Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#2481CC] to-[#50A7EA] p-0.5 shadow-lg shadow-[#2481CC]/30">
            <div className="w-full h-full rounded-[14px] bg-[#0E1621] flex items-center justify-center">
              <Download className="w-7 h-7 text-[#50A7EA] animate-bounce-subtle" />
            </div>
          </div>

          <div
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${
              isCritical
                ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
            }`}
          >
            {isCritical ? (
              <>
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Critical Update</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>New Release</span>
              </>
            )}
          </div>
        </div>

        {/* Title & Description */}
        <h2 id="update-modal-title" className="text-xl sm:text-2xl font-bold tracking-tight text-white mb-2">
          {isCritical ? 'A critical native update is required' : 'New Version Available'}
        </h2>
        <p className="text-sm text-slate-300 mb-5 leading-relaxed">
          {isCritical
            ? 'This update includes essential native runtime improvements and security optimizations required to keep syncing your vault.'
            : 'A new version of White Vault Android is available with performance and stability improvements.'}
        </p>

        {/* Version Change Indicator */}
        <div className="flex items-center justify-between p-3.5 mb-5 rounded-2xl bg-[#182533] border border-white/5">
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-wider text-slate-400">Current App</span>
            <span className="font-mono text-sm font-semibold text-slate-300">v{currentVersion}</span>
          </div>

          <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-[#50A7EA]" />
          </div>

          <div className="flex flex-col text-right">
            <span className="text-[11px] uppercase tracking-wider text-[#50A7EA]">Required APK</span>
            <span className="font-mono text-sm font-semibold text-white">
              v{versionInfo.latest_version}
            </span>
          </div>
        </div>

        {/* Release Notes (if provided) */}
        {versionInfo.release_notes && (
          <div className="mb-6 p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 max-h-32 overflow-y-auto text-xs text-slate-300">
            <div className="font-semibold text-slate-200 mb-1 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>What's New in v{versionInfo.latest_version}</span>
            </div>
            <p className="whitespace-pre-line leading-relaxed text-slate-300">
              {versionInfo.release_notes}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col gap-2.5">
          <button
            onClick={handleDownload}
            className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#2481CC] to-[#1E70B0] hover:from-[#1E70B0] hover:to-[#165a8e] active:scale-[0.98] text-white font-semibold text-sm shadow-xl shadow-[#2481CC]/30 flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Download Update (APK)</span>
          </button>

          {!isCritical && onDismiss && (
            <button
              onClick={onDismiss}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer text-center"
            >
              Remind Me Later
            </button>
          )}
        </div>

        {/* Footer Note */}
        {isCritical && (
          <p className="mt-4 text-[11px] text-center text-slate-400">
            White Vault will prompt the Android installer to update in place.
          </p>
        )}
      </div>
    </div>
  );
};
