import type { MediaSource } from './sources';

export type DownloadState =
  | 'queued'
  | 'downloading'
  | 'paused'
  | 'done'
  | 'error'
  | 'cancelled';

/** A completed/recorded download (Downloads tab list). */
export interface DownloadItem {
  id: string;
  animeId?: string;
  source?: MediaSource;
  title: string;
  episodeNumber?: number;
  type?: 'mp4' | 'hls';
  /** Capacitor Filesystem URI of the saved file (for playback). */
  fileUri: string;
  /** Relative path within Directory.Data (for deletion); absent on web. */
  path?: string;
  sizeBytes?: number;
  downloadedAt: number;
}

/** A download in flight (Active Downloads view). */
export interface ActiveDownload {
  id: string;
  title: string;
  type: 'mp4' | 'hls';
  progress: number; // 0..1
  state: DownloadState;
  bytes?: number;
  total?: number;
}
