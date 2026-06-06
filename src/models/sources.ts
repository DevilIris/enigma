/**
 * Streaming sources and metadata-listing services.
 *
 * Mirrors Ryu's `MediaSource` enum (Ryu/Sources/Sources.swift) — the central
 * dispatch key every scraper switches on. In Enigma the concrete scraper
 * implementations live in `services/sources/` and register themselves against
 * a registry keyed by these ids; this enum is the stable contract the UI uses.
 */
export enum MediaSource {
  AnimeWorld = 'AnimeWorld',
  GoGoAnime = 'GoGoAnime',
  AnimeHeaven = 'AnimeHeaven',
  AnimeFire = 'AnimeFire',
  Kuramanime = 'Kuramanime',
  Anime3rb = 'Anime3rb',
  HiAnime = 'HiAnime',
  Anilibria = 'Anilibria',
  AnimeSRBIJA = 'AnimeSRBIJA',
  AniWorld = 'AniWorld',
  TokyoInsider = 'TokyoInsider',
  AniVibe = 'AniVibe',
  AnimeUnity = 'AnimeUnity',
  AnimeFLV = 'AnimeFLV',
  AnimeBalkan = 'AnimeBalkan',
  AniBunker = 'AniBunker',
  // Added beyond Ryu's original set:
  AnimeSama = 'AnimeSama', // French
  AnimeNana = 'AnimeNana', // English
}

/** Human-readable label, region flag, and content language for each source. */
export const SOURCE_META: Record<
  MediaSource,
  { label: string; flag: string; lang: string }
> = {
  [MediaSource.AnimeWorld]: { label: 'AnimeWorld', flag: '🇮🇹', lang: 'Italian' },
  [MediaSource.GoGoAnime]: { label: 'GoGoAnime', flag: '🇺🇸', lang: 'English' },
  [MediaSource.AnimeHeaven]: { label: 'AnimeHeaven', flag: '🇺🇸', lang: 'English' },
  [MediaSource.AnimeFire]: { label: 'AnimeFire', flag: '🇧🇷', lang: 'Portuguese' },
  [MediaSource.Kuramanime]: { label: 'Kuramanime', flag: '🇮🇩', lang: 'Indonesian' },
  [MediaSource.Anime3rb]: { label: 'Anime3rb', flag: '🇸🇦', lang: 'Arabic' },
  [MediaSource.HiAnime]: { label: 'HiAnime', flag: '🇺🇸', lang: 'English' },
  [MediaSource.Anilibria]: { label: 'Anilibria', flag: '🇷🇺', lang: 'Russian' },
  [MediaSource.AnimeSRBIJA]: { label: 'AnimeSRBIJA', flag: '🇷🇸', lang: 'Serbian' },
  [MediaSource.AniWorld]: { label: 'AniWorld', flag: '🇩🇪', lang: 'German' },
  [MediaSource.TokyoInsider]: { label: 'TokyoInsider', flag: '🇺🇸', lang: 'English' },
  [MediaSource.AniVibe]: { label: 'AniVibe', flag: '🇺🇸', lang: 'English' },
  [MediaSource.AnimeUnity]: { label: 'AnimeUnity', flag: '🇮🇹', lang: 'Italian' },
  [MediaSource.AnimeFLV]: { label: 'AnimeFLV', flag: '🇪🇸', lang: 'Spanish' },
  [MediaSource.AnimeBalkan]: { label: 'AnimeBalkan', flag: '🇷🇸', lang: 'Balkan' },
  [MediaSource.AniBunker]: { label: 'AniBunker', flag: '🇵🇹', lang: 'Portuguese' },
  [MediaSource.AnimeSama]: { label: 'Anime-Sama', flag: '🇫🇷', lang: 'French' },
  [MediaSource.AnimeNana]: { label: 'AnimeNana', flag: '🇺🇸', lang: 'English' },
};

export const ALL_SOURCES: MediaSource[] = Object.values(MediaSource);

/** Metadata providers used for Home rows + Anime Details enrichment. */
export enum AnimeListingService {
  AniList = 'AniList',
  MAL = 'MAL',
  Kitsu = 'Kitsu',
}
