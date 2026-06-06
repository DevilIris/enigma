import { describe, it, expect } from 'vitest';
import { cleanTitle, seasonNumber, buildQueries, pickBestMatch } from './titleMatch';
import { MediaSource, type Anime } from '../models';
import type { SearchResult } from '../services/sources/types';

describe('cleanTitle', () => {
  it('strips season markers and glued/trailing numbers', () => {
    expect(cleanTitle('The Angel Next Door Spoils Me Rotten2')).toBe('The Angel Next Door Spoils Me Rotten');
    expect(cleanTitle('Naruto 2nd Season')).toBe('Naruto');
    expect(cleanTitle('Re:Zero Season 2')).toBe('Re:Zero');
  });
});

describe('seasonNumber', () => {
  it('detects seasons; defaults to 1', () => {
    expect(seasonNumber('Foo 2nd Season')).toBe(2);
    expect(seasonNumber('Foo Season 3')).toBe(3);
    expect(seasonNumber('Rotten2')).toBe(2);
    expect(seasonNumber('Mob Psycho 100')).toBe(1);
    expect(seasonNumber('Naruto')).toBe(1);
  });
});

const r = (title: string): SearchResult => ({
  id: title,
  title,
  href: `https://x/${title}`,
  source: MediaSource.AnimeNana,
});

describe('buildQueries', () => {
  it('includes raw + cleaned variants, most-specific first', () => {
    const a = { englishTitle: 'The Angel Next Door Spoils Me Rotten2', romajiTitle: 'Otonari', title: 'Otonari 2nd Season' } as Anime;
    const q = buildQueries(a);
    expect(q[0]).toBe('The Angel Next Door Spoils Me Rotten2');
    expect(q).toContain('The Angel Next Door Spoils Me Rotten');
  });
});

describe('pickBestMatch', () => {
  it('picks the correct season among results', () => {
    const a = {
      title: 'Otonari ... Ken 2nd Season',
      englishTitle: 'The Angel Next Door Spoils Me Rotten2',
    } as Anime;
    const results = [
      r('The Angel Next Door Spoils Me Rotten'),
      r('The Angel Next Door Spoils Me Rotten 2'),
    ];
    expect(pickBestMatch(results, a)?.title).toBe('The Angel Next Door Spoils Me Rotten 2');
  });

  it('picks season 1 when no season suffix on the anime', () => {
    const a = { title: 'Naruto', englishTitle: 'Naruto' } as Anime;
    const results = [r('Naruto'), r('Naruto Shippuden'), r('Boruto: Naruto Next Generations')];
    expect(pickBestMatch(results, a)?.title).toBe('Naruto');
  });
});
