/**
 * Universal UUID v4 generator that works in all contexts:
 * - HTTPS secure contexts
 * - HTTP local network / Wi-Fi IP contexts (e.g. http://192.168.1.9:5173/)
 * - Web Workers & older mobile browsers where crypto.randomUUID is undefined
 */
export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    try {
      return crypto.randomUUID();
    } catch {
      // Fall through to standard fallback
    }
  }

  // RFC4122 v4 compliant fallback
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}
