export type MediaType = "movie" | "tv";
export type WatchlistStatus = "to_watch" | "watching" | "watched";

export interface TMDBTitle {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  backdrop_path: string | null;
  overview: string;
  vote_average: number;
  vote_count: number;
  release_date?: string;
  first_air_date?: string;
  genre_ids?: number[];
  genres?: { id: number; name: string }[];
  media_type?: MediaType;
  number_of_seasons?: number;
  runtime?: number;
  status?: string;
  tagline?: string;
}

export interface TMDBSearchResult {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  media_type: MediaType;
  release_date?: string;
  first_air_date?: string;
  vote_average: number;
  overview: string;
}

export interface Recommendation {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  title: string;
  posterPath?: string | null;
  note?: string | null;
  watched: boolean;
  watchedAt?: string;
  createdAt: string;
  senderRating?: number | null;
  is_must_watch?: boolean;
  sender?: {
    id: string;
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
  // Populated client-side from TMDB
  tmdbTitle?: TMDBTitle;
}

export interface WatchlistItem {
  id: string;
  tmdbId: number;
  mediaType: MediaType;
  titleStr?: string;
  posterPath?: string | null;
  addedAt: string;
  status: WatchlistStatus;
  /** Convenience alias: status === "watched" */
  watched: boolean;
  watchedAt?: string;
  rating?: number | null;
  source?: string | null;
  title?: TMDBTitle;
}

export interface StreamingProvider {
  logo_path: string;
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

export interface FriendRequest {
  id: string;
  sender: {
    id: string;
    username: string | null;
    display_name: string | null;
    avatar_url: string | null;
  };
  createdAt: string;
}

export interface DigestEvent {
  id: string;
  created_at: string;
  // Older digest_sent rows carry extra legacy fields; only these are read.
  metadata: {
    window_start: string;
    window_end: string;
    own_count?: number;
    friend_count?: number;
    unrated_count?: number;
  };
}

export interface User {
  id: string;
  name: string;
  username: string;
  avatar?: string;
  bio?: string;
  followersCount: number;
  followingCount: number;
  watchedCount: number;
}
