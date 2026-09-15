/**
 * White Vault Tombstone Service
 * Tracks deleted item IDs locally to prevent resurrecting deleted cards during
 * background sync, network reconnects, and cross-device reconciliation.
 */

const TOMBSTONE_STORAGE_KEY = 'whitevault_deleted_item_tombstones';
const TOMBSTONE_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days retention

export interface TombstoneEntry {
  id: string;
  deleted_at: number;
}

export function getAllTombstoneEntries(): TombstoneEntry[] {
  try {
    const raw = localStorage.getItem(TOMBSTONE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const now = Date.now();
    // Auto-prune entries older than 14 days
    return parsed.filter((e) => e && typeof e.id === 'string' && now - (e.deleted_at || 0) < TOMBSTONE_MAX_AGE_MS);
  } catch {
    return [];
  }
}

export function getDeletedItemIds(): Set<string> {
  const entries = getAllTombstoneEntries();
  return new Set(entries.map((e) => e.id));
}

export function isItemDeleted(id: string): boolean {
  if (!id) return false;
  return getDeletedItemIds().has(id);
}

export function recordDeletedItemId(id: string): void {
  if (!id) return;
  try {
    const now = Date.now();
    const existing = getAllTombstoneEntries();
    // Deduplicate and append newest
    const filtered = existing.filter((e) => e.id !== id);
    filtered.push({ id, deleted_at: now });
    localStorage.setItem(TOMBSTONE_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to record tombstone for item:', id, e);
  }
}

export function removeTombstone(id: string): void {
  if (!id) return;
  try {
    const existing = getAllTombstoneEntries();
    const filtered = existing.filter((e) => e.id !== id);
    localStorage.setItem(TOMBSTONE_STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.warn('Failed to remove tombstone:', id, e);
  }
}

export function clearAllTombstones(): void {
  try {
    localStorage.removeItem(TOMBSTONE_STORAGE_KEY);
  } catch {}
}
