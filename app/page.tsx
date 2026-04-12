"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import RecommendationCard from "@/components/RecommendationCard";
import { useApp } from "@/lib/store";
import { getMovie, getTVShow } from "@/lib/tmdb";
import type { TMDBTitle } from "@/lib/types";

type Filter = "all" | "unwatched" | "watched";

export default function InboxPage() {
  const { recommendations, markWatched, markUnwatched, addRecToWatchlist, friendRequests, acceptFriendRequest, declineFriendRequest } = useApp();
  const [titleCache, setTitleCache] = useState<Record<string, TMDBTitle>>({});
  const [filter, setFilter] = useState<Filter>("all");
  const [loading, setLoading] = useState(true);

  const fetchTitles = useCallback(async () => {
    const toFetch = recommendations.filter(
      (r) => !titleCache[`${r.mediaType}-${r.tmdbId}`]
    );
    if (toFetch.length === 0) {
      setLoading(false);
      return;
    }

    const results = await Promise.allSettled(
      toFetch.map((r) =>
        r.mediaType === "movie" ? getMovie(r.tmdbId) : getTVShow(r.tmdbId)
      )
    );

    const newEntries: Record<string, TMDBTitle> = {};
    results.forEach((result, i) => {
      if (result.status === "fulfilled") {
        const key = `${toFetch[i].mediaType}-${toFetch[i].tmdbId}`;
        newEntries[key] = result.value;
      }
    });

    setTitleCache((prev) => ({ ...prev, ...newEntries }));
    setLoading(false);
  }, [recommendations, titleCache]);

  useEffect(() => {
    fetchTitles();
  }, [fetchTitles]);

  const enrichedRecs = recommendations.map((r) => ({
    ...r,
    tmdbTitle: titleCache[`${r.mediaType}-${r.tmdbId}`],
  }));

  const filtered = enrichedRecs.filter((r) => {
    if (filter === "unwatched") return !r.watched;
    if (filter === "watched") return r.watched;
    return true;
  });

  const unwatchedCount = recommendations.filter((r) => !r.watched).length;

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#ffffff" }}>
      <header className="sticky top-0 z-40" style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}>
        <AppHeader
          right={
            <Link
              href="/search"
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90"
              style={{ background: "#ff5757" }}
              title="Find a title to recommend"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path
                  d="M14 2L2 6.5L7 8.5M14 2L9.5 14L7 8.5M14 2L7 8.5"
                  stroke="white"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          }
        />

        <div className="px-4 pb-3">
          {unwatchedCount > 0 && (
            <p className="text-xs mb-3" style={{ color: "#999999" }}>
              {unwatchedCount} unseen recommendation{unwatchedCount !== 1 ? "s" : ""}
            </p>
          )}

          {/* Filter tabs */}
          <div className="flex gap-1 p-1 rounded-xl" style={{ background: "#f7f7f7", border: "1px solid #eeeeee" }}>
            {(["all", "unwatched", "watched"] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="flex-1 py-2 rounded-lg text-xs font-semibold capitalize transition-all duration-200"
                style={
                  filter === f
                    ? { background: "#ff5757", color: "white" }
                    : { background: "transparent", color: "#999999" }
                }
              >
                {f}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pt-2">
        {/* Friend requests */}
        {friendRequests.length > 0 && (
          <div className="mb-4 space-y-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "#cccccc" }}>
              Friend requests
            </p>
            {friendRequests.map((req) => {
              const name = req.sender.display_name || req.sender.username || "Unknown";
              const avatarColor = "#ff5757";
              return (
                <div
                  key={req.id}
                  className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: "#ffffff", border: "1px solid #eeeeee", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
                >
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ background: avatarColor, color: "white", fontFamily: "var(--font-playfair)" }}
                  >
                    {name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: "#1a1a1a" }}>{name}</p>
                    {req.sender.username && (
                      <p className="text-xs" style={{ color: "#999999" }}>@{req.sender.username}</p>
                    )}
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => declineFriendRequest(req.id)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: "#f7f7f7", color: "#999999", border: "1px solid #eeeeee" }}
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => acceptFriendRequest(req.id, req.sender.id)}
                      className="px-3 py-1.5 rounded-full text-xs font-semibold"
                      style={{ background: "#ff5757", color: "white" }}
                    >
                      Accept
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Recommendations */}
        <div className="space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-[140px] rounded-2xl animate-pulse"
              style={{ background: "#f7f7f7" }}
            />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
              style={{ background: "#f7f7f7" }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M20 4H4C2.9 4 2 4.9 2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6C22 4.9 21.1 4 20 4Z"
                  stroke="#cccccc"
                  strokeWidth="2"
                />
                <path d="M22 6L12 13L2 6" stroke="#cccccc" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </div>
            <p className="text-sm font-semibold" style={{ color: "#cccccc" }}>
              {filter === "watched" ? "Nothing watched yet" : "All caught up!"}
            </p>
            <p className="text-xs mt-1" style={{ color: "#dddddd" }}>
              {filter === "watched"
                ? "Mark recommendations as watched to see them here"
                : "No recommendations waiting for you"}
            </p>
          </div>
        ) : (
          filtered.map((rec) => (
            <RecommendationCard
              key={rec.id}
              rec={rec}
              onMarkWatched={markWatched}
              onMarkUnwatched={markUnwatched}
              onAddToWatchlist={addRecToWatchlist}
            />
          ))
        )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
