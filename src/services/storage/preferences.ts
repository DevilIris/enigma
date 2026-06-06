import { Preferences } from '@capacitor/preferences';

/**
 * Typed wrapper over @capacitor/preferences (the UserDefaults / localStorage
 * replacement). All values are JSON-encoded.
 */
export const prefs = {
  async getJSON<T>(key: string, fallback: T): Promise<T> {
    try {
      const { value } = await Preferences.get({ key });
      if (value == null) return fallback;
      return JSON.parse(value) as T;
    } catch {
      return fallback;
    }
  },

  async setJSON<T>(key: string, value: T): Promise<void> {
    await Preferences.set({ key, value: JSON.stringify(value) });
  },

  async getString(key: string): Promise<string | null> {
    const { value } = await Preferences.get({ key });
    return value ?? null;
  },

  async setString(key: string, value: string): Promise<void> {
    await Preferences.set({ key, value });
  },

  async remove(key: string): Promise<void> {
    await Preferences.remove({ key });
  },

  async clear(): Promise<void> {
    await Preferences.clear();
  },
};
