export interface Cue {
  start: number; // seconds
  end: number;
  text: string;
}

/** Parse "HH:MM:SS.mmm" / "MM:SS,mmm" (VTT uses '.', SRT uses ','). */
function toSeconds(ts: string): number {
  const m = ts.trim().match(/(?:(\d+):)?(\d{1,2}):(\d{1,2})[.,](\d{1,3})/);
  if (!m) return 0;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const min = parseInt(m[2], 10);
  const s = parseInt(m[3], 10);
  const ms = parseInt(m[4].padEnd(3, '0'), 10);
  return h * 3600 + min * 60 + s + ms / 1000;
}

const stripTags = (s: string): string => s.replace(/<[^>]+>/g, '').trim();

/**
 * Parse a VTT or SRT subtitle file into cues. The block-based approach works
 * for both: the WEBVTT header and SRT index lines have no "-->" and are
 * skipped, and toSeconds() accepts both '.' and ',' millisecond separators.
 */
export function parseSubtitles(raw: string): Cue[] {
  if (!raw) return [];
  const blocks = raw.replace(/\r/g, '').trim().split(/\n\s*\n/);
  const cues: Cue[] = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const timeIdx = lines.findIndex((l) => l.includes('-->'));
    if (timeIdx === -1) continue;
    const [a, b] = lines[timeIdx].split('-->');
    const start = toSeconds(a);
    const end = toSeconds(b);
    const text = lines
      .slice(timeIdx + 1)
      .map(stripTags)
      .filter(Boolean)
      .join('\n');
    if (text && end > start) cues.push({ start, end, text });
  }
  return cues;
}

/** Active cue for a given playback time (cues assumed sorted). */
export function cueAt(cues: Cue[], t: number): Cue | null {
  for (const c of cues) {
    if (t >= c.start && t <= c.end) return c;
    if (c.start > t) break;
  }
  return null;
}
