import { httpRequest } from '../http/httpClient';
import type { ExtractedVideo, StreamType } from '../../models';

export const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

/* ------------------------------------------------------------------ *
 * Pure parsers (unit-testable against fixtures) + async extractors    *
 * that fetch an embed page and return a playable ExtractedVideo.      *
 * ------------------------------------------------------------------ */

/** Find any direct .m3u8 / .mp4 URL in a blob of HTML/JS. */
export function findDirectStream(
  html: string
): { url: string; type: StreamType } | null {
  const m3u8 = html.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/i);
  if (m3u8) return { url: m3u8[0], type: 'hls' };
  const mp4 = html.match(/https?:\/\/[^\s"'<>\\]+\.mp4[^\s"'<>\\]*/i);
  if (mp4) return { url: mp4[0], type: 'mp4' };
  return null;
}

export function parseSibnetFile(html: string): string | null {
  const m =
    html.match(/player\.src\(\[\{\s*src:\s*"([^"]+)"/i) ||
    html.match(/"file"\s*:\s*"([^"]+\.mp4[^"]*)"/i) ||
    html.match(/src:\s*"(\/v\/[^"]+)"/i);
  return m?.[1] ?? null;
}

export function parseVidmolyFile(html: string): string | null {
  const m =
    html.match(/file\s*:\s*"([^"]+\.m3u8[^"]*)"/i) ||
    html.match(/sources?\s*:\s*\[\s*\{\s*file\s*:\s*"([^"]+)"/i) ||
    html.match(/"file"\s*:\s*"([^"]+)"/i);
  return m?.[1] ?? null;
}

export function parseSendvidFile(html: string): string | null {
  const m =
    html.match(/<source[^>]+src=["']([^"']+)["']/i) ||
    html.match(/property=["']og:video["']\s+content=["']([^"']+)["']/i) ||
    html.match(/"file"\s*:\s*"([^"]+)"/i);
  return m?.[1] ?? null;
}

/** VOE: the `'hls'` value is a stream URL or a base64-encoded one. */
export function parseVoe(html: string): string | null {
  const m =
    html.match(/'hls'\s*:\s*'([^']+)'/i) || html.match(/"hls"\s*:\s*"([^"]+)"/i);
  if (!m) return null;
  const val = m[1];
  if (val.includes('.m3u8') || val.startsWith('http')) return val;
  try {
    const dec = atob(val);
    if (dec.includes('.m3u8') || dec.startsWith('http')) return dec;
  } catch {
    /* not base64 */
  }
  return null;
}

export function parseVidoza(html: string): string | null {
  const m =
    html.match(/<source[^>]+src=["']([^"']+)["']/i) ||
    html.match(/sourcesCode\s*:[\s\S]*?src\s*:\s*"([^"]+)"/i) ||
    html.match(/src\s*:\s*"([^"]+\.mp4[^"]*)"/i);
  return m?.[1] ?? null;
}

/** Streamtape splits its token across two strings assigned to #robotlink. */
export function parseStreamtape(html: string): string | null {
  const concat = html.match(
    /robotlink'\)\.innerHTML\s*=\s*'([^']*)'\s*\+\s*\(?'([^']*)'\)?/i
  );
  if (concat) {
    const joined = (concat[1] + concat[2]).replace(/^https?:/, '');
    return `https:${joined}`;
  }
  const single = html.match(/(\/\/streamtape\.com\/get_video\?[^"'<>\s]+)/i);
  return single ? `https:${single[1]}` : null;
}

async function fetchEmbed(url: string, referer: string): Promise<string> {
  const res = await httpRequest<string>({
    url,
    cors: 'scrape',
    responseType: 'text',
    headers: { 'User-Agent': UA, Referer: referer },
  });
  return res.data;
}

export async function extractSibnet(embedUrl: string): Promise<ExtractedVideo | null> {
  const id = embedUrl.match(/videoid=(\d+)/)?.[1];
  if (!id) return null;
  const html = await fetchEmbed(
    `https://video.sibnet.ru/shell.php?videoid=${id}`,
    'https://video.sibnet.ru/'
  );
  const path = parseSibnetFile(html);
  if (!path) return null;
  const url = path.startsWith('http') ? path : `https://video.sibnet.ru${path}`;
  return {
    url,
    type: 'mp4',
    headers: { Referer: 'https://video.sibnet.ru/', 'User-Agent': UA },
  };
}

export async function extractVidmoly(embedUrl: string): Promise<ExtractedVideo | null> {
  const url = embedUrl.replace('vidmoly.to', 'vidmoly.net');
  const html = await fetchEmbed(url, url);
  const file = parseVidmolyFile(html);
  if (!file) return null;
  return {
    url: file,
    type: file.includes('.m3u8') ? 'hls' : 'mp4',
    headers: { Referer: 'https://vidmoly.net/', 'User-Agent': UA },
  };
}

export async function extractSendvid(embedUrl: string): Promise<ExtractedVideo | null> {
  const html = await fetchEmbed(embedUrl, embedUrl);
  let file = parseSendvidFile(html);
  if (!file) return null;
  if (file.startsWith('//')) file = `https:${file}`;
  return {
    url: file,
    type: file.includes('.m3u8') ? 'hls' : 'mp4',
    headers: { Referer: 'https://sendvid.com/', 'User-Agent': UA },
  };
}

/** Unpack a Dean Edwards `eval(function(p,a,c,k,e,d){...})` payload. */
export function unpackPacked(source: string): string {
  try {
    const m = source.match(
      /\}\s*\(\s*'(.*?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'(.*?)'\.split\('\|'\)/s
    );
    if (!m) return source;
    let payload = m[1].replace(/\\\\/g, '\\').replace(/\\'/g, "'");
    const radix = parseInt(m[2], 10);
    let count = parseInt(m[3], 10);
    const keywords = m[4].split('|');
    const encode = (n: number): string =>
      (n < radix ? '' : encode(Math.floor(n / radix))) +
      ((n = n % radix) > 35 ? String.fromCharCode(n + 29) : n.toString(36));
    const dict: Record<string, string> = {};
    while (count--) dict[encode(count)] = keywords[count] || encode(count);
    return payload.replace(/\b\w+\b/g, (w) => dict[w] ?? w);
  } catch {
    return source;
  }
}

/** StreamWish family (streamwish/embedwish/wishfast/…): packed JS → m3u8. */
export async function extractStreamWish(embedUrl: string): Promise<ExtractedVideo | null> {
  const html = await fetchEmbed(embedUrl, embedUrl);
  const src = /eval\(function\(p,a,c,k,e,[rd]\)/.test(html) ? unpackPacked(html) : html;
  const direct = findDirectStream(src) ?? findDirectStream(html);
  if (!direct) return null;
  return { ...direct, headers: { Referer: embedUrl, 'User-Agent': UA } };
}

/** YourUpload: jwplayer `file:` points at a direct mp4. */
export async function extractYourUpload(embedUrl: string): Promise<ExtractedVideo | null> {
  const html = await fetchEmbed(embedUrl, embedUrl);
  const m =
    html.match(/file\s*:\s*['"]([^'"]+)['"]/i) ||
    html.match(/<source[^>]+src=["']([^"']+)["']/i);
  if (!m) return null;
  let url = m[1];
  if (url.startsWith('//')) url = `https:${url}`;
  else if (url.startsWith('/')) url = `https://www.yourupload.com${url}`;
  return {
    url,
    type: url.includes('.m3u8') ? 'hls' : 'mp4',
    headers: { Referer: 'https://www.yourupload.com/', 'User-Agent': UA },
  };
}

export async function extractVoe(embedUrl: string): Promise<ExtractedVideo | null> {
  const html = await fetchEmbed(embedUrl, embedUrl);
  const url = parseVoe(html) ?? findDirectStream(html)?.url ?? null;
  if (!url) return null;
  return {
    url,
    type: url.includes('.m3u8') ? 'hls' : 'mp4',
    headers: { Referer: embedUrl, 'User-Agent': UA },
  };
}

export async function extractVidoza(embedUrl: string): Promise<ExtractedVideo | null> {
  const html = await fetchEmbed(embedUrl, embedUrl);
  const url = parseVidoza(html);
  if (!url) return null;
  return { url, type: url.includes('.m3u8') ? 'hls' : 'mp4', headers: { Referer: embedUrl, 'User-Agent': UA } };
}

export async function extractStreamtape(embedUrl: string): Promise<ExtractedVideo | null> {
  const html = await fetchEmbed(embedUrl, embedUrl);
  const url = parseStreamtape(html);
  if (!url) return null;
  return { url, type: 'mp4', headers: { Referer: 'https://streamtape.com/', 'User-Agent': UA } };
}

/**
 * Resolve an arbitrary embed URL to a playable stream. Known hosts use a
 * dedicated extractor; unknown hosts are fetched and scanned for a direct
 * stream URL as a best effort.
 */
export async function resolveEmbed(embedUrl: string): Promise<ExtractedVideo | null> {
  if (!embedUrl) return null;
  const u = embedUrl.toLowerCase();
  try {
    if (u.includes('sibnet')) return await extractSibnet(embedUrl);
    if (u.includes('vidmoly')) return await extractVidmoly(embedUrl);
    if (u.includes('sendvid')) return await extractSendvid(embedUrl);
    if (u.includes('voe')) return await extractVoe(embedUrl);
    if (u.includes('vidoza')) return await extractVidoza(embedUrl);
    if (u.includes('streamtape') || u.includes('strtape')) return await extractStreamtape(embedUrl);
    if (u.includes('yourupload')) return await extractYourUpload(embedUrl);
    if (u.includes('wish') || u.includes('swhoi') || u.includes('sfast') || u.includes('swiftplayers'))
      return await extractStreamWish(embedUrl);

    const html = await fetchEmbed(embedUrl, embedUrl);
    const direct = findDirectStream(html);
    if (direct) {
      return { ...direct, headers: { Referer: embedUrl, 'User-Agent': UA } };
    }
  } catch {
    /* fall through */
  }
  return null;
}

/** Hosts we can extract, best first; and hosts to skip entirely. */
const SUPPORTED_HOSTS = [
  'yourupload',
  'streamtape',
  'strtape',
  'vidmoly',
  'voe',
  'vidoza',
  'sibnet',
  'sendvid',
  'wish',
];
const UNSUPPORTED_HOSTS = ['mega.nz', 'ok.ru', 'mail.ru', 'hqq', 'embedsito', 'fembed', 'netu'];

/** Drop unextractable embeds and order the rest by extractor reliability. */
export function prioritizeEmbeds(embeds: string[]): string[] {
  const score = (e: string): number => {
    const u = e.toLowerCase();
    if (UNSUPPORTED_HOSTS.some((h) => u.includes(h))) return -1;
    const i = SUPPORTED_HOSTS.findIndex((h) => u.includes(h));
    return i >= 0 ? 100 - i : 0;
  };
  return embeds
    .map((e) => ({ e, s: score(e) }))
    .filter((x) => x.s >= 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.e);
}

/** Try a list of candidate embeds in order, returning the first that resolves. */
export async function resolveFirst(embeds: string[]): Promise<ExtractedVideo | null> {
  for (const e of prioritizeEmbeds(embeds)) {
    const r = await resolveEmbed(e);
    if (r) return r;
  }
  return null;
}
