import type { Anime } from '../models';
import type { SearchResult } from '../services/sources/types';

/** Normalize for comparison: lowercase, alphanumerics only, single-spaced. */
export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

/** Strip season/part markers (incl. a trailing or glued number) from a title. */
export function cleanTitle(t: string): string {
  if (!t) return '';
  return t
    .replace(/\b\d+(?:st|nd|rd|th)\s+season\b/gi, '')
    .replace(/\bseason\s+\d+\b/gi, '')
    .replace(/\bpart\s+\d+\b/gi, '')
    .replace(/\bcour\s+\d+\b/gi, '')
    .replace(/\s*\(tv\)\s*/gi, '')
    .replace(/\s+\d{1,2}$/, '') // trailing " 2"
    .replace(/([a-z])\d{1,2}$/i, '$1') // glued "Rotten2" -> "Rotten"
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Best-effort season number from a title (1 if none detected). */
export function seasonNumber(t: string): number {
  const s = t.toLowerCase();
  let m = s.match(/(\d+)(?:st|nd|rd|th)\s+season/);
  if (m) return parseInt(m[1], 10);
  m = s.match(/season\s+(\d+)/);
  if (m) return parseInt(m[1], 10);
  m = s.match(/\bpart\s+(\d+)/);
  if (m) return parseInt(m[1], 10);
  m = s.match(/\s(\d{1,2})$/); // trailing " 2"
  if (m) return parseInt(m[1], 10);
  m = s.match(/[a-z](\d)$/); // glued "rotten2"
  if (m) return parseInt(m[1], 10);
  return 1;
}

/** Candidate search queries for a metadata anime, most-specific first. */
export function buildQueries(a: Anime): string[] {
  const raw = [a.englishTitle, a.romajiTitle, a.title].filter(Boolean) as string[];
  const cleaned = raw.map(cleanTitle);
  const beforeColon = raw.map((t) => t.split(':')[0].trim());
  return Array.from(new Set([...raw, ...cleaned, ...beforeColon].map((s) => s.trim()))).filter(
    (s) => s.length > 1
  );
}

/** Choose the source result that best matches the anime (incl. the right season). */
export function pickBestMatch(results: SearchResult[], a: Anime): SearchResult | null {
  if (!results.length) return null;
  const wantSeason = seasonNumber(a.title || a.englishTitle || '');
  const base = normalize(cleanTitle(a.englishTitle || a.romajiTitle || a.title || ''));

  let best = results[0];
  let bestScore = -Infinity;
  for (const r of results) {
    const rn = normalize(r.title);
    const rnClean = normalize(cleanTitle(r.title));
    let score = 0;
    if (rnClean === base) score += 6;
    else if (base && (rn.includes(base) || base.includes(rnClean))) score += 3;
    const rs = seasonNumber(r.title);
    score += rs === wantSeason ? 4 : -Math.abs(rs - wantSeason);
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}
