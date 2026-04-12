import type { WatchlistItem } from "./types";

export const friendContent: Record<
  string,
  { watched: WatchlistItem[]; watchlist: WatchlistItem[] }
> = {
  friend_1: {
    // Jamie Chen
    watched: [
      { id: "fw_1_1", tmdbId: 872585, mediaType: "movie", addedAt: "", watched: true, watchedAt: "" },
      { id: "fw_1_2", tmdbId: 136315, mediaType: "tv",    addedAt: "", watched: true, watchedAt: "" },
      { id: "fw_1_3", tmdbId: 496243, mediaType: "movie", addedAt: "", watched: true, watchedAt: "" },
      { id: "fw_1_4", tmdbId: 1396,   mediaType: "tv",    addedAt: "", watched: true, watchedAt: "" },
    ],
    watchlist: [
      { id: "fw_1_5", tmdbId: 693134, mediaType: "movie", addedAt: "", watched: false },
      { id: "fw_1_6", tmdbId: 95396,  mediaType: "tv",    addedAt: "", watched: false },
    ],
  },
  friend_2: {
    // Sam Torres
    watched: [
      { id: "fw_2_1", tmdbId: 27205,  mediaType: "movie", addedAt: "", watched: true, watchedAt: "" },
      { id: "fw_2_2", tmdbId: 238,    mediaType: "movie", addedAt: "", watched: true, watchedAt: "" },
      { id: "fw_2_3", tmdbId: 329865, mediaType: "movie", addedAt: "", watched: true, watchedAt: "" },
      { id: "fw_2_4", tmdbId: 313369, mediaType: "movie", addedAt: "", watched: true, watchedAt: "" },
      { id: "fw_2_5", tmdbId: 60059,  mediaType: "tv",    addedAt: "", watched: true, watchedAt: "" },
    ],
    watchlist: [
      { id: "fw_2_6", tmdbId: 792307, mediaType: "movie", addedAt: "", watched: false },
      { id: "fw_2_7", tmdbId: 97546,  mediaType: "tv",    addedAt: "", watched: false },
    ],
  },
  friend_3: {
    // Maya Patel
    watched: [
      { id: "fw_3_1", tmdbId: 926393, mediaType: "movie", addedAt: "", watched: true, watchedAt: "" },
      { id: "fw_3_2", tmdbId: 67236,  mediaType: "tv",    addedAt: "", watched: true, watchedAt: "" },
      { id: "fw_3_3", tmdbId: 932085, mediaType: "movie", addedAt: "", watched: true, watchedAt: "" },
      { id: "fw_3_4", tmdbId: 95956,  mediaType: "tv",    addedAt: "", watched: true, watchedAt: "" },
    ],
    watchlist: [
      { id: "fw_3_5", tmdbId: 718821, mediaType: "movie", addedAt: "", watched: false },
      { id: "fw_3_6", tmdbId: 83867,  mediaType: "tv",    addedAt: "", watched: false },
    ],
  },
};
