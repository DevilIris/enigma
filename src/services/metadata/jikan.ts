import { httpRequest } from '../http/httpClient';
import type { Anime, AnimeStatus } from '../../models';
import { stripHtml } from '../../utils/format';

const BASE = 'https://api.jikan.moe/v4';

interface JikanAnime {
  mal_id: number;
  title: string;
  title_english?: string | null;
  synopsis?: string | null;
  images?: { jpg?: { large_image_url?: string; image_url?: string } };
  genres?: { name: string }[];
  year?: number | null;
  status?: string | null;
  type?: string | null;
  episodes?: number | null;
  duration?: string | null;
  score?: number | null;
}

function mapStatus(s?: string | null): AnimeStatus {
  if (!s) return 'unknown';
  if (/airing/i.test(s)) return 'airing';
  if (/finished/i.test(s)) return 'completed';
  if (/not yet/i.test(s)) return 'upcoming';
  return 'unknown';
}

function map(a: JikanAnime): Anime {
  return {
    id: String(a.mal_id),
    malId: a.mal_id,
    title: a.title_english || a.title,
    englishTitle: a.title_english ?? undefined,
    romajiTitle: a.title,
    synopsis: a.synopsis ? stripHtml(a.synopsis) : undefined,
    coverUrl: a.images?.jpg?.large_image_url ?? a.images?.jpg?.image_url,
    genres: a.genres?.map((g) => g.name),
    year: a.year ?? undefined,
    status: mapStatus(a.status),
    format: a.type ?? undefined,
    episodeCount: a.episodes ?? undefined,
    averageScore: a.score != null ? Math.round(a.score * 10) : undefined,
  };
}

async function get<T>(path: string): Promise<T> {
  const res = await httpRequest<T>({
    url: `${BASE}${path}`,
    cors: 'safe',
    responseType: 'json',
  });
  return res.data;
}

export const jikan = {
  async getTrending(): Promise<Anime[]> {
    const d = await get<{ data: JikanAnime[] }>('/top/anime?filter=airing');
    return d.data.map(map);
  },
  async getPopular(): Promise<Anime[]> {
    const d = await get<{ data: JikanAnime[] }>('/top/anime?filter=bypopularity');
    return d.data.map(map);
  },
  async getSeasonal(): Promise<Anime[]> {
    const d = await get<{ data: JikanAnime[] }>('/seasons/now');
    return d.data.map(map);
  },
  async search(q: string): Promise<Anime[]> {
    const d = await get<{ data: JikanAnime[] }>(
      `/anime?q=${encodeURIComponent(q)}&limit=24`
    );
    return d.data.map(map);
  },
  async getInfo(malId: number): Promise<Anime> {
    const d = await get<{ data: JikanAnime }>(`/anime/${malId}`);
    return map(d.data);
  },
};
