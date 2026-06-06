import { httpRequest } from '../http/httpClient';
import { MediaSource, type Episode, type ExtractedVideo } from '../../models';
import { absUrl } from './util/parse';
import type { AnimeDetail, SearchResult, Source } from './types';

// Anilibria moved off the deprecated v3 API to anilibria.top / api/v1.
const BASE = 'https://anilibria.top';
const API = `${BASE}/api/v1`;

interface ReleaseName {
  main?: string;
  english?: string;
}
interface Poster {
  src?: string;
}
interface AniEpisode {
  ordinal?: number;
  name?: string;
  name_english?: string;
  hls_480?: string;
  hls_720?: string;
  hls_1080?: string;
}
interface Release {
  id: number;
  name?: ReleaseName;
  description?: string;
  poster?: Poster;
  episodes?: AniEpisode[];
}

const titleOf = (n?: ReleaseName) => n?.main || n?.english || 'Unknown';
const posterUrl = (p?: Poster) => (p?.src ? absUrl(p.src, BASE) : undefined);

/** Highest available HLS variant (1080 → 720 → 480); URLs are absolute. */
export function pickAnilibriaHls(
  ep: { hls_1080?: string; hls_720?: string; hls_480?: string } | undefined
): string {
  return ep?.hls_1080 || ep?.hls_720 || ep?.hls_480 || '';
}

async function getRelease(id: string): Promise<Release> {
  const res = await httpRequest<Release>({
    url: `${API}/anime/releases/${id}`,
    cors: 'scrape',
    responseType: 'json',
  });
  return res.data;
}

function releaseEpisodes(r: Release): Episode[] {
  return (r.episodes ?? [])
    .map((e) => ({ number: e.ordinal ?? 0, href: pickAnilibriaHls(e), title: e.name || e.name_english }))
    .filter((e) => e.href)
    .sort((a, b) => a.number - b.number);
}

export const anilibria: Source = {
  id: MediaSource.Anilibria,
  playable: true,

  async search(query): Promise<SearchResult[]> {
    const res = await httpRequest<Release[]>({
      url: `${API}/app/search/releases`,
      params: { query },
      cors: 'scrape',
      responseType: 'json',
    });
    return (res.data ?? []).map((r) => ({
      id: String(r.id),
      title: titleOf(r.name),
      coverUrl: posterUrl(r.poster),
      href: String(r.id),
      source: MediaSource.Anilibria,
    }));
  },

  async fetchDetails(href): Promise<AnimeDetail> {
    const r = await getRelease(href);
    return {
      title: titleOf(r.name),
      alternativeTitle: r.name?.english,
      synopsis: r.description,
      coverUrl: posterUrl(r.poster),
      episodes: releaseEpisodes(r),
    };
  },

  async fetchEpisodes(href): Promise<Episode[]> {
    return releaseEpisodes(await getRelease(href));
  },

  // Episode href is already the absolute HLS URL.
  async extractVideo(episodeHref): Promise<ExtractedVideo> {
    return { url: episodeHref, type: 'hls', source: MediaSource.Anilibria };
  },
};
