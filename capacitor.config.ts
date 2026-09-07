import type { CapacitorConfig } from '@capacitor/cli';

/**
 * Capacitor Configuration for White Vault Android App
 * App ID: com.whitevault.app
 * App Name: White Vault
 *
 * Over-The-Air (OTA) Updates:
 * The `server.url` points to your live Netlify deployment URL.
 * Any web updates pushed to GitHub and deployed by Netlify will immediately
 * reflect inside the native shell without rebuilding or reinstalling the APK.
 * If you need to test local bundle assets (offline mode), comment out the `url` property.
 */
const config: CapacitorConfig = {
  appId: 'com.whitevault.app',
  appName: 'White Vault',
  webDir: 'dist',
  server: {
    // Production Netlify URL for live Over-The-Air updates
    // You can override this via CAPACITOR_SERVER_URL environment variable or modify directly
    url: process.env.CAPACITOR_SERVER_URL || 'https://whitevault.netlify.app',
    cleartext: true,
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    backgroundColor: '#0E1621',
  },
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    StatusBar: {
      overlaysWebView: true,
    },
  },
};

export default config;
