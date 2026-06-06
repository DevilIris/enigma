import { httpRequest } from '../http/httpClient';
import {
  MediaSource,
  type AudioChoice,
  type Episode,
  type ExtractedVideo,
  type SubtitleTrack,
} from '../../models';
import type { AnimeDetail, SearchResult, Source } from './types';

/**
 * HiAnime is consumed through an aniwatch-style JSON API. These public
 * instances are frequently rotated/offline — swap API_BASE if it stops
 * responding (e.g. a self-hosted aniwatch-api).
 */
const API_BASE = 'https://aniwatch-api-gp1w.onrender.com';

interface SearchResp {
  animes?: { id: string; name?: string; poster?: string }[];
}
interface EpisodesResp {
  episodes?: { episodeId: string; number: number; title?: string }[];
}
interface InfoResp {
  anime?: {
    info?: { id?: string; name?: string; poster?: string; description?: string };
    moreInfo?: { japanese?: string };
  };
}
interface SrcResp {
  sources?: { url: string; type?: string }[];
  tracks?: { file: string; label?: string; kind?: string }[];
}

async function api<T>(path: string): Promise<T> {
  const res = await httpRequest<T>({
    url: `${API_BASE}${path}`,
    cors: 'scrape',
    responseType: 'json',
  });
  return res.data;
}

export const hianime: Source = {
  id: MediaSource.HiAnime,
  playable: true,

  async search(query): Promise<SearchResult[]> {
    const data = await api<SearchResp>(
      `/anime/search?q=${encodeURIComponent(query)}`
    );
    return (data.animes ?? []).map((a) => ({
      id: a.id,
      title: a.name ?? 'Unknown',
      coverUrl: a.poster,
      href: a.id,
      source: MediaSource.HiAnime,
    }));
  },

  async fetchDetails(href): Promise<AnimeDetail> {
    const data = await api<InfoResp>(`/anime/info?id=${encodeURIComponent(href)}`);
    const info = data.anime?.info;
    const episodes = await this.fetchEpisodes(href);
    return {
      title: info?.name ?? 'Unknown',
      alternativeTitle: data.anime?.moreInfo?.japanese,
      synopsis: info?.description,
      coverUrl: info?.poster,
      episodes,
    };
  },

  async fetchEpisodes(href): Promise<Episode[]> {
    const data = await api<EpisodesResp>(
      `/anime/episodes/${encodeURIComponent(href)}`
    );
    return (data.episodes ?? []).map((e) => ({
      href: e.episodeId,
      number: e.number,
      title: e.title,
    }));
  },

  async extractVideo(episodeHref, audio: AudioChoice = 'sub'): Promise<ExtractedVideo> {
    const data = await api<SrcResp>(
      `/anime/episode-srcs?id=${encodeURIComponent(episodeHref)}&category=${audio}`
    );
    const src = data.sources?.[0];
    if (!src?.url) throw new Error('HiAnime: no stream found');
    const subtitles: SubtitleTrack[] = (data.tracks ?? [])
      .filter((t) => t.kind === 'captions' || /vtt|srt/i.test(t.file))
      .map((t) => ({ url: t.file, lang: t.label ?? 'Unknown', label: t.label }));
    return {
      url: src.url,
      type: src.url.includes('.m3u8') || src.type === 'hls' ? 'hls' : 'mp4',
      subtitles,
      source: MediaSource.HiAnime,
    };
  },
};
