import { httpRequest } from '../http/httpClient';
import type { Anime, AnimeStatus } from '../../models';
import { stripHtml } from '../../utils/format';

const BASE = 'https://kitsu.io/api/edge';

interface KitsuAnime {
  id: string;
  attributes?: {
    canonicalTitle?: string;
    titles?: { en?: string; en_jp?: string; ja_jp?: string };
    synopsis?: string;
    posterImage?: { large?: string; medium?: string };
    coverImage?: { large?: string };
    startDate?: string;
    status?: string;
    subtype?: string;
    episodeCount?: number;
    episodeLength?: number;
    averageRating?: string;
  };
}

function mapStatus(s?: string): AnimeStatus {
  switch (s) {
    case 'current':
      return 'airing';
    case 'finished':
      return 'completed';
    case 'upcoming':
      return 'upcoming';
    default:
      return 'unknown';
  }
}

function map(a: KitsuAnime): Anime {
  const at = a.attributes ?? {};
  return {
    id: a.id,
    title: at.canonicalTitle || at.titles?.en || at.titles?.en_jp || 'Unknown',
    alternativeTitle: at.titles?.ja_jp,
    englishTitle: at.titles?.en,
    romajiTitle: at.titles?.en_jp,
    synopsis: at.synopsis ? stripHtml(at.synopsis) : undefined,
    coverUrl: at.posterImage?.large ?? at.posterImage?.medium,
    bannerUrl: at.coverImage?.large,
    year: at.startDate ? Number(at.startDate.slice(0, 4)) : undefined,
    status: mapStatus(at.status),
    format: at.subtype,
    episodeCount: at.episodeCount,
    durationMin: at.episodeLength,
    averageScore: at.averageRating ? Math.round(Number(at.averageRating)) : undefined,
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await httpRequest<T>({
    url: `${BASE}${path}`,
    cors: 'safe',
    responseType: 'json',
    headers: {
      Accept: 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
    },
  });
  return res.data;
}

export const kitsu = {
  async getTrending(): Promise<Anime[]> {
    const d = await get<{ data: KitsuAnime[] }>('/trending/anime');
    return d.data.map(map);
  },
  getPopular(): Promise<Anime[]> {
    return get<{ data: KitsuAnime[] }>(
      '/anime?sort=-userCount&page[limit]=20'
    ).then((d) => d.data.map(map));
  },
  getSeasonal(): Promise<Anime[]> {
    return get<{ data: KitsuAnime[] }>(
      '/anime?filter[status]=current&sort=-userCount&page[limit]=20'
    ).then((d) => d.data.map(map));
  },
  async search(q: string): Promise<Anime[]> {
    const d = await get<{ data: KitsuAnime[] }>(
      `/anime?filter[text]=${encodeURIComponent(q)}&page[limit]=20`
    );
    return d.data.map(map);
  },
  async getInfo(id: string): Promise<Anime> {
    const d = await get<{ data: KitsuAnime }>(`/anime/${id}`);
    return map(d.data);
  },
};
