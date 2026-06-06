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
