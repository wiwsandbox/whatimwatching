"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import BottomNav from "@/components/BottomNav";
import AppHeader from "@/components/AppHeader";
import PosterImage from "@/components/PosterImage";
import { getMovie, getTVShow, getDisplayTitle, getYear } from "@/lib/tmdb";
import StreamingProviders from "@/components/StreamingProviders";
import { useApp } from "@/lib/store";
import type { TMDBTitle, WatchlistItem, WatchlistStatus } from "@/lib/types";

type Filter = "to_watch" | "watching" | "watched";

const STATUS_LABELS: Record<WatchlistStatus, string> = {
  to_watch: "To Watch",
  watching: "Watching",
  watched: "Watched",
};

const STATUS_COLORS: Record<WatchlistStatus, { bg: string; color: string }> = {
  to_watch: { bg: "#fff0f0", color: "#ff5757" },
  watching: { bg: "#fff8e1", color: "#f59e0b" },
  watched: { bg: "#e8fff0", color: "#10b981" },
};

function isUpcoming(title: TMDBTitle | undefined): boolean {
  if (!title) return false;
  const dateStr = title.release_date || title.first_air_date;
  if (!dateStr) return false;
  const releaseDate = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return releaseDate > today;
}

const NEXT_STATUS: Record<WatchlistStatus, WatchlistStatus> = {
  to_watch: "watching",
  watching: "watched",
  watched: "to_watch",
};

const TAB_INDEX: Record<Filter, number> = { to_watch: 0, watching: 1, watched: 2 };

export default function WatchlistPage() {
  const { watchlist, removeFromWatchlist, setWatchlistStatus } = useApp();
  const [titleCache, setTitleCache] = useState<Record<string, TMDBTitle>>({});
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("to_watch");
  const [filterVisible, setFilterVisible] = useState(true);

  const fetchTitles = useCallback(async () => {
    const toFetch = watchlist.filter((w) => !titleCache[`${w.mediaType}-${w.tmdbId}`]);
    if (toFetch.length === 0) { setLoading(false); return; }

    const results = await Promise.allSettled(
      toFetch.map((w) => (w.mediaType === "movie" ? getMovie(w.tmdbId) : getTVShow(w.tmdbId)))
    );
    const newEntries: Record<string, TMDBTitle> = {};
    results.forEach((r, i) => {
      if (r.status === "fulfilled") {
        newEntries[`${toFetch[i].mediaType}-${toFetch[i].tmdbId}`] = r.value;
      }
    });
    setTitleCache((prev) => ({ ...prev, ...newEntries }));
    setLoading(false);
  }, [watchlist, titleCache]);

  useEffect(() => { fetchTitles(); }, [fetchTitles]);

  const handleFilterChange = useCallback((f: Filter) => {
    if (f === filter) return;
    setFilterVisible(false);
    setTimeout(() => {
      setFilter(f);
      setFilterVisible(true);
    }, 100);
  }, [filter]);

  const enriched = watchlist.map((w) => ({
    ...w,
    title: titleCache[`${w.mediaType}-${w.tmdbId}`],
  }));

  const filtered = enriched.filter((w) => w.status === filter);

  const toWatchCount = watchlist.filter((w) => w.status === "to_watch").length;
  const watchingCount = watchlist.filter((w) => w.status === "watching").length;
  const watchedCount = watchlist.filter((w) => w.status === "watched").length;

  const filterTabs: { key: Filter; label: string; count?: number }[] = [
    { key: "to_watch", label: "To Watch", count: toWatchCount },
    { key: "watching", label: "Watching", count: watchingCount },
    { key: "watched", label: "Watched", count: watchedCount },
  ];

  return (
    <div className="flex flex-col min-h-screen pb-24" style={{ background: "var(--bg)" }}>
      <header
        className="sticky top-0 z-40"
        style={{ background: "rgba(255,250,248,0.95)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)" }}
      >
        <AppHeader />
        <div className="px-4 pb-3">
          {/* Tabs with sliding indicator */}
          <div className="relative flex p-[3px] rounded-[24px]" style={{ background: "var(--surface-2)" }}>
            {/* Sliding pill */}
            <div
              className="absolute inset-y-[3px] rounded-[20px] pointer-events-none"
              style={{
                background: "var(--brand)",
                width: "calc(33.33% - 2px)",
                left: 3,
                transform: `translateX(calc(${TAB_INDEX[filter]} * 100%))`,
                transition: "transform 200ms cubic-bezier(0.34, 1.56, 0.64, 1)",
              }}
            />
            {filterTabs.map(({ key, label, count }) => {
              const isActive = filter === key;
              return (
                <button
                  key={key}
                  onClick={() => handleFilterChange(key)}
                  className="relative z-10 flex-1 py-2 text-[11px] font-[500] transition-colors duration-200 flex items-center justify-center gap-1"
                  style={{ color: isActive ? "white" : "var(--text-secondary)" }}
                >
                  {label}
                  {count !== undefined && count > 0 && (
                    <span
                      className="text-[9px] px-1 py-0.5 rounded-full leading-none"
                      style={{
                        background: isActive ? "rgba(255,255,255,0.3)" : "var(--brand)",
                        color: "white",
                      }}
                    >
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main
        className="flex-1 px-4 pt-1"
        style={{ transition: "opacity 200ms ease", opacity: filterVisible ? 1 : 0 }}
      >
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-28 rounded-2xl animate-pulse" style={{ background: "var(--surface-2)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            {filter === "to_watch" && (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--surface-2)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <path d="M19 21L12 16L5 21V5C5 3.9 5.9 3 7 3H17C18.1 3 19 3.9 19 5V21Z" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M12 8V12M12 8L10 10M12 8L14 10" stroke="var(--text-muted)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Nothing to watch yet</p>
                <p className="text-xs mt-1 mb-5" style={{ color: "var(--text-muted)" }}>Add titles you want to watch</p>
                <Link href="/search" className="px-5 py-2.5 text-sm font-semibold" style={{ background: "var(--brand)", color: "white", borderRadius: 14 }}>
                  Find something to watch
                </Link>
                <Link href="/" className="mt-3 text-xs font-medium" style={{ color: "var(--text-muted)" }}>
                  Check your recommendations
                </Link>
              </>
            )}
            {filter === "watching" && (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--surface-2)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="var(--text-muted)" strokeWidth="2" />
                    <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="var(--text-muted)" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Nothing in progress</p>
                <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>Titles you're currently watching appear here</p>
              </>
            )}
            {filter === "watched" && (
              <>
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-4" style={{ background: "var(--surface-2)" }}>
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="var(--text-muted)" strokeWidth="2" />
                    <path d="M8 12L11 15L16 9" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>No finished titles yet</p>
                <p className="text-xs mt-1 mb-5" style={{ color: "var(--text-muted)" }}>Mark titles as watched to track what you've seen</p>
                <Link href="/search" className="px-5 py-2.5 text-sm font-semibold" style={{ background: "var(--brand)", color: "white", borderRadius: 14 }}>
                  Find something to watch
                </Link>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((item) => (
              <WatchlistRow
                key={item.id}
                item={item}
                onRemove={() => removeFromWatchlist(item.tmdbId, item.mediaType)}
                onCycleStatus={() => setWatchlistStatus(item.id, NEXT_STATUS[item.status])}
              />
            ))}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
}

function WatchlistRow({
  item,
  onRemove,
  onCycleStatus,
}: {
  item: WatchlistItem & { title?: TMDBTitle };
  onRemove: () => void;
  onCycleStatus: () => void;
}) {
  const title = item.title;
  const displayTitle = title ? getDisplayTitle(title) : item.titleStr || "Loading…";
  const year = title ? getYear(title) : "";
  const statusStyle = STATUS_COLORS[item.status];

  return (
    <div
      className="flex items-center gap-3 p-3 rounded-2xl active:scale-[0.97]"
      style={{
        background: "var(--surface)",
        border: "0.5px solid var(--border)",
        boxShadow: "0 2px 12px rgba(180, 100, 80, 0.06)",
        transition: "transform 150ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      <Link href={`/title/${item.mediaType}-${item.tmdbId}`} className="flex-shrink-0">
        <div className="relative w-12 h-[72px] overflow-hidden" style={{ background: "var(--surface-2)", borderRadius: 8 }}>
          {title ? (
            <PosterImage path={title.poster_path} alt={displayTitle} size="w92" fill />
          ) : (
            <div className="w-full h-full animate-pulse" style={{ background: "var(--surface-2)", borderRadius: 8 }} />
          )}
        </div>
      </Link>

      <div className="flex-1 min-w-0">
        <Link href={`/title/${item.mediaType}-${item.tmdbId}`}>
          <p className="font-semibold text-sm line-clamp-1 mb-1" style={{ color: "var(--text-primary)" }}>
            {displayTitle}
          </p>
        </Link>
        <div className="flex items-center gap-2 flex-wrap mb-1.5">
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
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onCycleStatus}
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold transition-all active:scale-95"
            style={{ background: statusStyle.bg, color: statusStyle.color }}
          >
            {item.status === "watched" && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <path d="M1 4L3 6L7 2" stroke={statusStyle.color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
            {item.status === "watching" && (
              <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                <circle cx="4" cy="4" r="3" stroke={statusStyle.color} strokeWidth="1.3" />
                <path d="M4 2.5V4L5 5" stroke={statusStyle.color} strokeWidth="1.2" strokeLinecap="round" />
              </svg>
            )}
            {STATUS_LABELS[item.status]}
          </button>

          {item.rating && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
              style={{ background: "#FFF1EF", color: "#C44030" }}
            >
              ★ {item.rating}
            </span>
          )}
        </div>
      </div>

      {/* Remove */}
      <button
        onClick={onRemove}
        className="w-8 h-8 rounded-full flex items-center justify-center transition-all active:scale-90 flex-shrink-0"
        style={{ background: "var(--surface-2)", border: "0.5px solid var(--border)" }}
        title="Remove"
      >
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path
            d="M1.5 3H10.5M4.5 3V2H7.5V3M5 5.5V9M7 5.5V9M2 3L2.5 10.5C2.5 11 2.9 11.5 3.5 11.5H8.5C9.1 11.5 9.5 11 9.5 10.5L10 3"
            stroke="var(--text-muted)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
