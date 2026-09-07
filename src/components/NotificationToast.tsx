import React, { useEffect, useState } from 'react';
import { ExternalLink, X, Bell } from 'lucide-react';

export interface ToastNotification {
  id: string;
  title: string;
  body: string;
  senderDevice?: string;
  itemId?: string;
}

interface NotificationToastProps {
  notification: ToastNotification | null;
  onDismiss: () => void;
  onNavigateItem?: (itemId: string) => void;
}

/**
 * Plays a clean, pleasant, subtle audio chime using Web Audio API
 */
function playSubtleNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    // Gentle melodic two-tone ding
    osc.frequency.setValueAtTime(587.33, now); // D5
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.12); // A5

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);
  } catch (e) {
    // AudioContext might be restricted until user interaction
  }
}

export const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onDismiss,
  onNavigateItem,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      playSubtleNotificationChime();

      // Gentle haptic feedback on supported mobile devices
      if ('vibrate' in navigator) {
        try {
          navigator.vibrate([60, 40, 60]);
        } catch (_) {}
      }

      // Also trigger Web Notification if permitted and window is not focused
      if (
        'Notification' in window &&
        Notification.permission === 'granted' &&
        document.visibilityState !== 'visible'
      ) {
        try {
          new Notification(notification.title, {
            body: notification.body,
            icon: '/pwa-192x192.png',
          });
        } catch (_) {}
      }

      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onDismiss, 300);
      }, 5000);

      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [notification, onDismiss]);

  if (!notification) return null;

  return (
    <div
      className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] w-[92%] max-w-md transition-all duration-300 ease-out pointer-events-auto ${
        isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 -translate-y-4 scale-95'
      }`}
    >
      <div className="bg-slate-900/90 dark:bg-zinc-900/95 backdrop-blur-xl border border-emerald-500/30 dark:border-emerald-500/40 text-slate-100 rounded-2xl shadow-2xl p-3.5 flex items-center gap-3.5 ring-1 ring-white/10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20 text-white">
          <Bell className="w-5 h-5 animate-pulse" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 truncate">
              {notification.title}
            </h4>
            {notification.senderDevice && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 text-slate-300 truncate max-w-[130px]">
                {notification.senderDevice}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-white line-clamp-1 mt-0.5">
            {notification.body}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {notification.itemId && onNavigateItem && (
            <button
              onClick={() => {
                onNavigateItem(notification.itemId!);
                onDismiss();
              }}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-medium transition-colors flex items-center gap-1"
            >
              <span>Open</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}

          <button
            onClick={() => {
              setIsVisible(false);
              setTimeout(onDismiss, 200);
            }}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
