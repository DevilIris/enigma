import React from 'react';
import { IonIcon, useIonActionSheet } from '@ionic/react';
import {
  play,
  pause,
  playBack,
  playForward,
  close,
  expand,
  speedometerOutline,
  settingsOutline,
  chatboxEllipsesOutline,
  tvOutline,
  volumeHighOutline,
} from 'ionicons/icons';
import { formatTime } from '../../utils/format';

export interface ControlsOverlayProps {
  visible: boolean;
  title: string;
  episodeLabel: string;
  playing: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  rate: number;
  holdActive: boolean;
  levels: { label: string }[];
  currentLevel: number; // -1 = auto
  subtitleTracks: { label?: string; lang?: string }[];
  selectedSub: number; // -1 = off
  audio: string; // 'sub' | 'dub' | 'raw'
  onAudio: (a: 'sub' | 'dub' | 'raw') => void;
  pipSupported: boolean;
  airplaySupported: boolean;
  castSupported: boolean;
  onCast: () => void;
  onClose: () => void;
  onTogglePlay: () => void;
  onSeek: (t: number) => void;
  onSkip: (delta: number) => void;
  onRate: (r: number) => void;
  onSelectLevel: (i: number) => void;
  onSelectSub: (i: number) => void;
  onPip: () => void;
  onAirplay: () => void;
  onFullscreen: () => void;
  onInteract: () => void;
}

const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

const ControlsOverlay: React.FC<ControlsOverlayProps> = (p) => {
  const [present] = useIonActionSheet();

  const speedSheet = () =>
    present({
      header: 'Playback speed',
      buttons: [
        ...SPEEDS.map((s) => ({ text: `${s}x`, handler: () => p.onRate(s) })),
        { text: 'Cancel', role: 'cancel' as const },
      ],
    });

  const qualitySheet = () =>
    present({
      header: 'Quality',
      buttons: [
        { text: 'Auto', handler: () => p.onSelectLevel(-1) },
        ...p.levels.map((l, i) => ({ text: l.label, handler: () => p.onSelectLevel(i) })),
        { text: 'Cancel', role: 'cancel' as const },
      ],
    });

  const audioSheet = () =>
    present({
      header: 'Audio',
      buttons: [
        { text: 'Sub', handler: () => p.onAudio('sub') },
        { text: 'Dub', handler: () => p.onAudio('dub') },
        { text: 'Raw', handler: () => p.onAudio('raw') },
        { text: 'Cancel', role: 'cancel' as const },
      ],
    });

  const subSheet = () =>
    present({
      header: 'Subtitles',
      buttons: [
        { text: 'Off', handler: () => p.onSelectSub(-1) },
        ...p.subtitleTracks.map((t, i) => ({
          text: t.label ?? t.lang ?? `Track ${i + 1}`,
          handler: () => p.onSelectSub(i),
        })),
        { text: 'Cancel', role: 'cancel' as const },
      ],
    });

  return (
    <div
      className={`enigma-controls ${p.visible ? 'visible' : ''}`}
      onClick={(e) => {
        e.stopPropagation();
        p.onInteract();
      }}
    >
      {/* Top bar */}
      <div className="enigma-controls-top">
        <button className="enigma-ctl-btn" onClick={p.onClose} aria-label="Close">
          <IonIcon icon={close} />
        </button>
        <div className="enigma-controls-title">
          <strong>{p.title}</strong>
          <span>{p.episodeLabel}</span>
        </div>
        <div className="enigma-controls-top-actions">
          {p.castSupported && (
            <button className="enigma-ctl-btn" onClick={p.onCast} aria-label="Cast">
              <IonIcon icon={tvOutline} />
            </button>
          )}
          {p.airplaySupported && (
            <button className="enigma-ctl-btn" onClick={p.onAirplay} aria-label="AirPlay">
              <IonIcon icon={tvOutline} />
            </button>
          )}
          {p.pipSupported && (
            <button className="enigma-ctl-btn" onClick={p.onPip} aria-label="Picture in picture">
              <IonIcon icon={expand} />
            </button>
          )}
        </div>
      </div>

      {/* Center transport */}
      <div className="enigma-controls-center">
        <button className="enigma-ctl-btn lg" onClick={() => p.onSkip(-10)} aria-label="Back 10s">
          <IonIcon icon={playBack} />
        </button>
        <button className="enigma-ctl-btn xl" onClick={p.onTogglePlay} aria-label="Play/Pause">
          <IonIcon icon={p.playing ? pause : play} />
        </button>
        <button className="enigma-ctl-btn lg" onClick={() => p.onSkip(10)} aria-label="Forward 10s">
          <IonIcon icon={playForward} />
        </button>
      </div>

      {p.holdActive && <div className="enigma-speed-pill">{p.rate.toFixed(2)}x ▶▶</div>}

      {/* Bottom bar */}
      <div className="enigma-controls-bottom">
        <div className="enigma-seek">
          <span className="enigma-time">{formatTime(p.currentTime)}</span>
          <div className="enigma-seek-track">
            <div
              className="enigma-seek-buffered"
              style={{ width: p.duration ? `${(p.buffered / p.duration) * 100}%` : '0%' }}
            />
            <input
              type="range"
              min={0}
              max={p.duration || 0}
              step={0.1}
              value={p.currentTime}
              onChange={(e) => p.onSeek(parseFloat(e.target.value))}
            />
          </div>
          <span className="enigma-time">
            -{formatTime(Math.max(0, p.duration - p.currentTime))}
          </span>
        </div>
        <div className="enigma-controls-actions">
          <button className="enigma-ctl-btn" onClick={audioSheet} aria-label="Audio">
            <IonIcon icon={volumeHighOutline} />
            <small>{p.audio.toUpperCase()}</small>
          </button>
          <button className="enigma-ctl-btn" onClick={speedSheet} aria-label="Speed">
            <IonIcon icon={speedometerOutline} />
            <small>{p.rate}x</small>
          </button>
          {p.levels.length > 0 && (
            <button className="enigma-ctl-btn" onClick={qualitySheet} aria-label="Quality">
              <IonIcon icon={settingsOutline} />
              <small>{p.currentLevel === -1 ? 'Auto' : p.levels[p.currentLevel]?.label}</small>
            </button>
          )}
          {p.subtitleTracks.length > 0 && (
            <button className="enigma-ctl-btn" onClick={subSheet} aria-label="Subtitles">
              <IonIcon icon={chatboxEllipsesOutline} />
              <small>{p.selectedSub === -1 ? 'Off' : 'CC'}</small>
            </button>
          )}
          <button className="enigma-ctl-btn" onClick={p.onFullscreen} aria-label="Fullscreen">
            <IonIcon icon={expand} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ControlsOverlay;
