import type { Recommendation, WatchlistItem, User } from "./types";

export const mockUser: User = {
  id: "user_1",
  name: "Alex Rivera",
  username: "alexrivera",
  bio: "Film nerd. Always watching something good.",
  followersCount: 142,
  followingCount: 89,
  watchedCount: 317,
};

export const mockFriends: User[] = [
  {
    id: "friend_1",
    name: "Jamie Chen",
    username: "jamiechen",
    followersCount: 88,
    followingCount: 54,
    watchedCount: 201,
  },
  {
    id: "friend_2",
    name: "Sam Torres",
    username: "samtorres",
    followersCount: 210,
    followingCount: 130,
    watchedCount: 445,
  },
  {
    id: "friend_3",
    name: "Maya Patel",
    username: "mayapatel",
    followersCount: 67,
    followingCount: 40,
    watchedCount: 158,
  },
];

// TMDB IDs for real titles
export const mockRecommendations: Recommendation[] = [
  {
    id: "rec_1",
    tmdbId: 533535,
    mediaType: "movie",
    title: "Deadpool & Wolverine",
    sender: { id: "friend_1", username: "jamie", display_name: "Jamie Chen", avatar_url: null },
    note: "This is a must-watch! The visuals are insane.",
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    watched: false,
  },
  {
    id: "rec_2",
    tmdbId: 1396,
    mediaType: "tv",
    title: "Breaking Bad",
    sender: { id: "friend_2", username: "sam", display_name: "Sam Torres", avatar_url: null },
    note: "You NEED to watch this if you haven't already.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    watched: false,
  },
  {
    id: "rec_3",
    tmdbId: 278,
    mediaType: "movie",
    title: "The Shawshank Redemption",
    sender: { id: "friend_3", username: "maya", display_name: "Maya Patel", avatar_url: null },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    watched: false,
  },
  {
    id: "rec_4",
    tmdbId: 94997,
    mediaType: "tv",
    title: "House of the Dragon",
    sender: { id: "friend_1", username: "jamie", display_name: "Jamie Chen", avatar_url: null },
    note: "Just finished S2. Cannot stop thinking about it.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 36).toISOString(),
    watched: true,
    watchedAt: new Date(Date.now() - 1000 * 60 * 60 * 10).toISOString(),
  },
  {
    id: "rec_5",
    tmdbId: 823464,
    mediaType: "movie",
    title: "Godzilla x Kong",
    sender: { id: "friend_2", username: "sam", display_name: "Sam Torres", avatar_url: null },
    note: "Perfect blockbuster. Leave your brain at the door.",
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    watched: true,
    watchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export const mockWatchlist: WatchlistItem[] = [
  {
    id: "wl_1",
    tmdbId: 693134,
    mediaType: "movie",
    addedAt: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    watched: false,
  },
  {
    id: "wl_2",
    tmdbId: 76479,
    mediaType: "tv",
    addedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 2).toISOString(),
    watched: false,
  },
  {
    id: "wl_3",
    tmdbId: 550,
    mediaType: "movie",
    addedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
    watched: true,
    watchedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 1).toISOString(),
  },
  {
    id: "wl_4",
    tmdbId: 100088,
    mediaType: "tv",
    addedAt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
    watched: false,
  },
];

export function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return "yesterday";
  return `${days}d ago`;
}
