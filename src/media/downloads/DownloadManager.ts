import { Filesystem, Directory, type ProgressStatus } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import { isNative } from '../../services/platform';
import { httpRequest } from '../../services/http/httpClient';
import { useLocalProxy, localProxyUrl } from '../../services/http/proxyConfig';
import { useDownloadsStore } from '../../stores';
import type { ActiveDownload, ExtractedVideo, MediaSource } from '../../models';

export interface DownloadRequest {
  video: ExtractedVideo;
  title: string;
  source?: MediaSource;
  animeId?: string;
  episodeNumber?: number;
}

interface Job extends ActiveDownload {
  url: string;
  headers?: Record<string, string>;
  fileName: string;
  source?: MediaSource;
  animeId?: string;
  episodeNumber?: number;
  cancelled: boolean;
}

/** Filesystem-safe filename. */
export function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ').trim().slice(0, 120);
}

/** Resolve the media segment URLs from an m3u8 playlist. */
export function parseSegments(playlist: string, playlistUrl: string): string[] {
  const out: string[] = [];
  for (const raw of playlist.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    try {
      out.push(new URL(line, playlistUrl).href);
    } catch {
      /* skip malformed */
    }
  }
  return out;
}

function abToBase64(buf: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

class DownloadManagerImpl {
  private jobs = new Map<string, Job>();
  private running = false;
  private queue: string[] = [];
  private seq = 0;

  private snapshot(): void {
    const active: ActiveDownload[] = [...this.jobs.values()].map((j) => ({
      id: j.id,
      title: j.title,
      type: j.type,
      progress: j.progress,
      state: j.state,
      bytes: j.bytes,
      total: j.total,
    }));
    useDownloadsStore.getState().setActive(active);
  }

  private finish(job: Job, fileUri: string, sizeBytes?: number): void {
    job.state = 'done';
    job.progress = 1;
    useDownloadsStore.getState().addCompleted({
      id: job.id,
      title: job.title,
      type: job.type,
      source: job.source,
      animeId: job.animeId,
      episodeNumber: job.episodeNumber,
      fileUri,
      path: isNative() ? job.fileName : undefined,
      sizeBytes,
      downloadedAt: Date.now(),
    });
    this.jobs.delete(job.id);
    this.snapshot();
  }

  private fail(job: Job): void {
    job.state = 'error';
    this.snapshot();
  }

  cancel(id: string): void {
    const job = this.jobs.get(id);
    if (!job) return;
    job.cancelled = true;
    job.state = 'cancelled';
    this.jobs.delete(id);
    this.snapshot();
  }

  enqueue(req: DownloadRequest): string {
    const id = `dl-${++this.seq}-${req.episodeNumber ?? ''}`;
    const type = req.video.type;
    const ext = type === 'hls' ? 'mpeg' : 'mp4';
    const job: Job = {
      id,
      title: req.title,
      type,
      progress: 0,
      state: 'queued',
      url: req.video.url,
      headers: req.video.headers,
      fileName: sanitizeFilename(`${req.title}.${ext}`),
      source: req.source,
      animeId: req.animeId,
      episodeNumber: req.episodeNumber,
      cancelled: false,
    };
    this.jobs.set(id, job);
    this.queue.push(id);
    this.snapshot();
    void this.pump();
    return id;
  }

  private async pump(): Promise<void> {
    if (this.running) return;
    this.running = true;
    while (this.queue.length) {
      const id = this.queue.shift()!;
      const job = this.jobs.get(id);
      if (!job || job.cancelled) continue;
      job.state = 'downloading';
      this.snapshot();
      try {
        if (!isNative()) await this.downloadWeb(job);
        else if (job.type === 'mp4') await this.downloadMp4Native(job);
        else await this.downloadHlsNative(job);
      } catch {
        if (!job.cancelled) this.fail(job);
      }
    }
    this.running = false;
  }

  /** Web: only MP4, via a browser download (HLS is not feasible on web). */
  private async downloadWeb(job: Job): Promise<void> {
    if (job.type !== 'mp4') {
      this.fail(job);
      return;
    }
    const a = document.createElement('a');
    a.href = useLocalProxy() ? localProxyUrl(job.url, job.headers) : job.url;
    a.download = job.fileName;
    a.target = '_blank';
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
    this.finish(job, job.url);
  }

  private async downloadMp4Native(job: Job): Promise<void> {
    const handle = await Filesystem.addListener('progress', (p: ProgressStatus) => {
      if (p.contentLength) {
        job.bytes = p.bytes;
        job.total = p.contentLength;
        job.progress = p.bytes / p.contentLength;
        this.snapshot();
      }
    });
    try {
      await Filesystem.downloadFile({
        url: job.url,
        path: job.fileName,
        directory: Directory.Data,
        headers: job.headers,
        progress: true,
        recursive: true,
      });
    } finally {
      await handle.remove();
    }
    const { uri } = await Filesystem.getUri({ path: job.fileName, directory: Directory.Data });
    this.finish(job, uri);
  }

  private async downloadHlsNative(job: Job): Promise<void> {
    const playlist = (
      await httpRequest<string>({ url: job.url, cors: 'scrape', responseType: 'text', headers: job.headers })
    ).data;
    const segments = parseSegments(playlist, job.url).filter((s) => !s.endsWith('.m3u8'));
    if (!segments.length) {
      this.fail(job);
      return;
    }
    // Create/clear the output file.
    await Filesystem.writeFile({ path: job.fileName, directory: Directory.Data, data: '', recursive: true });
    for (let i = 0; i < segments.length; i++) {
      if (job.cancelled) return;
      const buf = await fetch(segments[i], { headers: job.headers }).then((r) => r.arrayBuffer());
      await Filesystem.appendFile({ path: job.fileName, directory: Directory.Data, data: abToBase64(buf) });
      job.progress = (i + 1) / segments.length;
      this.snapshot();
    }
    const { uri } = await Filesystem.getUri({ path: job.fileName, directory: Directory.Data });
    this.finish(job, uri);
  }
}

export const DownloadManager = new DownloadManagerImpl();

/** Build a webview-playable URL for a stored download. */
export function localPlaybackUrl(fileUri: string): string {
  return Capacitor.convertFileSrc(fileUri);
}
