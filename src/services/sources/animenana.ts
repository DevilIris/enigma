import { httpRequest } from '../http/httpClient';
import { MediaSource, type Episode, type ExtractedVideo } from '../../models';
import { resolveEmbed, findDirectStream, UA } from '../extractors';
import { parseHtml, absUrl, attr, imgSrc, text } from './util/parse';
import type { AnimeDetail, SearchResult, Source } from './types';

const BASE = 'https://animenana.com';

/** Parse AnimeNana search results (`a > div.card.component-latest`). */
export function parseAnimeNanaSearch(html: string): SearchResult[] {
  const root = parseHtml(html);
  const out: SearchResult[] = [];
  for (const a of root.querySelectorAll('a')) {
    const card = a.querySelector('div.card.component-latest');
    if (!card) continue;
    const href = absUrl(attr(a, 'href'), BASE);
    const title = text(card.querySelector('.animename'));
    if (!href || !title) continue;
    // lozad lazy-loads: real poster is in data-src, src is a placeholder.
    const posterEl = card.querySelector('.animeposter img');
    const cover = attr(posterEl, 'data-src') || imgSrc(posterEl);
    out.push({
      id: href,
      title,
      coverUrl: cover ? absUrl(cover, BASE) : undefined,
      href,
      source: MediaSource.AnimeNana,
    });
  }
  return out;
}

/** Parse the episode list (`a > div.card.component-episodes` → `/view/<id>`). */
export function parseAnimeNanaEpisodes(html: string): Episode[] {
  const root = parseHtml(html);
  const out: Episode[] = [];
  for (const a of root.querySelectorAll('a')) {
    const card = a.querySelector('div.card.component-episodes');
    if (!card) continue;
    const href = absUrl(attr(a, 'href'), BASE);
    if (!href) continue;
    const label = text(card.querySelector('.animename')) || attr(a, 'title');
    const number = parseInt(label.match(/(\d+)/)?.[1] ?? '0', 10);
    out.push({ href, number });
  }
  out.sort((x, y) => x.number - y.number);
  return out;
}

/** AnimeNana's genre list (scraped from /animelist/; fallback when offline). */
export const ANIMENANA_GENRES = [
  'Action', 'Adventure', 'Chinese', 'Comedy', 'Detective', 'Drama', 'Ecchi',
  'Fantasy', 'Gourmet', 'Harem', 'High Stakes Game', 'Historical', 'Horror',
  'Isekai', 'Iyashikei', 'Josei', 'Kids', 'Magic', 'Martial Arts', 'Mecha',
  'Military', 'Music', 'Mystery', 'Mythology', 'Parody', 'Psychological',
  'Racing', 'Reincarnation', 'Romance', 'Samurai', 'School', 'Sci-Fi', 'Seinen',
  'Shoujo', 'Shoujo Ai', 'Shounen', 'Shounen Ai', 'Slice of Life', 'Space',
  'Sports', 'Strategy Game', 'Super Power', 'Supernatural', 'Survival',
  'Suspense', 'Team Sports', 'Time Travel', 'Vampire', 'Video Game',
];

/** Lenient card parser for browse/trending pages (any `/animeserie/` link). */
export function parseAnimeNanaCards(html: string): SearchResult[] {
  const root = parseHtml(html);
  const out: SearchResult[] = [];
  const seen = new Set<string>();
  for (const a of root.querySelectorAll('a')) {
    const raw = attr(a, 'href');
    if (!raw || !raw.includes('/animeserie/')) continue;
    const href = absUrl(raw, BASE);
    if (seen.has(href)) continue;
    const title = text(a.querySelector('.animename')) || attr(a.querySelector('img'), 'alt');
    if (!title) continue;
    const posterEl = a.querySelector('img');
    const cover = attr(posterEl, 'data-src') || imgSrc(posterEl);
    seen.add(href);
    out.push({ id: href, title, coverUrl: cover ? absUrl(cover, BASE) : undefined, href, source: MediaSource.AnimeNana });
  }
  return out;
}

/** Scrape the live genre list from /animelist/ (falls back to the static list). */
export async function animeNanaGenres(): Promise<string[]> {
  try {
    const res = await httpRequest<string>({ url: `${BASE}/animelist/`, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    const block = res.data.match(/<select[^>]*name="genres\[\]"[\s\S]*?<\/select>/i)?.[0] ?? '';
    const genres = Array.from(block.matchAll(/<option[^>]*>([^<]+)<\/option>/g)).map((m) => m[1].trim()).filter(Boolean);
    return genres.length ? genres : ANIMENANA_GENRES;
  } catch {
    return ANIMENANA_GENRES;
  }
}

/** Browse anime by genre(s) via /animelist/?genres[]=… */
export async function animeNanaBrowse(genres: string[] = []): Promise<SearchResult[]> {
  const qs = genres.map((g) => `genres[]=${encodeURIComponent(g)}`).join('&');
  const res = await httpRequest<string>({
    url: `${BASE}/animelist/${qs ? `?${qs}` : ''}`,
    cors: 'scrape',
    responseType: 'text',
    headers: { 'User-Agent': UA },
  });
  return parseAnimeNanaCards(res.data);
}

/** Trending/most-popular anime (the /animelist/popular listing). */
export async function animeNanaTrending(): Promise<SearchResult[]> {
  const res = await httpRequest<string>({ url: `${BASE}/animelist/popular`, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
  return parseAnimeNanaCards(res.data);
}

export const animenana: Source = {
  id: MediaSource.AnimeNana,
  playable: true,

  async search(query): Promise<SearchResult[]> {
    const res = await httpRequest<string>({
      url: `${BASE}/search/`,
      params: { key: query },
      cors: 'scrape',
      responseType: 'text',
      headers: { 'User-Agent': UA },
    });
    return parseAnimeNanaSearch(res.data);
  },

  async fetchDetails(href): Promise<AnimeDetail> {
    const res = await httpRequest<string>({ url: href, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    const root = parseHtml(res.data);
    return {
      title: text(root.querySelector('.widget-content-area h5 b')),
      synopsis: text(root.querySelector('#demo')),
      coverUrl: absUrl(imgSrc(root.querySelector('.widget-content-area .text-center img')), BASE),
      episodes: parseAnimeNanaEpisodes(res.data),
    };
  },

  async fetchEpisodes(href): Promise<Episode[]> {
    const res = await httpRequest<string>({ url: href, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    return parseAnimeNanaEpisodes(res.data);
  },

  async extractVideo(episodeHref): Promise<ExtractedVideo> {
    // NOTE: AnimeNana's /view/ pages sit behind a Cloudflare JS challenge, so a
    // plain fetch often returns 403. Full support needs a WebView render to mint
    // cf_clearance (Phase 10). Best effort below for environments that pass.
    const res = await httpRequest<string>({ url: episodeHref, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA, Referer: BASE } });
    const direct = findDirectStream(res.data);
    if (direct) return { ...direct, headers: { Referer: BASE, 'User-Agent': UA } };

    const iframe = attr(parseHtml(res.data).querySelector('iframe'), 'src');
    const resolved = iframe ? await resolveEmbed(absUrl(iframe, BASE)) : null;
    if (resolved) return resolved;

    throw new Error('AnimeNana: stream blocked (Cloudflare). Native/WebView required.');
  },
};
