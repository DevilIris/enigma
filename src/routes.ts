/** Central route paths + builders (no magic strings in components). */
export const routes = {
  tabs: '/tabs',
  home: '/tabs/home',
  library: '/tabs/library',
  downloads: '/tabs/downloads',
  activeDownloads: '/tabs/downloads/active',
  search: '/tabs/search',
  searchResults: '/tabs/search/results',
  settings: '/tabs/search/settings',
  settingsSection: (section: string) => `/tabs/search/settings/${section}`,

  /** Scraper-source anime details within a tab stack. */
  anime: (base: string, source: string, id: string) =>
    `${base}/anime/${encodeURIComponent(source)}/${encodeURIComponent(id)}`,

  /** Metadata-only anime details (AniList/Kitsu/Jikan id). */
  animeMeta: (base: string, metaId: number | string) =>
    `${base}/anime/meta/${metaId}`,
};

/** Marker source value used for metadata-origin (non-scraper) detail pages. */
export const META_SOURCE = 'meta';
