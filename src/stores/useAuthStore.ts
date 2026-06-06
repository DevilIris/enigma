import { create } from 'zustand';
import { secureStorage } from '../services/storage/secureStorage';
import { SecureKey } from '../services/storage/keys';
import { aniList } from '../services/metadata/anilist';

interface AuthState {
  aniListToken: string | null;
  aniListUser: string | null;
  ready: boolean;
  hydrate: () => Promise<void>;
  /** Store a freshly obtained token and resolve the viewer name. */
  setAniListToken: (token: string) => Promise<void>;
  logoutAniList: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  aniListToken: null,
  aniListUser: null,
  ready: false,

  hydrate: async () => {
    const token = await secureStorage.get(SecureKey.AniListToken);
    if (token) {
      const viewer = await aniList.getViewer();
      set({ aniListToken: token, aniListUser: viewer?.name ?? null });
    }
    set({ ready: true });
  },

  setAniListToken: async (token) => {
    await secureStorage.set(SecureKey.AniListToken, token);
    set({ aniListToken: token });
    const viewer = await aniList.getViewer();
    set({ aniListUser: viewer?.name ?? null });
  },

  logoutAniList: async () => {
    await secureStorage.remove(SecureKey.AniListToken);
    set({ aniListToken: null, aniListUser: null });
  },
}));
