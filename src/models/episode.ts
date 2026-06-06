/** A single episode reference within a source's detail page. */
export interface Episode {
  /** Source-relative episode URL (used by extractVideo). */
  href: string;
  number: number;
  title?: string;
  thumbnailUrl?: string;
  durationSec?: number;
  /** Whether a local download exists for this episode. */
  isDownloaded?: boolean;
  /** 0..1 watch progress, when known from continue-watching. */
  watchedProgress?: number;
}

export type StreamType = 'hls' | 'mp4';

export type AudioChoice = 'sub' | 'dub' | 'raw';

export interface SubtitleTrack {
  url: string;
  lang: string;
  label?: string;
  format?: 'vtt' | 'srt' | 'ass';
}

export interface QualityVariant {
  label: string; // e.g. "1080p", "720p", "auto"
  url: string;
  type: StreamType;
}

/**
 * Result of resolving an episode to a playable stream — the hand-off contract
 * between the scraping engine (`extractVideo`) and the player.
 */
export interface ExtractedVideo {
  url: string;
  type: StreamType;
  /** Headers (e.g. Referer / User-Agent) some CDNs require. */
  headers?: Record<string, string>;
  subtitles?: SubtitleTrack[];
  qualities?: QualityVariant[];
  source?: string;
}
