import { create } from 'zustand';
import type { ActiveDownload, DownloadItem } from '../models';
import { prefs } from '../services/storage/preferences';
import { PreferenceKey } from '../services/storage/keys';

interface DownloadsState {
  items: DownloadItem[];
  active: ActiveDownload[];
  ready: boolean;
  hydrate: () => Promise<void>;
  addCompleted: (item: DownloadItem) => void;
  removeCompleted: (id: string) => void;
  rename: (id: string, title: string) => void;
  setActive: (active: ActiveDownload[]) => void;
  clear: () => void;
}

const persist = (items: DownloadItem[]) =>
  void prefs.setJSON(PreferenceKey.Downloads, items);

/**
 * Download metadata index. The actual transfer engine + Filesystem writes are
 * built in Phase 9; this store holds the persisted list of completed downloads
 * and a live snapshot of in-flight transfers.
 */
export const useDownloadsStore = create<DownloadsState>((set, get) => ({
  items: [],
  active: [],
  ready: false,

  hydrate: async () => {
    const items = await prefs.getJSON<DownloadItem[]>(
      PreferenceKey.Downloads,
      []
    );
    set({ items, ready: true });
  },

  addCompleted: (item) => {
    const items = [item, ...get().items.filter((i) => i.id !== item.id)];
    persist(items);
    set({ items });
  },

  removeCompleted: (id) => {
    const items = get().items.filter((i) => i.id !== id);
    persist(items);
    set({ items });
  },

  rename: (id, title) => {
    const items = get().items.map((i) => (i.id === id ? { ...i, title } : i));
    persist(items);
    set({ items });
  },

  setActive: (active) => set({ active }),

  clear: () => {
    persist([]);
    set({ items: [] });
  },
}));
