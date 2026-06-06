import { AnimeListingService, type Anime } from '../../models';
import { aniList } from './anilist';
import { jikan } from './jikan';
import { kitsu } from './kitsu';

export { aniList } from './anilist';
export { jikan } from './jikan';
export { kitsu } from './kitsu';
export { getSkipTimes, voteSkipTime, activeSkip } from './aniskip';
export type { SkipTime } from './aniskip';

/**
 * A metadata provider supplies the Home rows and Anime Details enrichment.
 * AniList is the richest (airing schedule, seasonal); Jikan/Kitsu approximate
 * the same rows so the listing service is switchable like in Ryu.
 */
export interface MetadataProvider {
  getTrending(): Promise<Anime[]>;
  getPopular(): Promise<Anime[]>;
  getSeasonal(): Promise<Anime[]>;
  getAiring(): Promise<Anime[]>;
  search(query: string): Promise<Anime[]>;
}

const providers: Record<AnimeListingService, MetadataProvider> = {
  [AnimeListingService.AniList]: aniList,
  [AnimeListingService.MAL]: { ...jikan, getAiring: jikan.getTrending },
  [AnimeListingService.Kitsu]: { ...kitsu, getAiring: kitsu.getSeasonal },
};

export function metadataProvider(service: AnimeListingService): MetadataProvider {
  return providers[service] ?? providers[AnimeListingService.AniList];
}
