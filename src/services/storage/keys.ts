/**
 * Persistence keys. Kept stable so a future import path from the original
 * app (or across Enigma versions) is trivial.
 */
export const PreferenceKey = {
  Settings: 'enigma.settings',
  Favorites: 'enigma.favorites',
  ContinueWatching: 'continueWatchingItems',
  SearchHistory: 'enigma.searchHistory',
  Downloads: 'enigma.downloads',
  SelectedSource: 'selectedMediaSource',
} as const;

export type PreferenceKeyName =
  (typeof PreferenceKey)[keyof typeof PreferenceKey];

/** Secure-storage keys (auth tokens). */
export const SecureKey = {
  AniListToken: 'enigma.anilistToken',
  KitsuToken: 'enigma.kitsuToken',
} as const;
