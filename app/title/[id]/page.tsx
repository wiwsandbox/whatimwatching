"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import PosterImage from "@/components/PosterImage";
import StreamingProviders from "@/components/StreamingProviders";
import RecommendModal from "@/components/RecommendModal";
import RatingSelector from "@/components/RatingSelector";
import { getMovie, getTVShow, tmdbImage, getDisplayTitle, getYear } from "@/lib/tmdb";
import { useApp } from "@/lib/store";
import type { TMDBTitle, MediaType, WatchlistStatus } from "@/lib/types";

const STATUS_LABELS: Record<WatchlistStatus, string> = {
  to_watch: "Add to Watchlist",
  watching: "Watching",
  watched: "Watched",
};

export default function TitleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = params.id as string;
  const [mediaType, tmdbIdStr] = rawId.split("-") as [MediaType, string];
  const tmdbId = parseInt(tmdbIdStr, 10);

  const [title, setTitle] = useState<TMDBTitle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [recommendOpen, setRecommendOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  const { addToWatchlist, removeFromWatchlist, isInWatchlist, getWatchlistItem, setWatchlistStatus, setRating } = useApp();
  const inWatchlist = isInWatchlist(tmdbId, mediaType);
  const watchlistItem = getWatchlistItem(tmdbId, mediaType);

  useEffect(() => {
    if (!tmdbId || isNaN(tmdbId)) { setError(true); return; }
    const fetch = mediaType === "movie" ? getMovie(tmdbId) : getTVShow(tmdbId);
    fetch.then(setTitle).catch(() => setError(true)).finally(() => setLoading(false));
  }, [tmdbId, mediaType]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--border)", borderTopColor: "var(--brand)" }}
        />
      </div>
    );
  }

  if (error || !title) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: "var(--bg)" }}>
        <p style={{ color: "var(--text-muted)" }}>Could not load title.</p>
        <button onClick={() => router.back()} style={{ color: "var(--brand)" }} className="text-sm">
          Go back
        </button>
      </div>
    );
  }

  const displayTitle = getDisplayTitle(title);
  const year = getYear(title);
  const backdropUrl = title.backdrop_path ? tmdbImage(title.backdrop_path, "w780") : null;

  const handleStatusChange = (status: WatchlistStatus) => {
    if (watchlistItem) {
      setWatchlistStatus(watchlistItem.id, status);
    } else {
      addToWatchlist({ tmdbId, mediaType, titleStr: displayTitle, posterPath: title.poster_path, status });
    }
  };

  const handleAddOrRemove = () => {
    if (inWatchlist) removeFromWatchlist(tmdbId, mediaType);
    else addToWatchlist({ tmdbId, mediaType, titleStr: displayTitle, posterPath: title.poster_path, status: "to_watch" });
  };

  return (
    <>
      <div className="min-h-screen pb-10" style={{ background: "var(--bg)" }}>
        {/* Back button */}
        <button
          onClick={() => router.back()}
          className="fixed top-12 left-4 z-50 w-9 h-9 rounded-full flex items-center justify-center"
          style={{ background: "rgba(255,250,248,0.9)", border: "0.5px solid var(--border)", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M11 4L6 9L11 14" stroke="var(--text-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Backdrop */}
        <div className="relative w-full h-[240px] overflow-hidden">
          {backdropUrl ? (
            <Image src={backdropUrl} alt={displayTitle} fill className="object-cover" priority />
          ) : (
            <div className="w-full h-full" style={{ background: "var(--surface-2)" }} />
          )}
          <div
            className="absolute inset-0"
            style={{
              background: "linear-gradient(to bottom, rgba(255,250,248,0) 0%, rgba(255,250,248,0.3) 60%, var(--bg) 100%)",
            }}
          />
        </div>

        {/* Content */}
        <div className="px-4 -mt-8 relative">
          <div className="flex gap-4 mb-4">
            {/* Poster */}
            <div
              className="relative w-[90px] h-[135px] overflow-hidden flex-shrink-0"
              style={{ borderRadius: 16, border: "0.5px solid var(--border)", boxShadow: "0 8px 24px rgba(180,100,80,0.15)" }}
            >
              <PosterImage path={title.poster_path} alt={displayTitle} size="w185" fill />
            </div>

            {/* Basic info */}
            <div className="flex-1 pt-10">
              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                <span
                  className="text-[11px] font-medium"
                  style={{ background: "transparent", border: "0.5px solid var(--brand)", color: "var(--brand)", borderRadius: 20, padding: "2px 8px" }}
                >
                  {mediaType === "tv" ? "Series" : "Film"}
                </span>
                {year && (
                  <span className="text-xs" style={{ color: "var(--text-secondary)" }}>{year}</span>
                )}
              </div>
              <h1 className="text-xl font-bold leading-tight mb-2" style={{ color: "var(--text-primary)" }}>
                {displayTitle}
              </h1>
              {title.tagline && (
                <p className="text-xs italic mb-2" style={{ color: "var(--text-secondary)" }}>
                  &ldquo;{title.tagline}&rdquo;
                </p>
              )}
              {watchlistItem?.rating && (
                <div className="flex items-center gap-1">
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "var(--brand)", color: "white" }}
                  >
                    ★ {watchlistItem.rating}/10
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Streaming providers */}
          <div className="mb-4 h-10 flex items-center">
            <StreamingProviders id={tmdbId} mediaType={mediaType} size="md" maxShow={6} />
          </div>

          {/* Genres */}
          {title.genres && title.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {title.genres.map((g) => (
                <span
                  key={g.id}
                  className="px-3 py-1 text-xs font-medium"
                  style={{ background: "var(--surface)", color: "var(--text-secondary)", border: "0.5px solid var(--border)", borderRadius: 20 }}
                >
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {/* Overview */}
          {title.overview && (
            <div className="mb-6">
              <h2 className="text-[11px] font-semibold mb-2 uppercase tracking-[0.06em]" style={{ color: "var(--text-secondary)" }}>
                Overview
              </h2>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {title.overview}
              </p>
            </div>
          )}

          {/* Watchlist status selector */}
          {inWatchlist && watchlistItem ? (
            <div className="mb-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.06em] mb-2" style={{ color: "var(--text-secondary)" }}>
                Your status
              </p>
              <div className="flex gap-2">
                {(["to_watch", "watching", "watched"] as WatchlistStatus[]).map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="flex-1 py-2.5 text-xs font-semibold transition-all active:scale-95"
                    style={
                      watchlistItem.status === s
                        ? { background: "var(--brand)", color: "white", borderRadius: 14 }
                        : { background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }
                    }
                  >
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <button
              onClick={handleAddOrRemove}
              className="w-full py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-3"
              style={{ background: "var(--brand)", color: "white", borderRadius: 14 }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path
                  d="M13 2H3C2.4 2 2 2.4 2 3V14L8 11L14 14V3C14 2.4 13.6 2 13 2Z"
                  stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                />
                <path d="M8 5V9M6 7H10" stroke="white" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Add to Watchlist
            </button>
          )}

          {/* Remove from watchlist */}
          {inWatchlist && (
            <button
              onClick={() => removeFromWatchlist(tmdbId, mediaType)}
              className="w-full py-3 text-sm font-medium mb-3 transition-all active:scale-[0.98]"
              style={{ background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }}
            >
              Remove from watchlist
            </button>
          )}

          {/* Rate button */}
          <button
            onClick={() => setRateOpen(true)}
            className="w-full py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98] mb-3"
            style={{ background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M8 1L9.8 5.5H14.6L10.6 8.6L12.2 13.1L8 10.1L3.8 13.1L5.4 8.6L1.4 5.5H6.2L8 1Z"
                stroke="#C44030" strokeWidth="1.5" strokeLinejoin="round"
                fill={watchlistItem?.rating ? "#C44030" : "none"}
              />
            </svg>
            {watchlistItem?.rating ? `Your rating: ${watchlistItem.rating}/10` : "Rate this"}
          </button>

          {/* Recommend CTA */}
          <button
            onClick={() => setRecommendOpen(true)}
            className="w-full py-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
            style={{ background: "#FFF1EF", color: "#C44030", border: "0.5px solid #FACCBC", borderRadius: 14 }}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path
                d="M14 2L2 6.5L7 8.5M14 2L9.5 14L7 8.5M14 2L7 8.5"
                stroke="#C44030" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
            Recommend to a friend
          </button>
        </div>
      </div>

      <RecommendModal
        isOpen={recommendOpen}
        onClose={() => setRecommendOpen(false)}
        titleName={displayTitle}
        posterPath={title?.poster_path}
        tmdbId={tmdbId}
        mediaType={mediaType}
      />

      <RatingSelector
        isOpen={rateOpen}
        onClose={() => setRateOpen(false)}
        currentRating={watchlistItem?.rating ?? null}
        titleName={displayTitle}
        onRate={(rating) => setRating(tmdbId, mediaType, rating)}
      />
    </>
  );
}
