import { prefs } from '../storage/preferences';
import { PreferenceKey } from '../storage/keys';

export interface BackupData {
  version: number;
  createdAt: number;
  data: Record<string, unknown>;
}

const BACKUP_KEYS: string[] = [
  PreferenceKey.Settings,
  PreferenceKey.Favorites,
  PreferenceKey.ContinueWatching,
  PreferenceKey.SearchHistory,
  PreferenceKey.Downloads,
];

/** Base64-encode a backup (UTF-8 safe), matching Ryu's `.albackup` format. */
export function encodeBackup(b: BackupData): string {
  return btoa(unescape(encodeURIComponent(JSON.stringify(b))));
}

export function decodeBackup(s: string): BackupData {
  return JSON.parse(decodeURIComponent(escape(atob(s.trim())))) as BackupData;
}

export async function createBackup(now: number): Promise<BackupData> {
  const data: Record<string, unknown> = {};
  for (const key of BACKUP_KEYS) {
    const value = await prefs.getJSON<unknown>(key, null);
    if (value != null) data[key] = value;
  }
  return { version: 1, createdAt: now, data };
}

export async function restoreBackup(b: BackupData): Promise<void> {
  for (const [key, value] of Object.entries(b.data ?? {})) {
    await prefs.setJSON(key, value);
  }
}
