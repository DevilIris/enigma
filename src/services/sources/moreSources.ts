import { httpRequest } from '../http/httpClient';
import { MediaSource, type Episode, type ExtractedVideo } from '../../models';
import { findDirectStream, resolveEmbed, UA } from '../extractors';
import { parseHtml, absUrl, attr, text } from './util/parse';
import { htmlSource, decodeEntityJson } from './htmlSource';
import type { SearchResult, Source } from './types';

const txt = (url: string, params?: Record<string, string | number>) =>
  httpRequest<string>({ url, params, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } }).then((r) => r.data);

/* ------------------------- custom extractors ------------------------- */

const extractAnimeWorld = async (episodeHref: string): Promise<ExtractedVideo> => {
  const id = episodeHref.split('/').filter(Boolean).pop() ?? episodeHref;
  const page = await txt(`https://www.animeworld.so/api/episode/serverPlayerAnimeWorld?id=${id}`);
  const d = findDirectStream(page);
  if (d) return { ...d, headers: { Referer: 'https://www.animeworld.so/', 'User-Agent': UA } };
  throw new Error('AnimeWorld: no stream');
};

const extractAnimeFire = async (episodeHref: string): Promise<ExtractedVideo> => {
  const page = await txt(episodeHref);
  const dv = attr(parseHtml(page).querySelector('[data-video-src]'), 'data-video-src');
  if (dv) {
    const json = (
      await httpRequest<{ data?: { label: string; src: string }[] }>({
        url: absUrl(dv, 'https://animefire.plus'),
        cors: 'scrape',
        responseType: 'json',
        headers: { 'User-Agent': UA },
      })
    ).data;
    const arr = json.data ?? [];
    const best = arr[arr.length - 1] ?? arr[0];
    if (best?.src) return { url: best.src, type: best.src.includes('.m3u8') ? 'hls' : 'mp4', headers: { 'User-Agent': UA } };
  }
  const d = findDirectStream(page);
  if (d) return { ...d, headers: { 'User-Agent': UA } };
  throw new Error('AnimeFire: no stream');
};

const extractAnime3rb = async (episodeHref: string): Promise<ExtractedVideo> => {
  const page = await txt(episodeHref);
  const player = page
    .match(/https:\/\/video\.vid3rb\.com\/player\/[\w-]+\?token=\w+&(?:amp;)?expires=\d+/)?.[0]
    ?.replace(/&amp;/g, '&');
  if (player) {
    const pl = await txt(player);
    const mp4 = pl.match(/https?:\/\/[^\s<>"]+?\.mp4[^\s<>"]*/)?.[0];
    if (mp4) return { url: mp4.replace(/&amp;/g, '&'), type: 'mp4', headers: { Referer: 'https://anime3rb.com/', 'User-Agent': UA } };
  }
  const d = findDirectStream(page);
  if (d) return { ...d, headers: { Referer: 'https://anime3rb.com/', 'User-Agent': UA } };
  throw new Error('Anime3rb: no stream');
};

const extractTokyo = async (episodeHref: string): Promise<ExtractedVideo> => {
  const page = await txt(episodeHref);
  const m = page.match(/href="(https?:\/\/[^"]*media\.tokyoinsider\.com[^"]*\.(?:mp4|mkv|avi))"/i);
  if (m) return { url: m[1], type: 'mp4', headers: { 'User-Agent': UA } };
  const d = findDirectStream(page);
  if (d) return { ...d, headers: { 'User-Agent': UA } };
  throw new Error('TokyoInsider: no stream');
};

const extractAniBunker = async (episodeHref: string): Promise<ExtractedVideo> => {
  const page = await txt(episodeHref);
  const id = attr(parseHtml(page).querySelector('#videoContainer'), 'data-video-id');
  if (!id) throw new Error('AniBunker: no video id');
  const res = await httpRequest<{ url?: string }>({
    url: 'https://www.anibunker.com/php/loader.php',
    method: 'POST',
    cors: 'scrape',
    responseType: 'json',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Origin: 'https://www.anibunker.com', 'User-Agent': UA },
    data: `player_id=url_hd&video_id=${id}`,
  });
  const url = res.data.url;
  if (!url) throw new Error('AniBunker: no url');
  return { url, type: url.includes('.m3u8') ? 'hls' : 'mp4', headers: { Referer: 'https://www.anibunker.com/', 'User-Agent': UA } };
};

const extractAniWorld = async (episodeHref: string, base: string): Promise<ExtractedVideo> => {
  const page = await txt(episodeHref);
  const redirect = page.match(/href="(\/redirect\/[^"]+)"/)?.[1];
  if (redirect) {
    const r = await httpRequest<string>({ url: `${base}${redirect}`, cors: 'scrape', responseType: 'text', headers: { 'User-Agent': UA } });
    const resolved = await resolveEmbed(r.url || `${base}${redirect}`);
    if (resolved) return resolved;
    const d = findDirectStream(r.data);
    if (d) return { ...d, headers: { Referer: `${base}/`, 'User-Agent': UA } };
  }
  const d = findDirectStream(page);
  if (d) return { ...d, headers: { Referer: `${base}/`, 'User-Agent': UA } };
  throw new Error('AniWorld: no stream');
};

/* ------------------------- custom search / episodes ------------------------- */

const searchAniWorld = async (query: string, base: string): Promise<SearchResult[]> => {
  const root = parseHtml(await txt(`${base}/animes`));
  const q = query.toLowerCase();
  const out: SearchResult[] = [];
  for (const a of root.querySelectorAll('div.genre a')) {
    const title = text(a);
    const href = attr(a, 'href');
    if (!title || !href || !title.toLowerCase().includes(q)) continue;
    out.push({
      id: absUrl(href, base),
      title,
      coverUrl: 'https://s4.anilist.co/file/anilistcdn/character/large/default.jpg',
      href: absUrl(href, base),
      source: MediaSource.AniWorld,
    });
  }
  return out.slice(0, 40);
};

interface AURecord { id: number; title: string; imageurl: string; slug: string }

const searchAnimeUnity = async (query: string, base: string): Promise<SearchResult[]> => {
  const page = await txt(`${base}/archivio`, { title: query });
  const raw = page.match(/records="([^"]*)"/)?.[1];
  const recs = raw ? decodeEntityJson<AURecord[]>(raw) : null;
  if (!recs) return [];
  return recs.map((r) => ({
    id: String(r.id),
    title: r.title,
    coverUrl: r.imageurl,
    href: `${base}/anime/${r.id}-${r.slug}`,
    source: MediaSource.AnimeUnity,
  }));
};

const episodesAnimeUnity = async (href: string): Promise<Episode[]> => {
  const page = await txt(href);
  const raw = page.match(/episodes="([^"]*)"/)?.[1];
  const arr = raw ? decodeEntityJson<{ number: string | number; link: string }[]>(raw) : null;
  if (!arr) return [];
  return arr.map((e) => ({ number: Number(e.number) || 0, href: e.link })).filter((e) => e.href);
};

const episodesKuramanime = async (href: string): Promise<Episode[]> => {
  const page = await txt(href);
  const dc = attr(parseHtml(page).querySelector('div#episodeListsSection a.follow-btn'), 'data-content');
  if (!dc) return [];
  return parseHtml(dc)
    .querySelectorAll('a.btn')
    .map((a) => ({
      number: parseInt(text(a).replace('Ep ', '').match(/\d+/)?.[0] ?? '0', 10),
      href: absUrl(attr(a, 'href'), 'https://kuramanime.red'),
    }))
    .filter((e) => e.href);
};

/* ------------------------- source definitions ------------------------- */

export const animeworld = htmlSource({
  id: MediaSource.AnimeWorld,
  base: 'https://animeworld.so',
  search: { path: '/search', param: 'keyword' },
  itemSel: '.film-list .item',
  titleSel: 'a.name',
  detailTitleSel: 'div.widget-title h1',
  imageSel: 'a.poster img',
  imageAttr: 'src',
  hrefSel: 'a.poster',
  synopsisSel: 'div.info div.desc',
  altSel: 'div.widget-title h1',
  altAttr: 'data-jtitle',
  episodeSel: 'div.server.active ul.episodes li.episode a',
  extract: extractAnimeWorld,
});

export const animefire = htmlSource({
  id: MediaSource.AnimeFire,
  base: 'https://animefire.plus',
  search: { path: '', build: (q) => `https://animefire.plus/pesquisar/${encodeURIComponent(q.toLowerCase().replace(/\s+/g, '-'))}` },
  itemSel: 'div.card-group div.row div.divCardUltimosEps',
  titleSel: 'div.text-block h3.animeTitle',
  imageSel: 'article.card a img',
  imageAttr: 'data-src',
  hrefSel: 'article.card a',
  synopsisSel: 'div.divSinopse span.spanAnimeInfo',
  altSel: 'div.mr-2 h6.text-gray',
  episodeSel: 'div.div_video_list a',
  extract: extractAnimeFire,
});

export const kuramanime = htmlSource({
  id: MediaSource.Kuramanime,
  base: 'https://kuramanime.red',
  search: { path: '/anime', param: 'search' },
  itemSel: 'div#animeList div.col-lg-4',
  titleSel: 'div.product__item__text h5 a',
  imageSel: 'div.product__item__pic',
  imageAttr: 'data-setbg',
  hrefSel: 'div.product__item a',
  synopsisSel: 'div.anime__details__text p',
  altSel: 'div.anime__details__title span',
  episodesFn: episodesKuramanime,
  extract: 'generic',
});

export const anime3rb = htmlSource({
  id: MediaSource.Anime3rb,
  base: 'https://anime3rb.com',
  search: { path: '/search', param: 'q' },
  itemSel: 'section div.my-2',
  titleSel: 'h2.pt-1',
  imageSel: 'img',
  imageAttr: 'src',
  hrefSel: 'a',
  synopsisSel: 'p.leading-loose',
  episodeSel: 'div.absolute.overflow-hidden div a.gap-3',
  episodeNumSel: 'div.video-metadata span',
  extract: extractAnime3rb,
});

export const tokyoinsider = htmlSource({
  id: MediaSource.TokyoInsider,
  base: 'https://www.tokyoinsider.com',
  search: { path: '/anime/search', param: 'k' },
  itemSel: "div#inner_page table[cellpadding='3'] tr",
  titleSel: 'a',
  titleAttr: 'title',
  imageSel: 'img',
  imageAttr: 'src',
  hrefSel: 'a',
  hrefPrefix: 'https://www.tokyoinsider.com',
  synopsisSel: "td[style*='border-bottom: 0']",
  episodeSel: 'div.episode',
  episodeNumSel: 'strong',
  episodeHrefSel: 'a.download-link',
  episodeHrefPrefix: 'https://www.tokyoinsider.com',
  extract: extractTokyo,
});

export const anibunker = htmlSource({
  id: MediaSource.AniBunker,
  base: 'https://www.anibunker.com',
  search: { path: '/search', param: 'q' },
  itemSel: 'div.section--body article',
  titleSel: 'h4',
  imageSel: 'img',
  imageAttr: 'src',
  hrefSel: 'a',
  hrefPrefix: 'https://www.anibunker.com/',
  synopsisSel: 'div.sinopse--display p',
  episodeSel: 'div.eps-display a',
  episodeNumSel: 'div.ep_number',
  episodeHrefPrefix: 'https://www.anibunker.com',
  extract: extractAniBunker,
});

export const animeheaven = htmlSource({
  id: MediaSource.AnimeHeaven,
  base: 'https://animeheaven.me',
  search: { path: '/search.php', param: 's' },
  itemSel: 'div.info3.bc1 div.similarimg',
  titleSel: 'div.similarname a.c',
  imageSel: 'img',
  imageAttr: 'src',
  imagePrefix: 'https://animeheaven.me/',
  hrefSel: 'a',
  synopsisSel: 'div.infodiv div.infodes',
  altSel: 'div.infodiv div.infotitlejp',
  episodeSel: "a[href^='episode.php']",
  episodeNumSel: 'div.watch2.bc',
  extract: 'generic',
});

export const animesrbija = htmlSource({
  id: MediaSource.AnimeSRBIJA,
  base: 'https://www.animesrbija.com',
  search: { path: '/filter', param: 'search' },
  itemSel: 'div.ani-wrap div.ani-item',
  titleSel: 'h3.ani-title',
  imageSel: 'img',
  imageAttr: 'srcset',
  imagePrefix: 'https://www.animesrbija.com',
  hrefSel: 'a',
  hrefPrefix: 'https://www.animesrbija.com',
  synopsisSel: 'div.anime-description',
  altSel: 'h3.anime-eng-name',
  episodeSel: 'ul.anime-episodes-holder li.anime-episode-item',
  episodeNumSel: 'span.anime-episode-num',
  episodeNumStrip: 'Epizoda ',
  episodeHrefSel: 'a.anime-episode-link',
  episodeHrefPrefix: 'https://www.animesrbija.com',
  extract: 'generic',
});

export const animebalkan = htmlSource({
  id: MediaSource.AnimeBalkan,
  base: 'https://animebalkan.gg',
  search: { path: '/', param: 's' },
  itemSel: 'article.bs',
  titleSel: 'h2',
  imageSel: 'img',
  imageAttr: 'data-src',
  hrefSel: 'a',
  episodeSel: 'div.eplister ul li a',
  episodeNumSel: 'div.epl-num',
  extract: 'generic',
});

export const aniworld = htmlSource({
  id: MediaSource.AniWorld,
  base: 'https://aniworld.to',
  searchFn: searchAniWorld,
  synopsisSel: 'p.seri_des',
  episodeSel: 'table.seasonEpisodesList td a',
  extract: extractAniWorld,
});

export const anivibe = htmlSource({
  id: MediaSource.AniVibe,
  base: 'https://anivibe.net',
  search: { path: '/search.html', param: 'keyword' },
  itemSel: 'div.listupd article',
  titleSel: 'div.tt span',
  imageSel: 'img',
  imageAttr: 'src',
  hrefSel: 'a',
  hrefPrefix: 'https://anivibe.net',
  synopsisSel: 'div.synp div.entry-content',
  altSel: 'span.alter',
  episodeSel: 'div.eplister ul li a',
  episodeNumSel: 'div.epl-num',
  episodeHrefPrefix: 'https://anivibe.net',
  extract: 'm3u8json',
});

export const animeunity = htmlSource({
  id: MediaSource.AnimeUnity,
  base: 'https://www.animeunity.to',
  searchFn: searchAnimeUnity,
  episodesFn: episodesAnimeUnity,
  synopsisSel: 'div.description',
  extract: 'generic',
});

export const moreSources: Source[] = [
  animeworld,
  animefire,
  kuramanime,
  anime3rb,
  tokyoinsider,
  anibunker,
  animeheaven,
  animesrbija,
  animebalkan,
  aniworld,
  anivibe,
  animeunity,
];
