import { parse, type HTMLElement } from 'node-html-parser';

export function parseHtml(html: string): HTMLElement {
  return parse(html);
}

/** Resolve a possibly-relative href against a base URL. */
export function absUrl(href: string, base: string): string {
  if (!href) return '';
  if (href.startsWith('//')) return `https:${href}`;
  try {
    return new URL(href, base).href;
  } catch {
    return href;
  }
}

export function text(el: HTMLElement | null | undefined): string {
  return el?.text.trim() ?? '';
}

export function attr(
  el: HTMLElement | null | undefined,
  name: string
): string {
  return el?.getAttribute(name)?.trim() ?? '';
}

/** First image src, checking common lazy-load attributes. */
export function imgSrc(el: HTMLElement | null | undefined): string {
  if (!el) return '';
  return (
    el.getAttribute('src') ||
    el.getAttribute('data-src') ||
    el.getAttribute('data-original') ||
    el.getAttribute('data-lazy-src') ||
    ''
  ).trim();
}

/** Extract a background-image url(...) from a style attribute. */
export function bgImage(style: string): string {
  const m = style.match(/url\(['"]?([^'")]+)['"]?\)/i);
  return m?.[1] ?? '';
}

export type { HTMLElement };
