export interface HttpRequest {
  url: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  params?: Record<string, string | number | undefined>;
  /** Request body. Objects are JSON-serialized. */
  data?: unknown;
  responseType?: 'text' | 'json';
  /**
   * CORS classification:
   *  - 'safe'  : metadata APIs that allow browser CORS (AniList/Kitsu/Jikan/AniSkip)
   *  - 'scrape': source sites / embed hosts — need native HTTP or a web proxy
   */
  cors?: 'safe' | 'scrape';
}

export interface HttpResponse<T = string> {
  status: number;
  headers: Record<string, string>;
  data: T;
  /** Final URL after redirects (best-effort). */
  url: string;
}
