import { prefs } from './preferences';

/**
 * Token storage abstraction (AniList / Kitsu OAuth tokens).
 *
 * For now this is backed by @capacitor/preferences on every platform so the
 * auth flow (Phase 8) has a working store. On native we will later swap the
 * implementation for a Keychain/Keystore-backed plugin behind this same
 * interface; on web there is no true secure store, so Preferences is the
 * accepted (documented as non-secret-grade) fallback.
 */
export const secureStorage = {
  get(key: string): Promise<string | null> {
    return prefs.getString(key);
  },
  async set(key: string, value: string): Promise<void> {
    await prefs.setString(key, value);
  },
  async remove(key: string): Promise<void> {
    await prefs.remove(key);
  },
};
