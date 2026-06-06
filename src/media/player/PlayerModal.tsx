import React, { useCallback, useEffect, useRef, useState } from 'react';
import { IonContent, IonModal } from '@ionic/react';
import { ScreenOrientation } from '@capacitor/screen-orientation';
import Hls from 'hls.js';
import {
  usePlayerStore,
  useSettingsStore,
  useContinueWatchingStore,
  useAuthStore,
  type StreamCandidate,
} from '../../stores';
import { httpRequest } from '../../services/http/httpClient';
import { useLocalProxy, localProxyUrl } from '../../services/http/proxyConfig';
import { parseSubtitles, cueAt, type Cue } from '../subtitles/parseSubtitles';
import { getSkipTimes, activeSkip, type SkipTime } from '../../services/metadata';
import { aniList } from '../../services/metadata/anilist';
import { translateText } from '../../services/subtitles/translate';
import { loadCastFramework, isCastAvailable, castMedia } from '../../services/cast/castWeb';
import { isNative } from '../../services/platform';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import type { AudioChoice, ExtractedVideo } from '../../models';
import ControlsOverlay from './ControlsOverlay';
import SubtitleRenderer from './SubtitleRenderer';
import './player.css';

const HOLD_DELAY = 400;
const AUTOHIDE_MS = 3000;
const SAVE_EVERY_MS = 5000;

const PlayerModal: React.FC = () => {
  const isOpen = usePlayerStore((s) => s.isOpen);
  const request = usePlayerStore((s) => s.request);
  const closePlayer = usePlayerStore((s) => s.close);

  const holdSpeed = useSettingsStore((s) => s.settings.holdSpeedPlayer);
  const alwaysLandscape = useSettingsStore((s) => s.settings.alwaysLandscape);
  const subtitlePref = useSettingsStore((s) => s.settings.subtitleLanguage);
  const autoSkipIntro = useSettingsStore((s) => s.settings.autoSkipIntro);
  const autoSkipOutro = useSettingsStore((s) => s.settings.autoSkipOutro);
  const skipFeedback = useSettingsStore((s) => s.settings.skipFeedback);
  const useTranslate = useSettingsStore((s) => s.settings.useGoogleTranslate);
  const translateLang = useSettingsStore((s) => s.settings.translationLanguage);
  const translateInstance = useSettingsStore((s) => s.settings.customTranslatorURL);
  const saveProgress = useContinueWatchingStore((s) => s.save);
  const cwItems = useContinueWatchingStore.getState().items;
  const aniListToken = useAuthStore((s) => s.aniListToken);

  const skipsRef = useRef<SkipTime[]>([]);
  const skippedRef = useRef<Set<'op' | 'ed'>>(new Set());
  const sentProgressRef = useRef(false);
  const [currentSkip, setCurrentSkip] = useState<SkipTime | null>(null);
  const [translatedCue, setTranslatedCue] = useState<string | null>(null);
  const translationCache = useRef<Map<string, string>>(new Map());

  // The modal mounts its <video> lazily, so engine setup must wait for present.
  const [presented, setPresented] = useState(false);
  // Active stream descriptor (swappable when the sub/dub track changes).
  const [stream, setStream] = useState<ExtractedVideo | null>(null);
  const [audio, setAudio] = useState<AudioChoice>('sub');
  // True when autoplay was only allowed muted (Chrome policy) → show unmute hint.
  const [needsUnmute, setNeedsUnmute] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [exhausted, setExhausted] = useState(false);

  const stageRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const holdTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSave = useRef(0);
  const cuesRef = useRef<Cue[]>([]);
  const candidatesRef = useRef<StreamCandidate[]>([]);
  const idxRef = useRef(0);
  const audioRef = useRef<AudioChoice>('sub');
  const loadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [rate, setRate] = useState(1);
  const [holdActive, setHoldActive] = useState(false);
  const [levels, setLevels] = useState<{ label: string }[]>([]);
  const [currentLevel, setCurrentLevel] = useState(-1);
  const [selectedSub, setSelectedSub] = useState(-1);
  const [activeCue, setActiveCue] = useState<string | null>(null);
  const [controlsVisible, setControlsVisible] = useState(true);

  const pipSupported = typeof document !== 'undefined' && !!document.pictureInPictureEnabled;
  const airplaySupported =
    typeof window !== 'undefined' &&
    'WebKitPlaybackTargetAvailabilityEvent' in window;

  /* ---- auto-hide (never hide while paused, so the play button stays) ---- */
  const scheduleHide = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) setControlsVisible(false);
    }, AUTOHIDE_MS);
  }, []);
  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  /* ---- progress persistence ---- */
  const persist = useCallback(
    (time: number, total: number) => {
      if (!request || !total) return;
      const m = request.meta;
      saveProgress({
        animeTitle: m.animeTitle,
        episodeTitle: m.episodeTitle,
        episodeNumber: m.episodeNumber,
        imageUrl: m.imageUrl,
        fullURL: m.fullURL,
        source: m.source,
        href: m.href,
        metaId: m.metaId,
        malId: m.malId,
        lastPlayedTime: time,
        totalTime: total,
        updatedAt: Date.now(),
      });
    },
    [request, saveProgress]
  );

  const clearLoadTimer = useCallback(() => {
    if (loadTimerRef.current) {
      clearTimeout(loadTimerRef.current);
      loadTimerRef.current = null;
    }
  }, []);

  /* ---- resolve stream candidates in order; auto-advance on failure/stall ---- */
  const loadCandidate = useCallback(
    async (i: number): Promise<void> => {
      clearLoadTimer();
      const cands = candidatesRef.current;
      if (i >= cands.length) {
        setStream(null);
        setResolving(false);
        setExhausted(true);
        return;
      }
      idxRef.current = i;
      setResolving(true);
      setExhausted(false);
      setStream(null);
      let v: ExtractedVideo | null = null;
      try {
        v = await cands[i].resolve(audioRef.current);
      } catch {
        v = null;
      }
      if (candidatesRef.current !== cands) return; // superseded by a newer request
      if (!v || !v.url) {
        void loadCandidate(i + 1);
        return;
      }
      setResolving(false);
      setStream(v);
      // Stall watchdog: if playback hasn't started in 15s, try the next source.
      loadTimerRef.current = setTimeout(() => {
        const el = videoRef.current;
        if (el && el.readyState < 2) void loadCandidate(idxRef.current + 1);
      }, 15000);
    },
    [clearLoadTimer]
  );

  /* ---- (re)build candidate list when a new request arrives ---- */
  useEffect(() => {
    clearLoadTimer();
    setExhausted(false);
    const cands: StreamCandidate[] =
      request?.candidates ??
      (request?.video
        ? [{ source: request.meta.source, resolve: async () => request.video ?? null }]
        : []);
    candidatesRef.current = cands;
    idxRef.current = 0;
    const a = request?.audio ?? 'sub';
    setAudio(a);
    audioRef.current = a;
    if (cands.length) void loadCandidate(0);
    else setStream(null);
  }, [request, loadCandidate, clearLoadTimer]);

  /* ---- engine setup (runs once the modal is presented so the video exists) ---- */
  useEffect(() => {
    if (!presented || !request || !stream) return;
    const el = videoRef.current;
    if (!el) return;
    // In the browser dev server, route the stream through /__proxy so segments
    // get CORS + the right Referer/User-Agent. Native plays the URL directly.
    const streamUrl = useLocalProxy() ? localProxyUrl(stream.url, stream.headers) : stream.url;

    hlsRef.current?.destroy();
    hlsRef.current = null;
    setLevels([]);
    setCurrentLevel(-1);
    setRate(1);
    setControlsVisible(true);
    scheduleHide();

    const resumeAt =
      request.startTime ??
      cwItems.find((i) => i.fullURL === request.meta.fullURL)?.lastPlayedTime ??
      0;
    setNeedsUnmute(false);
    el.preload = 'auto';
    const seekResume = () => {
      if (resumeAt && resumeAt < el.duration - 5) el.currentTime = resumeAt;
    };
    // Start playback immediately; if the browser blocks autoplay-with-sound,
    // retry muted (allowed) and surface a "tap to unmute" hint.
    const tryPlay = () => {
      el.play().catch(() => {
        el.muted = true;
        setNeedsUnmute(true);
        void el.play().catch(() => undefined);
      });
    };
    el.addEventListener('loadedmetadata', seekResume, { once: true });

    const nativeHls = !!el.canPlayType('application/vnd.apple.mpegurl');
    if (stream.type === 'hls' && Hls.isSupported() && !nativeHls) {
      const hls = new Hls({
        xhrSetup: (xhr) => {
          for (const [k, val] of Object.entries(stream.headers ?? {})) {
            try {
              xhr.setRequestHeader(k, val);
            } catch {
              /* forbidden headers dropped by the browser */
            }
          }
        },
      });
      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(el);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLevels(
          hls.levels.map((l) => ({ label: l.height ? `${l.height}p` : `${Math.round((l.bitrate || 0) / 1000)}k` }))
        );
        tryPlay();
      });
      hls.on(Hls.Events.LEVEL_SWITCHED, (_e, d) => setCurrentLevel(hls.autoLevelEnabled ? -1 : d.level));
    } else {
      el.src = streamUrl;
      el.load();
      tryPlay(); // kick loading immediately (non-faststart MP4s otherwise stall)
    }

    // landscape lock + Chromecast framework (web/Android Chrome)
    if (alwaysLandscape) ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => undefined);
    loadCastFramework();

    return () => {
      persist(el.currentTime, el.duration);
      hlsRef.current?.destroy();
      hlsRef.current = null;
      el.removeAttribute('src');
      el.load();
      if (hideTimer.current) clearTimeout(hideTimer.current);
      ScreenOrientation.unlock().catch(() => undefined);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [presented, stream]);

  /* ---- choose default subtitle track when the stream changes ---- */
  useEffect(() => {
    const tracks = stream?.subtitles ?? [];
    if (!tracks.length) {
      setSelectedSub(-1);
      return;
    }
    const pref = (subtitlePref || '').toLowerCase();
    const idx = tracks.findIndex((t) => `${t.lang} ${t.label ?? ''}`.toLowerCase().includes(pref));
    setSelectedSub(idx >= 0 ? idx : 0);
  }, [stream, subtitlePref]);

  /* ---- load chosen subtitle file ---- */
  useEffect(() => {
    const tracks = stream?.subtitles ?? [];
    const track = selectedSub >= 0 ? tracks[selectedSub] : undefined;
    if (!track) {
      cuesRef.current = [];
      setActiveCue(null);
      return;
    }
    let cancelled = false;
    httpRequest<string>({ url: track.url, cors: 'scrape', responseType: 'text', headers: stream?.headers })
      .then((r) => {
        if (!cancelled) cuesRef.current = parseSubtitles(r.data);
      })
      .catch(() => {
        if (!cancelled) cuesRef.current = [];
      });
    return () => {
      cancelled = true;
    };
  }, [selectedSub, stream]);

  /* ---- translate the active cue when translation is enabled ---- */
  useEffect(() => {
    if (!useTranslate || !activeCue) {
      setTranslatedCue(null);
      return;
    }
    const cached = translationCache.current.get(activeCue);
    if (cached) {
      setTranslatedCue(cached);
      return;
    }
    let cancelled = false;
    setTranslatedCue(null);
    void translateText(activeCue, translateLang, translateInstance || undefined).then((t) => {
      if (cancelled || !t) return;
      translationCache.current.set(activeCue, t);
      setTranslatedCue(t);
    });
    return () => {
      cancelled = true;
    };
  }, [activeCue, useTranslate, translateLang, translateInstance]);

  /* ---- AniSkip intro/outro intervals ---- */
  useEffect(() => {
    skipsRef.current = [];
    skippedRef.current = new Set();
    sentProgressRef.current = false;
    setCurrentSkip(null);
    const malId = request?.meta.malId;
    if (!malId || !request) return;
    let cancelled = false;
    getSkipTimes(malId, request.meta.episodeNumber)
      .then((s) => {
        if (!cancelled) skipsRef.current = s;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [request]);

  /* ---- video element event wiring ---- */
  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    const cue = cuesRef.current.length ? cueAt(cuesRef.current, video.currentTime) : null;
    setActiveCue(cue?.text ?? null);

    // AniSkip: surface a button, and auto-skip once per segment if enabled.
    if (skipsRef.current.length) {
      const skip = activeSkip(skipsRef.current, video.currentTime);
      setCurrentSkip(skip);
      if (skip && !skippedRef.current.has(skip.type)) {
        const auto = skip.type === 'op' ? autoSkipIntro : autoSkipOutro;
        if (auto) {
          video.currentTime = skip.end;
          skippedRef.current.add(skip.type);
          if (skipFeedback) void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
        }
      }
    }

    // AniList progress sync once past ~85% (logged in + known media id).
    if (
      aniListToken &&
      request?.meta.metaId &&
      video.duration &&
      !sentProgressRef.current &&
      video.currentTime / video.duration >= 0.85
    ) {
      sentProgressRef.current = true;
      void aniList.saveProgress(request.meta.metaId, request.meta.episodeNumber);
    }

    const now = Date.now();
    if (now - lastSave.current > SAVE_EVERY_MS) {
      lastSave.current = now;
      persist(video.currentTime, video.duration);
    }
  };

  const doSkip = () => {
    const video = videoRef.current;
    if (!currentSkip || !video) return;
    video.currentTime = currentSkip.end;
    skippedRef.current.add(currentSkip.type);
    setCurrentSkip(null);
  };

  const castCurrent = () => {
    if (!stream || !request) return;
    void castMedia(
      stream.url,
      stream.type === 'hls' ? 'application/x-mpegurl' : 'video/mp4',
      request.meta.animeTitle,
      request.meta.imageUrl
    );
  };

  /** Switch sub/dub/raw: re-resolve the current source with the new track. */
  const changeAudio = (a: AudioChoice) => {
    if (a === audio) return;
    setAudio(a);
    audioRef.current = a;
    void loadCandidate(idxRef.current);
  };
  const onProgress = () => {
    const video = videoRef.current;
    if (video && video.buffered.length) setBuffered(video.buffered.end(video.buffered.length - 1));
  };

  /* ---- control callbacks ---- */
  const unmute = () => {
    const video = videoRef.current;
    if (video && video.muted) {
      video.muted = false;
      setNeedsUnmute(false);
    }
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    unmute();
    if (video.paused) void video.play();
    else video.pause();
    revealControls();
  };
  const seek = (t: number) => {
    if (videoRef.current) videoRef.current.currentTime = t;
    revealControls();
  };
  const skip = (delta: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, video.currentTime + delta), video.duration || 0);
    revealControls();
  };
  const applyRate = (r: number) => {
    if (videoRef.current) videoRef.current.playbackRate = r;
    setRate(r);
    revealControls();
  };
  const selectLevel = (i: number) => {
    if (hlsRef.current) hlsRef.current.currentLevel = i;
    setCurrentLevel(i);
  };
  const togglePip = async () => {
    const video = videoRef.current;
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      /* unsupported */
    }
  };
  const airplay = () => {
    const video = videoRef.current as unknown as { webkitShowPlaybackTargetPicker?: () => void };
    video.webkitShowPlaybackTargetPicker?.();
  };
  const toggleFullscreen = async () => {
    const stage = stageRef.current;
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        if (!isNative()) await ScreenOrientation.unlock().catch(() => undefined);
      } else {
        await stage?.requestFullscreen?.();
        await ScreenOrientation.lock({ orientation: 'landscape' }).catch(() => undefined);
      }
    } catch {
      /* unsupported */
    }
  };

  /* ---- hold-to-speed + tap-to-toggle on the stage ---- */
  const onPointerDown = () => {
    holdTimer.current = setTimeout(() => {
      if (videoRef.current) videoRef.current.playbackRate = holdSpeed;
      setHoldActive(true);
    }, HOLD_DELAY);
  };
  // Cancel a hold WITHOUT treating it as a tap (used for pointerleave/cancel,
  // which must never unmute — unmuting without a gesture makes Chrome pause).
  const cancelHold = () => {
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (holdActive) {
      if (videoRef.current) videoRef.current.playbackRate = rate;
      setHoldActive(false);
    }
  };

  const endPointer = () => {
    const held = holdActive;
    if (holdTimer.current) {
      clearTimeout(holdTimer.current);
      holdTimer.current = null;
    }
    if (held) {
      if (videoRef.current) videoRef.current.playbackRate = rate;
      setHoldActive(false);
      return;
    }
    // A tap is a real user gesture — if paused (e.g. Vivaldi blocked autoplay),
    // start playback; otherwise just toggle the controls.
    const v = videoRef.current;
    unmute();
    if (v && v.paused) {
      void v.play().catch(() => undefined);
      revealControls();
    } else {
      setControlsVisible((vis) => {
        const next = !vis;
        if (next) scheduleHide();
        return next;
      });
    }
  };

  return (
    <IonModal
      isOpen={isOpen}
      onDidPresent={() => setPresented(true)}
      onDidDismiss={() => {
        setPresented(false);
        closePlayer();
      }}
    >
      <IonContent scrollY={false}>
        <div
          ref={stageRef}
          className="enigma-player-stage"
          onPointerDown={onPointerDown}
          onPointerUp={endPointer}
          onPointerLeave={cancelHold}
          onPointerCancel={cancelHold}
        >
          <video
            ref={videoRef}
            playsInline
            onClick={(e) => e.stopPropagation()}
            onPlay={() => setPlaying(true)}
            onPause={() => {
              setPlaying(false);
              setControlsVisible(true); // surface the play button when paused
            }}
            onTimeUpdate={onTimeUpdate}
            onDurationChange={(e) => setDuration(e.currentTarget.duration || 0)}
            onProgress={onProgress}
            onCanPlay={clearLoadTimer}
            onError={() => void loadCandidate(idxRef.current + 1)}
            onEnded={() => persist(duration, duration)}
          />
          <SubtitleRenderer text={translatedCue ?? activeCue} raised={controlsVisible} />
          {resolving && (
            <div className="enigma-stream-error">Finding a source that plays…</div>
          )}
          {exhausted && (
            <div className="enigma-stream-error">
              No source could play this episode.
              <br />
              Try another episode, or a different source via the picker.
            </div>
          )}
          {needsUnmute && (
            <button
              className="enigma-unmute-btn"
              onClick={(e) => {
                e.stopPropagation();
                unmute();
              }}
            >
              🔊 Tap to unmute
            </button>
          )}
          {currentSkip && (
            <button
              className="enigma-skip-btn"
              onClick={(e) => {
                e.stopPropagation();
                doSkip();
              }}
            >
              Skip {currentSkip.type === 'op' ? 'Intro' : 'Outro'}
            </button>
          )}
          <ControlsOverlay
            visible={controlsVisible}
            title={request?.meta.animeTitle ?? ''}
            episodeLabel={request ? `Episode ${request.meta.episodeNumber}` : ''}
            playing={playing}
            currentTime={currentTime}
            duration={duration}
            buffered={buffered}
            rate={rate}
            holdActive={holdActive}
            levels={levels}
            currentLevel={currentLevel}
            subtitleTracks={stream?.subtitles ?? []}
            selectedSub={selectedSub}
            audio={audio}
            onAudio={changeAudio}
            pipSupported={pipSupported}
            airplaySupported={airplaySupported}
            castSupported={isCastAvailable()}
            onCast={castCurrent}
            onClose={closePlayer}
            onTogglePlay={togglePlay}
            onSeek={seek}
            onSkip={skip}
            onRate={applyRate}
            onSelectLevel={selectLevel}
            onSelectSub={setSelectedSub}
            onPip={togglePip}
            onAirplay={airplay}
            onFullscreen={toggleFullscreen}
            onInteract={revealControls}
          />
        </div>
      </IonContent>
    </IonModal>
  );
};

export default PlayerModal;
