import { create } from 'zustand';
import type { FavoriteItem, MediaSource } from '../models';
import { prefs } from '../services/storage/preferences';
import { PreferenceKey } from '../services/storage/keys';

interface FavoritesState {
  items: FavoriteItem[];
  ready: boolean;
  hydrate: () => Promise<void>;
  isFavorite: (id: string, source: MediaSource) => boolean;
  add: (item: FavoriteItem) => void;
  remove: (id: string, source: MediaSource) => void;
  toggle: (item: Omit<FavoriteItem, 'addedAt'>) => void;
  reorder: (from: number, to: number) => void;
  clear: () => void;
}

const persist = (items: FavoriteItem[]) =>
  void prefs.setJSON(PreferenceKey.Favorites, items);

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  items: [],
  ready: false,

  hydrate: async () => {
    const items = await prefs.getJSON<FavoriteItem[]>(
      PreferenceKey.Favorites,
      []
    );
    set({ items, ready: true });
  },

  isFavorite: (id, source) =>
    get().items.some((i) => i.id === id && i.source === source),

  add: (item) => {
    if (get().isFavorite(item.id, item.source)) return;
    const items = [...get().items, item];
    persist(items);
    set({ items });
  },

  remove: (id, source) => {
    const items = get().items.filter(
      (i) => !(i.id === id && i.source === source)
    );
    persist(items);
    set({ items });
  },

  toggle: (item) => {
    if (get().isFavorite(item.id, item.source)) {
      get().remove(item.id, item.source);
    } else {
      get().add({ ...item, addedAt: Date.now() });
    }
  },

  reorder: (from, to) => {
    const items = [...get().items];
    const [moved] = items.splice(from, 1);
    items.splice(to, 0, moved);
    persist(items);
    set({ items });
  },

  clear: () => {
    persist([]);
    set({ items: [] });
  },
}));
