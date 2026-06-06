import { Readable } from 'node:stream';
import type { Plugin } from 'vite';

/**
 * Dev-server proxy so `ionic serve` (Vite) can do everything a browser can't:
 * fetch cross-origin sources without CORS, set Referer/User-Agent, pass through
 * GET+POST, forward Range for seeking, and rewrite HLS playlists so the video
 * segments also flow through this proxy.
 *
 *   GET/POST /__proxy?url=<encoded>&referer=<encoded>&ua=<encoded>
 */
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function rewriteM3u8(text: string, manifestUrl: string, referer: string, ua: string): string {
  const wrap = (t: string) => {
    let s = `/__proxy?url=${encodeURIComponent(t)}`;
    if (referer) s += `&referer=${encodeURIComponent(referer)}`;
    if (ua) s += `&ua=${encodeURIComponent(ua)}`;
    return s;
  };
  const abs = (u: string) => {
    try {
      return new URL(u, manifestUrl).href;
    } catch {
      return u;
    }
  };
  return text
    .split('\n')
    .map((line) => {
      const t = line.trim();
      if (!t) return line;
      if (t.startsWith('#')) {
        return line.replace(/URI="([^"]+)"/g, (_m, uri) => `URI="${wrap(abs(uri))}"`);
      }
      return wrap(abs(t));
    })
    .join('\n');
}

export function enigmaDevProxy(): Plugin {
  return {
    name: 'enigma-dev-proxy',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/__proxy')) return next();

        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Headers', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        if (req.method === 'OPTIONS') {
          res.statusCode = 204;
          return res.end();
        }

        try {
          const u = new URL(req.url, 'http://localhost');
          const target = u.searchParams.get('url');
          if (!target) {
            res.statusCode = 400;
            return res.end('missing url');
          }
          const referer = u.searchParams.get('referer') ?? '';
          const ua = u.searchParams.get('ua') || DEFAULT_UA;

          const headers: Record<string, string> = { 'User-Agent': ua };
          if (referer) {
            headers['Referer'] = referer;
            try {
              headers['Origin'] = new URL(referer).origin;
            } catch {
              /* ignore */
            }
          }
          if (req.headers['content-type']) headers['Content-Type'] = String(req.headers['content-type']);
          if (req.headers['range']) headers['Range'] = String(req.headers['range']);

          let body: Buffer | undefined;
          if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
            const chunks: Buffer[] = [];
            for await (const c of req) chunks.push(c as Buffer);
            body = Buffer.concat(chunks);
          }

          const upstream = await fetch(target, {
            method: req.method ?? 'GET',
            headers,
            body,
            redirect: 'follow',
          });

          const ct = upstream.headers.get('content-type') ?? '';
          const finalUrl = upstream.url || target;
          const isM3u8 = /mpegurl/i.test(ct) || finalUrl.split('?')[0].endsWith('.m3u8');

          if (isM3u8) {
            const rewritten = rewriteM3u8(await upstream.text(), finalUrl, referer, ua);
            res.statusCode = upstream.status;
            res.setHeader('Content-Type', 'application/vnd.apple.mpegurl');
            return res.end(rewritten);
          }

          res.statusCode = upstream.status;
          if (ct) res.setHeader('Content-Type', ct);
          for (const h of ['content-length', 'content-range', 'accept-ranges']) {
            const v = upstream.headers.get(h);
            if (v) res.setHeader(h, v);
          }
          if (upstream.body) {
            Readable.fromWeb(upstream.body as Parameters<typeof Readable.fromWeb>[0]).pipe(res);
          } else {
            res.end();
          }
        } catch (e) {
          res.statusCode = 502;
          res.end(`proxy error: ${e instanceof Error ? e.message : String(e)}`);
        }
      });
    },
  };
}
