import { useSettingsStore } from '../../stores/useSettingsStore';

/**
 * Built-in default web proxy. Public CORS proxies are flaky, so this is a
 * best-effort default (GET HTML scraping only — not viable for video streams;
 * POST-based source searches won't work through it). Users can override with
 * their own proxy in Settings → Proxy, or disable it entirely.
 */
export const DEFAULT_PROXY_BASE = 'https://api.allorigins.win/raw';
export const DEFAULT_PROXY_MODE: 'param' | 'prefix' = 'param';

export interface ProxyConfig {
  proxyEnabled: boolean;
  proxyBaseUrl: string;
  proxyMode: string;
}

/** Pure proxy-URL builder (unit-testable). */
export function applyProxy(target: string, cfg: ProxyConfig): string {
  if (!cfg.proxyEnabled) return target;
  const base = cfg.proxyBaseUrl || DEFAULT_PROXY_BASE;
  // A user-supplied base may use prefix mode; the built-in default is param.
  const mode = cfg.proxyBaseUrl
    ? cfg.proxyMode === 'prefix'
      ? 'prefix'
      : 'param'
    : DEFAULT_PROXY_MODE;
  if (mode === 'param') {
    const sep = base.includes('?') ? '&' : '?';
    return `${base}${sep}url=${encodeURIComponent(target)}`;
  }
  return `${base}${target}`;
}

/** Same-origin dev-server proxy endpoint (Vite middleware under `ionic serve`). */
export const LOCAL_PROXY = '/__proxy';

/** True when running in the Vite dev server (so the /__proxy middleware exists). */
export function isDevServer(): boolean {
  try {
    return !!(import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV;
  } catch {
    return false;
  }
}

/** Build a /__proxy URL carrying the target + the headers the proxy should inject. */
export function localProxyUrl(target: string, headers?: Record<string, string>): string {
  const ref = headers?.Referer ?? headers?.referer ?? '';
  const ua = headers?.['User-Agent'] ?? headers?.['user-agent'] ?? '';
  let u = `${LOCAL_PROXY}?url=${encodeURIComponent(target)}`;
  if (ref) u += `&referer=${encodeURIComponent(ref)}`;
  if (ua) u += `&ua=${encodeURIComponent(ua)}`;
  return u;
}

/** Prefer the same-origin dev proxy when available (full headers + POST + streaming). */
export function useLocalProxy(): boolean {
  const cfg = useSettingsStore.getState().settings;
  return cfg.proxyEnabled && !cfg.proxyBaseUrl && isDevServer();
}

export function buildProxyUrl(target: string, headers?: Record<string, string>): string {
  if (useLocalProxy()) return localProxyUrl(target, headers);
  return applyProxy(target, useSettingsStore.getState().settings);
}

/**
 * Whether a *working* scrape proxy is available on web. The dev server's
 * /__proxy works, and a user-supplied custom proxy works — but the built-in
 * default (allorigins) is unreliable/often down, so on production web with no
 * custom proxy we report false. Direct-CORS sources (e.g. Anilibria) still
 * work regardless; this only gates the proxy-dependent scraper sources.
 */
export function isProxyConfigured(): boolean {
  const s = useSettingsStore.getState().settings;
  if (!s.proxyEnabled) return false;
  return isDevServer() || !!s.proxyBaseUrl;
}
