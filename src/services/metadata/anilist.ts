import { httpRequest } from '../http/httpClient';
import { secureStorage } from '../storage/secureStorage';
import { SecureKey } from '../storage/keys';
import type { Anime, AnimeStatus } from '../../models';
import { stripHtml, currentSeason } from '../../utils/format';

const ENDPOINT = 'https://graphql.anilist.co';

export interface AniListReview {
  summary: string;
  score?: number; // reviewer's 0-100 score
  rating?: number; // community upvotes
  user: string;
}

/* ---- Raw AniList shapes (only the fields we read) ---- */
interface AniListTitle {
  romaji?: string;
  english?: string;
  native?: string;
  userPreferred?: string;
}
interface AniListMedia {
  id: number;
  idMal?: number | null;
  title?: AniListTitle;
  description?: string | null;
  coverImage?: { extraLarge?: string; large?: string };
  bannerImage?: string | null;
  genres?: string[];
  seasonYear?: number | null;
  season?: string | null;
  startDate?: { year?: number | null };
  status?: string | null;
  format?: string | null;
  episodes?: number | null;
  duration?: number | null;
  averageScore?: number | null;
}

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native userPreferred }
  description(asHtml: false)
  coverImage { extraLarge large }
  bannerImage
  genres
  season
  seasonYear
  startDate { year }
  status
  format
  episodes
  duration
  averageScore
`;

function mapStatus(s?: string | null): AnimeStatus {
  switch (s) {
    case 'RELEASING':
      return 'airing';
    case 'FINISHED':
      return 'completed';
    case 'NOT_YET_RELEASED':
      return 'upcoming';
    default:
      return 'unknown';
  }
}

export function mapMedia(m: AniListMedia): Anime {
  return {
    id: String(m.id),
    metaId: m.id,
    malId: m.idMal ?? undefined,
    title:
      m.title?.userPreferred ??
      m.title?.english ??
      m.title?.romaji ??
      'Unknown',
    alternativeTitle: m.title?.native ?? undefined,
    englishTitle: m.title?.english ?? undefined,
    romajiTitle: m.title?.romaji ?? undefined,
    coverUrl: m.coverImage?.extraLarge ?? m.coverImage?.large,
    bannerUrl: m.bannerImage ?? undefined,
    synopsis: m.description ? stripHtml(m.description) : undefined,
    genres: m.genres,
    year: m.seasonYear ?? m.startDate?.year ?? undefined,
    season: m.season ?? undefined,
    status: mapStatus(m.status),
    format: m.format ?? undefined,
    episodeCount: m.episodes ?? undefined,
    durationMin: m.duration ?? undefined,
    averageScore: m.averageScore ?? undefined,
  };
}

async function query<T>(gql: string, variables?: object): Promise<T> {
  const token = await secureStorage.get(SecureKey.AniListToken);
  const res = await httpRequest<{ data?: T; errors?: unknown }>({
    url: ENDPOINT,
    method: 'POST',
    cors: 'safe',
    responseType: 'json',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    data: { query: gql, variables },
  });
  if (!res.data?.data) throw new Error('AniList: empty response');
  return res.data.data;
}

function pageQuery(sort: string): string {
  return `query ($page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(sort: ${sort}, type: ANIME, isAdult: false) { ${MEDIA_FIELDS} }
    }
  }`;
}

async function fetchPage(sort: string, perPage = 30): Promise<Anime[]> {
  const data = await query<{ Page: { media: AniListMedia[] } }>(
    pageQuery(sort),
    { page: 1, perPage }
  );
  return data.Page.media.map(mapMedia);
}

export const aniList = {
  getTrending: () => fetchPage('TRENDING_DESC'),
  getPopular: () => fetchPage('POPULARITY_DESC'),

  async getSeasonal(): Promise<Anime[]> {
    const { season, year } = currentSeason();
    const data = await query<{ Page: { media: AniListMedia[] } }>(
      `query ($season: MediaSeason, $seasonYear: Int, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(season: $season, seasonYear: $seasonYear, type: ANIME, isAdult: false, sort: POPULARITY_DESC) {
            ${MEDIA_FIELDS}
          }
        }
      }`,
      { season, seasonYear: year, perPage: 30 }
    );
    return data.Page.media.map(mapMedia);
  },

  async getAiring(): Promise<Anime[]> {
    const now = Math.floor(Date.now() / 1000);
    const week = now + 7 * 24 * 3600;
    const data = await query<{
      Page: { airingSchedules: { media: AniListMedia }[] };
    }>(
      `query ($start: Int, $end: Int, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          airingSchedules(sort: [TIME], airingAt_greater: $start, airingAt_lesser: $end) {
            media { ${MEDIA_FIELDS} }
          }
        }
      }`,
      { start: now, end: week, perPage: 50 }
    );
    const seen = new Set<number>();
    const out: Anime[] = [];
    for (const s of data.Page.airingSchedules) {
      if (!s.media || seen.has(s.media.id)) continue;
      seen.add(s.media.id);
      out.push(mapMedia(s.media));
    }
    return out;
  },

  async search(q: string): Promise<Anime[]> {
    const data = await query<{ Page: { media: AniListMedia[] } }>(
      `query ($q: String, $perPage: Int) {
        Page(page: 1, perPage: $perPage) {
          media(search: $q, type: ANIME, isAdult: false, sort: SEARCH_MATCH) {
            ${MEDIA_FIELDS}
          }
        }
      }`,
      { q, perPage: 30 }
    );
    return data.Page.media.map(mapMedia);
  },

  async getInfo(id: number): Promise<Anime> {
    const data = await query<{ Media: AniListMedia }>(
      `query ($id: Int) { Media(id: $id, type: ANIME) { ${MEDIA_FIELDS} } }`,
      { id }
    );
    return mapMedia(data.Media);
  },

  /** Community reviews for a title (best-effort; empty on error). */
  async getReviews(id: number): Promise<AniListReview[]> {
    try {
      const data = await query<{
        Media: { reviews?: { nodes?: { summary?: string | null; score?: number | null; rating?: number | null; user?: { name?: string } | null }[] } };
      }>(
        `query ($id: Int) {
          Media(id: $id, type: ANIME) {
            reviews(sort: RATING_DESC, perPage: 8) {
              nodes { summary score rating user { name } }
            }
          }
        }`,
        { id }
      );
      return (data.Media?.reviews?.nodes ?? [])
        .map((r) => ({
          summary: (r.summary ?? '').trim(),
          score: r.score ?? undefined,
          rating: r.rating ?? undefined,
          user: r.user?.name ?? 'Anonymous',
        }))
        .filter((r) => r.summary);
    } catch {
      return [];
    }
  },

  /** Authenticated: the logged-in user (null if not logged in / token invalid). */
  async getViewer(): Promise<{ id: number; name: string } | null> {
    try {
      const data = await query<{ Viewer: { id: number; name: string } }>(
        `query { Viewer { id name } }`
      );
      return data.Viewer ?? null;
    } catch {
      return null;
    }
  },

  /** Authenticated: update watch progress for a media entry. */
  async saveProgress(mediaId: number, progress: number): Promise<void> {
    try {
      await query(
        `mutation ($mediaId: Int, $progress: Int) {
          SaveMediaListEntry(mediaId: $mediaId, progress: $progress) { id progress status }
        }`,
        { mediaId, progress }
      );
    } catch {
      /* best-effort */
    }
  },
};
