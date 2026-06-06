import { CapacitorHttp, type HttpOptions } from '@capacitor/core';
import { isNative } from '../platform';
import { buildProxyUrl } from './proxyConfig';
import type { HttpRequest, HttpResponse } from './types';

function withParams(url: string, params?: HttpRequest['params']): string {
  if (!params) return url;
  const u = new URL(url);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) u.searchParams.set(k, String(v));
  }
  return u.toString();
}

/**
 * Unified HTTP entry point.
 *  - Native: CapacitorHttp (no CORS, arbitrary headers, follows redirects).
 *  - Web + cors:'safe': direct fetch.
 *  - Web + cors:'scrape': fetch through the configured scrape proxy.
 */
export async function httpRequest<T = string>(
  req: HttpRequest
): Promise<HttpResponse<T>> {
  const method = req.method ?? 'GET';
  const responseType = req.responseType ?? 'text';
  const targetUrl = withParams(req.url, req.params);

  if (isNative()) {
    const opts: HttpOptions = {
      url: targetUrl,
      method,
      headers: req.headers,
      data: req.data,
      responseType: responseType === 'json' ? 'json' : 'text',
    };
    const res = await CapacitorHttp.request(opts);
    return {
      status: res.status,
      headers: (res.headers ?? {}) as Record<string, string>,
      data: res.data as T,
      url: res.url ?? targetUrl,
    };
  }

  // --- Web ---
  const finalUrl = req.cors === 'scrape' ? buildProxyUrl(targetUrl, req.headers) : targetUrl;
  const body =
    req.data == null
      ? undefined
      : typeof req.data === 'string'
        ? req.data
        : JSON.stringify(req.data);

  // Scrape requests get one retry + a per-attempt timeout so a dead/slow source
  // fails fast instead of stalling episode loading.
  const attempts = req.cors === 'scrape' ? 2 : 1;
  const timeoutMs = req.cors === 'scrape' ? 9000 : 20000;
  let res: Response | undefined;
  for (let i = 0; i < attempts; i++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      res = await fetch(finalUrl, { method, headers: req.headers, body, signal: controller.signal });
      if (res.ok || res.status < 500) break;
    } catch (err) {
      if (i === attempts - 1) throw err;
    } finally {
      clearTimeout(timer);
    }
    if (i < attempts - 1) await new Promise((r) => setTimeout(r, 300));
  }
  if (!res) throw new Error(`Request failed: ${finalUrl}`);

  const headers: Record<string, string> = {};
  res.headers.forEach((value, key) => {
    headers[key] = value;
  });
  const data = (responseType === 'json'
    ? await res.json()
    : await res.text()) as T;

  return { status: res.status, headers, data, url: res.url || finalUrl };
}
