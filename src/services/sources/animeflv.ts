import { httpRequest } from '../http/httpClient';
import { MediaSource, type Episode, type ExtractedVideo } from '../../models';
import { resolveFirst, findDirectStream, UA } from '../extractors';
import { parseHtml, absUrl, attr, imgSrc, text } from './util/parse';
import type { AnimeDetail, SearchResult, Source } from './types';

const BASE = 'https://www3.animeflv.net';

/** Parse an AnimeFLV browse page (`ul.ListAnimes li`). */
export function parseAnimeflvSearch(html: string): SearchResult[] {
  const root = parseHtml(html);
  const out: SearchResult[] = [];
  for (const li of root.querySelectorAll('ul.ListAnimes li')) {
    const a = li.querySelector('a');
    const href = absUrl(attr(a, 'href'), BASE);
    const title = text(li.querySelector('h3.Title')) || attr(li.querySelector('img'), 'alt');
    if (!href || !title) continue;
    out.push({
      id: href,
      title,
      coverUrl: absUrl(imgSrc(li.querySelector('img')), BASE),
      href,
      source: MediaSource.AnimeFLV,
    });
  }
  return out;
}

/** Max episode number from the `var episodes = [[ep,id], ...]` script. */
export function parseAnimeflvEpisodeCount(html: string): number {
  const m = html.match(/var\s+episodes\s*=\s*\[\s*\[\s*(\d+)\s*,/);
  return m ? parseInt(m[1], 10) : 0;
}

/** Extract candidate embed URLs from the episode page `var videos = {...}`. */
export function parseAnimeflvEmbeds(html: string): string[] {
  const out: string[] = [];
  const block = html.match(/var\s+videos\s*=\s*(\{[\s\S]*?\});/);
  const scope = block?.[1] ?? html;
  for (const m of scope.matchAll(/"(?:code|url)"\s*:\s*"(https?:[^"]+)"/g)) {
    out.push(m[1].replace(/\\\//g, '/'));
  }
  return Array.from(new Set(out));
}

export const animeflv: Source = {
  id: MediaSource.AnimeFLV,
  playable: true,

  async search(query): Promise<SearchResult[]> {
    const res = await httpRequest<string>({
      url: `${BASE}/browse`,
      params: { q: query },
      cors: 'scrape',
      responseType: 'text',
      headers: { 'User-Agent': UA },
    });
    return parseAnimeflvSearch(res.data);
  },

  async fetchDetails(href): Promise<AnimeDetail> {
    const res = await httpRequest<string>({ url: href, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    const root = parseHtml(res.data);
    const episodes = await this.fetchEpisodes(href);
    return {
      title: text(root.querySelector('h1.Title')),
      alternativeTitle: text(root.querySelector('span.TxtAlt')),
      synopsis: text(root.querySelector('div.Description p')),
      coverUrl: absUrl(imgSrc(root.querySelector('div.AnimeCover img, figure img')), BASE),
      episodes,
    };
  },

  async fetchEpisodes(href): Promise<Episode[]> {
    const res = await httpRequest<string>({ url: href, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    const count = parseAnimeflvEpisodeCount(res.data);
    const verBase = href.replace('/anime/', '/ver/');
    return Array.from({ length: count }, (_, i) => ({
      href: `${verBase}-${i + 1}`,
      number: i + 1,
    }));
  },

  async extractVideo(episodeHref): Promise<ExtractedVideo> {
    const res = await httpRequest<string>({ url: episodeHref, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    const embeds = parseAnimeflvEmbeds(res.data);
    const resolved = await resolveFirst(embeds);
    if (resolved) return resolved;

    const direct = findDirectStream(res.data);
    if (direct) return { ...direct, headers: { Referer: BASE, 'User-Agent': UA } };

    // No real stream resolved — throw so the player falls back to another source
    // (returning a bare embed-page URL here would just stall the <video>).
    throw new Error('AnimeFLV: no playable stream');
  },
};
