import { Browser } from '@capacitor/browser';
import { isNative } from '../platform';

/**
 * AniList OAuth via the implicit grant (response_type=token) so no client
 * secret ships in the app. Register your own AniList API client with redirect
 * URL `enigma://anilist` and put its client id in Settings → Account.
 */
export function buildAuthUrl(clientId: string): string {
  const u = new URL('https://anilist.co/api/v2/oauth/authorize');
  u.searchParams.set('client_id', clientId);
  u.searchParams.set('response_type', 'token');
  return u.toString();
}

export async function loginAniList(clientId: string): Promise<void> {
  if (!clientId) return;
  const url = buildAuthUrl(clientId);
  if (isNative()) {
    await Browser.open({ url });
  } else {
    // Web: full-page redirect; the token comes back in the URL fragment.
    window.location.href = url;
  }
}

/** Pull `access_token` out of an implicit-grant redirect URL fragment. */
export function extractTokenFromUrl(url: string): string | null {
  const hash = url.split('#')[1];
  if (!hash) return null;
  const params = new URLSearchParams(hash);
  return params.get('access_token');
}

export async function closeAuthBrowser(): Promise<void> {
  try {
    await Browser.close();
  } catch {
    /* no-op on web */
  }
}
