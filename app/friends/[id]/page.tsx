"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PosterImage from "@/components/PosterImage";
import StreamingProviders from "@/components/StreamingProviders";
import { getMovie, getTVShow, getDisplayTitle, getYear } from "@/lib/tmdb";
import { getClient } from "@/lib/supabase/client";
import type { TMDBTitle, WatchlistItem, WatchlistStatus, MediaType } from "@/lib/types";

type Tab = "watched" | "watchlist";

interface FriendProfile {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
}

type EnrichedItem = WatchlistItem & { title?: TMDBTitle };

export default function FriendProfilePage() {
  const params = useParams();
  const router = useRouter();
  const friendId = params.id as string;
  const supabase = getClient();

  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [watchedItems, setWatchedItems] = useState<WatchlistItem[]>([]);
  const [toWatchItems, setToWatchItems] = useState<WatchlistItem[]>([]);
  const [tab, setTab] = useState<Tab>("watched");
  const [titleCache, setTitleCache] = useState<Record<string, TMDBTitle>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      // Fetch friend profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, bio")
        .eq("id", friendId)
        .single();

      if (profileError || !profileData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setFriend(profileData);

      // Fetch friend's watchlist (RLS policy allows friends to see each other's lists)
      const { data: watchlistData } = await supabase
        .from("watchlist")
        .select("id, tmdb_id, media_type, title, poster_path, status, rating, created_at")
        .eq("user_id", friendId)
        .order("created_at", { ascending: false });

      if (watchlistData) {
        const items: WatchlistItem[] = watchlistData.map((w) => ({
          id: w.id,
          tmdbId: w.tmdb_id,
          mediaType: w.media_type as MediaType,
          titleStr: w.title,
          posterPath: w.poster_path,
          status: w.status as WatchlistStatus,
          watched: w.status === "watched",
          rating: w.rating ?? null,
          addedAt: w.created_at,
        }));

        setWatchedItems(items.filter((i) => i.status === "watched"));
        setToWatchItems(items.filter((i) => i.status === "to_watch" || i.status === "watching"));

        // Fetch TMDB data for all items
        const toFetch = items;
        const results = await Promise.allSettled(
          toFetch.map((item) =>
            item.mediaType === "movie" ? getMovie(item.tmdbId) : getTVShow(item.tmdbId)
          )
        );
        const newEntries: Record<string, TMDBTitle> = {};
        results.forEach((r, i) => {
          if (r.status === "fulfilled") {
            newEntries[`${toFetch[i].mediaType}-${toFetch[i].tmdbId}`] = r.value;
          }
        });
        setTitleCache(newEntries);
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId]);

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "#ffffff" }}>
        <p style={{ color: "#999999" }}>Friend not found.</p>
        <button onClick={() => router.back()} style={{ color: "#ff5757" }} className="text-sm">
          Go back
        </button>
      </div>
    );
  }

  const enrich = (items: WatchlistItem[]): EnrichedItem[] =>
    items.map((item) => ({
      ...item,
      title: titleCache[`${item.mediaType}-${item.tmdbId}`],
    }));

  const activeList = enrich(tab === "watched" ? watchedItems : toWatchItems);
  const avatarColor = friend?.avatar_url?.startsWith("color:")
    ? friend.avatar_url.slice(6)
    : "#ff5757";
  const displayName = friend?.display_name || friend?.username || "…";

  return (
    <div className="min-h-screen pb-10" style={{ background: "#ffffff" }}>
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="fixed top-12 left-4 z-50 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,255,255,0.9)", border: "1px solid #eeeeee", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9L11 14" stroke="#1a1a1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Header */}
      <div className="px-4 pt-16 pb-5">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{ background: avatarColor, color: "white", fontFamily: "var(--font-playfair)" }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none mb-1" style={{ color: "#1a1a1a" }}>
              {displayName}
            </h1>
            {friend?.username && (
              <p className="text-sm" style={{ color: "#999999" }}>@{friend.username}</p>
            )}
            {friend?.bio && (
              <p className="text-xs mt-1" style={{ color: "#666666" }}>{friend.bio}</p>
            )}
          </div>
        </div>

        {/* Stats */}
        <div
          className="flex items-center justify-around py-3 rounded-2xl mb-5"
          style={{ background: "#f7f7f7" }}
        >
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-lg font-bold" style={{ color: "#1a1a1a", fontFamily: "var(--font-playfair)" }}>
              {loading ? "—" : watchedItems.length}
            </span>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "#999999" }}>Watched</span>
          </div>
          <div className="w-px h-8" style={{ background: "#eeeeee" }} />
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-lg font-bold" style={{ color: "#1a1a1a", fontFamily: "var(--font-playfair)" }}>
              {loading ? "—" : toWatchItems.length}
            </span>
            <span className="text-[10px] uppercase tracking-wide" style={{ color: "#999999" }}>To watch</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#f7f7f7", border: "1px solid #eeeeee" }}>
          {(["watched", "watchlist"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all duration-200"
              style={
                tab === t
                  ? { background: "#ff5757", color: "white" }
                  : { background: "transparent", color: "#999999" }
              }
            >
              {t === "watched" ? "Watched" : "Watchlist"}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="px-4 space-y-2">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "#f7f7f7" }} />
          ))
        ) : activeList.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm" style={{ color: "#cccccc" }}>Nothing here yet</p>
          </div>
        ) : (
          activeList.map((item) => <FriendTitleRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

function FriendTitleRow({ item }: { item: EnrichedItem }) {
  const title = item.title;
  const displayTitle = title ? getDisplayTitle(title) : item.titleStr || "Loading…";
  const year = title ? getYear(title) : "";

  return (
    <Link
      href={`/title/${item.mediaType}-${item.tmdbId}`}
      className="flex items-center gap-3 p-3 rounded-2xl transition-all active:scale-[0.98]"
      style={{
        background: "#ffffff",
        border: "1px solid #eeeeee",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        display: "flex",
      }}
    >
      <div className="relative w-12 h-[72px] rounded-xl overflow-hidden flex-shrink-0" style={{ background: "#f7f7f7" }}>
        {title ? (
          <PosterImage path={title.poster_path} alt={displayTitle} size="w92" fill className="rounded-xl" />
        ) : (
          <div className="w-full h-full animate-pulse rounded-xl" style={{ background: "#f7f7f7" }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm line-clamp-1 mb-1" style={{ color: "#1a1a1a" }}>
          {displayTitle}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {year && <span className="text-[11px]" style={{ color: "#999999" }}>{year}</span>}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full uppercase font-medium tracking-wide"
            style={
              item.mediaType === "tv"
                ? { background: "#e8f0ff", color: "#3b5bdb" }
                : { background: "#fff0f0", color: "#ff5757" }
            }
          >
            {item.mediaType === "tv" ? "Series" : "Film"}
          </span>
          <StreamingProviders id={item.tmdbId} mediaType={item.mediaType} maxShow={3} size="sm" />
          {item.rating && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#fff0f0", color: "#ff5757" }}>
              ★ {item.rating}
            </span>
          )}
        </div>
      </div>

      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
        <path d="M5 3L9 7L5 11" stroke="#cccccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
