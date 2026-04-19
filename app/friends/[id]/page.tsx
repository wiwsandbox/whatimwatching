"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import PosterImage from "@/components/PosterImage";
import StreamingProviders from "@/components/StreamingProviders";
import { getMovie, getTVShow, getDisplayTitle, getYear } from "@/lib/tmdb";
import { getClient } from "@/lib/supabase/client";
import { useApp } from "@/lib/store";
import type { TMDBTitle, WatchlistItem, WatchlistStatus, MediaType } from "@/lib/types";
import FriendNetworkSheet from "@/components/FriendNetworkSheet";
import SendMessageSheet from "@/components/SendMessageSheet";

type Tab = "watched" | "watchlist";

function isUpcoming(title: TMDBTitle | undefined): boolean {
  if (!title) return false;
  const dateStr = title.release_date || title.first_air_date;
  if (!dateStr) return false;
  const releaseDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return releaseDate > today;
}

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
  const { addToWatchlist, isInWatchlist: checkInWatchlist } = useApp();

  const [friend, setFriend] = useState<FriendProfile | null>(null);
  const [watchedItems, setWatchedItems] = useState<WatchlistItem[]>([]);
  const [toWatchItems, setToWatchItems] = useState<WatchlistItem[]>([]);
  const [tab, setTab] = useState<Tab>("watched");
  const [tabVisible, setTabVisible] = useState(true);
  const [titleCache, setTitleCache] = useState<Record<string, TMDBTitle>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [networkSheetOpen, setNetworkSheetOpen] = useState(false);
  const [friendCount, setFriendCount] = useState<number>(0);
  const [messageSheetOpen, setMessageSheetOpen] = useState(false);
  const [selectedMessageItem, setSelectedMessageItem] = useState<EnrichedItem | null>(null);

  useEffect(() => {
    async function load() {
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

      const countRes = await fetch(`/api/friend-network?friendId=${friendId}`);
      if (countRes.ok) {
        const countJson = await countRes.json();
        setFriendCount(countJson.totalCount ?? 0);
      }

      setLoading(false);
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [friendId]);

  const handleTabChange = (t: Tab) => {
    if (t === tab) return;
    setTabVisible(false);
    setTimeout(() => {
      setTab(t);
      setTabVisible(true);
    }, 100);
  };

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--text-muted)" }}>Friend not found.</p>
        <button onClick={() => router.back()} style={{ color: "var(--brand)" }} className="text-sm">
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
    : "var(--brand)";
  const displayName = friend?.display_name || friend?.username || "…";

  return (
    <div className="min-h-screen pb-10" style={{ background: "var(--bg)" }}>
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="fixed top-12 left-4 z-50 w-9 h-9 rounded-full flex items-center justify-center"
        style={{ background: "rgba(255,250,248,0.9)", border: "0.5px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <path d="M11 4L6 9L11 14" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Header */}
      <div className="px-4 pt-16 pb-5">
        <div className="flex items-center gap-4 mb-5">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold flex-shrink-0"
            style={{ background: avatarColor, color: "white", fontFamily: "var(--font-playfair)", boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)" }}
          >
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl font-bold leading-none mb-1" style={{ color: "var(--text-primary)" }}>
              {displayName}
            </h1>
            {friend?.username && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>@{friend.username}</p>
            )}
            {friend?.bio && (
              <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>{friend.bio}</p>
            )}
          </div>
        </div>

        {/* Friends card */}
        <button
          onClick={() => setNetworkSheetOpen(true)}
          className="w-full flex items-center justify-between p-4 rounded-2xl mb-5 transition-all active:scale-[0.97]"
          style={{
            background: "var(--surface)",
            border: "0.5px solid var(--border)",
            boxShadow: "0 2px 12px rgba(180, 100, 80, 0.06)",
            transition: "transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: "var(--surface-2)" }}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <circle cx="7" cy="6" r="3.5" stroke="var(--brand)" strokeWidth="1.5" />
                <path d="M1 15C1 12.2 3.7 10 7 10" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="13" cy="8" r="2.5" stroke="var(--brand)" strokeWidth="1.5" />
                <path d="M10 15C10 13.1 11.3 12 13 12C14.7 12 16 13.1 16 15" stroke="var(--brand)" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Friends</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {loading ? "—" : `${friendCount} connection${friendCount !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="flex-shrink-0">
            <path d="M5 3L9 7L5 11" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Tabs with sliding indicator */}
        <div className="relative flex p-[3px] rounded-[24px]" style={{ background: "var(--surface-2)" }}>
          <div
            className="absolute inset-y-[3px] rounded-[20px] pointer-events-none"
            style={{
              background: "var(--brand)",
              width: "calc(50% - 3px)",
              left: 3,
              transform: tab === "watched" ? "translateX(0)" : "translateX(100%)",
              transition: "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            }}
          />
          {(["watched", "watchlist"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => handleTabChange(t)}
              className="relative z-10 flex-1 py-2 text-xs font-[500] transition-colors duration-200"
              style={{ color: tab === t ? "white" : "var(--text-secondary)" }}
            >
              {t === "watched" ? "Watched" : "Watchlist"}
            </button>
          ))}
        </div>
      </div>

      {/* List with fade transition */}
      <div
        className="px-4 space-y-2"
        style={{ transition: "opacity 200ms ease", opacity: tabVisible ? 1 : 0 }}
      >
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-2xl animate-pulse" style={{ background: "var(--surface-2)" }} />
          ))
        ) : activeList.length === 0 ? (
          <div className="flex flex-col items-center py-12 text-center">
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>Nothing here yet</p>
          </div>
        ) : (
          activeList.map((item) => (
            <FriendTitleRow
              key={item.id}
              item={item}
              isInWatchlist={checkInWatchlist(item.tmdbId, item.mediaType)}
              onAdd={() =>
                addToWatchlist({
                  tmdbId: item.tmdbId,
                  mediaType: item.mediaType,
                  titleStr: item.titleStr,
                  posterPath: item.title?.poster_path ?? item.posterPath ?? null,
                  status: "to_watch",
                  rating: null,
                  source: "friend_watchlist",
                })
              }
              onMessage={() => {
                setSelectedMessageItem(item);
                setMessageSheetOpen(true);
              }}
            />
          ))
        )}
      </div>

      <FriendNetworkSheet
        isOpen={networkSheetOpen}
        onClose={() => setNetworkSheetOpen(false)}
        friendName={displayName}
        friendId={friendId}
      />

      <SendMessageSheet
        isOpen={messageSheetOpen}
        onClose={() => { setMessageSheetOpen(false); setSelectedMessageItem(null); }}
        preselectedFriendId={friendId}
        preselectedFriendName={displayName}
        showContext={selectedMessageItem ? {
          tmdbId: selectedMessageItem.tmdbId,
          mediaType: selectedMessageItem.mediaType,
          showTitle: selectedMessageItem.title ? getDisplayTitle(selectedMessageItem.title) : selectedMessageItem.titleStr || "",
          posterPath: selectedMessageItem.title?.poster_path ?? selectedMessageItem.posterPath ?? null,
        } : null}
      />
    </div>
  );
}

function FriendTitleRow({
  item,
  isInWatchlist,
  onAdd,
  onMessage,
}: {
  item: EnrichedItem;
  isInWatchlist: boolean;
  onAdd: () => void;
  onMessage: () => void;
}) {
  const title = item.title;
  const displayTitle = title ? getDisplayTitle(title) : item.titleStr || "Loading…";
  const year = title ? getYear(title) : "";

  return (
    <Link
      href={`/title/${item.mediaType}-${item.tmdbId}`}
      className="flex items-center gap-3 p-3 rounded-2xl active:scale-[0.97]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        boxShadow: "0 2px 12px rgba(180, 100, 80, 0.06)",
        display: "flex",
        transition: "transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <div className="relative w-12 h-[72px] overflow-hidden flex-shrink-0" style={{ background: "var(--surface-2)", borderRadius: 8 }}>
        {title ? (
          <PosterImage path={title.poster_path} alt={displayTitle} size="w92" fill />
        ) : (
          <div className="w-full h-full animate-pulse" style={{ background: "var(--surface-2)", borderRadius: 8 }} />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm line-clamp-1 mb-1" style={{ color: "var(--text-primary)" }}>
          {displayTitle}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          {year && <span className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{year}</span>}
          <span
            className="text-[11px] font-medium"
            style={{ background: "transparent", border: "0.5px solid var(--brand)", color: "var(--brand)", borderRadius: 20, padding: "2px 8px" }}
          >
            {item.mediaType === "tv" ? "Series" : "Film"}
          </span>
          {isUpcoming(title) && (
            <span
              className="text-[11px] font-medium"
              style={{ background: "#EEF6FF", color: "#2563EB", border: "0.5px solid #BFDBFE", borderRadius: 20, padding: "2px 8px" }}
            >
              Upcoming
            </span>
          )}
          <StreamingProviders id={item.tmdbId} mediaType={item.mediaType} maxShow={3} size="sm" />
          {item.rating && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "#FFF1EF", color: "#C44030" }}>
              ★ {item.rating}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); onMessage(); }}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={{ background: "var(--surface-2)", border: "0.5px solid var(--border)" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M1.5 1.5H12.5C13 1.5 13.5 1.9 13.5 2.5V8.5C13.5 9.1 13 9.5 12.5 9.5H4.5L1.5 12.5V2.5C1.5 1.9 1.9 1.5 1.5 1.5Z" stroke="var(--text-muted)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!isInWatchlist) onAdd(); }}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90"
          style={
            isInWatchlist
              ? { background: "var(--surface-2)", border: "0.5px solid var(--border)" }
              : { background: "var(--brand)" }
          }
        >
          {isInWatchlist ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M3 7L6 10L11 4" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M7 3V11M3 7H11" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          )}
        </button>
      </div>
    </Link>
  );
}
