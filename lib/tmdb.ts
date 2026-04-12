const API_KEY = "78c87308e5caf2d13af3381e0e94958c";
const BASE_URL = "https://api.themoviedb.org/3";
const IMAGE_BASE = "https://image.tmdb.org/t/p";

export const tmdbImage = (
  path: string | null,
  size: "w92" | "w154" | "w185" | "w342" | "w500" | "w780" | "original" = "w342"
): string => {
  if (!path) return "/placeholder-poster.svg";
  return `${IMAGE_BASE}/${size}${path}`;
};

async function tmdbFetch<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(`${BASE_URL}${endpoint}`);
  url.searchParams.set("api_key", API_KEY);
  url.searchParams.set("language", "en-US");
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  const res = await fetch(url.toString(), { next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`TMDB error: ${res.status}`);
  return res.json();
}

export async function searchMulti(query: string, page = 1) {
  return tmdbFetch<{ results: import("./types").TMDBSearchResult[]; total_results: number; total_pages: number }>(
    "/search/multi",
    { query, page: String(page), include_adult: "false" }
  );
}

export async function getMovie(id: number) {
  return tmdbFetch<import("./types").TMDBTitle>(`/movie/${id}`);
}

export async function getTVShow(id: number) {
  return tmdbFetch<import("./types").TMDBTitle>(`/tv/${id}`);
}

export async function getTrending(mediaType: "movie" | "tv" | "all" = "all", timeWindow: "day" | "week" = "week") {
  return tmdbFetch<{ results: import("./types").TMDBSearchResult[] }>(
    `/trending/${mediaType}/${timeWindow}`
  );
}

export async function getPopularMovies() {
  return tmdbFetch<{ results: import("./types").TMDBTitle[] }>("/movie/popular");
}

export async function getPopularTV() {
  return tmdbFetch<{ results: import("./types").TMDBTitle[] }>("/tv/popular");
}

export async function getWatchProviders(
  id: number,
  mediaType: "movie" | "tv"
): Promise<import("./types").StreamingProvider[]> {
  try {
    const data = await tmdbFetch<{
      results: Record<string, { flatrate?: import("./types").StreamingProvider[] }>;
    }>(`/${mediaType}/${id}/watch/providers`);
    return data.results?.US?.flatrate || [];
  } catch {
    return [];
  }
}

export function getDisplayTitle(item: { title?: string; name?: string }): string {
  return item.title || item.name || "Unknown Title";
}

export function getYear(item: { release_date?: string; first_air_date?: string }): string {
  const date = item.release_date || item.first_air_date;
  if (!date) return "";
  return date.slice(0, 4);
}
