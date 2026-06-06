import { MediaSource, AnimeListingService } from './sources';

export type ThemePreference = 'system' | 'light' | 'dark';
export type AudioPreference = 'Sub' | 'Dub' | 'Raw' | 'Always Ask';
export type MediaPlayer =
  | 'Default'
  | 'VLC'
  | 'Infuse'
  | 'OutPlayer'
  | 'nPlayer'
  | 'Custom'
  | 'WebPlayer';
export type CastStreamingMethod = 'Buffered' | 'Live';

/**
 * Every persisted preference, mirroring the UserDefaults keys used by Ryu.
 * Stored as one JSON blob under PreferenceKey.Settings.
 */
export interface Settings {
  // Sources / listing
  selectedMediaSource: MediaSource;
  selectedAnimeListingService: AnimeListingService;
  /** AniList API client id (register your own app with redirect enigma://anilist). */
  anilistClientId: string;

  // General / playback behavior
  autoPlay: boolean;
  holdSpeedPlayer: number; // 0.5 .. 2.0
  mediaPlayerSelection: MediaPlayer;
  alwaysLandscape: boolean;
  browserPlayer: boolean;
  mergeActivity: boolean;
  episodeSortingReverse: boolean;
  episodeNotifications: boolean;

  // Sources tuning
  retryMethod: string;
  playbackQuality: string; // "Auto" | "1080p" | "720p" | "480p" | "360p"
  gogoFetcher: string;
  audioPreference: AudioPreference;
  serverPreference: string;
  subtitleLanguage: string;
  otherFormats: boolean;

  // Networking proxy (web scraping / streaming)
  proxyIP: string;
  proxyPort: string;
  /** Master switch: use a CORS/scrape proxy on web (built-in default if no URL set). */
  proxyEnabled: boolean;
  /** Application-level CORS/scrape proxy base URL used on web (empty = built-in default). */
  proxyBaseUrl: string;
  proxyMode: 'off' | 'prefix' | 'param';

  // AniSkip
  autoSkipIntro: boolean;
  autoSkipOutro: boolean;
  skipFeedback: boolean;
  aniSkipInstanceURL: string;

  // Translation
  useGoogleTranslate: boolean;
  translationLanguage: string;
  customTranslatorURL: string;

  // Cast
  fullTitleCast: boolean;
  animeImageCast: boolean;
  castStreamingMethod: CastStreamingMethod;

  // Appearance
  theme: ThemePreference;
  syncTheme: boolean;

  // App lifecycle
  showOnboarding: boolean;
  /** Settings schema version, for one-time migrations. */
  schemaVersion: number;
}

export const SETTINGS_SCHEMA_VERSION = 2;

export const DEFAULT_SETTINGS: Settings = {
  // AnimeNana is the default for English speakers.
  selectedMediaSource: MediaSource.AnimeNana,
  selectedAnimeListingService: AnimeListingService.AniList,
  anilistClientId: '',

  autoPlay: true,
  holdSpeedPlayer: 2.0,
  mediaPlayerSelection: 'Default',
  alwaysLandscape: false,
  browserPlayer: false,
  mergeActivity: false,
  episodeSortingReverse: false,
  episodeNotifications: false,

  retryMethod: 'Standard',
  playbackQuality: 'Auto',
  gogoFetcher: 'Default',
  audioPreference: 'Sub',
  serverPreference: 'Default',
  subtitleLanguage: 'English',
  otherFormats: false,

  proxyIP: '',
  proxyPort: '',
  proxyEnabled: true,
  proxyBaseUrl: '',
  proxyMode: 'param',

  autoSkipIntro: false,
  autoSkipOutro: false,
  skipFeedback: true,
  aniSkipInstanceURL: 'https://api.aniskip.com',

  useGoogleTranslate: false,
  translationLanguage: 'en',
  customTranslatorURL: '',

  fullTitleCast: true,
  animeImageCast: true,
  castStreamingMethod: 'Buffered',

  theme: 'system',
  syncTheme: true,

  showOnboarding: true,
  schemaVersion: SETTINGS_SCHEMA_VERSION,
};
