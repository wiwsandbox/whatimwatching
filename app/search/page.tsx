"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import PosterImage from "@/components/PosterImage";
import StreamingProviders from "@/components/StreamingProviders";
import { searchMulti, getTrending, getDisplayTitle, getYear } from "@/lib/tmdb";
import { useApp } from "@/lib/store";
import type { TMDBSearchResult, MediaType } from "@/lib/types";

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<TMDBSearchResult[]>([]);
  const [trending, setTrending] = useState<TMDBSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [trendingLoading, setTrendingLoading] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { addToWatchlist, isInWatchlist } = useApp();

  useEffect(() => {
    getTrending("all", "week")
      .then((data) => {
        setTrending(
          data.results.filter((r) => r.media_type === "movie" || r.media_type === "tv").slice(0, 12)
        );
      })
      .finally(() => setTrendingLoading(false));
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const data = await searchMulti(query);
        setResults(
          data.results
            .filter((r) => r.media_type === "movie" || r.media_type === "tv")
            .slice(0, 20)
        );
      } finally {
        setLoading(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const displayList = query.trim() ? results : trending;
  const isSearching = query.trim().length > 0;

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "#ffffff" }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: "rgba(255,255,255,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <AppHeader />
        <div className="px-4 pb-3">
          {/* Search input */}
          <div
            className="flex items-center gap-3 px-4 py-3 rounded-2xl"
            style={{ background: "#f7f7f7", border: "1px solid #eeeeee" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <circle cx="11" cy="11" r="8" stroke="#cccccc" strokeWidth="2" />
              <path d="M21 21L16.65 16.65" stroke="#cccccc" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Films, series, anything…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "#1a1a1a", fontFamily: "var(--font-dm-sans)" }}
              autoFocus={false}
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="w-5 h-5 rounded-full flex items-center justify-center"
                style={{ background: "#eeeeee" }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                  <path d="M2 2L8 8M8 2L2 8" stroke="#999999" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Section label */}
      <div className="px-4 mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "#cccccc" }}>
          {isSearching ? `Results for "${query}"` : "Trending this week"}
        </span>
      </div>

      <main className="flex-1 px-4">
        {loading || trendingLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "#f7f7f7" }} />
            ))}
          </div>
        ) : displayList.length === 0 && isSearching ? (
          <div className="flex flex-col items-center py-16 text-center">
            <p className="text-sm" style={{ color: "#cccccc" }}>No results found</p>
          </div>
        ) : (
          <div className="space-y-2">
            {displayList.map((item) => (
              <SearchResultRow
                key={`${item.media_type}-${item.id}`}
                item={item}
                inWatchlist={isInWatchlist(item.id, item.media_type as MediaType)}
                onAddWatchlist={() =>
                  addToWatchlist({
                    tmdbId: item.id,
                    mediaType: item.media_type!,
                    status: "to_watch",
                    titleStr: getDisplayTitle(item),
                    posterPath: item.poster_path,
                  })
                }
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function SearchResultRow({
  item,
  inWatchlist,
  onAddWatchlist,
}: {
  item: TMDBSearchResult;
  inWatchlist: boolean;
  onAddWatchlist: () => void;
}) {
  const title = getDisplayTitle(item);
  const year = getYear(item);

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl"
      style={{ background: "#ffffff", border: "1px solid #eeeeee", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
    >
      <Link href={`/title/${item.media_type}-${item.id}`} className="flex-shrink-0">
        <div className="relative w-12 h-[72px] rounded-xl overflow-hidden" style={{ background: "#f7f7f7" }}>
          <PosterImage path={item.poster_path} alt={title} size="w92" fill className="rounded-xl" />
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/title/${item.media_type}-${item.id}`}>
          <p className="font-semibold text-sm line-clamp-1 leading-snug mb-1" style={{ color: "#1a1a1a" }}>
            {title}
          </p>
        </Link>
        <div className="flex items-center gap-2 flex-wrap">
          {year && (
            <span className="text-[11px]" style={{ color: "#999999" }}>{year}</span>
          )}
          <span
            className="text-[10px] px-1.5 py-0.5 rounded-full uppercase font-medium tracking-wide"
            style={
              item.media_type === "tv"
                ? { background: "#e8f0ff", color: "#3b5bdb" }
                : { background: "#fff0f0", color: "#ff5757" }
            }
          >
            {item.media_type === "tv" ? "Series" : "Film"}
          </span>
          <StreamingProviders id={item.id} mediaType={item.media_type!} maxShow={3} size="sm" />
        </div>
      </div>

      {/* Add to watchlist */}
      <button
        onClick={onAddWatchlist}
        disabled={inWatchlist}
        className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-90"
        style={
          inWatchlist
            ? { background: "#f7f7f7", border: "1px solid #eeeeee" }
            : { background: "#ff5757" }
        }
        title={inWatchlist ? "In watchlist" : "Add to watchlist"}
      >
        {inWatchlist ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8L6.5 11.5L13 5" stroke="#cccccc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 3V13M3 8H13" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        )}
      </button>
    </div>
  );
}
