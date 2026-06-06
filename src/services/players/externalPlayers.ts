import { AppLauncher } from '@capacitor/app-launcher';
import { isNative } from '../platform';

export const EXTERNAL_PLAYERS = ['VLC', 'Infuse', 'OutPlayer', 'nPlayer'] as const;
export type ExternalPlayer = (typeof EXTERNAL_PLAYERS)[number];

export function isExternalPlayer(value: string): value is ExternalPlayer {
  return (EXTERNAL_PLAYERS as readonly string[]).includes(value);
}

/** Build the deep-link URL for an external player app (schemes from Ryu). */
export function buildExternalUrl(player: string, streamUrl: string): string | null {
  switch (player) {
    case 'Infuse':
      return `infuse://x-callback-url/play?url=${encodeURIComponent(streamUrl)}`;
    case 'VLC':
      return `vlc://${streamUrl}`;
    case 'OutPlayer':
      return `outplayer://${streamUrl}`;
    case 'nPlayer':
      return `nplayer-${streamUrl}`;
    default:
      return null;
  }
}

/** Open a stream in an external native player. Returns false on web/failure. */
export async function openInExternalPlayer(player: string, streamUrl: string): Promise<boolean> {
  const url = buildExternalUrl(player, streamUrl);
  if (!url || !isNative()) return false;
  try {
    await AppLauncher.openUrl({ url });
    return true;
  } catch {
    return false;
  }
}
