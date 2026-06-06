import type { AudioChoice, Episode, ExtractedVideo, MediaSource } from '../../models';

export interface SearchResult {
  id: string;
  title: string;
  coverUrl?: string;
  /** Source detail-page URL (absolute). */
  href: string;
  source: MediaSource;
}

export interface AnimeDetail {
  title: string;
  alternativeTitle?: string;
  synopsis?: string;
  coverUrl?: string;
  bannerUrl?: string;
  episodes: Episode[];
}

/**
 * Every streaming source implements this contract, mirroring Ryu's
 * enum-keyed dispatch. The registry maps a MediaSource to one instance.
 */
export interface Source {
  id: MediaSource;
  /** Whether episode/stream extraction is implemented (vs browse-only). */
  playable: boolean;
  search(query: string): Promise<SearchResult[]>;
  fetchDetails(href: string): Promise<AnimeDetail>;
  fetchEpisodes(href: string): Promise<Episode[]>;
  /** `audio` lets sources that offer sub/dub/raw pick the track (others ignore it). */
  extractVideo(episodeHref: string, audio?: AudioChoice): Promise<ExtractedVideo>;
}
