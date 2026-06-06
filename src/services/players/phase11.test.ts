import { describe, it, expect } from 'vitest';
import { buildExternalUrl, isExternalPlayer } from './externalPlayers';
import { encodeBackup, decodeBackup, type BackupData } from '../backup/backup';

describe('external player deep links', () => {
  it('builds the documented scheme URLs', () => {
    expect(buildExternalUrl('VLC', 'https://x/v.m3u8')).toBe('vlc://https://x/v.m3u8');
    expect(buildExternalUrl('OutPlayer', 'https://x/v.mp4')).toBe('outplayer://https://x/v.mp4');
    expect(buildExternalUrl('nPlayer', 'https://x/v.mp4')).toBe('nplayer-https://x/v.mp4');
    expect(buildExternalUrl('Infuse', 'https://x/v.mp4')).toBe(
      'infuse://x-callback-url/play?url=https%3A%2F%2Fx%2Fv.mp4'
    );
    expect(buildExternalUrl('Default', 'https://x')).toBeNull();
  });

  it('identifies external players', () => {
    expect(isExternalPlayer('VLC')).toBe(true);
    expect(isExternalPlayer('Default')).toBe(false);
  });
});

describe('backup encode/decode', () => {
  it('round-trips UTF-8 content', () => {
    const b: BackupData = {
      version: 1,
      createdAt: 1234567890,
      data: { title: '日本語テスト', list: [1, 2, 3], flag: true },
    };
    expect(decodeBackup(encodeBackup(b))).toEqual(b);
  });
});
