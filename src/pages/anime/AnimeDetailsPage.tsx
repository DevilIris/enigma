import React, { useEffect, useMemo, useState } from 'react';
import {
  IonBackButton,
  IonButton,
  IonButtons,
  IonChip,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonNote,
  IonPage,
  IonSkeletonText,
  IonSpinner,
  IonTitle,
  IonToolbar,
  useIonToast,
  useIonActionSheet,
} from '@ionic/react';
import { useParams } from 'react-router';
import { heart, heartOutline, star, chevronDownOutline } from 'ionicons/icons';
import {
  AnimeListingService,
  MediaSource,
  SOURCE_META,
  type Anime,
  type AudioChoice,
  type Episode,
} from '../../models';
import { aniList } from '../../services/metadata/anilist';
import { jikan } from '../../services/metadata/jikan';
import { kitsu } from '../../services/metadata/kitsu';
import { getSource, implementedSources } from '../../services/sources';
import { DownloadManager } from '../../media/downloads/DownloadManager';
import { openInExternalPlayer, isExternalPlayer } from '../../services/players/externalPlayers';
import { isNative } from '../../services/platform';
import { isProxyConfigured } from '../../services/http/proxyConfig';
import {
  useFavoritesStore,
  usePlayerStore,
  useSettingsStore,
  type StreamCandidate,
} from '../../stores';
import { META_SOURCE } from '../../routes';
import { buildQueries, pickBestMatch } from '../../utils/titleMatch';
import EpisodeList from './EpisodeList';

const toAudio = (p: string): AudioChoice => (p === 'Dub' ? 'dub' : p === 'Raw' ? 'raw' : 'sub');

// Sources whose search/stream allow cross-origin requests, so they work in a
// plain browser (PWA) with no proxy. Anilibria's API + HLS send CORS headers.
const DIRECT_WEB_SOURCES: MediaSource[] = [MediaSource.Anilibria];

// Fallback sources tried (after the chosen one) when a stream fails to play.
// Direct-stream sources first — they're far more reliable than embed-host ones.
const PLAY_FALLBACKS: MediaSource[] = [
  MediaSource.Anilibria,
  MediaSource.AnimeSama,
  MediaSource.AnimeWorld,
  MediaSource.HiAnime,
  MediaSource.AnimeNana,
  MediaSource.AnimeFLV,
];

const AnimeDetailsPage: React.FC = () => {
  const { source, id } = useParams<{ source: string; id: string }>();
  const service = useSettingsStore((s) => s.settings.selectedAnimeListingService);
  const selectedSource = useSettingsStore((s) => s.settings.selectedMediaSource);
  const reverseEpisodes = useSettingsStore((s) => s.settings.episodeSortingReverse);
  const mediaPlayer = useSettingsStore((s) => s.settings.mediaPlayerSelection);
  const audioPref = useSettingsStore((s) => s.settings.audioPreference);
  const isFavorite = useFavoritesStore((s) => s.isFavorite);
  const toggleFavorite = useFavoritesStore((s) => s.toggle);
  const play = usePlayerStore((s) => s.play);
  const [presentToast] = useIonToast();

  const isMeta = source === META_SOURCE;

  const [anime, setAnime] = useState<Anime | null>(null);
  const [title, setTitle] = useState('');
  const [altTitle, setAltTitle] = useState('');
  const [coverUrl, setCoverUrl] = useState<string | undefined>();
  const [synopsis, setSynopsis] = useState<string | undefined>();
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [playbackSource, setPlaybackSource] = useState<MediaSource | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingEps, setLoadingEps] = useState(false);
  const [epsNote, setEpsNote] = useState<string>('');
  const [busyHref, setBusyHref] = useState<string | null>(null);
  /** Explicit source/language override chosen by the user (meta pages). */
  const [chosenSource, setChosenSource] = useState<MediaSource | null>(null);
  const [presentSourceSheet] = useIonActionSheet();

  // Reset the language override when navigating to a different title.
  useEffect(() => {
    setChosenSource(null);
  }, [id, source]);

  const openSourcePicker = () =>
    presentSourceSheet({
      header: 'Load episodes from…',
      buttons: [
        ...implementedSources()
          .sort(
            (a, b) =>
              SOURCE_META[a].lang.localeCompare(SOURCE_META[b].lang) ||
              SOURCE_META[a].label.localeCompare(SOURCE_META[b].label)
          )
          .map((s) => ({
            text: `${SOURCE_META[s].flag}  ${SOURCE_META[s].lang} · ${SOURCE_META[s].label}`,
            handler: () => setChosenSource(s),
          })),
        { text: 'Cancel', role: 'cancel' as const },
      ],
    });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setAnime(null);
    setEpisodes([]);
    setPlaybackSource(null);
    setEpsNote('');

    const loadMetaEpisodes = async (a: Anime) => {
      // Scrape sources need a working proxy (native, dev /__proxy, or a custom
      // one). On bare production web only direct-CORS sources work, so filter
      // the chain down to those rather than failing outright.
      const proxied = isNative() || isProxyConfigured();
      // If the user explicitly picked a source/language, use only that (fast).
      // Otherwise try the selected source, then the same reliable fallbacks the
      // player uses (Anilibria first — direct HLS, works even in the browser).
      const requested = chosenSource ? [chosenSource] : [selectedSource, ...PLAY_FALLBACKS];
      const order = Array.from(new Set<MediaSource>(requested))
        .filter((s) => getSource(s)?.playable)
        .filter((s) => proxied || DIRECT_WEB_SOURCES.includes(s));
      if (!order.length) {
        setEpsNote(
          'On the web, this source needs a proxy. Install the app (or set a proxy in Settings → Proxy), or pick Anilibria via the source button.'
        );
        return;
      }

      // AniList's preferred title is often romaji; sources index by English /
      // a cleaned name. Try several query variants, then pick the right match.
      const queries = buildQueries(a).slice(0, 5);
      setLoadingEps(true);
      try {
        for (const sid of order) {
          const src = getSource(sid)!;
          let results: Awaited<ReturnType<typeof src.search>> = [];
          for (const q of queries) {
            try {
              results = await src.search(q);
            } catch {
              results = [];
            }
            if (cancelled) return;
            if (results.length) break;
          }
          if (!results.length) continue;
          const best = pickBestMatch(results, a) ?? results[0];
          let eps: Episode[] = [];
          try {
            eps = await src.fetchEpisodes(best.href);
          } catch {
            eps = [];
          }
          if (cancelled) return;
          if (eps.length) {
            setEpisodes(eps);
            setPlaybackSource(sid);
            return;
          }
        }
        setEpsNote('No episodes found for this title on the available sources.');
      } finally {
        if (!cancelled) setLoadingEps(false);
      }
    };

    const run = async () => {
      try {
        if (isMeta) {
          const a =
            service === AnimeListingService.Kitsu
              ? await kitsu.getInfo(id)
              : service === AnimeListingService.MAL
                ? await jikan.getInfo(Number(id))
                : await aniList.getInfo(Number(id));
          if (cancelled) return;
          setAnime(a);
          setTitle(a.title);
          setAltTitle(a.alternativeTitle ?? '');
          setCoverUrl(a.coverUrl);
          setSynopsis(a.synopsis);
          setLoading(false);
          await loadMetaEpisodes(a);
        } else {
          const src = getSource(source as MediaSource);
          if (!src) {
            setEpsNote(`${source} isn’t implemented yet.`);
            setLoading(false);
            return;
          }
          const detail = await src.fetchDetails(id);
          if (cancelled) return;
          setTitle(detail.title);
          setAltTitle(detail.alternativeTitle ?? '');
          setCoverUrl(detail.coverUrl);
          setSynopsis(detail.synopsis);
          setEpisodes(detail.episodes);
          setPlaybackSource(source as MediaSource);
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setEpsNote('Failed to load.');
          setLoading(false);
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [isMeta, id, source, service, selectedSource, chosenSource]);

  const favSource: MediaSource = isMeta ? selectedSource : (source as MediaSource);
  const favId = anime?.id ?? id;
  const fav = isFavorite(favId, favSource);

  const onToggleFav = () => {
    if (!title) return;
    toggleFavorite({
      id: favId,
      source: favSource,
      metaId: anime?.metaId,
      href: isMeta ? undefined : id,
      title,
      coverUrl,
    });
  };

  const downloadEpisode = async (ep: Episode) => {
    if (!playbackSource) return;
    const src = getSource(playbackSource);
    if (!src) return;
    presentToast({ message: 'Preparing download…', duration: 1200 });
    try {
      const video = await src.extractVideo(ep.href);
      DownloadManager.enqueue({
        video,
        title: `${title} - Ep ${ep.number}`,
        source: playbackSource,
        animeId: isMeta ? undefined : id,
        episodeNumber: ep.number,
      });
      presentToast({ message: 'Download started', duration: 1500, color: 'success' });
    } catch {
      presentToast({ message: 'Could not start the download.', duration: 2500, color: 'danger' });
    }
  };

  /** Build the ordered list of source attempts for an episode. */
  const buildCandidates = (ep: Episode): StreamCandidate[] => {
    const queryAnime: Anime = anime ?? ({ id, title, source: source as MediaSource } as Anime);
    const order = Array.from(
      new Set<MediaSource>([playbackSource as MediaSource, ...PLAY_FALLBACKS])
    ).filter((s) => getSource(s)?.playable);

    return order.map((sid) => ({
      source: sid,
      resolve: async (au) => {
        const s = getSource(sid);
        if (!s) return null;
        try {
          // The originally-selected source already has this episode's href.
          if (sid === playbackSource) return await s.extractVideo(ep.href, au);
          // Other sources: re-find the same title + episode number.
          for (const q of buildQueries(queryAnime)) {
            const results = await s.search(q);
            if (!results.length) continue;
            const best = pickBestMatch(results, queryAnime) ?? results[0];
            const eps = await s.fetchEpisodes(best.href);
            const m = eps.find((e) => e.number === ep.number) ?? eps[ep.number - 1];
            return m ? await s.extractVideo(m.href, au) : null;
          }
          return null;
        } catch {
          return null;
        }
      },
    }));
  };

  const playEpisode = async (ep: Episode) => {
    if (!playbackSource) return;
    const audio = toAudio(audioPref);

    // External native player: needs a direct URL from the chosen source up front.
    if (isNative() && isExternalPlayer(mediaPlayer)) {
      const src = getSource(playbackSource);
      setBusyHref(ep.href);
      try {
        const video = await src!.extractVideo(ep.href, audio);
        if (await openInExternalPlayer(mediaPlayer, video.url)) return;
      } catch {
        /* fall through to the in-app player */
      } finally {
        setBusyHref(null);
      }
    }

    play({
      audio,
      candidates: buildCandidates(ep),
      meta: {
        animeTitle: title,
        episodeTitle: ep.title,
        episodeNumber: ep.number,
        imageUrl: coverUrl,
        fullURL: ep.href,
        source: playbackSource,
        href: isMeta ? undefined : id,
        malId: anime?.malId,
        metaId: anime?.metaId,
      },
    });
  };

  const chips = useMemo(() => {
    if (!anime) return [];
    const list: { icon?: string; text: string }[] = [];
    if (anime.averageScore) list.push({ icon: star, text: `${anime.averageScore}%` });
    if (anime.format) list.push({ text: anime.format });
    if (anime.episodeCount) list.push({ text: `${anime.episodeCount} ep` });
    if (anime.status) list.push({ text: anime.status });
    if (anime.year) list.push({ text: String(anime.year) });
    return list;
  }, [anime]);

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/tabs/home" />
          </IonButtons>
          <IonTitle>{title || 'Details'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onToggleFav} disabled={!title}>
              <IonIcon
                slot="icon-only"
                icon={fav ? heart : heartOutline}
                color={fav ? 'danger' : undefined}
              />
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen>
        {loading ? (
          <div style={{ padding: 16 }}>
            <IonSkeletonText animated style={{ width: '60%', height: 24 }} />
            <IonSkeletonText animated style={{ width: '100%', height: 140, marginTop: 12 }} />
            <IonSkeletonText animated style={{ width: '90%' }} />
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 14, padding: 16 }}>
              {coverUrl && (
                <img
                  src={coverUrl}
                  alt={title}
                  style={{ width: 110, borderRadius: 12, flex: '0 0 auto', boxShadow: '0 4px 14px rgba(0,0,0,0.4)' }}
                />
              )}
              <div style={{ alignSelf: 'flex-end' }}>
                <h1 style={{ margin: '0 0 4px', fontSize: '1.25rem' }}>{title}</h1>
                {altTitle && (
                  <p style={{ margin: 0, opacity: 0.6, fontSize: '0.85rem' }}>{altTitle}</p>
                )}
              </div>
            </div>

            {chips.length > 0 && (
              <div style={{ padding: '0 12px', display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {chips.map((c, i) => (
                  <IonChip key={i} outline>
                    {c.icon && <IonIcon icon={c.icon} color="primary" />}
                    <IonLabel>{c.text}</IonLabel>
                  </IonChip>
                ))}
              </div>
            )}

            {synopsis && <p style={{ padding: '8px 16px', lineHeight: 1.5 }}>{synopsis}</p>}

            <div className="enigma-section-header">
              <h2>Episodes</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {loadingEps && <IonSpinner name="dots" />}
                {isMeta && (
                  <IonButton fill="clear" size="small" onClick={openSourcePicker}>
                    {playbackSource
                      ? `${SOURCE_META[playbackSource].flag} ${SOURCE_META[playbackSource].label}`
                      : 'Source'}
                    <IonIcon slot="end" icon={chevronDownOutline} />
                  </IonButton>
                )}
              </div>
            </div>

            {episodes.length > 0 ? (
              <EpisodeList
                episodes={episodes}
                onPlay={playEpisode}
                onDownload={downloadEpisode}
                busyHref={busyHref}
                reverse={reverseEpisodes}
              />
            ) : (
              !loadingEps && (
                <IonNote style={{ display: 'block', padding: '0 16px 16px' }}>
                  {epsNote || 'No episodes available.'}
                </IonNote>
              )
            )}
            <div style={{ height: 24 }} />
          </>
        )}
      </IonContent>
    </IonPage>
  );
};

export default AnimeDetailsPage;
