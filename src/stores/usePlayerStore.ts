import { create } from 'zustand';
import type { AudioChoice, ExtractedVideo, MediaSource } from '../models';

/** Identifying metadata attached to a playback request (for resume + sync). */
export interface PlayerMeta {
  animeTitle: string;
  episodeTitle?: string;
  episodeNumber: number;
  imageUrl?: string;
  fullURL: string;
  source: MediaSource;
  href?: string;
  malId?: number;
  metaId?: number;
}

/** One source's attempt to produce a playable stream for the episode. */
export interface StreamCandidate {
  source: MediaSource;
  resolve: (audio: AudioChoice) => Promise<ExtractedVideo | null>;
}

export interface PlayerRequest {
  meta: PlayerMeta;
  startTime?: number;
  /** Initial audio track (sub/dub/raw). */
  audio?: AudioChoice;
  /** Direct stream (local downloads / tests). */
  video?: ExtractedVideo;
  /** Ordered source attempts; the player tries each until one actually plays. */
  candidates?: StreamCandidate[];
}

interface PlayerState {
  request: PlayerRequest | null;
  isOpen: boolean;
  play: (req: PlayerRequest) => void;
  close: () => void;
}

/**
 * Holds the active playback request. The full-screen PlayerModal (Phase 7)
 * subscribes to this; `play()` opens it from anywhere (details / downloads /
 * continue-watching).
 */
export const usePlayerStore = create<PlayerState>((set) => ({
  request: null,
  isOpen: false,
  play: (req) => set({ request: req, isOpen: true }),
  close: () => set({ isOpen: false }),
}));

// Dev-only test seam so the player can be driven from automated checks.
if (typeof window !== 'undefined' && (import.meta as unknown as { env?: { DEV?: boolean } }).env?.DEV) {
  (window as unknown as { __enigmaPlayer?: typeof usePlayerStore }).__enigmaPlayer = usePlayerStore;
}
