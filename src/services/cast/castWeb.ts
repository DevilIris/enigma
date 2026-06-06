/**
 * Minimal Google Cast (CAF web sender) integration. Works in Chrome / Android
 * Chrome where the Cast framework is available; a no-op everywhere else
 * (iOS uses AirPlay instead). Experimental — feature-detected throughout.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const w = window as any;

let loading = false;

export function loadCastFramework(): void {
  if (loading || w.__enigmaCastLoaded) return;
  loading = true;
  w.__onGCastApiAvailable = (available: boolean) => {
    if (!available) return;
    try {
      w.cast.framework.CastContext.getInstance().setOptions({
        receiverApplicationId: w.chrome.cast.media.DEFAULT_MEDIA_RECEIVER_APP_ID,
        autoJoinPolicy: w.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED,
      });
      w.__enigmaCastLoaded = true;
    } catch {
      /* framework not ready */
    }
  };
  const s = document.createElement('script');
  s.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
  s.async = true;
  document.head.appendChild(s);
}

export function isCastAvailable(): boolean {
  return !!(w.cast?.framework && w.chrome?.cast);
}

export async function castMedia(
  url: string,
  contentType: string,
  title: string,
  imageUrl?: string
): Promise<boolean> {
  if (!isCastAvailable()) return false;
  try {
    const ctx = w.cast.framework.CastContext.getInstance();
    await ctx.requestSession();
    const session = ctx.getCurrentSession();
    if (!session) return false;
    const mediaInfo = new w.chrome.cast.media.MediaInfo(url, contentType);
    mediaInfo.metadata = new w.chrome.cast.media.GenericMediaMetadata();
    mediaInfo.metadata.title = title;
    if (imageUrl) mediaInfo.metadata.images = [new w.chrome.cast.Image(imageUrl)];
    const request = new w.chrome.cast.media.LoadRequest(mediaInfo);
    await session.loadMedia(request);
    return true;
  } catch {
    return false;
  }
}
