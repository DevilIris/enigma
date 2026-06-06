import { create } from 'zustand';
import {
  DEFAULT_SETTINGS,
  MediaSource,
  SETTINGS_SCHEMA_VERSION,
  type Settings,
} from '../models';
import { prefs } from '../services/storage/preferences';
import { PreferenceKey } from '../services/storage/keys';

interface SettingsState {
  settings: Settings;
  ready: boolean;
  hydrate: () => Promise<void>;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  patch: (partial: Partial<Settings>) => void;
  reset: () => void;
}

/** Apply the effective light/dark theme by toggling the html palette class. */
function applyTheme(s: Settings): void {
  const prefersDark =
    window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? true;
  const dark = s.syncTheme ? prefersDark : s.theme !== 'light';
  document.documentElement.classList.toggle('ion-palette-dark', dark);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  ready: false,

  hydrate: async () => {
    const stored = await prefs.getJSON<Partial<Settings>>(
      PreferenceKey.Settings,
      {}
    );
    const isLegacy =
      Object.keys(stored).length > 0 && stored.schemaVersion === undefined;
    const settings = { ...DEFAULT_SETTINGS, ...stored };

    // One-time migration: move users off the old default (GoGoAnime, now an
    // offline domain) onto the working English default.
    if (isLegacy && settings.selectedMediaSource === MediaSource.GoGoAnime) {
      settings.selectedMediaSource = MediaSource.AnimeNana;
    }
    settings.schemaVersion = SETTINGS_SCHEMA_VERSION;

    void prefs.setJSON(PreferenceKey.Settings, settings);
    applyTheme(settings);
    set({ settings, ready: true });
  },

  set: (key, value) => {
    const settings = { ...get().settings, [key]: value };
    void prefs.setJSON(PreferenceKey.Settings, settings);
    if (key === 'theme' || key === 'syncTheme') applyTheme(settings);
    set({ settings });
  },

  patch: (partial) => {
    const settings = { ...get().settings, ...partial };
    void prefs.setJSON(PreferenceKey.Settings, settings);
    applyTheme(settings);
    set({ settings });
  },

  reset: () => {
    void prefs.setJSON(PreferenceKey.Settings, DEFAULT_SETTINGS);
    applyTheme(DEFAULT_SETTINGS);
    set({ settings: DEFAULT_SETTINGS });
  },
}));
