"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useMemo,
  ReactNode,
} from "react";
import { getClient } from "./supabase/client";
import type { Recommendation, WatchlistItem, WatchlistStatus, MediaType, FriendRequest } from "./types";

interface ToastState { message: string; id: number }

interface Message {
  id: string
  senderId: string
  receiverId: string
  content: string
  tmdbId?: number | null
  mediaType?: string | null
  showTitle?: string | null
  showPosterPath?: string | null
  readAt?: string | null
  createdAt: string
  sender?: {
    id: string
    username: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface AppState {
  recommendations: Recommendation[];
  watchlist: WatchlistItem[];
  friendRequests: FriendRequest[];
  toast: ToastState | null;
  inboxUnreadCount: number;
  markInboxSeen: () => void;
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
  ) => Promise<{ error: string | null }>;
  addRecToWatchlist: (recId: string, tmdbId: number, mediaType: MediaType, title: string, posterPath: string | null) => Promise<void>;
  markWatchedFromRec: (recId: string, tmdbId: number, mediaType: MediaType, title: string, posterPath: string | null) => Promise<void>;
  dismissRecommendation: (recId: string) => Promise<void>;
  messages: Message[];
  unreadMessageCount: number;
  sendMessage: (receiverId: string, content: string, showContext?: { tmdbId: number; mediaType: string; showTitle: string; showPosterPath: string | null }) => Promise<{ error: string | null }>;
  markMessagesRead: () => Promise<void>;
  refreshMessages: () => Promise<void>;
  refreshRecommendations: () => Promise<void>;
  refreshWatchlist: () => Promise<void>;
  refreshFriendRequests: () => Promise<void>;
  acceptFriendRequest: (id: string, senderId: string) => Promise<void>;
  declineFriendRequest: (id: string) => Promise<void>;
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [lastInboxSeenAt, setLastInboxSeenAt] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("wiw_inbox_seen") ?? new Date(0).toISOString();
    }
    return new Date(0).toISOString();
  });
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
    const { data, error } = await supabase
      .from("recommendations")
      .select(`
        id, tmdb_id, media_type, title, poster_path, note, read_at, created_at,
        sender:sender_id(id, username, display_name, avatar_url)
      `)
      .eq("receiver_id", userId)
      .is("dismissed_at", null)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("refreshRecommendations error:", error);
      return;
    }

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

  const refreshFriendRequests = useCallback(async () => {
    if (!userId) { setFriendRequests([]); return; }
    const { data, error } = await supabase
      .from("friendships")
      .select("id, created_at, sender:user_id(id, username, display_name, avatar_url)")
      .eq("friend_id", userId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("refreshFriendRequests error:", error);
      return;
    }

    if (data) {
      setFriendRequests(
        data.map((r) => ({
          id: r.id,
          sender: (Array.isArray(r.sender) ? r.sender[0] : r.sender) as FriendRequest["sender"],
          createdAt: r.created_at,
        }))
      );
    }
  }, [userId, supabase]);

  const markInboxSeen = useCallback(() => {
    const now = new Date().toISOString();
    setLastInboxSeenAt(now);
    if (typeof window !== "undefined") {
      localStorage.setItem("wiw_inbox_seen", now);
    }
  }, []);

  const unreadMessageCount = useMemo(() =>
    messages.filter((m) => !m.readAt).length
  , [messages]);

  const inboxUnreadCount = useMemo(() => {
    const newRecs = recommendations.filter(
      (r) => !r.watched && r.createdAt > lastInboxSeenAt
    ).length;
    const newRequests = friendRequests.filter(
      (r) => r.createdAt > lastInboxSeenAt
    ).length;
    return newRecs + newRequests + unreadMessageCount;
  }, [recommendations, friendRequests, lastInboxSeenAt, unreadMessageCount]);

  const refreshMessages = useCallback(async () => {
    if (!userId) { setMessages([]); return; }
    const { data } = await supabase
      .from("messages")
      .select("id, sender_id, receiver_id, content, tmdb_id, media_type, show_title, show_poster_path, read_at, created_at, sender:sender_id(id, username, display_name, avatar_url)")
      .eq("receiver_id", userId)
      .order("created_at", { ascending: false });

    if (data) {
      setMessages(data.map((m) => ({
        id: m.id,
        senderId: m.sender_id,
        receiverId: m.receiver_id,
        content: m.content,
        tmdbId: m.tmdb_id,
        mediaType: m.media_type,
        showTitle: m.show_title,
        showPosterPath: m.show_poster_path,
        readAt: m.read_at,
        createdAt: m.created_at,
        sender: Array.isArray(m.sender) ? m.sender[0] : m.sender,
      })));
    }
  }, [userId, supabase]);

  const sendMessage = useCallback(async (
    receiverId: string,
    content: string,
    showContext?: { tmdbId: number; mediaType: string; showTitle: string; showPosterPath: string | null }
  ): Promise<{ error: string | null }> => {
    if (!userId) return { error: "Not authenticated" };
    const res = await fetch("/api/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiver_id: receiverId,
        content,
        tmdb_id: showContext?.tmdbId ?? null,
        media_type: showContext?.mediaType ?? null,
        show_title: showContext?.showTitle ?? null,
        show_poster_path: showContext?.showPosterPath ?? null,
      }),
    });
    const json = await res.json();
    if (json.error) return { error: json.error };
    showToast("Message sent!");
    return { error: null };
  }, [userId, showToast]);

  const markMessagesRead = useCallback(async () => {
    if (!userId) return;
    const unreadIds = messages.filter((m) => !m.readAt).map((m) => m.id);
    if (unreadIds.length === 0) return;
    await supabase
      .from("messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", unreadIds);
    setMessages((prev) =>
      prev.map((m) => unreadIds.includes(m.id) ? { ...m, readAt: new Date().toISOString() } : m)
    );
  }, [userId, supabase, messages]);

  useEffect(() => {
    refreshRecommendations();
    refreshWatchlist();
    refreshFriendRequests();
    refreshMessages();
  }, [refreshRecommendations, refreshWatchlist, refreshFriendRequests, refreshMessages]);

  // Real-time: refresh inbox when a new recommendation arrives
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("recommendations-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "recommendations", filter: `receiver_id=eq.${userId}` },
        () => { refreshRecommendations(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase, refreshRecommendations]);

  // Real-time: refresh when a new friend request arrives
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("friend-requests-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "friendships", filter: `friend_id=eq.${userId}` },
        () => { refreshFriendRequests(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase, refreshFriendRequests]);

  // Real-time: refresh when a new message arrives
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel("messages-inbox")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `receiver_id=eq.${userId}` },
        () => { refreshMessages(); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, supabase, refreshMessages]);

  const showToast = useCallback((message: string) => {
    const id = Date.now();
    setToast({ message, id });
    setTimeout(() => {
      setToast((prev) => (prev?.id === id ? null : prev));
    }, 2800);
  }, []);

  const acceptFriendRequest = useCallback(
    async (id: string, senderId: string) => {
      if (!userId) return;
      const { error: updateError } = await supabase
        .from("friendships")
        .update({ status: "accepted" })
        .eq("id", id);
      if (updateError) { showToast("Could not accept request"); return; }

      // Insert reciprocal row so both users see each other as friends
      await supabase.from("friendships").upsert(
        { user_id: userId, friend_id: senderId, status: "accepted" },
        { onConflict: "user_id,friend_id" }
      );

      setFriendRequests((prev) => prev.filter((r) => r.id !== id));
      showToast("Friend added!");
    },
    [userId, supabase, showToast]
  );

  const declineFriendRequest = useCallback(
    async (id: string) => {
      await supabase.from("friendships").delete().eq("id", id);
      setFriendRequests((prev) => prev.filter((r) => r.id !== id));
    },
    [supabase]
  );

  const sendRecommendation = useCallback(
    async (
      tmdbId: number,
      mediaType: MediaType,
      title: string,
      posterPath: string | null,
      friendIds: string[],
      friendNames: string[],
      note: string
    ): Promise<{ error: string | null }> => {
      if (!userId) return { error: "Not authenticated" };

      const rows = friendIds.map((friendId) => ({
        sender_id: userId,
        receiver_id: friendId,
        tmdb_id: tmdbId,
        media_type: mediaType,
        title,
        poster_path: posterPath,
        note: note.trim() || null,
      }));

      const { error } = await supabase.from("recommendations").insert(rows);
      if (error) {
        console.error("sendRecommendation error:", error);
        return { error: error.message };
      }

      showToast(`Sent to ${friendNames.join(", ")}`);

      // Fire push notifications — best-effort, don't block on failure
      friendIds.forEach((friendId) => {
        fetch("/api/push/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient_user_id: friendId,
            notification_type: "recommendation",
            title,
          }),
        }).catch(() => {});
      });

      return { error: null };
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

  const markWatchedFromRec = useCallback(
    async (recId: string, tmdbId: number, mediaType: MediaType, title: string, posterPath: string | null) => {
      if (!userId) return;
      const { data, error } = await supabase
        .from("watchlist")
        .upsert(
          { user_id: userId, tmdb_id: tmdbId, media_type: mediaType, title, poster_path: posterPath, status: "watched" },
          { onConflict: "user_id,tmdb_id,media_type" }
        )
        .select()
        .single();

      if (error) { showToast(`Could not save: ${error.message}`); return; }

      if (data) {
        setWatchlist((prev) => {
          const exists = prev.some((w) => w.tmdbId === tmdbId && w.mediaType === mediaType);
          const newItem: WatchlistItem = {
            id: data.id, tmdbId: data.tmdb_id, mediaType: data.media_type as MediaType,
            titleStr: data.title, posterPath: data.poster_path,
            status: "watched", watched: true, rating: null, addedAt: data.created_at,
          };
          return exists ? prev.map((w) => w.tmdbId === tmdbId && w.mediaType === mediaType ? newItem : w) : [newItem, ...prev];
        });
      }

      const now = new Date().toISOString();
      await supabase.from("recommendations").update({ read_at: now }).eq("id", recId);
      setRecommendations((prev) =>
        prev.map((r) => r.id === recId ? { ...r, watched: true, watchedAt: now } : r)
      );

      showToast("Marked as watched");
      fetch("/api/push/rec-accepted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rec_id: recId, notification_type: "watched" }),
      }).catch(() => {});
    },
    [userId, supabase, showToast]
  );

  const dismissRecommendation = useCallback(
    async (recId: string) => {
      const now = new Date().toISOString();
      await supabase
        .from("recommendations")
        .update({ dismissed_at: now })
        .eq("id", recId);
      setRecommendations((prev) => prev.filter((r) => r.id !== recId));
    },
    [supabase]
  );

  const addRecToWatchlist = useCallback(
    async (recId: string, tmdbId: number, mediaType: MediaType, title: string, posterPath: string | null) => {
      if (!userId) return;
      // Add to watchlist
      const { data, error } = await supabase
        .from("watchlist")
        .upsert(
          { user_id: userId, tmdb_id: tmdbId, media_type: mediaType, title, poster_path: posterPath, status: "to_watch" },
          { onConflict: "user_id,tmdb_id,media_type" }
        )
        .select()
        .single();

      if (error) { showToast(`Could not add to watchlist: ${error.message}`); return; }

      if (data) {
        setWatchlist((prev) => {
          const exists = prev.some((w) => w.tmdbId === tmdbId && w.mediaType === mediaType);
          const newItem: WatchlistItem = {
            id: data.id, tmdbId: data.tmdb_id, mediaType: data.media_type as MediaType,
            titleStr: data.title, posterPath: data.poster_path,
            status: data.status as WatchlistStatus, watched: false, rating: null, addedAt: data.created_at,
          };
          return exists ? prev : [newItem, ...prev];
        });
      }

      // Mark recommendation as seen
      const now = new Date().toISOString();
      await supabase.from("recommendations").update({ read_at: now }).eq("id", recId);
      setRecommendations((prev) =>
        prev.map((r) => r.id === recId ? { ...r, watched: true, watchedAt: now } : r)
      );
      showToast("Added to watchlist");
      fetch("/api/push/rec-accepted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rec_id: recId, notification_type: "watchlisted" }),
      }).catch(() => {});
    },
    [userId, supabase, showToast]
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
        friendRequests,
        toast,
        inboxUnreadCount,
        markInboxSeen,
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
        addRecToWatchlist,
        markWatchedFromRec,
        dismissRecommendation,
        messages,
        unreadMessageCount,
        sendMessage,
        markMessagesRead,
        refreshMessages,
        refreshRecommendations,
        refreshWatchlist,
        refreshFriendRequests,
        acceptFriendRequest,
        declineFriendRequest,
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
