import { create } from 'zustand';
import type { ContinueWatchingItem } from '../models';
import { prefs } from '../services/storage/preferences';
import { PreferenceKey } from '../services/storage/keys';
import { useSettingsStore } from './useSettingsStore';

interface ContinueWatchingState {
  items: ContinueWatchingItem[];
  ready: boolean;
  hydrate: () => Promise<void>;
  /** Items still worth resuming (>15% remaining), newest first. */
  visible: () => ContinueWatchingItem[];
  save: (item: ContinueWatchingItem) => void;
  remove: (fullURL: string) => void;
  clear: () => void;
}

const persist = (items: ContinueWatchingItem[]) =>
  void prefs.setJSON(PreferenceKey.ContinueWatching, items);

/** Ryu's display rule: keep only episodes with >15% left to watch. */
const hasRemaining = (i: ContinueWatchingItem): boolean =>
  i.totalTime > 0 && (i.totalTime - i.lastPlayedTime) / i.totalTime > 0.15;

export const useContinueWatchingStore = create<ContinueWatchingState>(
  (set, get) => ({
    items: [],
    ready: false,

    hydrate: async () => {
      const items = await prefs.getJSON<ContinueWatchingItem[]>(
        PreferenceKey.ContinueWatching,
        []
      );
      set({ items, ready: true });
    },

    visible: () => get().items.filter(hasRemaining),

    save: (item) => {
      const mergeActivity = useSettingsStore.getState().settings.mergeActivity;
      let items = get().items.filter((i) => i.fullURL !== item.fullURL);
      if (mergeActivity) {
        items = items.filter((i) => i.animeTitle !== item.animeTitle);
      }
      items = [{ ...item, updatedAt: Date.now() }, ...items];
      persist(items);
      set({ items });
    },

    remove: (fullURL) => {
      const items = get().items.filter((i) => i.fullURL !== fullURL);
      persist(items);
      set({ items });
    },

    clear: () => {
      persist([]);
      set({ items: [] });
    },
  })
);
