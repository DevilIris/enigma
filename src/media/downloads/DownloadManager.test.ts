import { describe, it, expect } from 'vitest';
import { parseSegments, sanitizeFilename } from './DownloadManager';

describe('parseSegments', () => {
  it('resolves relative and absolute .ts segments against the playlist URL', () => {
    const playlist = `#EXTM3U
#EXT-X-VERSION:3
#EXTINF:10,
seg0.ts
#EXTINF:10,
https://cdn.example/seg1.ts
#EXT-X-ENDLIST`;
    const segs = parseSegments(playlist, 'https://host.example/path/index.m3u8');
    expect(segs).toEqual([
      'https://host.example/path/seg0.ts',
      'https://cdn.example/seg1.ts',
    ]);
  });

  it('ignores comment/tag lines', () => {
    expect(parseSegments('#EXTM3U\n#EXTINF:5,', 'https://h/x.m3u8')).toEqual([]);
  });
});

describe('sanitizeFilename', () => {
  it('strips filesystem-illegal characters', () => {
    const name = sanitizeFilename('My/Anime: "Best" <Ep 1>?');
    expect(name).not.toMatch(/[\\/:*?"<>|]/);
  });
});
