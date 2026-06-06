import type { MediaSource } from './sources';

export type AnimeStatus = 'airing' | 'completed' | 'upcoming' | 'unknown';

/**
 * Normalized anime record. Items coming from metadata APIs (AniList/Kitsu/Jikan)
 * carry a numeric `metaId`; items coming from a scraper source carry a `source`
 * + `href` (the source-relative URL used to fetch details/episodes).
 */
export interface Anime {
  /** Stable id within its origin (AniList id, or source slug/href). */
  id: string;
  source?: MediaSource;
  /** Source detail-page URL (scraper sources). */
  href?: string;
  /** AniList/MAL id, when known — also used to query AniSkip. */
  metaId?: number;
  malId?: number;

  title: string;
  alternativeTitle?: string;
  englishTitle?: string;
  romajiTitle?: string;
  coverUrl?: string;
  bannerUrl?: string;
  synopsis?: string;
  genres?: string[];
  year?: number;
  season?: string;
  status?: AnimeStatus;
  format?: string;
  episodeCount?: number;
  durationMin?: number;
  averageScore?: number;
}

export interface AiringInfo {
  episode: number;
  airingAt: number; // unix seconds
}
