import { DeviceOS, DeviceType } from '../types';
import { generateUUID } from './uuid';

export function getDeviceToken(): string {
  const STORAGE_KEY = 'unimap_device_token';
  let token = localStorage.getItem(STORAGE_KEY);
  if (!token) {
    token = 'dev_' + generateUUID();
    localStorage.setItem(STORAGE_KEY, token);
  }
  return token;
}

export function detectDeviceOS(): DeviceOS {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('android')) return 'android';
  if (ua.includes('iphone') || ua.includes('ipad') || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios';
  if (ua.includes('linux')) return 'linux';
  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  return 'other';
}

export function detectDeviceType(): DeviceType {
  const ua = navigator.userAgent.toLowerCase();
  const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
  const width = window.innerWidth;

  if (ua.includes('tablet') || ua.includes('ipad') || (isTouch && width >= 600 && width <= 1024)) {
    return 'tablet';
  }
  if (ua.includes('mobile') || (isTouch && width < 600)) {
    return 'mobile';
  }
  return 'desktop';
}

export function detectBrowser(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Firefox/')) return 'Firefox';
  if (ua.includes('Edg/')) return 'Edge';
  if (ua.includes('Chrome/')) return 'Chrome';
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return 'Safari';
  if (ua.includes('OPR/') || ua.includes('Opera/')) return 'Opera';
  return 'Browser';
}

export function generateDefaultDeviceName(): string {
  const os = detectDeviceOS();
  const type = detectDeviceType();
  const browser = detectBrowser();

  const osLabel = os.charAt(0).toUpperCase() + os.slice(1);
  const typeLabel = type.charAt(0).toUpperCase() + type.slice(1);

  return `${osLabel} ${typeLabel} (${browser})`;
}
