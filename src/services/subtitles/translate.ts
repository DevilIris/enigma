import { httpRequest } from '../http/httpClient';

const DEFAULT_INSTANCE = 'https://translate-api-first.vercel.app/api/translate';

/**
 * Translate subtitle text via a translate proxy (default the public instance
 * Ryu used, or a user-configured one). Best-effort — returns null on failure.
 */
export async function translateText(
  text: string,
  targetLang: string,
  instance?: string
): Promise<string | null> {
  if (!text.trim()) return null;
  try {
    const res = await httpRequest<{ data?: string; translation?: string }>({
      url: instance || DEFAULT_INSTANCE,
      method: 'POST',
      cors: 'safe',
      responseType: 'json',
      headers: { 'Content-Type': 'application/json' },
      data: { text, source_lang: 'auto', target_lang: targetLang },
    });
    return res.data?.data ?? res.data?.translation ?? null;
  } catch {
    return null;
  }
}
