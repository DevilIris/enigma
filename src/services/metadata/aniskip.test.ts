import { describe, it, expect } from 'vitest';
import { activeSkip, type SkipTime } from './aniskip';

const skips: SkipTime[] = [
  { type: 'op', start: 10, end: 30 },
  { type: 'ed', start: 1300, end: 1320 },
];

describe('activeSkip', () => {
  it('returns the interval covering the current time', () => {
    expect(activeSkip(skips, 20)?.type).toBe('op');
    expect(activeSkip(skips, 1310)?.type).toBe('ed');
  });

  it('is exclusive of the end and returns null outside any interval', () => {
    expect(activeSkip(skips, 5)).toBeNull();
    expect(activeSkip(skips, 30)).toBeNull(); // end is exclusive
    expect(activeSkip(skips, 100)).toBeNull();
  });
});
