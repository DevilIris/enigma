import type { MediaSource } from './sources';

/** A bookmarked anime (Library tab). Mirrors Ryu's FavoriteItem. */
export interface FavoriteItem {
  id: string;
  source: MediaSource;
  href?: string;
  metaId?: number;
  title: string;
  coverUrl?: string;
  addedAt: number;
}

/**
 * An in-progress episode (Home "Continue Watching" row). Mirrors Ryu's
 * ContinueWatchingItem; `fullURL` is the dedup key, and the >15%-remaining
 * display rule is applied at read time.
 */
export interface ContinueWatchingItem {
  animeTitle: string;
  episodeTitle?: string;
  episodeNumber: number;
  imageUrl?: string;
  /** Unique episode URL — the dedup key. */
  fullURL: string;
  source: MediaSource;
  href?: string;
  metaId?: number;
  malId?: number;
  lastPlayedTime: number; // seconds
  totalTime: number; // seconds
  updatedAt: number;
}

export interface SearchHistoryItem {
  query: string;
  source: MediaSource;
  searchedAt: number;
}
