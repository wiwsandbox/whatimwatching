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

export interface DigestActivityItem {
  id?: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  rating?: number;
  recipient_rating?: number | null;
  created_at: string;
  watched_at?: string;
}

export interface DigestFriendActivityItem {
  kind: "friend_rating" | "friend_watchlist_add" | "recommendation_received";
  friend_id: string;
  friend_name: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  rating?: number;
  created_at: string;
}

export interface DigestTrendingItem {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
}

// --- Digest content redesign (v2 blocks) -----------------------------------
// A digest_sent event's metadata is either this v2 shape (post-redesign) or
// the older v1 shape below it (own_activity/friend_activity/trending) for
// historical rows sent before this redesign shipped. The page renders
// whichever shape a given event actually has — see DigestEvent.metadata.

export type DigestBlockId =
  | "payoff"
  | "unrated"
  | "must_watch_received"
  | "episodes_aired"
  | "waiting_on_you"
  | "hottest_take"
  | "taste_twin"
  | "circle_ratings"
  | "trending"
  | "must_watch_balance";

export interface PayoffItem {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  friend_id: string;
  friend_name: string;
  action: "watched" | "rated" | "watching";
  rating?: number | null;
  created_at: string;
}

export interface UnratedItem {
  watchlist_id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  watched_at: string;
}

export interface MustWatchReceivedItem {
  rec_id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  runtime_label: string | null;
  sender_id: string;
  sender_name: string;
  sender_monthly_sent_count: number;
}

export interface EpisodeAiredItem {
  tmdb_id: number;
  media_type: "tv";
  title: string;
  poster_path: string | null;
  episode_label: string;
  air_date: string;
  friend_signal: string | null;
  caught_up: boolean;
}

export interface WaitingOnYouItem {
  rec_id: string;
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  runtime_label: string | null;
  sender_id: string;
  sender_name: string;
  created_at: string;
  age_days: number;
}

export interface HottestTakeItem {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  user_rating: number;
  circle_average: number;
  circle_rating_count: number;
}

export interface TasteTwinItem {
  friend_id: string;
  friend_name: string;
  shared_count: number;
  agree_count: number;
  agree_pct: number;
}

export interface CircleRatingItem {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  friend_id: string;
  friend_name: string;
  rating: number;
}

export interface TrendingAnnotatedItem {
  tmdb_id: number;
  media_type: MediaType;
  title: string;
  poster_path: string | null;
  signal: string;
}

export interface MustWatchBalanceItem {
  remaining: number;
  total: number;
  cadence_days: number;
  days_until_reset: number | null;
}

export interface DigestEvent {
  id: string;
  created_at: string;
  metadata: {
    window_start: string;
    window_end: string;
    // v2 (post-redesign)
    state?: "full" | "thin";
    hero_block_id?: DigestBlockId;
    payoff?: { items: PayoffItem[]; count: number; prior_week_count: number } | null;
    unrated?: UnratedItem[];
    must_watch_received?: MustWatchReceivedItem[];
    episodes_aired?: EpisodeAiredItem[];
    waiting_on_you?: WaitingOnYouItem[];
    hottest_take?: HottestTakeItem | null;
    taste_twin?: TasteTwinItem | null;
    circle_ratings?: CircleRatingItem[];
    trending_annotated?: TrendingAnnotatedItem[];
    must_watch_balance?: MustWatchBalanceItem | null;
    // v1 (pre-redesign, historical rows only)
    own_activity?: {
      rec_watched: DigestActivityItem[];
      rated: DigestActivityItem[];
      watchlist_add: DigestActivityItem[];
      watched: DigestActivityItem[];
    };
    friend_activity?: DigestFriendActivityItem[];
    trending?: DigestTrendingItem[];
    own_activity_present?: boolean;
    friend_activity_present?: boolean;
    trending_only?: boolean;
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
