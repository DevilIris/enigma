import { describe, it, expect } from 'vitest';
import { parseSubtitles, cueAt } from './parseSubtitles';

describe('parseSubtitles', () => {
  it('parses WEBVTT (dot ms)', () => {
    const vtt = `WEBVTT

1
00:00:01.000 --> 00:00:03.500
Hello <b>world</b>

2
00:00:04.000 --> 00:00:05.000
Second line`;
    const cues = parseSubtitles(vtt);
    expect(cues).toHaveLength(2);
    expect(cues[0]).toMatchObject({ start: 1, end: 3.5, text: 'Hello world' });
  });

  it('parses SRT (comma ms)', () => {
    const srt = `1
00:00:02,000 --> 00:00:04,000
Line one
Line two`;
    const cues = parseSubtitles(srt);
    expect(cues[0].start).toBe(2);
    expect(cues[0].text).toBe('Line one\nLine two');
  });

  it('finds the active cue at a time', () => {
    const cues = parseSubtitles(`WEBVTT

00:00:01.000 --> 00:00:02.000
A`);
    expect(cueAt(cues, 1.5)?.text).toBe('A');
    expect(cueAt(cues, 5)).toBeNull();
  });
});
