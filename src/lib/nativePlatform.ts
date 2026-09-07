import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';

/**
 * Initializes native Android device integrations:
 * - Edge-to-edge status bar overlay
 * - Theme-synchronized status bar icons
 * - Android hardware back button handling
 */
export async function initNativePlatform(isDarkMode: boolean = false): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // Configure edge-to-edge full screen overlay
    await StatusBar.setOverlaysWebView({ overlay: true });
    await updateNativeStatusBar(isDarkMode);
  } catch (err) {
    console.warn('Native StatusBar init notice:', err);
  }

  // Listen for Android hardware back button press
  try {
    await CapApp.removeAllListeners();
    await CapApp.addListener('backButton', ({ canGoBack }) => {
      // If modal or popover is open, close it, or go back in history
      const hasOpenModal = document.querySelector('[role="dialog"], .fixed.z-50');
      if (hasOpenModal) {
        // Dispatch ESC keydown to trigger active modal close handler
        window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape' }));
        return;
      }

      if (canGoBack && window.history.length > 1) {
        window.history.back();
      } else {
        // Gracefully minimize app to background without terminating
        CapApp.minimizeApp();
      }
    });
  } catch (err) {
    console.warn('Native BackButton handler notice:', err);
  }
}

/**
 * Dynamically updates the native Android status bar icons (light vs dark)
 * based on the active UniMap theme.
 */
export async function updateNativeStatusBar(isDarkMode: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // In Capacitor StatusBar:
    // Style.Dark means light content (white text/icons for dark backgrounds)
    // Style.Light means dark content (black text/icons for light backgrounds)
    await StatusBar.setStyle({
      style: isDarkMode ? Style.Dark : Style.Light,
    });
  } catch (err) {
    console.warn('Failed to update native status bar style:', err);
  }
}
