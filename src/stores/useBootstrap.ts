import { useEffect, useState } from 'react';
import { useSettingsStore } from './useSettingsStore';
import { useFavoritesStore } from './useFavoritesStore';
import { useContinueWatchingStore } from './useContinueWatchingStore';
import { useSearchHistoryStore } from './useSearchHistoryStore';
import { useDownloadsStore } from './useDownloadsStore';
import { useAuthStore } from './useAuthStore';

/** Hydrate every persisted store from @capacitor/preferences in parallel. */
export async function hydrateAll(): Promise<void> {
  await Promise.all([
    useSettingsStore.getState().hydrate(),
    useFavoritesStore.getState().hydrate(),
    useContinueWatchingStore.getState().hydrate(),
    useSearchHistoryStore.getState().hydrate(),
    useDownloadsStore.getState().hydrate(),
    useAuthStore.getState().hydrate(),
  ]);
}

/**
 * Runs hydration once on mount and reports readiness. The app shell renders a
 * splash until this resolves so screens never flash default/empty data.
 */
export function useBootstrap(): boolean {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    hydrateAll()
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);
  return ready;
}
