import { httpRequest } from '../http/httpClient';
import { type Episode, type ExtractedVideo, type MediaSource } from '../../models';
import { resolveEmbed, findDirectStream, UA } from '../extractors';
import { parseHtml, absUrl, attr, imgSrc, text } from './util/parse';
import type { AnimeDetail, SearchResult, Source } from './types';

export type ExtractFn = (episodeHref: string, base: string) => Promise<ExtractedVideo>;
export type ExtractStrategy = 'sourceTag' | 'm3u8json' | 'iframe' | 'generic';

export interface HtmlSourceConfig {
  id: MediaSource;
  base: string;
  /** Either selector-based search (path + param) or a path builder, or a full override. */
  search?: { path: string; param?: string; build?: (q: string) => string };
  searchFn?: (query: string, base: string) => Promise<SearchResult[]>;
  itemSel?: string;
  titleSel?: string;
  /** Title selector on the detail page (defaults to titleSel). */
  detailTitleSel?: string;
  titleAttr?: string;
  imageSel?: string;
  imageAttr?: 'src' | 'data-src' | 'data-setbg' | 'srcset';
  imagePrefix?: string;
  imageStatic?: string;
  hrefSel?: string;
  hrefAttr?: string;
  hrefPrefix?: string;
  clientFilter?: boolean;
  synopsisSel?: string;
  altSel?: string;
  altAttr?: string;
  episodeSel?: string;
  episodeNumSel?: string;
  episodeNumStrip?: string;
  episodeHrefSel?: string;
  episodeHrefPrefix?: string;
  episodesFn?: (href: string, base: string) => Promise<Episode[]>;
  extract: ExtractStrategy | ExtractFn;
  headers?: Record<string, string>;
}

/** First URL in a srcset attribute. */
export function firstSrcset(s: string): string {
  return s.split(',')[0]?.trim().split(/\s+/)[0] ?? '';
}

/** Last-resort readable title from a detail URL slug. */
export function titleFromHref(href: string): string {
  const seg = href.split(/[?#]/)[0].split('/').filter(Boolean).pop() ?? '';
  return decodeURIComponent(seg).replace(/\.\w+$/, '').replace(/[-_]+/g, ' ').trim();
}

/** Decode a Vue/HTML-entity-encoded JSON attribute (AnimeUnity records/episodes). */
export function decodeEntityJson<T>(raw: string): T | null {
  try {
    return JSON.parse(raw.replace(/&quot;/g, '"').replace(/&amp;/g, '&')) as T;
  } catch {
    return null;
  }
}

export function htmlSource(cfg: HtmlSourceConfig): Source {
  const headers = { 'User-Agent': UA, ...(cfg.headers ?? {}) };
  const fetchText = (url: string, params?: Record<string, string | number>) =>
    httpRequest<string>({ url, params, cors: 'scrape', responseType: 'text', headers }).then((r) => r.data);

  const defaultSearch = async (query: string): Promise<SearchResult[]> => {
    const s = cfg.search;
    if (!s || !cfg.itemSel) return [];
    const url = s.build ? s.build(query) : `${cfg.base}${s.path}`;
    const params = !s.build && s.param ? { [s.param]: query } : undefined;
    const root = parseHtml(await fetchText(url, params));
    const out: SearchResult[] = [];
    for (const item of root.querySelectorAll(cfg.itemSel)) {
      const titleEl = cfg.titleSel ? item.querySelector(cfg.titleSel) : item;
      const title = (cfg.titleAttr ? attr(titleEl, cfg.titleAttr) : text(titleEl)).trim();
      const hrefEl = cfg.hrefSel ? item.querySelector(cfg.hrefSel) : item;
      const rawHref = attr(hrefEl, cfg.hrefAttr ?? 'href');
      if (!title || !rawHref) continue;
      const href = absUrl(rawHref, cfg.hrefPrefix || cfg.base);
      let cover = cfg.imageStatic;
      if (!cover) {
        const imgEl = cfg.imageSel ? item.querySelector(cfg.imageSel) : item.querySelector('img');
        const raw = cfg.imageAttr === 'srcset'
          ? firstSrcset(attr(imgEl, 'srcset'))
          : cfg.imageAttr
            ? attr(imgEl, cfg.imageAttr)
            : imgSrc(imgEl);
        cover = raw ? absUrl(raw, cfg.imagePrefix || cfg.base) : undefined;
      }
      out.push({ id: href, title, coverUrl: cover, href, source: cfg.id });
    }
    return cfg.clientFilter
      ? out.filter((r) => r.title.toLowerCase().includes(query.toLowerCase()))
      : out;
  };

  const defaultEpisodes = async (href: string): Promise<Episode[]> => {
    if (!cfg.episodeSel) return [];
    const root = parseHtml(await fetchText(href));
    const eps: Episode[] = [];
    for (const el of root.querySelectorAll(cfg.episodeSel)) {
      const numTxt = cfg.episodeNumSel ? text(el.querySelector(cfg.episodeNumSel)) : text(el);
      const stripped = cfg.episodeNumStrip ? numTxt.replace(cfg.episodeNumStrip, '') : numTxt;
      const number = parseInt(stripped.match(/\d+/)?.[0] ?? '0', 10);
      const hrefEl = cfg.episodeHrefSel ? el.querySelector(cfg.episodeHrefSel) : el;
      const rawHref = attr(hrefEl, 'href');
      if (!rawHref) continue;
      eps.push({ number, href: absUrl(rawHref, cfg.episodeHrefPrefix || cfg.base) });
    }
    return eps.sort((a, b) => a.number - b.number);
  };

  const doSearch = cfg.searchFn ? (q: string) => cfg.searchFn!(q, cfg.base) : defaultSearch;
  const doEpisodes = cfg.episodesFn ? (h: string) => cfg.episodesFn!(h, cfg.base) : defaultEpisodes;

  const doExtract = async (href: string): Promise<ExtractedVideo> => {
    if (typeof cfg.extract === 'function') return cfg.extract(href, cfg.base);
    const page = await fetchText(href);
    if (cfg.extract === 'm3u8json') {
      const m = page.match(/"url":"(.*?\.m3u8[^"]*)"/);
      if (m) {
        return { url: m[1].replace(/\\\//g, '/'), type: 'hls', headers: { Referer: `${cfg.base}/`, 'User-Agent': UA }, source: cfg.id };
      }
    }
    if (cfg.extract === 'iframe' || cfg.extract === 'generic') {
      const iframe = attr(parseHtml(page).querySelector('iframe'), 'src');
      if (iframe) {
        const r = await resolveEmbed(absUrl(iframe, cfg.base));
        if (r) return r;
      }
    }
    const direct = findDirectStream(page);
    if (direct) return { ...direct, headers: { Referer: `${cfg.base}/`, 'User-Agent': UA }, source: cfg.id };
    throw new Error(`${cfg.id}: no stream found`);
  };

  return {
    id: cfg.id,
    playable: true,
    search: doSearch,
    fetchEpisodes: doEpisodes,
    async fetchDetails(href): Promise<AnimeDetail> {
      const root = parseHtml(await fetchText(href));
      const episodes = await doEpisodes(href);
      const titleSel = cfg.detailTitleSel ?? cfg.titleSel;
      return {
        title: (titleSel ? text(root.querySelector(titleSel)) : '') || titleFromHref(href),
        alternativeTitle: cfg.altSel
          ? cfg.altAttr
            ? attr(root.querySelector(cfg.altSel), cfg.altAttr)
            : text(root.querySelector(cfg.altSel))
          : undefined,
        synopsis: cfg.synopsisSel ? text(root.querySelector(cfg.synopsisSel)) : undefined,
        episodes,
      };
    },
    extractVideo: doExtract,
  };
}
