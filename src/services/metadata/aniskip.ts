import { httpRequest } from '../http/httpClient';
import { useSettingsStore } from '../../stores/useSettingsStore';

export interface SkipTime {
  type: 'op' | 'ed';
  start: number;
  end: number;
}

/** The skip interval covering time `t`, if any. */
export function activeSkip(skips: SkipTime[], t: number): SkipTime | null {
  for (const s of skips) if (t >= s.start && t < s.end) return s;
  return null;
}

interface AniSkipResult {
  interval: { startTime: number; endTime: number };
  skipType: 'op' | 'ed';
  episodeLength: number;
  skipId: string;
}

/**
 * Fetch intro (op) / outro (ed) skip intervals for an episode from AniSkip.
 * Requires the MAL id (obtained via AniList `idMal` / Jikan).
 */
export async function getSkipTimes(
  malId: number,
  episodeNumber: number,
  episodeLengthSec = 0
): Promise<SkipTime[]> {
  const base = useSettingsStore
    .getState()
    .settings.aniSkipInstanceURL.replace(/\/$/, '');
  // Build the query manually: AniSkip wants repeated `types[]` keys, which
  // URLSearchParams.set would collapse.
  const qs = `types[]=op&types[]=ed&episodeLength=${episodeLengthSec || 0}`;
  try {
    const res = await httpRequest<{ found: boolean; results?: AniSkipResult[] }>({
      url: `${base}/v2/skip-times/${malId}/${episodeNumber}?${qs}`,
      cors: 'safe',
      responseType: 'json',
    });
    const results = res.data?.results ?? [];
    return results.map((r) => ({
      type: r.skipType,
      start: r.interval.startTime,
      end: r.interval.endTime,
    }));
  } catch {
    return [];
  }
}

/** Submit a skip-time vote (called by the player when an interval is used). */
export async function voteSkipTime(skipId: string, score = 1): Promise<void> {
  const base = useSettingsStore
    .getState()
    .settings.aniSkipInstanceURL.replace(/\/$/, '');
  try {
    await httpRequest({
      url: `${base}/v1/skip-times/vote/${skipId}`,
      method: 'POST',
      cors: 'safe',
      responseType: 'json',
      headers: { 'Content-Type': 'application/json' },
      data: { score },
    });
  } catch {
    /* best-effort */
  }
}
