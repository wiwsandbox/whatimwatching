"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";
import { getClient } from "./supabase/client";
import type { Recommendation, WatchlistItem, WatchlistStatus, MediaType } from "./types";

interface ToastState { message: string; id: number }

interface AppState {
  recommendations: Recommendation[];
  watchlist: WatchlistItem[];
  toast: ToastState | null;
  markWatched: (recId: string) => void;
  markUnwatched: (recId: string) => void;
  addToWatchlist: (item: Omit<WatchlistItem, "id" | "addedAt" | "watched">) => void;
  removeFromWatchlist: (tmdbId: number, mediaType: MediaType) => void;
  isInWatchlist: (tmdbId: number, mediaType?: MediaType) => boolean;
  getWatchlistItem: (tmdbId: number, mediaType: MediaType) => WatchlistItem | undefined;
  setWatchlistStatus: (id: string, status: WatchlistStatus) => void;
  setRating: (tmdbId: number, mediaType: MediaType, rating: number | null) => Promise<void>;
  /** @deprecated use setWatchlistStatus */
  markWatchlistWatched: (id: string) => void;
  showToast: (message: string) => void;
  sendRecommendation: (
    tmdbId: number,
    mediaType: MediaType,
    title: string,
    posterPath: string | null,
    friendIds: string[],
    friendNames: string[],
    note: string
  ) => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  refreshWatchlist: () => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const supabase = getClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserId(session?.user?.id ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUserId(session?.user?.id ?? null);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  const refreshRecommendations = useCallback(async () => {
    if (!userId) { setRecommendations([]); return; }
    const { data } = await supabase
      .from("recommendations")
      .select(`
        id, tmdb_id, media_type, title, poster_path, note, read_at, created_at,
        sender:sender_id(id, username, display_name, avatar_url)
      `)
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setRecommendations(
        data.map((r) => ({
          id: r.id,
          tmdbId: r.tmdb_id,
          mediaType: r.media_type as MediaType,
          title: r.title,
          posterPath: r.poster_path,
          note: r.note,
          watched: !!r.read_at,
          watchedAt: r.read_at ?? undefined,
          createdAt: r.created_at,
          sender: Array.isArray(r.sender) ? r.sender[0] : r.sender,
        }))
      );
    }
  }, [userId, supabase]);

  const refreshWatchlist = useCallback(async () => {
    if (!userId) { setWatchlist([]); return; }
    const { data } = await supabase
      .from("watchlist")
      .select("id, tmdb_id, media_type, title, poster_path, status, rating, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setWatchlist(
        data.map((w) => ({
          id: w.id,
          tmdbId: w.tmdb_id,
          mediaType: w.media_type as MediaType,
          titleStr: w.title,
          posterPath: w.poster_path,
          status: w.status as WatchlistStatus,
          watched: w.status === "watched",
          rating: w.rating ?? null,
          addedAt: w.created_at,
        }))
      );
    }
  }, [userId, supabase]);

  useEffect(() => {
    refreshRecommendations();
    refreshWatchlist();
  }, [refreshRecommendations, refreshWatchlist]);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 2800);
  }, []);

  const sendRecommendation = useCallback(
    async (
      tmdbId: number,
      mediaType: MediaType,
      title: string,
      posterPath: string | null,
      friendIds: string[],
      friendNames: string[],
      note: string
    ) => {
      if (!userId) return;

      const rows = friendIds.map((friendId) => ({
        sender_id: userId,
        receiver_id: friendId,
        tmdb_id: tmdbId,
        media_type: mediaType,
        title,
        poster_path: posterPath,
        note: note.trim() || null,
      }));

      await supabase.from("recommendations").insert(rows);

      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      friendIds.forEach((receiverId) => {
        fetch(`${supabaseUrl}/functions/v1/send-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
          },
          body: JSON.stringify({
            user_id: receiverId,
            title: "New recommendation",
            body: `Someone recommended "${title}" to you`,
            url: "/",
          }),
        }).catch(() => {});
      });

      showToast(`Recommended to ${friendNames.join(", ")}`);
    },
    [userId, supabase, showToast]
  );

  const markWatched = useCallback(
    async (recId: string) => {
      const now = new Date().toISOString();
      await supabase.from("recommendations").update({ read_at: now }).eq("id", recId);
      setRecommendations((prev) =>
        prev.map((r) => r.id === recId ? { ...r, watched: true, watchedAt: now } : r)
      );
    },
    [supabase]
  );

  const markUnwatched = useCallback(
    async (recId: string) => {
      await supabase.from("recommendations").update({ read_at: null }).eq("id", recId);
      setRecommendations((prev) =>
        prev.map((r) => r.id === recId ? { ...r, watched: false, watchedAt: undefined } : r)
      );
    },
    [supabase]
  );

  const addToWatchlist = useCallback(
    async (item: Omit<WatchlistItem, "id" | "addedAt" | "watched">) => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("watchlist")
        .upsert(
          {
            user_id: userId,
            tmdb_id: item.tmdbId,
            media_type: item.mediaType,
            title: item.titleStr ?? "",
            poster_path: item.posterPath ?? null,
            status: item.status ?? "to_watch",
            rating: item.rating ?? null,
          },
          { onConflict: "user_id,tmdb_id,media_type" }
        )
        .select()
        .single();

      if (error) {
        console.error("addToWatchlist error:", error);
        showToast(`Could not save: ${error.message}`);
        return;
      }

      if (data) {
        const newItem: WatchlistItem = {
          id: data.id,
          tmdbId: data.tmdb_id,
          mediaType: data.media_type as MediaType,
          titleStr: data.title,
          posterPath: data.poster_path,
          status: data.status as WatchlistStatus,
          watched: data.status === "watched",
          rating: data.rating ?? null,
          addedAt: data.created_at,
        };
        setWatchlist((prev) => {
          const exists = prev.some(
            (w) => w.tmdbId === newItem.tmdbId && w.mediaType === newItem.mediaType
          );
          if (exists) return prev.map((w) =>
            w.tmdbId === newItem.tmdbId && w.mediaType === newItem.mediaType ? newItem : w
          );
          return [newItem, ...prev];
        });
        showToast("Added to watchlist");
      }
    },
    [userId, supabase, showToast]
  );

  const removeFromWatchlist = useCallback(
    async (tmdbId: number, mediaType: MediaType) => {
      if (!userId) return;
      const { error } = await supabase
        .from("watchlist")
        .delete()
        .eq("user_id", userId)
        .eq("tmdb_id", tmdbId)
        .eq("media_type", mediaType);
      if (error) {
        console.error("removeFromWatchlist error:", error);
        return;
      }
      setWatchlist((prev) =>
        prev.filter((w) => !(w.tmdbId === tmdbId && w.mediaType === mediaType))
      );
    },
    [userId, supabase]
  );

  const isInWatchlist = useCallback(
    (tmdbId: number, mediaType?: MediaType) =>
      watchlist.some(
        (w) => w.tmdbId === tmdbId && (mediaType ? w.mediaType === mediaType : true)
      ),
    [watchlist]
  );

  const getWatchlistItem = useCallback(
    (tmdbId: number, mediaType: MediaType) =>
      watchlist.find((w) => w.tmdbId === tmdbId && w.mediaType === mediaType),
    [watchlist]
  );

  const setWatchlistStatus = useCallback(
    async (id: string, status: WatchlistStatus) => {
      const { error } = await supabase.from("watchlist").update({ status }).eq("id", id);
      if (error) {
        console.error("setWatchlistStatus error:", error);
        showToast(`Could not update status: ${error.message}`);
        return;
      }
      setWatchlist((prev) =>
        prev.map((w) =>
          w.id === id ? { ...w, status, watched: status === "watched" } : w
        )
      );
    },
    [supabase, showToast]
  );

  const setRating = useCallback(
    async (tmdbId: number, mediaType: MediaType, rating: number | null) => {
      if (!userId) return;
      const existing = watchlist.find(
        (w) => w.tmdbId === tmdbId && w.mediaType === mediaType
      );

      if (existing) {
        const { error } = await supabase
          .from("watchlist")
          .update({ rating })
          .eq("id", existing.id);
        if (error) {
          console.error("setRating error:", error);
          showToast(`Could not save rating: ${error.message}`);
          return;
        }
        setWatchlist((prev) =>
          prev.map((w) => w.id === existing.id ? { ...w, rating } : w)
        );
        showToast(rating ? `Rated ${rating}/10` : "Rating removed");
      } else {
        // Not in watchlist — add with status "watched"
        const { data, error } = await supabase
          .from("watchlist")
          .upsert(
            {
              user_id: userId,
              tmdb_id: tmdbId,
              media_type: mediaType,
              title: "",
              status: "watched",
              rating,
            },
            { onConflict: "user_id,tmdb_id,media_type" }
          )
          .select()
          .single();

        if (error) {
          console.error("setRating (insert) error:", error);
          showToast(`Could not save rating: ${error.message}`);
          return;
        }

        if (data) {
          setWatchlist((prev) => [
            {
              id: data.id,
              tmdbId: data.tmdb_id,
              mediaType: data.media_type as MediaType,
              titleStr: data.title,
              posterPath: data.poster_path,
              status: "watched",
              watched: true,
              rating: data.rating ?? null,
              addedAt: data.created_at,
            },
            ...prev,
          ]);
          showToast(rating ? `Rated ${rating}/10` : "Rating removed");
        }
      }
    },
    [userId, supabase, watchlist]
  );

  const markWatchlistWatched = useCallback(
    async (id: string) => setWatchlistStatus(id, "watched"),
    [setWatchlistStatus]
  );

  return (
    <AppContext.Provider
      value={{
        recommendations,
        watchlist,
        toast,
        markWatched,
        markUnwatched,
        addToWatchlist,
        removeFromWatchlist,
        isInWatchlist,
        getWatchlistItem,
        setWatchlistStatus,
        setRating,
        markWatchlistWatched,
        showToast,
        sendRecommendation,
        refreshRecommendations,
        refreshWatchlist,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
