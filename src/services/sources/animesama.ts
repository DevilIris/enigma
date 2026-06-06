import { httpRequest } from '../http/httpClient';
import { MediaSource, type Episode, type ExtractedVideo } from '../../models';
import { resolveFirst, UA } from '../extractors';
import { parseHtml, absUrl, attr, imgSrc, text } from './util/parse';
import type { AnimeDetail, SearchResult, Source } from './types';

const BASE = 'https://anime-sama.fr';
const DEFAULT_SEASON = 'saison1';
const DEFAULT_LANG = 'vostfr';
const SEP = '##'; // separates the episodes.js URL from the episode index in Episode.href

/** Parse the AnimeSama search fragment (anchors to `/catalogue/<slug>/`). */
export function parseAnimeSamaSearch(html: string): SearchResult[] {
  const root = parseHtml(html);
  const seen = new Set<string>();
  const out: SearchResult[] = [];
  for (const a of root.querySelectorAll('a')) {
    const rawHref = attr(a, 'href');
    if (!/catalogue\/[^/]+/.test(rawHref)) continue;
    const href = absUrl(rawHref, BASE).replace(/\/+$/, '/');
    const slug = href.match(/catalogue\/([^/]+)/)?.[1];
    if (!slug || seen.has(slug)) continue;
    seen.add(slug);
    const title =
      text(a.querySelector('h3, h4, .titre')) ||
      attr(a.querySelector('img'), 'alt') ||
      text(a) ||
      slug.replace(/-/g, ' ');
    out.push({
      id: href,
      title,
      coverUrl: absUrl(imgSrc(a.querySelector('img')), BASE),
      href,
      source: MediaSource.AnimeSama,
    });
  }
  return out;
}

/**
 * Parse an AnimeSama `episodes.js` file. Each `eps<N>` array is a *player host*,
 * holding one embed URL per episode. So episode i's candidate embeds are
 * `arrays.map(a => a[i])`.
 */
export function parseAnimeSamaEpisodes(js: string): string[][] {
  const arrays: string[][] = [];
  const re = /var\s+eps\d+\s*=\s*\[([\s\S]*?)\]/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(js)) !== null) {
    const urls = Array.from(m[1].matchAll(/'([^']+)'|"([^"]+)"/g))
      .map((x) => (x[1] ?? x[2] ?? '').trim())
      .filter((u) => /^https?:/.test(u));
    if (urls.length) arrays.push(urls);
  }
  return arrays;
}

function episodesJsUrl(detailHref: string): string {
  const base = detailHref.replace(/\/+$/, '');
  return `${base}/${DEFAULT_SEASON}/${DEFAULT_LANG}/episodes.js`;
}

export const animesama: Source = {
  id: MediaSource.AnimeSama,
  playable: true,

  async search(query): Promise<SearchResult[]> {
    const res = await httpRequest<string>({
      url: `${BASE}/template-php/defaut/fetch.php`,
      method: 'POST',
      cors: 'scrape',
      responseType: 'text',
      headers: {
        'User-Agent': UA,
        Referer: BASE,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      data: `query=${encodeURIComponent(query)}`,
    });
    return parseAnimeSamaSearch(res.data);
  },

  async fetchDetails(href): Promise<AnimeDetail> {
    const res = await httpRequest<string>({ url: href, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    const root = parseHtml(res.data);
    const episodes = await this.fetchEpisodes(href);
    const slug = href.match(/catalogue\/([^/]+)/)?.[1] ?? '';
    return {
      title:
        text(root.querySelector('#titreOeuvre')) ||
        attr(root.querySelector('meta[property="og:title"]'), 'content') ||
        slug.replace(/-/g, ' '),
      synopsis: text(root.querySelector('.synopsis, p.text-sm')),
      coverUrl: attr(root.querySelector('meta[property="og:image"]'), 'content'),
      episodes,
    };
  },

  async fetchEpisodes(href): Promise<Episode[]> {
    const jsUrl = episodesJsUrl(href);
    const res = await httpRequest<string>({
      url: jsUrl,
      cors: 'scrape',
      responseType: 'text',
      headers: { 'User-Agent': UA, Referer: href },
    });
    const arrays = parseAnimeSamaEpisodes(res.data);
    const count = arrays.reduce((max, a) => Math.max(max, a.length), 0);
    return Array.from({ length: count }, (_, i) => ({
      href: `${jsUrl}${SEP}${i}`,
      number: i + 1,
    }));
  },

  async extractVideo(episodeHref): Promise<ExtractedVideo> {
    const [jsUrl, idxStr] = episodeHref.split(SEP);
    const index = parseInt(idxStr ?? '0', 10);
    const res = await httpRequest<string>({ url: jsUrl, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    const arrays = parseAnimeSamaEpisodes(res.data);
    const candidates = arrays.map((a) => a[index]).filter(Boolean);
    const resolved = await resolveFirst(candidates);
    if (resolved) return resolved;
    if (candidates[0]) {
      return { url: candidates[0], type: 'hls', headers: { Referer: BASE, 'User-Agent': UA } };
    }
    throw new Error('AnimeSama: no stream found');
  },
};
