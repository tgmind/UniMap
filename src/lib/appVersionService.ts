import { Capacitor } from '@capacitor/core';
import { getSupabaseClient } from './supabase';

/**
 * Hardcoded native Android shell version.
 * Increment this constant whenever generating a new native APK with
 * updated Capacitor plugins or native code changes.
 */
export const NATIVE_VERSION = '1.0.0';

export interface AppVersionInfo {
  id: string;
  platform: string;
  latest_version: string;
  min_supported_version: string;
  apk_url: string;
  title?: string;
  release_notes?: string;
  is_critical: boolean;
  created_at?: string;
}

export interface VersionCheckResult {
  needsUpdate: boolean;
  isCritical: boolean;
  currentVersion: string;
  info?: AppVersionInfo;
}

/**
 * Semantic version comparator.
 * Returns true if currentVersion is strictly older than targetVersion (e.g. 1.0.0 < 1.1.0).
 */
export function isVersionOlder(currentVersion: string, targetVersion: string): boolean {
  const current = currentVersion.split('.').map((n) => parseInt(n, 10) || 0);
  const target = targetVersion.split('.').map((n) => parseInt(n, 10) || 0);

  const maxLength = Math.max(current.length, target.length);
  for (let i = 0; i < maxLength; i++) {
    const c = current[i] || 0;
    const t = target[i] || 0;
    if (c < t) return true;
    if (c > t) return false;
  }
  return false;
}

/**
 * Checks Supabase `app_versions` table on startup.
 * Compares current native version against the latest published version in the database.
 */
export async function checkNativeAppVersion(): Promise<VersionCheckResult> {
  const isNative = Capacitor.isNativePlatform();
  // Allow manual preview in browser dev environment if test flag is active
  const isDevEmulation =
    typeof window !== 'undefined' &&
    window.location.search.includes('test_update_modal=true');

  if (!isNative && !isDevEmulation) {
    return {
      needsUpdate: false,
      isCritical: false,
      currentVersion: NATIVE_VERSION,
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      needsUpdate: false,
      isCritical: false,
      currentVersion: NATIVE_VERSION,
    };
  }

  try {
    const { data, error } = await client
      .from('app_versions')
      .select('*')
      .eq('platform', 'android')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return {
        needsUpdate: false,
        isCritical: false,
        currentVersion: NATIVE_VERSION,
      };
    }

    const versionInfo = data as AppVersionInfo;
    const hasNewerVersion = isVersionOlder(NATIVE_VERSION, versionInfo.latest_version);
    const belowMinVersion = isVersionOlder(NATIVE_VERSION, versionInfo.min_supported_version);

    // If version is below minimum supported, update is strictly required/critical
    const isCritical = Boolean(versionInfo.is_critical || belowMinVersion);

    return {
      needsUpdate: hasNewerVersion,
      isCritical,
      currentVersion: NATIVE_VERSION,
      info: versionInfo,
    };
  } catch (err) {
    console.warn('App version check skipped due to error:', err);
    return {
      needsUpdate: false,
      isCritical: false,
      currentVersion: NATIVE_VERSION,
    };
  }
}
