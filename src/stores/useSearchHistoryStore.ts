import { create } from 'zustand';
import type { SearchHistoryItem, MediaSource } from '../models';
import { prefs } from '../services/storage/preferences';
import { PreferenceKey } from '../services/storage/keys';

interface SearchHistoryState {
  items: SearchHistoryItem[];
  ready: boolean;
  hydrate: () => Promise<void>;
  /** Record a query; dedups by query+source and promotes it to the top. */
  push: (query: string, source: MediaSource) => void;
  remove: (query: string, source: MediaSource) => void;
  clear: () => void;
}

const MAX_HISTORY = 50;

const persist = (items: SearchHistoryItem[]) =>
  void prefs.setJSON(PreferenceKey.SearchHistory, items);

export const useSearchHistoryStore = create<SearchHistoryState>((set, get) => ({
  items: [],
  ready: false,

  hydrate: async () => {
    const items = await prefs.getJSON<SearchHistoryItem[]>(
      PreferenceKey.SearchHistory,
      []
    );
    set({ items, ready: true });
  },

  push: (query, source) => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const rest = get().items.filter(
      (i) => !(i.query.toLowerCase() === trimmed.toLowerCase() && i.source === source)
    );
    const items = [
      { query: trimmed, source, searchedAt: Date.now() },
      ...rest,
    ].slice(0, MAX_HISTORY);
    persist(items);
    set({ items });
  },

  remove: (query, source) => {
    const items = get().items.filter(
      (i) => !(i.query === query && i.source === source)
    );
    persist(items);
    set({ items });
  },

  clear: () => {
    persist([]);
    set({ items: [] });
  },
}));
