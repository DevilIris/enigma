import { describe, it, expect } from 'vitest';
import { buildAuthUrl, extractTokenFromUrl } from './anilistAuth';

describe('anilistAuth', () => {
  it('builds an implicit-grant authorize URL', () => {
    const url = buildAuthUrl('19551');
    expect(url).toContain('client_id=19551');
    expect(url).toContain('response_type=token');
    expect(url).toContain('anilist.co/api/v2/oauth/authorize');
  });

  it('extracts the access token from a redirect fragment', () => {
    expect(
      extractTokenFromUrl('enigma://anilist#access_token=abc123&token_type=Bearer&expires_in=3600')
    ).toBe('abc123');
  });

  it('returns null when there is no token', () => {
    expect(extractTokenFromUrl('enigma://anilist')).toBeNull();
    expect(extractTokenFromUrl('https://app/callback')).toBeNull();
  });
});
