import { httpRequest } from '../http/httpClient';
import { MediaSource, type Episode, type ExtractedVideo } from '../../models';
import { resolveEmbed, findDirectStream, UA } from '../extractors';
import { parseHtml, absUrl, attr, imgSrc, text } from './util/parse';
import type { AnimeDetail, SearchResult, Source } from './types';

const BASE = 'https://anitaku.bz';

/** Parse a GoGoAnime search results page (`ul.items li`). */
export function parseGogoSearch(html: string): SearchResult[] {
  const root = parseHtml(html);
  const out: SearchResult[] = [];
  for (const li of root.querySelectorAll('ul.items li')) {
    const a = li.querySelector('a');
    const href = absUrl(attr(a, 'href'), BASE);
    if (!href) continue;
    const img = li.querySelector('img');
    const title = (
      attr(a, 'title') ||
      attr(img, 'alt') ||
      text(li.querySelector('p.name > a'))
    ).replace(/["']/g, '');
    if (!title) continue;
    out.push({
      id: href,
      title,
      coverUrl: imgSrc(img),
      href,
      source: MediaSource.GoGoAnime,
    });
  }
  return out;
}

/** Max episode number from the `ul#episode_page` ep_end attributes. */
export function parseGogoEpisodeCount(html: string): number {
  const root = parseHtml(html);
  let max = 0;
  for (const a of root.querySelectorAll('ul#episode_page a')) {
    max = Math.max(max, parseInt(attr(a, 'ep_end') || '0', 10));
  }
  return max;
}

function slugFromHref(href: string): string {
  return href.replace(BASE, '').replace('/category/', '').replace(/^\//, '');
}

export const gogoanime: Source = {
  id: MediaSource.GoGoAnime,
  playable: true,

  async search(query) {
    const results: SearchResult[] = [];
    for (const page of [1, 2]) {
      const res = await httpRequest<string>({
        url: `${BASE}/search.html`,
        params: { keyword: query, page },
        cors: 'scrape',
        responseType: 'text',
        headers: { 'User-Agent': UA },
      });
      results.push(...parseGogoSearch(res.data));
    }
    return results;
  },

  async fetchDetails(href): Promise<AnimeDetail> {
    const res = await httpRequest<string>({ url: href, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    const root = parseHtml(res.data);
    const episodes = await this.fetchEpisodes(href);
    return {
      title: text(root.querySelector('.anime_info_body_bg h1')),
      alternativeTitle: text(root.querySelector('.anime_info_body_bg p.other-name a')),
      synopsis: text(root.querySelector('.anime_info_body_bg .description')),
      coverUrl: imgSrc(root.querySelector('.anime_info_body_bg img')),
      episodes,
    };
  },

  async fetchEpisodes(href): Promise<Episode[]> {
    const res = await httpRequest<string>({ url: href, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    const count = parseGogoEpisodeCount(res.data);
    const slug = slugFromHref(href);
    return Array.from({ length: count }, (_, i) => ({
      href: `${BASE}/${slug}-episode-${i + 1}`,
      number: i + 1,
    }));
  },

  async extractVideo(episodeHref): Promise<ExtractedVideo> {
    const res = await httpRequest<string>({ url: episodeHref, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    const root = parseHtml(res.data);
    const iframe =
      attr(root.querySelector('div.play-video iframe'), 'src') ||
      attr(root.querySelector('iframe'), 'src');
    const embed = absUrl(iframe, BASE);

    // Best effort: try the embed page for a direct stream, else hand back the
    // embed URL (full GoGo decryption is a Phase 10 hardening item).
    const resolved = embed ? await resolveEmbed(embed) : null;
    if (resolved) return resolved;

    const direct = findDirectStream(res.data);
    if (direct) return { ...direct, headers: { Referer: BASE, 'User-Agent': UA } };

    // Don't return the bare embed page (it won't play); let the player fall back.
    throw new Error('GoGoAnime: no playable stream');
  },
};
